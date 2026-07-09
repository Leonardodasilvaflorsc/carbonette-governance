import asyncio
import logging
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analysis.association import associate_plume
from app.core.config import get_settings
from app.db import create_pool, run_migrations
from app.providers.emissions_data import EmissionsDataProvider, SyntheticEmissionsProvider
from app.providers.mock import fixture_facilities
from app.providers.plumes import fixture_plumes
from app.providers.wind import FallbackWindProvider, MockWindProvider, OpenMeteoEra5WindProvider
from app.routers import aois, auth, facilities, plumes, reports, share, watchlist
from app.services.alerts import LogEmailSender, SmtpEmailSender, WatchChecker
from app.services.analysis import AnalysisService
from app.services.runner import CeleryRunner, LocalRunner
from app.stores.analysis import InMemoryAnalysisStore, PostgisAnalysisStore
from app.stores.facilities import FacilityStore, InMemoryFacilityStore, PostgisFacilityStore
from app.stores.platform import InMemoryPlatformStore, PostgisPlatformStore
from app.stores.plumes import InMemoryPlumeStore, PostgisPlumeStore
from app.stores.reports import InMemoryReportStore, PostgisReportStore

logger = logging.getLogger(__name__)
settings = get_settings()


def build_emissions_provider() -> EmissionsDataProvider:
    """GEE se configurado/instalável; senão sintético (declarado na UI)."""
    if settings.emissions_provider in ("auto", "gee") and settings.gee_service_account_key_file:
        try:
            from app.providers.gee import GEEEmissionsProvider

            return GEEEmissionsProvider(
                settings.gee_service_account_email, settings.gee_service_account_key_file
            )
        except Exception as e:
            if settings.emissions_provider == "gee":
                raise
            logger.warning("GEE indisponível (%s); usando provider sintético", e)
    return SyntheticEmissionsProvider()


async def _redis_ok() -> bool:
    try:
        client = aioredis.from_url(settings.redis_url)
        try:
            await asyncio.wait_for(client.ping(), timeout=2)
            return True
        finally:
            await client.aclose()
    except Exception:
        return False


async def build_facility_store() -> FacilityStore:
    """Escolhe o store conforme FACILITY_BACKEND e disponibilidade do banco.

    Modo "auto" degrada para fixtures em memória quando o PostGIS está
    inalcançável (dev offline) — as respostas declaram source="mock".
    """
    if settings.facility_backend != "mock":
        try:
            pool = await create_pool(settings.database_url)
            await run_migrations(pool)
            return PostgisFacilityStore(pool)
        except Exception as e:
            if settings.facility_backend == "db":
                raise
            logger.warning("PostGIS indisponível (%s); usando fixtures em memória", e)
    return InMemoryFacilityStore(fixture_facilities(settings.facility_ref_year))


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.facility_store = await build_facility_store()

    # Análise quantitativa: store compartilha o pool do atlas quando há DB
    facility_store = app.state.facility_store
    if isinstance(facility_store, PostgisFacilityStore):
        analysis_store = PostgisAnalysisStore(facility_store.pool)
    else:
        analysis_store = InMemoryAnalysisStore()
    service = AnalysisService(analysis_store, build_emissions_provider())
    app.state.analysis_service = service

    # Plumas: PostGIS quando há DB; senão fixtures associadas às instalações mock
    if isinstance(facility_store, PostgisFacilityStore):
        app.state.plume_store = PostgisPlumeStore(facility_store.pool)
    else:
        seeded = fixture_plumes()
        mock_facilities = fixture_facilities(settings.facility_ref_year)
        for p in seeded:
            p.facility_id = associate_plume(p, mock_facilities)
        app.state.plume_store = InMemoryPlumeStore(seeded)

    app.state.report_store = (
        PostgisReportStore(facility_store.pool)
        if isinstance(facility_store, PostgisFacilityStore)
        else InMemoryReportStore()
    )

    if settings.wind_provider == "mock":
        app.state.wind_provider = MockWindProvider()
    elif settings.wind_provider == "era5":
        app.state.wind_provider = OpenMeteoEra5WindProvider()
    else:
        app.state.wind_provider = FallbackWindProvider(
            OpenMeteoEra5WindProvider(), MockWindProvider()
        )

    # Plataforma: usuários, watchlist, alertas (E6/E7)
    platform_store = (
        PostgisPlatformStore(facility_store.pool)
        if isinstance(facility_store, PostgisFacilityStore)
        else InMemoryPlatformStore()
    )
    app.state.platform_store = platform_store
    app.state.user_store = platform_store
    email_sender = (
        SmtpEmailSender(
            settings.smtp_host, settings.smtp_port, settings.smtp_user,
            settings.smtp_password, settings.smtp_from,
        )
        if settings.smtp_host
        else LogEmailSender()
    )
    app.state.watch_checker = WatchChecker(
        platform_store, app.state.plume_store, service, email_sender
    )

    use_celery = settings.analysis_runner == "celery" or (
        settings.analysis_runner == "auto"
        and isinstance(analysis_store, PostgisAnalysisStore)
        and await _redis_ok()
    )
    app.state.analysis_runner = CeleryRunner() if use_celery else LocalRunner(service)
    logger.info("runner de análise: %s", app.state.analysis_runner.name)

    yield
    if isinstance(facility_store, PostgisFacilityStore):
        await facility_store.pool.close()


app = FastAPI(
    title=f"{settings.app_name} API",
    description="Inteligência de emissões de gases de efeito estufa via satélite",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(facilities.router)
app.include_router(aois.router)
app.include_router(plumes.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(share.router)
app.include_router(watchlist.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ServiceStatus(BaseModel):
    database: str
    redis: str


class HealthResponse(BaseModel):
    status: str
    services: ServiceStatus


async def check_database() -> str:
    try:
        conn = await asyncio.wait_for(asyncpg.connect(settings.database_url), timeout=3)
        try:
            # PostGIS e TimescaleDB são requisitos do modelo de dados
            ext = await conn.fetchval(
                "SELECT count(*) FROM pg_extension WHERE extname IN ('postgis', 'timescaledb')"
            )
            return "ok" if ext == 2 else "missing-extensions"
        finally:
            await conn.close()
    except Exception:
        return "unavailable"


async def check_redis() -> str:
    try:
        client = aioredis.from_url(settings.redis_url)
        try:
            await asyncio.wait_for(client.ping(), timeout=3)
            return "ok"
        finally:
            await client.aclose()
    except Exception:
        return "unavailable"


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    db_status, redis_status = await asyncio.gather(check_database(), check_redis())
    services = ServiceStatus(database=db_status, redis=redis_status)
    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
    return HealthResponse(status=overall, services=services)
