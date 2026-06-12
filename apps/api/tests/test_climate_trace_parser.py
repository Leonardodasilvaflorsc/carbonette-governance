from app.providers.climate_trace import parse_assets_response

V6_STYLE = {
    "assets": [
        {
            "Id": 1234,
            "Name": "Usina Siderúrgica Exemplo",
            "Sector": "steel",
            "Country": "BRA",
            "Centroid": {"Geometry": [-44.104, -22.523]},
            "EmissionsSummary": [
                {"Gas": "co2", "EmissionsQuantity": 6900000.0},
                {"Gas": "ch4", "EmissionsQuantity": 900.0},
                {"Gas": "co2e_100yr", "EmissionsQuantity": 6926820.0},
            ],
        },
        {
            # sem centroide → deve ser ignorado, não quebrar
            "Id": 99,
            "Name": "Asset sem coordenada",
            "Sector": "cement",
        },
    ]
}

SNAKE_STYLE = {
    "data": [
        {
            "asset_id": "abc",
            "asset_name": "Aterro Exemplo",
            "sector_name": "solid-waste-disposal",
            "iso3_country": "BRA",
            "lon": -48.918,
            "lat": -26.248,
            "Emissions": [{"gas": "ch4", "quantity": 9800.0}],
        }
    ]
}


def test_parses_pascalcase_v6_assets():
    records = parse_assets_response(V6_STYLE, "climate-trace-v6", 2024)
    assert len(records) == 1  # o asset sem coordenada é descartado
    r = records[0]
    assert r.id == "ct-1234"
    assert r.sector == "steel"
    assert r.lon == -44.104 and r.lat == -22.523
    assert r.emissions == {"co2": 6900000.0, "ch4": 900.0}
    assert r.co2e_t == 6926820.0  # co2e vai para o campo de ranking, não para o dict de gases


def test_parses_snakecase_variant():
    records = parse_assets_response(SNAKE_STYLE, "climate-trace-v6", 2024)
    assert len(records) == 1
    r = records[0]
    assert r.id == "ct-abc"
    assert r.emissions == {"ch4": 9800.0}
    assert r.co2e_t is None
    assert r.ref_year == 2024


def test_empty_payload_is_safe():
    assert parse_assets_response({}, "climate-trace-v6", 2024) == []
