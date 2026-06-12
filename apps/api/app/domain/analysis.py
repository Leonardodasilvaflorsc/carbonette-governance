"""Domínio da Análise Quantitativa (MRV).

Distinção central (regra científica nº 1): tudo aqui é CONCENTRAÇÃO de
coluna/fração molar sobre a AOI — nunca fluxo de emissão. Unidades
acompanham cada ponto.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

AnalysisGas = Literal["CH4", "NO2", "SO2", "CO"]

# Filtros de qualidade obrigatórios (seção 7.3 do plano; recomendação KNMI/SRON)
QA_THRESHOLDS: dict[str, float] = {"CH4": 0.5, "NO2": 0.75, "SO2": 0.5, "CO": 0.5}

# Unidade da média da AOI por gás (produtos L3 TROPOMI no GEE)
CONCENTRATION_UNITS: dict[str, str] = {
    "CH4": "ppb",
    "NO2": "µmol/m²",
    "SO2": "µmol/m²",
    "CO": "mmol/m²",
}


class GeoPolygon(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]


class Aoi(BaseModel):
    id: str
    name: str
    geometry: GeoPolygon


class TimeseriesPoint(BaseModel):
    date: date
    value: float | None  # média da AOI após filtro de qualidade; None = sem dado
    unit: str
    qa_fraction: float | None = None  # fração de pixels que passou o filtro
    n_obs: int | None = None
    background: float | None = None  # média do anel regional de comparação


class AnalyzedPoint(TimeseriesPoint):
    climatology: float | None = None  # média móvel histórica
    zscore: float | None = None
    anomaly: bool = False


class AnalysisParams(BaseModel):
    gas: AnalysisGas
    start: date
    end: date


class AnalysisJob(BaseModel):
    id: str
    aoi_id: str
    params: AnalysisParams
    status: Literal["pending", "running", "done", "error"] = "pending"
    product: str | None = None  # rastreabilidade: fonte, algoritmo, qa, período
    error: str | None = None
    result: list[AnalyzedPoint] = Field(default_factory=list)
