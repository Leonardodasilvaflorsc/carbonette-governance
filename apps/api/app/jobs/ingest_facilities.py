"""Job de sincronização Climate TRACE → PostGIS.

Uso:
    python -m app.jobs.ingest_facilities             # provider real
    python -m app.jobs.ingest_facilities --mock      # fixtures de dev

Periodicidade recomendada: mensal (o inventário Climate TRACE é anual,
com revisões). Vira task Celery beat na FASE 6.
"""

import argparse
import asyncio
import logging

from app.core.config import get_settings
from app.db import create_pool, run_migrations
from app.providers.climate_trace import ClimateTraceProvider, FacilityProvider
from app.providers.mock import MockFacilityProvider
from app.stores.facilities import PostgisFacilityStore

logger = logging.getLogger(__name__)


async def ingest(provider: FacilityProvider) -> int:
    settings = get_settings()
    pool = await create_pool(settings.database_url)
    try:
        await run_migrations(pool)
        records = await provider.fetch_facilities(
            settings.facility_countries, settings.facility_ref_year
        )
        store = PostgisFacilityStore(pool)
        count = await store.upsert_many(records)
        logger.info("ingestão concluída: %d instalações", count)
        return count
    finally:
        await pool.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Sincroniza instalações para o PostGIS")
    parser.add_argument("--mock", action="store_true", help="usa fixtures de dev em vez da API")
    args = parser.parse_args()

    settings = get_settings()
    provider: FacilityProvider = (
        MockFacilityProvider()
        if args.mock
        else ClimateTraceProvider(settings.climate_trace_api_url)
    )
    asyncio.run(ingest(provider))


if __name__ == "__main__":
    main()
