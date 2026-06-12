"""Interface EmissionsDataProvider e provider sintético de desenvolvimento.

A aplicação NUNCA depende de um provedor concreto (regra 'O que não fazer'
do plano): GEE e openEO/CDSE implementam este mesmo protocolo.
"""

import hashlib
import math
import random
from datetime import date
from typing import Protocol

from app.domain.analysis import (
    CONCENTRATION_UNITS,
    QA_THRESHOLDS,
    GeoPolygon,
    TimeseriesPoint,
)


class EmissionsDataProvider(Protocol):
    """Extrai a série temporal de concentração média de uma AOI."""

    product_name: str

    async def extract_timeseries(
        self, geometry: GeoPolygon, gas: str, start: date, end: date
    ) -> list[TimeseriesPoint]: ...


def month_starts(start: date, end: date) -> list[date]:
    months: list[date] = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        months.append(date(y, m, 1))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return months


# nível de fundo plausível e amplitudes por gás (apenas para a forma da curva)
_SYNTH_BASE = {
    "CH4": (1880.0, 18.0, 65.0),  # (base, amplitude sazonal, magnitude do spike)
    "NO2": (80.0, 25.0, 90.0),
    "SO2": (35.0, 10.0, 60.0),
    "CO": (28.0, 6.0, 15.0),
}


class SyntheticEmissionsProvider:
    """Série determinística (semeada pela AOI) para desenvolvimento offline.

    Curva = base + sazonalidade senoidal + ruído + 1–2 spikes injetados —
    suficiente para exercitar climatologia, z-score e gráficos. O produto
    declara 'synthetic-dev' e a UI avisa que não é dado orbital real.
    """

    product_name = "synthetic-dev"

    async def extract_timeseries(self, geometry, gas, start, end):
        base, season_amp, spike = _SYNTH_BASE.get(gas, (50.0, 10.0, 30.0))
        seed = hashlib.sha256(f"{geometry.coordinates}{gas}".encode()).hexdigest()
        rng = random.Random(seed)
        months = month_starts(start, end)
        spike_idx = {rng.randrange(len(months) // 2, len(months))} if len(months) >= 6 else set()

        points: list[TimeseriesPoint] = []
        for i, d in enumerate(months):
            value = (
                base
                + season_amp * math.sin(2 * math.pi * (d.month - 1) / 12)
                + rng.gauss(0, season_amp * 0.25)
                + (spike if i in spike_idx else 0.0)
            )
            background = base + rng.gauss(0, season_amp * 0.15)
            points.append(
                TimeseriesPoint(
                    date=d,
                    value=round(value, 2),
                    unit=CONCENTRATION_UNITS[gas],
                    qa_fraction=round(rng.uniform(0.55, 0.95), 2),
                    n_obs=rng.randrange(40, 400),
                    background=round(background, 2),
                )
            )
        return points


def provider_product_label(provider: EmissionsDataProvider, gas: str) -> str:
    """Linha de rastreabilidade exigida em todo resultado (regra 7.6)."""
    return f"{provider.product_name} · {gas} · qa≥{QA_THRESHOLDS[gas]}"
