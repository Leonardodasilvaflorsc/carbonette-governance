"""Serviço de análise: orquestra provider → climatologia → persistência.

Compartilhado pelo runner local (asyncio) e pelo worker Celery — o
pipeline é idêntico, muda apenas onde executa.
"""

import logging
import uuid

from app.analysis.climatology import analyze_series
from app.domain.analysis import AnalysisJob, AnalysisParams, Aoi
from app.providers.emissions_data import EmissionsDataProvider, provider_product_label
from app.stores.analysis import AnalysisStore

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self, store: AnalysisStore, provider: EmissionsDataProvider):
        self.store = store
        self.provider = provider

    async def create_aoi(self, name: str, geometry) -> Aoi:
        aoi = Aoi(id=f"aoi-{uuid.uuid4().hex[:12]}", name=name, geometry=geometry)
        await self.store.create_aoi(aoi)
        return aoi

    async def create_job(self, aoi_id: str, params: AnalysisParams) -> AnalysisJob:
        job = AnalysisJob(id=f"job-{uuid.uuid4().hex[:12]}", aoi_id=aoi_id, params=params)
        await self.store.save_job(job)
        return job

    async def run_job(self, job_id: str) -> AnalysisJob:
        job = await self.store.get_job(job_id)
        if job is None:
            raise ValueError(f"job desconhecido: {job_id}")
        aoi = await self.store.get_aoi(job.aoi_id)
        if aoi is None:
            job.status, job.error = "error", "AOI não encontrada"
            await self.store.save_job(job)
            return job

        job.status = "running"
        await self.store.save_job(job)
        try:
            raw = await self.provider.extract_timeseries(
                aoi.geometry, job.params.gas, job.params.start, job.params.end
            )
            job.result = analyze_series(raw)
            job.product = (
                f"{provider_product_label(self.provider, job.params.gas)} · "
                f"{job.params.start.isoformat()} a {job.params.end.isoformat()}"
            )
            job.status = "done"
        except Exception as e:  # noqa: BLE001 — status de erro é parte do contrato
            logger.exception("job %s falhou", job_id)
            job.status, job.error = "error", str(e)
        await self.store.save_job(job)
        return job
