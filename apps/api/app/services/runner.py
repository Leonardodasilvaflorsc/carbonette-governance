"""Runners de job: Celery (produção) e local asyncio (dev/offline).

A API seleciona no startup: ``analysis_runner=auto`` usa Celery se o
broker Redis responder; senão executa no próprio processo. O resultado
fica disponível pela mesma API em ambos os casos.
"""

import asyncio
import logging

from app.services.analysis import AnalysisService

logger = logging.getLogger(__name__)


class LocalRunner:
    name = "local"

    def __init__(self, service: AnalysisService):
        self.service = service
        self._tasks: set[asyncio.Task] = set()

    def submit(self, job_id: str) -> None:
        task = asyncio.create_task(self.service.run_job(job_id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)


class CeleryRunner:
    name = "celery"

    def submit(self, job_id: str) -> None:
        from app.workers.celery_app import run_analysis_task

        run_analysis_task.delay(job_id)
