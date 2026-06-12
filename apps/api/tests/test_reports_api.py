import io

import pytest
from conftest import auth_headers
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def headers(client):
    return auth_headers(client)


def test_one_click_dossier_meets_acceptance(client, headers):
    # um clique gera o dossiê...
    resp = client.post("/facilities/fx-joi-landfill/report", json={}, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["trace_hash"]) == 64  # sha-256 de rastreabilidade

    # ...e o PDF está pronto para reunião: 8–15 páginas (critério de aceite)
    pdf_resp = client.get(body["url"])
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF")
    pages = len(PdfReader(io.BytesIO(pdf_resp.content)).pages)
    assert 8 <= pages <= 15, f"dossiê com {pages} páginas, fora do intervalo 8–15"


def test_dossier_text_carries_disclaimers_and_traceability(client, headers):
    resp = client.post(
        "/facilities/fx-cap-coal/report", json={"export_fraction_eu": 0.3}, headers=headers
    )
    body = resp.json()
    pdf = client.get(body["url"]).content
    text = "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)

    # disclaimers obrigatórios (regra 7.5) e rastreabilidade (7.6)
    assert "GHG Protocol" in text
    assert "ISO 14064" in text
    assert body["trace_hash"][:16] in text.replace("\n", "")
    # fixture é declarada como demonstração dentro do documento
    assert "dev-fixture" in text
    # CBAM: power está no escopo (eletricidade)
    assert "CBAM" in text


def test_report_for_unknown_facility_404(client, headers):
    assert (
        client.post("/facilities/nao-existe/report", json={}, headers=headers).status_code == 404
    )
    assert client.get("/reports/rep-inexistente.pdf").status_code == 404
