"""Montagem e renderização do dossiê do emissor (E5)."""

import hashlib
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.analysis.cbam import cbam_exposure
from app.analysis.co2e import co2e_breakdown
from app.domain.facilities import FacilityRecord
from app.domain.plumes import Plume
from app.reports.opportunities import opportunities_for
from app.reports.svg_charts import bar_chart, scatter_with_error_bars

SECTOR_LABELS_PT = {
    "steel": "Siderurgia e fundição",
    "cement": "Cimento",
    "power": "Geração de energia",
    "solid-waste-disposal": "Aterros e resíduos",
    "oil-and-gas-production": "O&G — produção",
    "oil-and-gas-transport": "O&G — transporte",
    "oil-and-gas-refining": "O&G — refino",
    "manufacturing": "Manufatura",
    "food-beverage-tobacco": "Agroindústria e alimentos",
    "aluminum": "Alumínio",
    "chemicals": "Química",
}


def _thousands(v) -> str:
    if v is None:
        return "—"
    return f"{float(v):,.0f}".replace(",", ".")


_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html", "j2"]),
)
_env.filters["thousands"] = _thousands


class Branding:
    def __init__(self, app_name: str, primary: str = "#1FB6A6"):
        self.app_name = app_name
        self.primary = primary


def build_dossier_html(
    facility: FacilityRecord,
    plumes: list[Plume],
    sector_peers: list[FacilityRecord],
    branding: Branding,
    carbon_price_eur_t: float,
    export_fraction_eu: float = 0.2,
) -> tuple[str, str, str]:
    """Retorna (html, report_id, trace_hash)."""
    report_id = f"rep-{uuid.uuid4().hex[:10]}"
    generated_at = datetime.now(tz=UTC).strftime("%Y-%m-%d %H:%M UTC")

    co2e = co2e_breakdown(facility.emissions, facility.sector)
    cbam = cbam_exposure(
        facility.sector, co2e["total_co2e_t"], carbon_price_eur_t, export_fraction_eu
    )

    # benchmark: pares do mesmo setor/país ordenados por CO2e
    peers = sorted(
        [p for p in sector_peers if p.co2e_t is not None],
        key=lambda p: p.co2e_t or 0,
        reverse=True,
    )
    rank = next((i + 1 for i, p in enumerate(peers) if p.id == facility.id), len(peers) or 1)
    universe = max(len(peers), 1)
    median = peers[len(peers) // 2].co2e_t if peers else 0.0
    benchmark = {
        "rank": rank,
        "universe": universe,
        "percentile": round(100 * (universe - rank + 1) / universe),
        "median_co2e_t": median or 0.0,
        "above_median": (facility.co2e_t or 0) >= (median or 0),
    }
    top = peers[:8]
    if facility.id not in {p.id for p in top} and facility.co2e_t is not None:
        top = top + [facility]
    benchmark_chart = bar_chart(
        [(p.name, p.co2e_t or 0.0) for p in top],
        highlight_label=facility.name,
        highlight_color=branding.primary,
    )

    plumes_sorted = sorted(plumes, key=lambda p: p.observed_at)
    plume_chart = scatter_with_error_bars(
        [
            (p.observed_at.strftime("%d/%m/%y"), p.flux_kg_h or 0.0, p.flux_uncertainty_kg_h or 0.0)
            for p in plumes_sorted
            if p.flux_kg_h is not None
        ],
        unit=f"kg/h de {plumes_sorted[0].gas}" if plumes_sorted else "kg/h",
        color=branding.primary,
    )
    quantified = [p for p in plumes_sorted if p.flux_kg_h is not None]
    max_plume = max(quantified, key=lambda p: p.flux_kg_h or 0) if quantified else None

    trace_hash = hashlib.sha256(
        json.dumps(
            {
                "facility": facility.model_dump(),
                "plumes": [p.id for p in plumes],
                "carbon_price": carbon_price_eur_t,
                "export_fraction": export_fraction_eu,
                "date": generated_at[:10],
            },
            sort_keys=True,
            default=str,
        ).encode()
    ).hexdigest()

    html = _env.get_template("dossier.html.j2").render(
        report_id=report_id,
        generated_at=generated_at,
        trace_hash=trace_hash,
        brand=branding,
        facility=facility,
        sector_label=SECTOR_LABELS_PT.get(facility.sector, facility.sector),
        co2e=co2e,
        cbam=cbam,
        plumes=[p.model_dump(mode="json") for p in plumes_sorted],
        max_plume=max_plume.model_dump(mode="json") if max_plume else None,
        plume_chart=plume_chart,
        plume_sources=sorted({f"{p.source} ({p.instrument or 'n/d'})" for p in plumes}),
        benchmark=benchmark,
        benchmark_chart=benchmark_chart,
        opportunities=opportunities_for(facility.sector),
    )
    return html, report_id, trace_hash


def render_pdf(html: str) -> bytes:
    from weasyprint import HTML  # import tardio: dependência pesada

    return HTML(string=html).write_pdf()
