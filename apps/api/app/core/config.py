from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ORBITAL-GHG"
    database_url: str = "postgresql://orbital:orbital-dev-password@localhost:5432/orbital"
    redis_url: str = "redis://localhost:6379/0"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "orbital"
    s3_secret_key: str = "orbital-dev-secret"

    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Atlas de Emissores (FASE 2) ---
    climate_trace_api_url: str = "https://api.climatetrace.org/v6"
    # auto: usa PostGIS se alcançável, senão fixtures em memória (dev offline)
    facility_backend: str = "auto"  # auto | db | mock
    facility_countries: list[str] = ["BRA"]
    facility_ref_year: int = 2024


@lru_cache
def get_settings() -> Settings:
    return Settings()
