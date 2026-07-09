"""Stores do Atlas de Emissores: PostGIS (produção) e memória (dev offline).

Ambos implementam o mesmo protocolo; a API escolhe na inicialização
conforme ``FACILITY_BACKEND`` (auto|db|mock) e disponibilidade do banco.
"""

import json
from typing import Protocol

import asyncpg

from app.domain.facilities import Bbox, FacilityRecord


class FacilityStore(Protocol):
    source: str  # "db" | "mock" — exposto nas respostas da API

    async def query(
        self,
        bbox: Bbox | None,
        sector: str | None,
        min_co2e_t: float | None,
        limit: int,
    ) -> list[FacilityRecord]: ...

    async def get(self, facility_id: str) -> FacilityRecord | None: ...

    async def sectors(self) -> list[str]: ...

    async def upsert_many(self, records: list[FacilityRecord]) -> int: ...


class InMemoryFacilityStore:
    source = "mock"

    def __init__(self, records: list[FacilityRecord] | None = None):
        self._records: dict[str, FacilityRecord] = {r.id: r for r in (records or [])}

    async def query(self, bbox, sector, min_co2e_t, limit):
        out = [
            r
            for r in self._records.values()
            if (bbox is None or bbox.contains(r.lon, r.lat))
            and (sector is None or r.sector == sector)
            and (min_co2e_t is None or (r.co2e_t or 0) >= min_co2e_t)
        ]
        out.sort(key=lambda r: r.co2e_t or 0, reverse=True)
        return out[:limit]

    async def get(self, facility_id):
        return self._records.get(facility_id)

    async def sectors(self):
        return sorted({r.sector for r in self._records.values()})

    async def upsert_many(self, records):
        for r in records:
            self._records[r.id] = r
        return len(records)


_ROW_COLS = (
    "id, name, sector, country, ST_X(geom) AS lon, ST_Y(geom) AS lat, "
    "data_source, ref_year, emissions, co2e_t"
)


def _row_to_record(row: asyncpg.Record) -> FacilityRecord:
    emissions = row["emissions"]
    if isinstance(emissions, str):
        emissions = json.loads(emissions)
    return FacilityRecord(
        id=row["id"],
        name=row["name"],
        sector=row["sector"],
        country=row["country"],
        lon=row["lon"],
        lat=row["lat"],
        ref_year=row["ref_year"],
        emissions=emissions,
        co2e_t=row["co2e_t"],
        data_source=row["data_source"],
    )


class PostgisFacilityStore:
    source = "db"

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def query(self, bbox, sector, min_co2e_t, limit):
        clauses, params = [], []
        if bbox is not None:
            params.extend([bbox.west, bbox.south, bbox.east, bbox.north])
            clauses.append("geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)")
        if sector is not None:
            params.append(sector)
            clauses.append(f"sector = ${len(params)}")
        if min_co2e_t is not None:
            params.append(min_co2e_t)
            clauses.append(f"co2e_t >= ${len(params)}")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(limit)
        sql = (
            f"SELECT {_ROW_COLS} FROM facilities {where} "
            f"ORDER BY co2e_t DESC NULLS LAST LIMIT ${len(params)}"
        )
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        return [_row_to_record(r) for r in rows]

    async def get(self, facility_id):
        sql = f"SELECT {_ROW_COLS} FROM facilities WHERE id = $1"
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(sql, facility_id)
        return _row_to_record(row) if row else None

    async def sectors(self):
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT DISTINCT sector FROM facilities ORDER BY sector")
        return [r["sector"] for r in rows]

    async def upsert_many(self, records):
        sql = """
            INSERT INTO facilities
                (id, name, sector, country, geom, data_source, ref_year,
                 emissions, co2e_t, updated_at)
            VALUES
                ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
                 $7, $8, $9::jsonb, $10, now())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                sector = EXCLUDED.sector,
                country = EXCLUDED.country,
                geom = EXCLUDED.geom,
                data_source = EXCLUDED.data_source,
                ref_year = EXCLUDED.ref_year,
                emissions = EXCLUDED.emissions,
                co2e_t = EXCLUDED.co2e_t,
                updated_at = now()
        """
        args = [
            (r.id, r.name, r.sector, r.country, r.lon, r.lat, r.data_source, r.ref_year,
             json.dumps(r.emissions), r.co2e_t)
            for r in records
        ]
        async with self.pool.acquire() as conn:
            await conn.executemany(sql, args)
        return len(args)
