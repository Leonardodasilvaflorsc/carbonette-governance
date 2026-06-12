"""Provider Google Earth Engine — atalho do MVP quantitativo (seção 4.4).

Usa as coleções L3 ``COPERNICUS/S5P/OFFL/L3_*`` (já filtradas por qa_value
na geração do L3; o filtro adicional documentado aplica-se no L2/CDSE).
Requer ``earthengine-api`` (extra ``gee``) e service account.

NOTA: sem rede no ambiente de desenvolvimento este provider não tem teste
de integração — validar no primeiro deploy. A redução por região usa
``reduceRegions`` com média espacial e agregação mensal.
"""

import asyncio
from datetime import date

from app.domain.analysis import CONCENTRATION_UNITS, GeoPolygon, TimeseriesPoint
from app.providers.emissions_data import month_starts

_COLLECTIONS = {
    "CH4": ("COPERNICUS/S5P/OFFL/L3_CH4", "CH4_column_volume_mixing_ratio_dry_air", 1.0),
    # mol/m² → µmol/m²
    "NO2": ("COPERNICUS/S5P/OFFL/L3_NO2", "tropospheric_NO2_column_number_density", 1e6),
    "SO2": ("COPERNICUS/S5P/OFFL/L3_SO2", "SO2_column_number_density", 1e6),
    # mol/m² → mmol/m²
    "CO": ("COPERNICUS/S5P/OFFL/L3_CO", "CO_column_number_density", 1e3),
}


class GEEEmissionsProvider:
    product_name = "S5P TROPOMI L3 (GEE OFFL)"

    def __init__(self, service_account_email: str, key_file: str):
        import ee  # import tardio: dependência opcional

        self._ee = ee
        credentials = ee.ServiceAccountCredentials(service_account_email, key_file)
        ee.Initialize(credentials)

    def _extract_sync(
        self, geometry: GeoPolygon, gas: str, start: date, end: date
    ) -> list[TimeseriesPoint]:
        ee = self._ee
        collection_id, band, scale_factor = _COLLECTIONS[gas]
        region = ee.Geometry.Polygon(geometry.coordinates)
        points: list[TimeseriesPoint] = []

        for month_start in month_starts(start, end):
            next_month = (
                date(month_start.year + 1, 1, 1)
                if month_start.month == 12
                else date(month_start.year, month_start.month + 1, 1)
            )
            img = (
                ee.ImageCollection(collection_id)
                .select(band)
                .filterDate(month_start.isoformat(), next_month.isoformat())
                .mean()
            )
            stats = img.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.count(), sharedInputs=True),
                geometry=region,
                scale=7000,  # ~resolução nativa TROPOMI
                maxPixels=1e9,
            ).getInfo()
            mean = stats.get(f"{band}_mean") or stats.get("mean")
            count = stats.get(f"{band}_count") or stats.get("count") or 0
            points.append(
                TimeseriesPoint(
                    date=month_start,
                    value=round(mean * scale_factor, 3) if mean is not None else None,
                    unit=CONCENTRATION_UNITS[gas],
                    n_obs=int(count),
                )
            )
        return points

    async def extract_timeseries(self, geometry, gas, start, end):
        # GEE é síncrono/bloqueante; roda em thread para não travar o event loop
        return await asyncio.to_thread(self._extract_sync, geometry, gas, start, end)
