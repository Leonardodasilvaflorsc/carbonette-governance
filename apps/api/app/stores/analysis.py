"""Stores de AOIs e jobs de análise (PostGIS + memória, mesmo protocolo)."""

import json
from typing import Protocol

import asyncpg

from app.domain.analysis import AnalysisJob, AnalyzedPoint, Aoi, GeoPolygon


class AnalysisStore(Protocol):
    source: str

    async def create_aoi(self, aoi: Aoi) -> None: ...
    async def list_aois(self) -> list[Aoi]: ...
    async def get_aoi(self, aoi_id: str) -> Aoi | None: ...
    async def save_job(self, job: AnalysisJob) -> None: ...
    async def get_job(self, job_id: str) -> AnalysisJob | None: ...


class InMemoryAnalysisStore:
    source = "mock"

    def __init__(self) -> None:
        self._aois: dict[str, Aoi] = {}
        self._jobs: dict[str, AnalysisJob] = {}

    async def create_aoi(self, aoi):
        self._aois[aoi.id] = aoi

    async def list_aois(self):
        return list(self._aois.values())

    async def get_aoi(self, aoi_id):
        return self._aois.get(aoi_id)

    async def save_job(self, job):
        self._jobs[job.id] = job.model_copy(deep=True)

    async def get_job(self, job_id):
        return self._jobs.get(job_id)


class PostgisAnalysisStore:
    source = "db"

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def create_aoi(self, aoi):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO aois (id, name, geom)
                VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
                """,
                aoi.id,
                aoi.name,
                aoi.geometry.model_dump_json(),
            )

    async def list_aois(self):
        sql = "SELECT id, name, ST_AsGeoJSON(geom) AS g FROM aois ORDER BY created_at"
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql)
        return [
            Aoi(id=r["id"], name=r["name"], geometry=GeoPolygon(**json.loads(r["g"])))
            for r in rows
        ]

    async def get_aoi(self, aoi_id):
        async with self.pool.acquire() as conn:
            r = await conn.fetchrow(
                "SELECT id, name, ST_AsGeoJSON(geom) AS g FROM aois WHERE id = $1", aoi_id
            )
        if not r:
            return None
        return Aoi(id=r["id"], name=r["name"], geometry=GeoPolygon(**json.loads(r["g"])))

    async def save_job(self, job):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO analysis_jobs
                    (id, aoi_id, gas, start_date, end_date, status, product,
                     error, result, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    product = EXCLUDED.product,
                    error = EXCLUDED.error,
                    result = EXCLUDED.result,
                    updated_at = now()
                """,
                job.id,
                job.aoi_id,
                job.params.gas,
                job.params.start,
                job.params.end,
                job.status,
                job.product,
                job.error,
                json.dumps([p.model_dump(mode="json") for p in job.result]),
            )
            # série também vai para a hypertable (consultas longas / alertas FASE 6)
            if job.status == "done" and job.result:
                await conn.executemany(
                    """
                    INSERT INTO timeseries
                        (aoi_id, gas, date, value, unit, qa_fraction, n_obs, background, product)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (aoi_id, gas, date) DO UPDATE SET
                        value = EXCLUDED.value, qa_fraction = EXCLUDED.qa_fraction,
                        n_obs = EXCLUDED.n_obs, background = EXCLUDED.background,
                        product = EXCLUDED.product
                    """,
                    [
                        (job.aoi_id, job.params.gas, p.date, p.value, p.unit,
                         p.qa_fraction, p.n_obs, p.background, job.product or "")
                        for p in job.result
                    ],
                )

    async def get_job(self, job_id):
        async with self.pool.acquire() as conn:
            r = await conn.fetchrow(
                """
                SELECT id, aoi_id, gas, start_date, end_date, status, product, error, result
                FROM analysis_jobs WHERE id = $1
                """,
                job_id,
            )
        if not r:
            return None
        raw = r["result"]
        result = [AnalyzedPoint(**p) for p in json.loads(raw)] if raw else []
        return AnalysisJob(
            id=r["id"],
            aoi_id=r["aoi_id"],
            params={"gas": r["gas"], "start": r["start_date"], "end": r["end_date"]},
            status=r["status"],
            product=r["product"],
            error=r["error"],
            result=result,
        )
