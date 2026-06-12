"""Conversões para CO₂e — GWP100 do IPCC AR6 (regra 7 do plano).

CH₄ fóssil e biogênico têm GWP distintos no AR6; a classificação é feita
pelo setor da instalação e fica registrada no resultado.
"""

GWP100_AR6 = {
    "co2": 1.0,
    "ch4_fossil": 29.8,
    "ch4_biogenic": 27.2,
    "n2o": 273.0,
}

# setores cujo CH4 é majoritariamente biogênico (resíduos, agro)
BIOGENIC_CH4_SECTORS = {
    "solid-waste-disposal",
    "food-beverage-tobacco",
    "agriculture",
    "wastewater-treatment",
}


def ch4_kind(sector: str) -> str:
    return "ch4_biogenic" if sector in BIOGENIC_CH4_SECTORS else "ch4_fossil"


def co2e_breakdown(emissions_t: dict[str, float], sector: str) -> dict:
    """Decompõe emissões t/ano por gás em t CO₂e/ano com o fator usado.

    Gases sem GWP de aquecimento global direto mapeado (NO2, SO2, CO —
    poluentes/precursores) não entram no total e são listados à parte.
    """
    rows: list[dict] = []
    excluded: list[str] = []
    total = 0.0
    for gas, tons in sorted(emissions_t.items()):
        key = ch4_kind(sector) if gas == "ch4" else gas
        gwp = GWP100_AR6.get(key)
        if gwp is None:
            excluded.append(gas)
            continue
        co2e = tons * gwp
        total += co2e
        rows.append({"gas": gas, "tons": tons, "gwp_key": key, "gwp": gwp, "co2e_t": co2e})
    return {"rows": rows, "total_co2e_t": total, "excluded_gases": excluded}
