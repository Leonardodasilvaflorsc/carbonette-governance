from fastapi.testclient import TestClient

from app import main
from app.main import app

client = TestClient(app)


def test_health_reports_all_services(monkeypatch):
    async def db_ok() -> str:
        return "ok"

    async def redis_ok() -> str:
        return "ok"

    monkeypatch.setattr(main, "check_database", db_ok)
    monkeypatch.setattr(main, "check_redis", redis_ok)

    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["services"] == {"database": "ok", "redis": "ok"}


def test_health_degrades_gracefully_without_services(monkeypatch):
    async def unavailable() -> str:
        return "unavailable"

    monkeypatch.setattr(main, "check_database", unavailable)
    monkeypatch.setattr(main, "check_redis", unavailable)

    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["services"]["database"] == "unavailable"
