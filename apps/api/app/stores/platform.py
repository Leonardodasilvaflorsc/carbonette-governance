"""Stores de usuários, watches e alertas (PostGIS + memória)."""

import json
from datetime import UTC, datetime
from typing import Protocol

import asyncpg

from app.domain.platform import Alert, UserWithHash, Watch


class UserStore(Protocol):
    async def create(self, user: UserWithHash) -> None: ...
    async def get(self, user_id: str) -> UserWithHash | None: ...
    async def get_by_email(self, email: str) -> UserWithHash | None: ...
    async def count(self) -> int: ...


class WatchStore(Protocol):
    async def create(self, watch: Watch) -> None: ...
    async def list_all(self) -> list[Watch]: ...
    async def list_for_user(self, user_id: str) -> list[Watch]: ...
    async def update_last_checked(self, watch_id: str, when: datetime) -> None: ...


class AlertStore(Protocol):
    async def create(self, alert: Alert) -> None: ...
    async def list_for_user(self, user_id: str) -> list[Alert]: ...


class InMemoryPlatformStore:
    """Implementa os três protocolos para desenvolvimento offline e testes."""

    def __init__(self) -> None:
        self._users: dict[str, UserWithHash] = {}
        self._watches: dict[str, Watch] = {}
        self._alerts: list[Alert] = []

    # UserStore
    async def create(self, user: UserWithHash) -> None:
        if any(u.email == user.email for u in self._users.values()):
            raise ValueError("e-mail já cadastrado")
        self._users[user.id] = user

    async def get(self, user_id):
        return self._users.get(user_id)

    async def get_by_email(self, email):
        return next((u for u in self._users.values() if u.email == email), None)

    async def count(self):
        return len(self._users)

    # WatchStore
    async def create_watch(self, watch: Watch) -> None:
        self._watches[watch.id] = watch

    async def list_all(self):
        return list(self._watches.values())

    async def list_for_user(self, user_id):
        return [w for w in self._watches.values() if w.user_id == user_id]

    async def update_last_checked(self, watch_id, when):
        if watch_id in self._watches:
            self._watches[watch_id] = self._watches[watch_id].model_copy(
                update={"last_checked": when}
            )

    # AlertStore
    async def create_alert(self, alert: Alert) -> None:
        self._alerts.append(alert)

    async def list_alerts_for_user(self, user_id):
        watch_ids = {w.id for w in await self.list_for_user(user_id)}
        return [a for a in self._alerts if a.watch_id in watch_ids]


class PostgisPlatformStore:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def create(self, user: UserWithHash) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                user.id, user.email, user.password_hash, user.role,
            )

    async def get(self, user_id):
        async with self.pool.acquire() as conn:
            r = await conn.fetchrow(
                "SELECT id, email, password_hash, role FROM users WHERE id = $1", user_id
            )
        return UserWithHash(**dict(r)) if r else None

    async def get_by_email(self, email):
        async with self.pool.acquire() as conn:
            r = await conn.fetchrow(
                "SELECT id, email, password_hash, role FROM users WHERE email = $1", email
            )
        return UserWithHash(**dict(r)) if r else None

    async def count(self):
        async with self.pool.acquire() as conn:
            return await conn.fetchval("SELECT count(*) FROM users")

    async def create_watch(self, watch: Watch) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO watches (id, user_id, target_type, target_id, gas, last_checked)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                watch.id, watch.user_id, watch.target_type, watch.target_id,
                watch.gas, watch.last_checked,
            )

    async def list_all(self):
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, user_id, target_type, target_id, gas, last_checked FROM watches"
            )
        return [Watch(**dict(r)) for r in rows]

    async def list_for_user(self, user_id):
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT id, user_id, target_type, target_id, gas, last_checked
                   FROM watches WHERE user_id = $1""",
                user_id,
            )
        return [Watch(**dict(r)) for r in rows]

    async def update_last_checked(self, watch_id, when):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE watches SET last_checked = $2 WHERE id = $1", watch_id, when
            )

    async def create_alert(self, alert: Alert) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO alerts (id, watch_id, kind, message, payload, sent, created_at)
                   VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)""",
                alert.id, alert.watch_id, alert.kind, alert.message,
                json.dumps(alert.payload), alert.sent, alert.created_at,
            )

    async def list_alerts_for_user(self, user_id):
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT a.id, a.watch_id, a.kind, a.message, a.payload, a.sent, a.created_at
                   FROM alerts a JOIN watches w ON w.id = a.watch_id
                   WHERE w.user_id = $1 ORDER BY a.created_at DESC""",
                user_id,
            )
        out = []
        for r in rows:
            d = dict(r)
            if isinstance(d["payload"], str):
                d["payload"] = json.loads(d["payload"])
            out.append(Alert(**d))
        return out


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
