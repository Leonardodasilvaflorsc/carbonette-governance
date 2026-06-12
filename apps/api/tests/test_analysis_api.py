import time

import pytest
from fastapi.testclient import TestClient

from app.main import app

LANDFILL_AOI = {
    "name": "Aterro sanitário — Joinville (teste)",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [[-48.93, -26.26], [-48.90, -26.26], [-48.90, -26.23],
             [-48.93, -26.23], [-48.93, -26.26]]
        ],
    },
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _wait_done(client, job_id: str, timeout_s: float = 10) -> dict:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        job = client.get(f"/analyses/{job_id}").json()
        if job["status"] in ("done", "error"):
            return job
        time.sleep(0.05)
    raise AssertionError("job não terminou no tempo limite")


def test_full_aoi_analysis_flow(client):
    # cria AOI
    resp = client.post("/aois", json=LANDFILL_AOI)
    assert resp.status_code == 201
    aoi = resp.json()

    # submete análise de 12 meses de CH4 (critério de aceite da FASE 3)
    resp = client.post(
        f"/aois/{aoi['id']}/analyses",
        json={"gas": "CH4", "start": "2025-06-01", "end": "2026-05-01"},
    )
    assert resp.status_code == 202
    submitted = resp.json()
    assert submitted["runner"] == "local"  # sem broker no ambiente de teste

    job = _wait_done(client, submitted["job"]["id"])
    assert job["status"] == "done"
    assert len(job["result"]) == 12
    assert "synthetic-dev" in job["product"]  # rastreabilidade declara a fonte
    assert "qa≥0.5" in job["product"]

    # série tem climatologia após o aquecimento e unidade correta
    assert all(p["unit"] == "ppb" for p in job["result"])
    assert any(p["climatology"] is not None for p in job["result"])

    # exportações
    csv_resp = client.get(f"/analyses/{job['id']}/export.csv")
    assert csv_resp.status_code == 200
    assert "date,value,unit" in csv_resp.text

    gj = client.get(f"/analyses/{job['id']}/export.geojson").json()
    assert gj["features"][0]["geometry"]["type"] == "Polygon"
    assert len(gj["features"][0]["properties"]["series"]) == 12


def test_validation_errors(client):
    degenerate = {"name": "x", "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 1]]]}}
    assert client.post("/aois", json=degenerate).status_code == 422

    aoi_id = client.post("/aois", json=LANDFILL_AOI).json()["id"]
    inverted = {"gas": "CH4", "start": "2026-05-01", "end": "2025-06-01"}
    assert client.post(f"/aois/{aoi_id}/analyses", json=inverted).status_code == 422

    valid = {"gas": "CH4", "start": "2025-06-01", "end": "2026-05-01"}
    assert client.post("/aois/nao-existe/analyses", json=valid).status_code == 404


def test_export_requires_done_job(client):
    assert client.get("/analyses/inexistente/export.csv").status_code == 404
