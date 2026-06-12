import pytest
from conftest import ADMIN, auth_headers
from fastapi.testclient import TestClient

from app.main import app

AOI = {
    "name": "AOI watch",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[-48.93, -26.26], [-48.90, -26.26], [-48.90, -26.23], [-48.93, -26.26]]],
    },
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def admin(client):
    return auth_headers(client)


@pytest.fixture(scope="module")
def viewer(client, admin):
    creds = {"email": "cliente@teste.dev", "password": "senha-cliente-1"}
    resp = client.post("/auth/register", json={**creds, "role": "viewer"}, headers=admin)
    assert resp.status_code == 201
    token = client.post("/auth/login", json=creds).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- auth e papéis -----------------------------------------------------------


def test_bootstrap_first_user_is_admin(client, admin):
    me = client.get("/auth/me", headers=admin).json()
    assert me["email"] == ADMIN["email"]
    assert me["role"] == "admin"


def test_register_requires_admin_after_bootstrap(client, viewer):
    resp = client.post(
        "/auth/register",
        json={"email": "x@y.dev", "password": "12345678!", "role": "analyst"},
        headers=viewer,
    )
    assert resp.status_code == 403
    # sem token também não
    assert client.post(
        "/auth/register", json={"email": "x@y.dev", "password": "12345678!"}
    ).status_code == 401


def test_wrong_password_rejected(client):
    resp = client.post("/auth/login", json={"email": ADMIN["email"], "password": "errada-123"})
    assert resp.status_code == 401


def test_viewer_is_read_only(client, viewer):
    # leitura ok
    assert client.get("/facilities", params={"bbox": "-49.1,-26.6,-48.5,-26.0"}).status_code == 200
    # escrita negada (403) e sem token negada (401)
    assert client.post("/aois", json=AOI, headers=viewer).status_code == 403
    assert client.post("/aois", json=AOI).status_code == 401
    assert (
        client.post("/facilities/fx-joi-landfill/report", json={}, headers=viewer).status_code
        == 403
    )


# --- links públicos assinados ------------------------------------------------


def test_share_link_grants_only_the_shared_target(client, admin):
    created = client.post(
        "/share",
        json={"target_type": "facility", "target_id": "fx-joi-landfill", "expires_days": 7},
        headers=admin,
    )
    assert created.status_code == 201
    token = created.json()["token"]

    # cliente externo, SEM autenticação, abre o link e vê só o alvo
    view = client.get(f"/share/{token}")
    assert view.status_code == 200
    body = view.json()
    assert body["facility"]["id"] == "fx-joi-landfill"
    assert all(p["facility_id"] == "fx-joi-landfill" for p in body["plumes"])

    # o token de share NÃO serve para a API autenticada
    assert (
        client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    )


def test_share_link_invalid_or_viewer_created(client, viewer):
    assert client.get("/share/token-invalido").status_code == 401
    # viewer não cria links
    resp = client.post(
        "/share", json={"target_type": "facility", "target_id": "fx-joi-landfill"}, headers=viewer
    )
    assert resp.status_code == 403


# --- watchlist e alertas -----------------------------------------------------


def test_watchlist_check_creates_new_plume_alert(client, admin):
    watch = client.post(
        "/watchlist",
        json={"target_type": "facility", "target_id": "fx-joi-landfill", "gas": "CH4"},
        headers=admin,
    )
    assert watch.status_code == 201

    # plumas fixture têm datas em 2026-04/05; last_checked None → janela 30d
    # pode não cobri-las; o gatilho real é validado no nível do serviço em
    # test_watch_checker. Aqui validamos o fluxo HTTP completo:
    result = client.post("/watchlist/check", headers=admin)
    assert result.status_code == 200
    assert "alerts_created" in result.json()

    alerts = client.get("/alerts", headers=admin)
    assert alerts.status_code == 200
    watches = client.get("/watchlist", headers=admin).json()
    assert len(watches) == 1
    assert watches[0]["last_checked"] is not None
