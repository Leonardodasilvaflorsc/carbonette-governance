"""Provider Climate TRACE (api.climatetrace.org).

O parser é tolerante a variações de casing/forma observadas entre versões
da API (v4–v6). ATENÇÃO: o esquema exato da v6 deve ser validado contra a
API viva no primeiro deploy com rede aberta — os testes cobrem as formas
conhecidas, não garantem o contrato remoto.
"""

import logging
from typing import Any, Protocol

import httpx

from app.domain.facilities import FacilityRecord

logger = logging.getLogger(__name__)


class FacilityProvider(Protocol):
    async def fetch_facilities(self, countries: list[str], year: int) -> list[FacilityRecord]: ...


def _get(d: dict[str, Any], *names: str) -> Any:
    """Busca a primeira chave existente, indiferente a maiúsculas."""
    lower = {k.lower(): v for k, v in d.items()}
    for name in names:
        if name.lower() in lower:
            return lower[name.lower()]
    return None


def _parse_centroid(asset: dict[str, Any]) -> tuple[float, float] | None:
    centroid = _get(asset, "Centroid")
    if isinstance(centroid, dict):
        geometry = _get(centroid, "Geometry") or _get(centroid, "coordinates")
        if isinstance(geometry, (list, tuple)) and len(geometry) >= 2:
            return float(geometry[0]), float(geometry[1])
    lon, lat = _get(asset, "lon", "longitude"), _get(asset, "lat", "latitude")
    if lon is not None and lat is not None:
        return float(lon), float(lat)
    return None


def _parse_emissions(asset: dict[str, Any]) -> tuple[dict[str, float], float | None]:
    entries = _get(asset, "EmissionsSummary", "Emissions") or []
    gases: dict[str, float] = {}
    co2e: float | None = None
    for e in entries:
        if not isinstance(e, dict):
            continue
        gas = str(_get(e, "Gas") or "").lower()
        qty = _get(e, "EmissionsQuantity", "Quantity", "value")
        if not gas or qty is None:
            continue
        qty = float(qty)
        if gas in ("co2e", "co2e_100yr"):
            co2e = qty
        else:
            gases[gas] = qty
    return gases, co2e


def parse_assets_response(
    payload: dict[str, Any], data_source: str, ref_year: int
) -> list[FacilityRecord]:
    assets = _get(payload, "assets", "data") or []
    records: list[FacilityRecord] = []
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        asset_id = _get(asset, "Id", "asset_id")
        name = _get(asset, "Name", "asset_name")
        coords = _parse_centroid(asset)
        if asset_id is None or name is None or coords is None:
            logger.debug("asset ignorado por campos ausentes: %r", asset_id)
            continue
        gases, co2e = _parse_emissions(asset)
        records.append(
            FacilityRecord(
                id=f"ct-{asset_id}",
                name=str(name),
                sector=str(_get(asset, "Sector", "sector_name") or "unknown"),
                country=str(_get(asset, "Country", "iso3_country") or "UNK"),
                lon=coords[0],
                lat=coords[1],
                ref_year=int(_get(asset, "Year") or ref_year),
                emissions=gases,
                co2e_t=co2e,
                data_source=data_source,
            )
        )
    return records


class ClimateTraceProvider:
    def __init__(self, base_url: str, timeout: float = 60):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def fetch_facilities(self, countries: list[str], year: int) -> list[FacilityRecord]:
        records: list[FacilityRecord] = []
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for country in countries:
                offset, page_size = 0, 1000
                while True:
                    params = {
                        "countries": country,
                        "year": year,
                        "limit": page_size,
                        "offset": offset,
                    }
                    resp = await client.get(f"{self.base_url}/assets", params=params)
                    resp.raise_for_status()
                    page = parse_assets_response(resp.json(), "climate-trace-v6", year)
                    records.extend(page)
                    if len(page) < page_size:
                        break
                    offset += page_size
        return records
