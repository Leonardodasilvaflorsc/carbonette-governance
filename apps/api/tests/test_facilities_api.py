import pytest
from fastapi.testclient import TestClient

from app.main import app

# bbox aproximadas (west,south,east,north)
JOINVILLE = "-49.1,-26.6,-48.5,-26.0"
SANTA_CATARINA = "-54.0,-29.5,-48.0,-25.8"


@pytest.fixture(scope="module")
def client():
    # context manager executa o lifespan (monta o store de fixtures)
    with TestClient(app) as c:
        yield c


def test_list_by_bbox_joinville(client):
    resp = client.get("/facilities", params={"bbox": JOINVILLE})
    assert resp.status_code == 200
    body = resp.json()
    assert body["source"] == "mock"  # honestidade do dado em dev offline
    ids = [f["id"] for f in body["facilities"]]
    assert "fx-joi-landfill" in ids
    assert body["count"] >= 3
    # ordenado por CO2e decrescente
    co2e = [f["co2e_t"] for f in body["facilities"]]
    assert co2e == sorted(co2e, reverse=True)


def test_ranking_sc_top_is_coal_plant(client):
    resp = client.get("/facilities/ranking", params={"bbox": SANTA_CATARINA, "limit": 20})
    assert resp.status_code == 200
    body = resp.json()
    assert body["facilities"][0]["id"] == "fx-cap-coal"
    assert body["count"] <= 20


def test_sector_filter(client):
    resp = client.get(
        "/facilities", params={"bbox": SANTA_CATARINA, "sector": "solid-waste-disposal"}
    )
    sectors = {f["sector"] for f in resp.json()["facilities"]}
    assert sectors == {"solid-waste-disposal"}


def test_get_facility_detail(client):
    resp = client.get("/facilities/fx-joi-landfill")
    assert resp.status_code == 200
    body = resp.json()
    assert body["emissions"] == {"ch4": 9800.0}
    assert body["data_source"] == "dev-fixture"


def test_unknown_facility_404(client):
    assert client.get("/facilities/nao-existe").status_code == 404


def test_invalid_bbox_422(client):
    assert client.get("/facilities", params={"bbox": "1,2,3"}).status_code == 422
    assert client.get("/facilities", params={"bbox": "10,5,-10,6"}).status_code == 422


def test_sectors_endpoint(client):
    resp = client.get("/facilities/sectors")
    assert resp.status_code == 200
    assert "steel" in resp.json()["sectors"]
