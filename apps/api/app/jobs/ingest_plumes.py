"""Job de sincronização Carbon Mapper → PostGIS, com associação a
instalações por proximidade + setor.

Uso:
    python -m app.jobs.ingest_plumes --bbox=-54,-29.5,-48,-25.8 [--mock]
"""

import argparse
import asyncio
import logging
from datetime import UTC, datetime, timedelta

from app.analysis.association import associate_plume
from app.core.config import get_settings
from app.db import create_pool, run_migrations
from app.providers.plumes import CarbonMapperProvider, MockPlumeProvider, PlumeProvider
from app.stores.facilities import PostgisFacilityStore
from app.stores.plumes import PostgisPlumeStore

logger = logging.getLogger(__name__)


async def ingest(provider: PlumeProvider, bbox: tuple[float, float, float, float]) -> int:
    settings = get_settings()
    pool = await create_pool(settings.database_url)
    try:
        await run_migrations(pool)
        end = datetime.now(tz=UTC)
        plumes = await provider.fetch_plumes(bbox, end - timedelta(days=365), end)

        facility_store = PostgisFacilityStore(pool)
        from app.domain.facilities import Bbox

        facilities = await facility_store.query(
            Bbox(west=bbox[0], south=bbox[1], east=bbox[2], north=bbox[3]), None, None, 10000
        )
        for p in plumes:
            p.facility_id = associate_plume(p, facilities)

        count = await PostgisPlumeStore(pool).upsert_many(plumes)
        associated = sum(1 for p in plumes if p.facility_id)
        logger.info("ingestão: %d plumas (%d associadas a instalações)", count, associated)
        return count
    finally:
        await pool.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Sincroniza plumas para o PostGIS")
    parser.add_argument("--bbox", required=True, help="west,south,east,north")
    parser.add_argument("--mock", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    provider: PlumeProvider = (
        MockPlumeProvider() if args.mock else CarbonMapperProvider(settings.carbon_mapper_api_key)
    )
    bbox = tuple(float(v) for v in args.bbox.split(","))
    asyncio.run(ingest(provider, bbox))  # type: ignore[arg-type]


if __name__ == "__main__":
    main()
