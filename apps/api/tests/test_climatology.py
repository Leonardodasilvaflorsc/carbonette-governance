from datetime import date

from app.analysis.climatology import analyze_series
from app.domain.analysis import TimeseriesPoint


def series(values: list[float | None]) -> list[TimeseriesPoint]:
    return [
        TimeseriesPoint(date=date(2025, (i % 12) + 1, 1), value=v, unit="ppb")
        for i, v in enumerate(values)
    ]


def test_flags_spike_against_rolling_baseline():
    values = [1880.0, 1882.0, 1879.0, 1881.0, 1880.0, 1960.0, 1881.0]
    out = analyze_series(series(values))
    spike = out[5]
    assert spike.anomaly is True
    assert spike.zscore is not None and spike.zscore > 2
    assert spike.climatology is not None and 1879 <= spike.climatology <= 1882
    # o ponto seguinte volta ao normal e não é anômalo
    assert out[6].anomaly is False


def test_needs_minimum_history():
    out = analyze_series(series([1880.0, 2100.0, 2100.0]))
    # sem histórico mínimo, nada de z-score (evita falsos positivos no início)
    assert all(p.zscore is None for p in out)
    assert all(p.anomaly is False for p in out)


def test_gaps_are_preserved_not_interpolated():
    values = [1880.0, 1881.0, 1882.0, None, 1960.0]
    out = analyze_series(series(values))
    assert out[3].value is None and out[3].anomaly is False
    # o spike após a lacuna ainda é detectado com o histórico válido
    assert out[4].anomaly is True


def test_constant_series_has_no_anomalies():
    out = analyze_series(series([1880.0] * 8))
    assert all(p.anomaly is False for p in out)
