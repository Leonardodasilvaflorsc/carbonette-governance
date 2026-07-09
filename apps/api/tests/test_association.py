from datetime import UTC, datetime

from app.analysis.association import associate_plume, haversine_km
from app.domain.facilities import FacilityRecord
from app.domain.plumes import Plume


def facility(fid: str, sector: str, lon: float, lat: float) -> FacilityRecord:
    return FacilityRecord(
        id=fid, name=fid, sector=sector, country="BRA", lon=lon, lat=lat,
        ref_year=2024, emissions={}, co2e_t=None, data_source="dev-fixture",
    )


def plume(lon: float, lat: float, gas: str = "CH4") -> Plume:
    return Plume(
        id="p1", source="dev-fixture", gas=gas, lon=lon, lat=lat,
        observed_at=datetime(2026, 5, 1, tzinfo=UTC),
    )


def test_haversine_sanity():
    assert haversine_km(-48.85, -26.30, -48.85, -26.30) == 0
    # ~1 grau de latitude ≈ 111 km
    assert abs(haversine_km(0, 0, 0, 1) - 111.2) < 1


def test_sector_affinity_beats_raw_distance():
    landfill = facility("aterro", "solid-waste-disposal", -48.920, -26.250)  # ~1,1 km
    warehouse = facility("galpao", "manufacturing", -48.910, -26.245)  # ~0,6 km
    p = plume(-48.916, -26.247, gas="CH4")
    # o galpão é mais perto, mas aterro é fonte plausível de CH4
    assert associate_plume(p, [landfill, warehouse]) == "aterro"


def test_no_association_beyond_max_distance():
    far = facility("longe", "solid-waste-disposal", -49.5, -26.9)
    assert associate_plume(plume(-48.916, -26.247), [far]) is None


def test_nearest_wins_within_same_affinity():
    a = facility("a", "solid-waste-disposal", -48.918, -26.248)
    b = facility("b", "solid-waste-disposal", -48.940, -26.270)
    assert associate_plume(plume(-48.916, -26.247), [a, b]) == "a"
