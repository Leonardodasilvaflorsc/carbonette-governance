"""Providers de plumas: Carbon Mapper (real) e fixtures de desenvolvimento.

Carbon Mapper: registro gratuito em carbonmapper.org; endpoint público de
catálogo de plumas anotadas. O parser é tolerante — VALIDAR contra a API
viva no primeiro deploy (mesma ressalva do Climate TRACE).
"""

import logging
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.domain.plumes import Plume

logger = logging.getLogger(__name__)


class PlumeProvider(Protocol):
    async def fetch_plumes(
        self, bbox: tuple[float, float, float, float], start: datetime, end: datetime
    ) -> list[Plume]: ...


def parse_carbon_mapper_response(payload: dict[str, Any]) -> list[Plume]:
    items = payload.get("items") or payload.get("features") or []
    plumes: list[Plume] = []
    for item in items:
        props = item.get("properties") or {}

        def g(*keys: str, item: dict[str, Any] = item, props: dict[str, Any] = props) -> Any:
            # campos aparecem ora em properties, ora no item raiz
            for k in keys:
                if props.get(k) is not None:
                    return props[k]
                if item.get(k) is not None:
                    return item[k]
            return None

        plume_id = g("plume_id", "id")
        gas = str(g("gas") or "CH4").upper()
        geom = g("geometry", "plume_bounds")
        coords = None
        if isinstance(geom, dict) and geom.get("type") == "Point":
            coords = geom.get("coordinates")
        elif g("lon") is not None:
            coords = [g("lon"), g("lat")]
        if plume_id is None or coords is None:
            continue
        observed = g("scene_timestamp", "datetime")
        try:
            observed_at = datetime.fromisoformat(str(observed).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            observed_at = datetime.now(tz=UTC)
        plumes.append(
            Plume(
                id=f"cm-{plume_id}",
                source="carbon-mapper",
                gas=gas,
                lon=float(coords[0]),
                lat=float(coords[1]),
                flux_kg_h=g("emission_auto"),
                flux_uncertainty_kg_h=g("emission_uncertainty_auto"),
                method="provider-reported",
                observed_at=observed_at,
                instrument=g("instrument"),
                quicklook_url=g("plume_png", "rgb_png"),
            )
        )
    return plumes


class CarbonMapperProvider:
    def __init__(self, api_key: str, base_url: str = "https://api.carbonmapper.org"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def fetch_plumes(self, bbox, start, end):
        params = {
            "bbox": ",".join(str(v) for v in bbox),
            "datetime": f"{start.isoformat()}/{end.isoformat()}",
            "limit": 1000,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/catalog/plumes/annotated", params=params, headers=headers
            )
            resp.raise_for_status()
            return parse_carbon_mapper_response(resp.json())


# Plumas de demonstração associáveis às instalações fixture (FASE 2).
# Fluxos em ordens de grandeza típicas de cada tipo de fonte — rotulados
# dev-fixture; nunca chegam a dossiê.
_PLUME_FIXTURE = [
    # (id, gas, lon, lat, flux, unc, instrument, observed)
    ("fxp-joi-landfill-1", "CH4", -48.916, -26.247, 412.0, 138.0, "EMIT", "2026-04-18T13:40:00+00:00"),
    ("fxp-joi-landfill-2", "CH4", -48.919, -26.250, 365.0, 121.0, "EMIT", "2026-05-22T13:55:00+00:00"),
    ("fxp-sp-landfill-1", "CH4", -46.466, -23.450, 1280.0, 410.0, "GHGSat", "2026-05-03T14:10:00+00:00"),
    ("fxp-pau-refinery-1", "CH4", -47.139, -22.731, 690.0, 240.0, "EMIT", "2026-03-29T13:20:00+00:00"),
    ("fxp-cap-coal-1", "CH4", -48.955, -28.443, 210.0, 90.0, "EMIT", "2026-04-30T13:05:00+00:00"),
]


class MockPlumeProvider:
    async def fetch_plumes(self, bbox, start, end):
        west, south, east, north = bbox
        out = []
        for pid, gas, lon, lat, flux, unc, instrument, observed in _PLUME_FIXTURE:
            if not (west <= lon <= east and south <= lat <= north):
                continue
            out.append(
                Plume(
                    id=pid,
                    source="dev-fixture",
                    gas=gas,
                    lon=lon,
                    lat=lat,
                    flux_kg_h=flux,
                    flux_uncertainty_kg_h=unc,
                    method="provider-reported",
                    observed_at=datetime.fromisoformat(observed),
                    instrument=instrument,
                    quicklook_url=None,
                )
            )
        return out


def fixture_plumes() -> list[Plume]:
    return [
        Plume(
            id=pid,
            source="dev-fixture",
            gas=gas,
            lon=lon,
            lat=lat,
            flux_kg_h=flux,
            flux_uncertainty_kg_h=unc,
            method="provider-reported",
            observed_at=datetime.fromisoformat(observed),
            instrument=instrument,
            quicklook_url=None,
        )
        for pid, gas, lon, lat, flux, unc, instrument, observed in _PLUME_FIXTURE
    ]
