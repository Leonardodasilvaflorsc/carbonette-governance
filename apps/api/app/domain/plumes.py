"""Domínio de plumas detectadas e estimativas de fluxo.

Aqui SIM tratamos de fluxo de emissão (kg/h) — sempre acompanhado de
incerteza (±) e método (regra científica nº 4 do plano).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.domain.analysis import GeoPolygon

FluxMethod = Literal["provider-reported", "IME", "CSF"]


class Plume(BaseModel):
    id: str
    source: str  # carbon-mapper | dev-fixture
    gas: str  # CH4 | CO2
    lon: float
    lat: float
    geometry: GeoPolygon | None = None  # contorno georreferenciado, se disponível
    flux_kg_h: float | None = None
    flux_uncertainty_kg_h: float | None = None
    method: FluxMethod = "provider-reported"
    observed_at: datetime
    instrument: str | None = None
    facility_id: str | None = None  # associação por proximidade + setor
    quicklook_url: str | None = None


class Wind(BaseModel):
    speed_m_s: float
    direction_deg: float | None = None
    uncertainty_m_s: float
    source: str  # era5-open-meteo | mock-constant
