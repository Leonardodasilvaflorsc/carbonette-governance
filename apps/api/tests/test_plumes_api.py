import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.providers.plumes import parse_carbon_mapper_response


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_plumes_by_bbox_joinville(client):
    resp = client.get("/plumes", params={"bbox": "-49.1,-26.6,-48.5,-26.0", "gas": "CH4"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 2
    # plumas do aterro foram associadas à instalação certa (afinidade CH4)
    assert {p["facility_id"] for p in body["plumes"]} == {"fx-joi-landfill"}


def test_facility_plumes_have_flux_with_uncertainty(client):
    resp = client.get("/facilities/fx-joi-landfill/plumes")
    body = resp.json()
    assert body["count"] >= 1
    for p in body["plumes"]:
        # regra: nunca fluxo sem incerteza e método
        assert p["flux_kg_h"] is not None
        assert p["flux_uncertainty_kg_h"] is not None
        assert p["method"] == "provider-reported"


def test_flux_estimate_ime(client):
    resp = client.post(
        "/flux/estimate",
        json={
            "method": "IME",
            "enhancements_kg_m2": [1e-4, 1e-4, 1e-4, 1e-4],
            "pixel_size_m": 100,
            "lon": -48.916,
            "lat": -26.247,
            "observed_at": "2026-05-22T13:55:00Z",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    # vento mock 3.5 m/s: U_eff = 0.9·3.5+0.6 = 3.75; Q = 3.75·4/200·3600 = 270 kg/h
    assert abs(body["flux_kg_h"] - 270.0) < 0.5
    assert body["uncertainty_kg_h"] > 0
    assert body["wind"]["source"].startswith("mock-constant")
    assert "Não substitui" in body["disclaimer"]


def test_flux_estimate_validates_empty_mask(client):
    resp = client.post(
        "/flux/estimate",
        json={
            "method": "IME",
            "enhancements_kg_m2": [-1e-4],
            "pixel_size_m": 100,
            "lon": 0,
            "lat": 0,
            "observed_at": "2026-05-22T13:55:00Z",
        },
    )
    assert resp.status_code == 422


def test_carbon_mapper_parser():
    payload = {
        "items": [
            {
                "plume_id": "CH4_123",
                "gas": "CH4",
                "geometry": {"type": "Point", "coordinates": [-48.916, -26.247]},
                "properties": {},
                "emission_auto": 412.5,
                "emission_uncertainty_auto": 130.0,
                "instrument": "EMIT",
                "scene_timestamp": "2026-04-18T13:40:00Z",
                "plume_png": "https://example.org/q.png",
            },
            {"plume_id": "sem-coords"},
        ]
    }
    plumes = parse_carbon_mapper_response(payload)
    assert len(plumes) == 1
    p = plumes[0]
    assert p.id == "cm-CH4_123"
    assert p.flux_kg_h == 412.5
    assert p.flux_uncertainty_kg_h == 130.0
    assert p.quicklook_url == "https://example.org/q.png"
