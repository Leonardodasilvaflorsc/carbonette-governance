import asyncio
import logging
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import get_settings
from app.db import create_pool, run_migrations
from app.providers.mock import fixture_facilities
from app.routers import facilities
from app.stores.facilities import FacilityStore, InMemoryFacilityStore, PostgisFacilityStore

logger = logging.getLogger(__name__)
settings = get_settings()


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
    yield
    store = app.state.facility_store
    if isinstance(store, PostgisFacilityStore):
        await store.pool.close()


app = FastAPI(
    title=f"{settings.app_name} API",
    description="Inteligência de emissões de gases de efeito estufa via satélite",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(facilities.router)

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
