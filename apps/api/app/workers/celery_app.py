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
