"""Exposição regulatória estimada: CBAM e precificação de carbono.

ESTIMATIVA DE SCREENING (não é aconselhamento tributário/jurídico):
- CBAM (Reg. UE 2023/956) cobre aço/ferro, cimento, alumínio,
  fertilizantes, hidrogênio e eletricidade importados pela UE; a exposição
  real depende da fração exportada à UE e das emissões específicas por
  produto — aqui parametrizada pela fração de exportação.
- O preço do carbono é configurável (default aproxima o EU ETS).
"""

CBAM_SECTOR_MAP = {
    "steel": "Ferro e aço",
    "cement": "Cimento",
    "aluminum": "Alumínio",
    "fertilizers": "Fertilizantes",
    "hydrogen": "Hidrogênio",
    "power": "Eletricidade",
}


def cbam_exposure(
    sector: str,
    total_co2e_t: float,
    carbon_price_eur_t: float,
    export_fraction_eu: float = 0.2,
) -> dict:
    applicable = sector in CBAM_SECTOR_MAP
    exposed_t = total_co2e_t * export_fraction_eu if applicable else 0.0
    return {
        "applicable": applicable,
        "category": CBAM_SECTOR_MAP.get(sector),
        "carbon_price_eur_t": carbon_price_eur_t,
        "export_fraction_eu": export_fraction_eu,
        "exposed_co2e_t": round(exposed_t, 1),
        "annual_exposure_eur": round(exposed_t * carbon_price_eur_t, 0),
        # cenário cheio: precificação doméstica futura sobre o total
        "full_pricing_eur": round(total_co2e_t * carbon_price_eur_t, 0),
    }
