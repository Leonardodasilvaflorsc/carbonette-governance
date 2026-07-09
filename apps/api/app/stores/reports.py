"""Stores de dossiês gerados (metadados + PDF)."""

import json
from typing import Protocol

import asyncpg
from pydantic import BaseModel


class ReportMeta(BaseModel):
    id: str
    facility_id: str
    trace_hash: str
    params: dict


class ReportStore(Protocol):
    source: str

    async def save(self, meta: ReportMeta, pdf: bytes) -> None: ...
    async def get_pdf(self, report_id: str) -> bytes | None: ...
    async def get_meta(self, report_id: str) -> ReportMeta | None: ...


class InMemoryReportStore:
    source = "mock"

    def __init__(self) -> None:
        self._meta: dict[str, ReportMeta] = {}
        self._pdf: dict[str, bytes] = {}

    async def save(self, meta, pdf):
        self._meta[meta.id] = meta
        self._pdf[meta.id] = pdf

    async def get_pdf(self, report_id):
        return self._pdf.get(report_id)

    async def get_meta(self, report_id):
        return self._meta.get(report_id)


class PostgisReportStore:
    source = "db"

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def save(self, meta, pdf):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO reports (id, facility_id, trace_hash, params, pdf)
                VALUES ($1, $2, $3, $4::jsonb, $5)
                """,
                meta.id, meta.facility_id, meta.trace_hash, json.dumps(meta.params), pdf,
            )

    async def get_pdf(self, report_id):
        async with self.pool.acquire() as conn:
            return await conn.fetchval("SELECT pdf FROM reports WHERE id = $1", report_id)

    async def get_meta(self, report_id):
        async with self.pool.acquire() as conn:
            r = await conn.fetchrow(
                "SELECT id, facility_id, trace_hash, params FROM reports WHERE id = $1", report_id
            )
        if not r:
            return None
        params = r["params"]
        return ReportMeta(
            id=r["id"],
            facility_id=r["facility_id"],
            trace_hash=r["trace_hash"],
            params=json.loads(params) if isinstance(params, str) else params,
        )
