import math

import pytest

from app.analysis.flux import csf_flux, ime_flux
from app.domain.plumes import Wind

WIND = Wind(speed_m_s=4.0, direction_deg=270.0, uncertainty_m_s=1.2, source="mock-constant")


def test_ime_flux_matches_hand_calculation():
    # 4 pixels de 100 m com 1e-4 kg/m² cada:
    # IME = 4·1e-4·1e4 = 4 kg; L = √(4·1e4) = 200 m; U_eff = 0.9·4 + 0.6 = 4.2
    # Q = 4.2 · 4/200 = 0.084 kg/s = 302.4 kg/h
    est = ime_flux([1e-4] * 4, pixel_area_m2=100 * 100, wind=WIND)
    assert est.flux_kg_h == pytest.approx(302.4, rel=1e-3)
    assert est.method == "IME"
    # incerteza: √((1.2/4.2... não: σU relativo ao U10? usamos U_eff) — verifica só coerência
    assert 0 < est.uncertainty_kg_h < est.flux_kg_h


def test_ime_ignores_negative_enhancements_and_validates():
    est = ime_flux([1e-4, -5e-5, 1e-4], pixel_area_m2=1e4, wind=WIND)
    assert est.flux_kg_h > 0
    with pytest.raises(ValueError):
        ime_flux([-1e-4], pixel_area_m2=1e4, wind=WIND)


def test_csf_flux_matches_hand_calculation():
    # ∫ΔΩdx = (2e-4+3e-4)·1000 = 0.5 kg/m; Q = 4·0.5 = 2 kg/s = 7200 kg/h
    est = csf_flux([2e-4, 3e-4], pixel_width_m=1000, wind=WIND)
    assert est.flux_kg_h == pytest.approx(7200.0, rel=1e-6)
    assert est.method == "CSF"


def test_uncertainty_grows_with_wind_uncertainty():
    windy = Wind(speed_m_s=4.0, uncertainty_m_s=2.4, source="mock-constant")
    low = ime_flux([1e-4] * 4, 1e4, WIND)
    high = ime_flux([1e-4] * 4, 1e4, windy)
    assert high.uncertainty_kg_h > low.uncertainty_kg_h
    # razão de incerteza nunca abaixo do piso de 25% do enhancement
    assert low.uncertainty_kg_h / low.flux_kg_h >= 0.25 - 1e-9


def test_detail_carries_traceability():
    est = ime_flux([1e-4] * 4, 1e4, WIND)
    assert "U_eff" in est.detail and "mock-constant" in est.detail
    assert not math.isnan(est.flux_kg_h)
