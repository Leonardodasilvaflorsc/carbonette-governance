"""Associação pluma ↔ instalação por proximidade + afinidade de setor."""

import math

from app.domain.facilities import FacilityRecord
from app.domain.plumes import Plume

DEFAULT_MAX_DISTANCE_KM = 3.0

# setores plausíveis como fonte do gás da pluma → bônus na associação
GAS_SECTOR_AFFINITY: dict[str, set[str]] = {
    "CH4": {
        "solid-waste-disposal",
        "oil-and-gas-production",
        "oil-and-gas-transport",
        "oil-and-gas-refining",
        "food-beverage-tobacco",
        "power",
    },
    "CO2": {"power", "steel", "cement", "oil-and-gas-refining", "aluminum", "chemicals"},
}

AFFINITY_BONUS = 0.5  # distância efetiva multiplicada por isto quando o setor casa


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def associate_plume(
    plume: Plume,
    facilities: list[FacilityRecord],
    max_distance_km: float = DEFAULT_MAX_DISTANCE_KM,
) -> str | None:
    """Instalação mais provável para a pluma, ou None se nenhuma plausível.

    Score = distância real, reduzida pela metade quando o setor da
    instalação é fonte plausível do gás — uma pluma de CH₄ entre um aterro
    a 1,2 km e um galpão qualquer a 0,8 km pertence ao aterro.
    """
    affinity = GAS_SECTOR_AFFINITY.get(plume.gas.upper(), set())
    best_id: str | None = None
    best_score = math.inf

    for f in facilities:
        distance = haversine_km(plume.lon, plume.lat, f.lon, f.lat)
        if distance > max_distance_km:
            continue
        score = distance * (AFFINITY_BONUS if f.sector in affinity else 1.0)
        if score < best_score:
            best_score, best_id = score, f.id

    return best_id
