from datetime import UTC, datetime, timedelta

import pytest

from app.core.security import hash_password
from app.domain.platform import UserWithHash, Watch
from app.providers.emissions_data import SyntheticEmissionsProvider
from app.providers.plumes import fixture_plumes
from app.services.alerts import WatchChecker
from app.services.analysis import AnalysisService
from app.stores.analysis import InMemoryAnalysisStore
from app.stores.platform import InMemoryPlatformStore
from app.stores.plumes import InMemoryPlumeStore


class CaptureSender:
    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to, subject, body):
        self.sent.append((to, subject, body))


@pytest.fixture
def setup():
    from app.analysis.association import associate_plume
    from app.providers.mock import fixture_facilities

    platform = InMemoryPlatformStore()
    seeded = fixture_plumes()
    facilities = fixture_facilities()
    for p in seeded:
        p.facility_id = associate_plume(p, facilities)
    plumes = InMemoryPlumeStore(seeded)
    service = AnalysisService(InMemoryAnalysisStore(), SyntheticEmissionsProvider())
    sender = CaptureSender()
    checker = WatchChecker(platform, plumes, service, sender)
    return platform, checker, sender


async def test_new_plume_since_last_check_triggers_email(setup):
    platform, checker, sender = setup
    await platform.create(
        UserWithHash(id="u1", email="analista@teste.dev", role="analyst",
                     password_hash=hash_password("x" * 8))
    )
    watch = Watch(
        id="w1", user_id="u1", target_type="facility", target_id="fx-joi-landfill",
        gas="CH4", last_checked=datetime(2026, 1, 1, tzinfo=UTC),
    )
    await platform.create_watch(watch)

    alerts = await checker.check_watch(watch)

    # as duas plumas fixture do aterro são posteriores a 2026-01-01
    assert len(alerts) == 2
    assert all(a.kind == "new-plume" for a in alerts)
    assert len(sender.sent) == 2
    assert sender.sent[0][0] == "analista@teste.dev"
    assert "kg/h" in sender.sent[0][2]
    # estado persistido para a próxima rodada
    stored = (await platform.list_all())[0]
    assert stored.last_checked is not None

    # segunda verificação: nada novo, nenhum alerta duplicado
    again = await checker.check_watch(stored)
    assert again == []


async def test_no_alert_when_plumes_predate_window(setup):
    platform, checker, sender = setup
    await platform.create(
        UserWithHash(id="u1", email="a@b.dev", role="analyst",
                     password_hash=hash_password("x" * 8))
    )
    watch = Watch(
        id="w1", user_id="u1", target_type="facility", target_id="fx-joi-landfill",
        gas="CH4", last_checked=datetime.now(tz=UTC) + timedelta(days=1),
    )
    await platform.create_watch(watch)
    assert await checker.check_watch(watch) == []
    assert sender.sent == []
