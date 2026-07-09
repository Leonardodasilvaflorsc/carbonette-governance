"""Fixture de desenvolvimento offline do Atlas de Emissores.

REGRA: estes valores são ORDENS DE GRANDEZA PLAUSÍVEIS para desenvolvimento
de interface, NÃO dados reais — ``data_source="dev-fixture"`` é exibido na
UI e nunca deve chegar a um dossiê. A fonte real é o Climate TRACE
(provider ao lado), sincronizado quando há rede.

Instalações são lugares reais conhecidos (nomes/coordenadas aproximados)
concentrados em SC/Brasil para exercitar o critério de aceite da FASE 2
(busca por Joinville e ranking de SC).
"""

from app.domain.facilities import FacilityRecord

_FIXTURE = [
    # --- região de Joinville/Norte de SC ---
    ("fx-joi-foundry", "Fundição de grande porte — Joinville", "steel", -48.872, -26.272, {"co2": 310_000.0}, 310_000.0),
    ("fx-joi-landfill", "Aterro sanitário — Joinville", "solid-waste-disposal", -48.918, -26.248, {"ch4": 9_800.0}, 266_560.0),
    ("fx-joi-metal", "Metalurgia — Distrito Industrial Joinville", "steel", -48.851, -26.252, {"co2": 120_000.0}, 120_000.0),
    ("fx-sfs-port", "Terminal portuário — São Francisco do Sul", "oil-and-gas-transport", -48.632, -26.236, {"ch4": 1_400.0, "co2": 45_000.0}, 86_720.0),
    ("fx-jgs-motor", "Planta eletrometalmecânica — Jaraguá do Sul", "manufacturing", -49.072, -26.486, {"co2": 95_000.0}, 95_000.0),
    # --- demais SC ---
    ("fx-cap-coal", "Complexo termelétrico a carvão — Capivari de Baixo", "power", -48.957, -28.445, {"co2": 4_600_000.0, "ch4": 520.0}, 4_615_496.0),
    ("fx-imb-cement", "Cimenteira — Imbituba", "cement", -48.670, -28.240, {"co2": 780_000.0}, 780_000.0),
    ("fx-cri-ceramic", "Polo cerâmico — Criciúma", "manufacturing", -49.369, -28.677, {"co2": 210_000.0}, 210_000.0),
    ("fx-lag-landfill", "Aterro regional — Laguna", "solid-waste-disposal", -48.781, -28.482, {"ch4": 4_200.0}, 114_240.0),
    ("fx-itj-port", "Complexo portuário — Itajaí/Navegantes", "oil-and-gas-transport", -48.661, -26.901, {"co2": 88_000.0, "ch4": 600.0}, 105_880.0),
    ("fx-blu-textile", "Parque têxtil — Blumenau", "manufacturing", -49.066, -26.919, {"co2": 130_000.0}, 130_000.0),
    ("fx-cha-agro", "Frigorífico e agroindústria — Chapecó", "food-beverage-tobacco", -52.618, -27.096, {"ch4": 6_500.0, "co2": 70_000.0}, 246_800.0),
    # --- fora de SC, para o globo não ficar vazio ---
    ("fx-cub-steel", "Siderúrgica integrada — Cubatão (SP)", "steel", -46.425, -23.870, {"co2": 5_200_000.0, "ch4": 900.0}, 5_226_820.0),
    ("fx-vol-steel", "Usina siderúrgica — Volta Redonda (RJ)", "steel", -44.104, -22.523, {"co2": 6_900_000.0}, 6_900_000.0),
    ("fx-pau-refinery", "Refinaria — Paulínia (SP)", "oil-and-gas-refining", -47.137, -22.729, {"co2": 3_100_000.0, "ch4": 2_400.0}, 3_171_520.0),
    ("fx-sp-landfill", "Aterro metropolitano — Grande São Paulo", "solid-waste-disposal", -46.467, -23.452, {"ch4": 28_000.0}, 761_600.0),
]


def fixture_facilities(ref_year: int = 2024) -> list[FacilityRecord]:
    return [
        FacilityRecord(
            id=fid,
            name=name,
            sector=sector,
            country="BRA",
            lon=lon,
            lat=lat,
            ref_year=ref_year,
            emissions=emissions,
            co2e_t=co2e,
            data_source="dev-fixture",
        )
        for fid, name, sector, lon, lat, emissions, co2e in _FIXTURE
    ]


class MockFacilityProvider:
    def __init__(self, ref_year: int = 2024):
        self.ref_year = ref_year

    async def fetch_facilities(self, countries: list[str], year: int) -> list[FacilityRecord]:
        return [f for f in fixture_facilities(year) if f.country in countries]
