"""Domínio do Atlas de Emissores.

Valores de ``emissions`` são SEMPRE t/ano por gás (inventário), nunca
concentração — ver regra científica nº 1 do plano.
"""

from pydantic import BaseModel, Field


class FacilityRecord(BaseModel):
    id: str
    name: str
    sector: str
    country: str  # ISO3
    lon: float
    lat: float
    ref_year: int
    emissions: dict[str, float] = Field(default_factory=dict)  # {gás: t/ano}
    co2e_t: float | None = None  # t CO2e/ano (GWP100)
    data_source: str


class Bbox(BaseModel):
    west: float
    south: float
    east: float
    north: float

    def contains(self, lon: float, lat: float) -> bool:
        return self.west <= lon <= self.east and self.south <= lat <= self.north


def parse_bbox(raw: str) -> Bbox:
    parts = [float(p) for p in raw.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox deve ser 'west,south,east,north'")
    west, south, east, north = parts
    lons_ok = -180 <= west <= 180 and -180 <= east <= 180
    lats_ok = -90 <= south <= 90 and -90 <= north <= 90
    if not (lons_ok and lats_ok):
        raise ValueError("bbox fora dos limites geográficos")
    if west > east or south > north:
        raise ValueError("bbox invertida (west>east ou south>north)")
    return Bbox(west=west, south=south, east=east, north=north)
