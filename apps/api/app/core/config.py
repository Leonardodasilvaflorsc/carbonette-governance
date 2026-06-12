from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ORBITAL-GHG"
    # --- White-label / dossiê (FASE 5) ---
    brand_primary_color: str = "#1FB6A6"
    carbon_price_eur_t: float = 70.0
    database_url: str = "postgresql://orbital:orbital-dev-password@localhost:5432/orbital"
    redis_url: str = "redis://localhost:6379/0"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "orbital"
    s3_secret_key: str = "orbital-dev-secret"

    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Análise Quantitativa (FASE 3) ---
    # auto: GEE se credencial configurada e lib disponível, senão sintético
    emissions_provider: str = "auto"  # auto | gee | synthetic
    gee_service_account_email: str = ""
    gee_service_account_key_file: str = ""
    # auto: Celery se o broker Redis responder, senão runner local (asyncio)
    analysis_runner: str = "auto"  # auto | celery | local

    # --- Plumas e fluxo (FASE 4) ---
    carbon_mapper_api_key: str = ""
    wind_provider: str = "auto"  # auto | era5 | mock

    # --- Atlas de Emissores (FASE 2) ---
    climate_trace_api_url: str = "https://api.climatetrace.org/v6"
    # auto: usa PostGIS se alcançável, senão fixtures em memória (dev offline)
    facility_backend: str = "auto"  # auto | db | mock
    facility_countries: list[str] = ["BRA"]
    facility_ref_year: int = 2024


@lru_cache
def get_settings() -> Settings:
    return Settings()
