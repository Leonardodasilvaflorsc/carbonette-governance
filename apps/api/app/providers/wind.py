"""Providers de vento para inversão de fluxo.

Real: reanálise ERA5 via API pública do Open-Meteo (sem chave) — mesmos
dados ECMWF da CDS API, com latência de acesso muito menor para consultas
pontuais. A CDS API permanece a referência para campos completos (FASE 4+
quando precisarmos de níveis de pressão).
"""

from datetime import datetime
from typing import Protocol

import httpx

from app.domain.plumes import Wind

# Incerteza 1σ típica do vento 10 m da reanálise vs. observações locais
ERA5_WIND_UNCERTAINTY_M_S = 1.5


class WindProvider(Protocol):
    async def wind_at(self, lon: float, lat: float, when: datetime) -> Wind: ...


class OpenMeteoEra5WindProvider:
    BASE = "https://archive-api.open-meteo.com/v1/era5"

    async def wind_at(self, lon, lat, when):
        day = when.date().isoformat()
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": day,
            "end_date": day,
            "hourly": "wind_speed_10m,wind_direction_10m",
            "wind_speed_unit": "ms",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(self.BASE, params=params)
            resp.raise_for_status()
            data = resp.json()["hourly"]
        idx = min(when.hour, len(data["wind_speed_10m"]) - 1)
        return Wind(
            speed_m_s=float(data["wind_speed_10m"][idx]),
            direction_deg=float(data["wind_direction_10m"][idx]),
            uncertainty_m_s=ERA5_WIND_UNCERTAINTY_M_S,
            source="era5-open-meteo",
        )


class FallbackWindProvider:
    """ERA5 com degradação graciosa: sem rede, usa o vento constante do
    mock e DECLARA isso no campo source (a incerteza publicada segue o ±)."""

    def __init__(self, primary: WindProvider, fallback: WindProvider):
        self.primary = primary
        self.fallback = fallback

    async def wind_at(self, lon, lat, when):
        try:
            return await self.primary.wind_at(lon, lat, when)
        except Exception:
            wind = await self.fallback.wind_at(lon, lat, when)
            source = f"{wind.source} (fallback: era5 indisponível)"
            return wind.model_copy(update={"source": source})


class MockWindProvider:
    """Vento constante para desenvolvimento offline e testes determinísticos."""

    def __init__(self, speed_m_s: float = 3.5, uncertainty_m_s: float = 1.0):
        self.speed = speed_m_s
        self.uncertainty = uncertainty_m_s

    async def wind_at(self, lon, lat, when):
        return Wind(
            speed_m_s=self.speed,
            direction_deg=270.0,
            uncertainty_m_s=self.uncertainty,
            source="mock-constant",
        )
