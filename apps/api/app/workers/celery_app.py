"""Worker Celery (jobs pesados — extração de séries, e nas próximas fases
inversão de pluma e geração de PDF).

Subir com:
    celery -A app.workers.celery_app worker --loglevel=info

Requer o extra ``workers`` (celery) e Redis acessível.
"""

import asyncio

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("orbital", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_default_queue = "analysis"

# verificação periódica das watchlists (E6) — diária às 09:00 UTC
celery_app.conf.beat_schedule = {
    "watchlist-daily": {
        "task": "watchlist.check",
        "schedule": 24 * 60 * 60,
    }
}


def _build_service():
    # o worker monta seu próprio service (pool de DB próprio do processo)
    from app.db import create_pool
    from app.main import build_emissions_provider
    from app.stores.analysis import PostgisAnalysisStore

    async def make():
        pool = await create_pool(settings.database_url)
        from app.services.analysis import AnalysisService

        return AnalysisService(PostgisAnalysisStore(pool), build_emissions_provider())

    return asyncio.run(make())


@celery_app.task(name="analysis.run_job")
def run_analysis_task(job_id: str) -> str:
    service = _build_service()
    job = asyncio.run(service.run_job(job_id))
    return job.status


@celery_app.task(name="watchlist.check")
def check_watchlists_task() -> int:
    from app.db import create_pool
    from app.services.alerts import LogEmailSender, SmtpEmailSender, WatchChecker
    from app.stores.platform import PostgisPlatformStore
    from app.stores.plumes import PostgisPlumeStore

    async def run() -> int:
        pool = await create_pool(settings.database_url)
        try:
            from app.main import build_emissions_provider
            from app.services.analysis import AnalysisService
            from app.stores.analysis import PostgisAnalysisStore

            platform = PostgisPlatformStore(pool)
            sender = (
                SmtpEmailSender(
                    settings.smtp_host, settings.smtp_port, settings.smtp_user,
                    settings.smtp_password, settings.smtp_from,
                )
                if settings.smtp_host
                else LogEmailSender()
            )
            checker = WatchChecker(
                platform,
                PostgisPlumeStore(pool),
                AnalysisService(PostgisAnalysisStore(pool), build_emissions_provider()),
                sender,
            )
            return await checker.check_all()
        finally:
            await pool.close()

    return asyncio.run(run())
