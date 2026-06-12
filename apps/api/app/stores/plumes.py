"""Stores de plumas (PostGIS + memória, mesmo protocolo)."""

import json
from typing import Protocol

import asyncpg

from app.domain.analysis import GeoPolygon
from app.domain.facilities import Bbox
from app.domain.plumes import Plume


class PlumeStore(Protocol):
    source: str

    async def query(
        self, bbox: Bbox | None, gas: str | None, facility_id: str | None
    ) -> list[Plume]: ...
    async def upsert_many(self, plumes: list[Plume]) -> int: ...


class InMemoryPlumeStore:
    source = "mock"

    def __init__(self, plumes: list[Plume] | None = None):
        self._plumes: dict[str, Plume] = {p.id: p for p in (plumes or [])}

    async def query(self, bbox, gas, facility_id):
        out = [
            p
            for p in self._plumes.values()
            if (bbox is None or bbox.contains(p.lon, p.lat))
            and (gas is None or p.gas == gas)
            and (facility_id is None or p.facility_id == facility_id)
        ]
        out.sort(key=lambda p: p.observed_at, reverse=True)
        return out

    async def upsert_many(self, plumes):
        for p in plumes:
            self._plumes[p.id] = p
        return len(plumes)


class PostgisPlumeStore:
    source = "db"

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def query(self, bbox, gas, facility_id):
        clauses, params = [], []
        if bbox is not None:
            params.extend([bbox.west, bbox.south, bbox.east, bbox.north])
            clauses.append("geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)")
        if gas is not None:
            params.append(gas)
            clauses.append(f"gas = ${len(params)}")
        if facility_id is not None:
            params.append(facility_id)
            clauses.append(f"facility_id = ${len(params)}")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"""
            SELECT id, source, gas, ST_X(geom) AS lon, ST_Y(geom) AS lat,
                   ST_AsGeoJSON(contour) AS contour, flux_kg_h, flux_uncertainty_kg_h,
                   method, observed_at, instrument, facility_id, quicklook_url
            FROM plumes {where} ORDER BY observed_at DESC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        return [
            Plume(
                id=r["id"],
                source=r["source"],
                gas=r["gas"],
                lon=r["lon"],
                lat=r["lat"],
                geometry=GeoPolygon(**json.loads(r["contour"])) if r["contour"] else None,
                flux_kg_h=r["flux_kg_h"],
                flux_uncertainty_kg_h=r["flux_uncertainty_kg_h"],
                method=r["method"],
                observed_at=r["observed_at"],
                instrument=r["instrument"],
                facility_id=r["facility_id"],
                quicklook_url=r["quicklook_url"],
            )
            for r in rows
        ]

    async def upsert_many(self, plumes):
        sql = """
            INSERT INTO plumes
                (id, source, gas, geom, contour, flux_kg_h, flux_uncertainty_kg_h,
                 method, observed_at, instrument, facility_id, quicklook_url, updated_at)
            VALUES
                ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326),
                 CASE WHEN $6::text IS NULL THEN NULL
                      ELSE ST_SetSRID(ST_GeomFromGeoJSON($6), 4326) END,
                 $7, $8, $9, $10, $11, $12, $13, now())
            ON CONFLICT (id) DO UPDATE SET
                flux_kg_h = EXCLUDED.flux_kg_h,
                flux_uncertainty_kg_h = EXCLUDED.flux_uncertainty_kg_h,
                method = EXCLUDED.method,
                facility_id = EXCLUDED.facility_id,
                quicklook_url = EXCLUDED.quicklook_url,
                updated_at = now()
        """
        args = [
            (p.id, p.source, p.gas, p.lon, p.lat,
             p.geometry.model_dump_json() if p.geometry else None,
             p.flux_kg_h, p.flux_uncertainty_kg_h, p.method, p.observed_at,
             p.instrument, p.facility_id, p.quicklook_url)
            for p in plumes
        ]
        async with self.pool.acquire() as conn:
            await conn.executemany(sql, args)
        return len(args)
