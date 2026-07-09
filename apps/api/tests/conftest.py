import os

# Testes nunca tocam rede/banco: força o store de fixtures em memória
# antes de qualquer import de app.* (get_settings usa lru_cache).
os.environ["FACILITY_BACKEND"] = "mock"
os.environ["WIND_PROVIDER"] = "mock"  # determinístico e offline

ADMIN = {"email": "admin@teste.dev", "password": "senha-forte-123"}


def auth_headers(client) -> dict[str, str]:
    """Bootstrap do admin (primeiro usuário) + login → header Bearer."""
    client.post("/auth/register", json=ADMIN)  # 201 na primeira vez; ignorado depois
    resp = client.post("/auth/login", json=ADMIN)
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
