from app.analysis.cbam import cbam_exposure
from app.analysis.co2e import co2e_breakdown
from app.reports.svg_charts import bar_chart, scatter_with_error_bars


def test_ch4_biogenic_for_landfill():
    out = co2e_breakdown({"ch4": 1000.0}, "solid-waste-disposal")
    assert out["rows"][0]["gwp_key"] == "ch4_biogenic"
    assert out["total_co2e_t"] == 1000.0 * 27.2


def test_ch4_fossil_for_oil_and_gas():
    out = co2e_breakdown({"ch4": 1000.0, "co2": 500.0}, "oil-and-gas-production")
    by_gas = {r["gas"]: r for r in out["rows"]}
    assert by_gas["ch4"]["gwp"] == 29.8
    assert out["total_co2e_t"] == 1000.0 * 29.8 + 500.0


def test_non_ghg_gases_excluded_from_total():
    out = co2e_breakdown({"co2": 100.0, "no2": 50.0, "so2": 10.0}, "steel")
    assert out["total_co2e_t"] == 100.0
    assert set(out["excluded_gases"]) == {"no2", "so2"}


def test_cbam_applies_to_steel_not_manufacturing():
    steel = cbam_exposure("steel", 1_000_000.0, carbon_price_eur_t=70.0, export_fraction_eu=0.2)
    assert steel["applicable"] is True
    assert steel["exposed_co2e_t"] == 200_000.0
    assert steel["annual_exposure_eur"] == 14_000_000.0

    other = cbam_exposure("manufacturing", 1_000_000.0, carbon_price_eur_t=70.0)
    assert other["applicable"] is False
    assert other["annual_exposure_eur"] == 0.0
    assert other["full_pricing_eur"] == 70_000_000.0


def test_svg_charts_produce_valid_svg():
    s = scatter_with_error_bars([("01/04", 412.0, 138.0), ("22/05", 365.0, 121.0)])
    assert s.startswith("<svg") and s.endswith("</svg>") and "circle" in s
    b = bar_chart([("A", 100.0), ("B", 50.0)], highlight_label="A")
    assert b.startswith("<svg") and "rect" in b
    assert scatter_with_error_bars([]) == ""
