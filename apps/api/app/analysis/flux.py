"""Inversão de fluxo de pluma: IME e CSF — funções puras com incerteza.

Métodos (simplificados, premissas documentadas — regra 7.4):

IME (Integrated Mass Enhancement, Varon et al. 2018, AMT):
    Q = U_eff · IME / L
    IME = Σ ΔΩ_i · A_pixel   [kg]   (ΔΩ = enhancement em kg/m²)
    L   = √(N · A_pixel)     [m]    (escala da pluma)
    U_eff = α·U10 + β, com α=0.9 e β=0.6 m/s (calibração típica p/ CH4)

CSF (Cross-Sectional Flux):
    Q = U_perp · Σ_j ΔΩ_j · w_pixel   [kg/s]
    (transecto perpendicular ao vento; U_perp ≈ U10)

Incerteza (1σ, propagação em quadratura):
    σQ/Q = √( (σU/U)² + σ_enh² )
    σ_enh padrão 25% (ruído de retrieval + fundo); σU vem do provider de
    vento. Estes números acompanham TODO resultado — nunca publicar fluxo
    sem ±.
"""

import math

from app.domain.plumes import Wind

IME_ALPHA = 0.9
IME_BETA = 0.6  # m/s
ENHANCEMENT_REL_UNCERTAINTY = 0.25

SECONDS_PER_HOUR = 3600.0


class FluxEstimate:
    def __init__(self, flux_kg_h: float, uncertainty_kg_h: float, method: str, detail: str):
        self.flux_kg_h = flux_kg_h
        self.uncertainty_kg_h = uncertainty_kg_h
        self.method = method
        self.detail = detail


def _relative_uncertainty(wind: Wind) -> float:
    rel_wind = wind.uncertainty_m_s / max(wind.speed_m_s, 0.1)
    return math.sqrt(rel_wind**2 + ENHANCEMENT_REL_UNCERTAINTY**2)


def ime_flux(
    enhancements_kg_m2: list[float],
    pixel_area_m2: float,
    wind: Wind,
) -> FluxEstimate:
    """Fluxo IME a partir dos enhancements positivos da máscara da pluma."""
    positive = [e for e in enhancements_kg_m2 if e > 0]
    if not positive or pixel_area_m2 <= 0:
        raise ValueError("máscara de pluma vazia ou área de pixel inválida")

    ime_kg = sum(positive) * pixel_area_m2
    plume_scale_m = math.sqrt(len(positive) * pixel_area_m2)
    u_eff = IME_ALPHA * wind.speed_m_s + IME_BETA

    flux_kg_s = u_eff * ime_kg / plume_scale_m
    flux_kg_h = flux_kg_s * SECONDS_PER_HOUR
    uncertainty = flux_kg_h * _relative_uncertainty(wind)
    detail = (
        f"IME={ime_kg:.1f} kg, L={plume_scale_m:.0f} m, "
        f"U_eff={u_eff:.2f} m/s ({wind.source}), N={len(positive)} px"
    )
    return FluxEstimate(round(flux_kg_h, 1), round(uncertainty, 1), "IME", detail)


def csf_flux(
    transect_kg_m2: list[float],
    pixel_width_m: float,
    wind: Wind,
) -> FluxEstimate:
    """Fluxo CSF a partir de um transecto perpendicular ao vento."""
    if not transect_kg_m2 or pixel_width_m <= 0:
        raise ValueError("transecto vazio ou largura de pixel inválida")

    line_density_kg_m = sum(e for e in transect_kg_m2 if e > 0) * pixel_width_m
    flux_kg_s = wind.speed_m_s * line_density_kg_m
    flux_kg_h = flux_kg_s * SECONDS_PER_HOUR
    uncertainty = flux_kg_h * _relative_uncertainty(wind)
    detail = (
        f"∫ΔΩdx={line_density_kg_m:.3f} kg/m, U={wind.speed_m_s:.2f} m/s "
        f"({wind.source}), {len(transect_kg_m2)} px no transecto"
    )
    return FluxEstimate(round(flux_kg_h, 1), round(uncertainty, 1), "CSF", detail)
