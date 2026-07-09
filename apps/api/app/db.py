"""Pool de conexões Postgres e runner de migrações SQL simples.

Migrações são arquivos ``migrations/NNN_nome.sql`` aplicados em ordem e
registrados em ``schema_migrations`` (idempotente).
"""

import logging
from pathlib import Path

import asyncpg

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


async def create_pool(dsn: str, timeout: float = 5) -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn, min_size=1, max_size=10, timeout=timeout)


async def run_migrations(pool: asyncpg.Pool) -> list[str]:
    """Aplica migrações pendentes; retorna os nomes aplicados nesta chamada."""
    applied: list[str] = []
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )
        done = {r["name"] for r in await conn.fetch("SELECT name FROM schema_migrations")}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in done:
                continue
            async with conn.transaction():
                await conn.execute(path.read_text())
                await conn.execute("INSERT INTO schema_migrations (name) VALUES ($1)", path.name)
            logger.info("migração aplicada: %s", path.name)
            applied.append(path.name)
    return applied
