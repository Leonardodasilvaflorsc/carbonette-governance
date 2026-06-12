import os

# Testes nunca tocam rede/banco: força o store de fixtures em memória
# antes de qualquer import de app.* (get_settings usa lru_cache).
os.environ["FACILITY_BACKEND"] = "mock"
os.environ["WIND_PROVIDER"] = "mock"  # determinístico e offline
