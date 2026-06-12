"""Climatologia móvel e detecção de anomalias (z-score) — funções puras.

Método: para cada ponto, a climatologia é a média dos `window` pontos
válidos ANTERIORES (nunca inclui o próprio ponto, para não mascarar a
anomalia que se quer detectar). z = (v − μ) / σ; anomalia se z ≥ z_thresh
com σ > 0 e pelo menos `min_history` pontos de histórico.
"""

import statistics

from app.domain.analysis import AnalyzedPoint, TimeseriesPoint

DEFAULT_WINDOW = 6
DEFAULT_Z_THRESHOLD = 2.0
MIN_HISTORY = 3


def analyze_series(
    points: list[TimeseriesPoint],
    window: int = DEFAULT_WINDOW,
    z_threshold: float = DEFAULT_Z_THRESHOLD,
    min_history: int = MIN_HISTORY,
) -> list[AnalyzedPoint]:
    ordered = sorted(points, key=lambda p: p.date)
    history: list[float] = []
    out: list[AnalyzedPoint] = []

    for p in ordered:
        climatology = zscore = None
        anomaly = False
        if p.value is not None and len(history) >= min_history:
            recent = history[-window:]
            mean = statistics.fmean(recent)
            std = statistics.pstdev(recent)
            climatology = mean
            if std > 0:
                zscore = (p.value - mean) / std
                anomaly = zscore >= z_threshold
        out.append(
            AnalyzedPoint(
                **p.model_dump(),
                climatology=climatology,
                zscore=zscore,
                anomaly=anomaly,
            )
        )
        if p.value is not None:
            history.append(p.value)

    return out
