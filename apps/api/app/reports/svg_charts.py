"""Gráficos SVG gerados no servidor para o dossiê (sem dependências).

WeasyPrint renderiza SVG inline — gráficos ficam vetoriais no PDF.
"""

from xml.sax.saxutils import escape


def scatter_with_error_bars(
    points: list[tuple[str, float, float]],  # (rótulo, valor, incerteza)
    width: int = 640,
    height: int = 220,
    unit: str = "kg/h",
    color: str = "#1FB6A6",
) -> str:
    """Dispersão com barras de erro (ex.: fluxo de plumas por data)."""
    if not points:
        return ""
    pad_l, pad_r, pad_t, pad_b = 56, 16, 12, 34
    plot_w, plot_h = width - pad_l - pad_r, height - pad_t - pad_b

    vmax = max(v + u for _, v, u in points) * 1.15
    vmin = 0.0

    def x(i: int) -> float:
        n = len(points)
        return pad_l + (plot_w / 2 if n == 1 else i * plot_w / (n - 1))

    def y(v: float) -> float:
        return pad_t + plot_h * (1 - (v - vmin) / (vmax - vmin))

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" font-family="Helvetica, Arial, sans-serif">'
    ]
    # eixo y: 4 linhas de grade com rótulo
    for k in range(5):
        v = vmin + (vmax - vmin) * k / 4
        yy = y(v)
        parts.append(
            f'<line x1="{pad_l}" y1="{yy:.1f}" x2="{width - pad_r}" y2="{yy:.1f}" '
            f'stroke="#D8DEE6" stroke-width="0.6"/>'
            f'<text x="{pad_l - 6}" y="{yy + 3:.1f}" text-anchor="end" font-size="8" '
            f'fill="#5A6472">{v:,.0f}</text>'
        )
    for i, (label, value, unc) in enumerate(points):
        xx = x(i)
        parts.append(
            f'<line x1="{xx:.1f}" y1="{y(value + unc):.1f}" x2="{xx:.1f}" '
            f'y2="{y(max(value - unc, 0)):.1f}" stroke="{color}" stroke-width="1.2"/>'
            f'<circle cx="{xx:.1f}" cy="{y(value):.1f}" r="3.5" fill="{color}"/>'
            f'<text x="{xx:.1f}" y="{height - pad_b + 14}" text-anchor="middle" '
            f'font-size="8" fill="#5A6472">{escape(label)}</text>'
        )
    parts.append(
        f'<text x="{pad_l}" y="{pad_t - 2}" font-size="8" fill="#5A6472">{escape(unit)}</text>'
    )
    parts.append("</svg>")
    return "".join(parts)


def bar_chart(
    bars: list[tuple[str, float]],
    highlight_label: str | None = None,
    width: int = 640,
    height: int = 220,
    unit: str = "t CO₂e/ano",
    color: str = "#9AA6B5",
    highlight_color: str = "#1FB6A6",
) -> str:
    """Barras horizontais (ex.: benchmark setorial com a instalação destacada)."""
    if not bars:
        return ""
    pad_l, pad_r, row_h = 200, 70, max(18, min(30, (height - 30) // len(bars)))
    vmax = max(v for _, v in bars) or 1.0
    plot_w = width - pad_l - pad_r

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" '
        f'height="{30 + row_h * len(bars)}" font-family="Helvetica, Arial, sans-serif">'
    ]
    for i, (label, value) in enumerate(bars):
        yy = 15 + i * row_h
        fill = highlight_color if label == highlight_label else color
        bw = plot_w * value / vmax
        short = label if len(label) <= 34 else label[:33] + "…"
        parts.append(
            f'<text x="{pad_l - 8}" y="{yy + row_h / 2 + 3}" text-anchor="end" font-size="8.5" '
            f'fill="#33404F">{escape(short)}</text>'
            f'<rect x="{pad_l}" y="{yy + 3}" width="{bw:.1f}" height="{row_h - 8}" '
            f'fill="{fill}" rx="2"/>'
            f'<text x="{pad_l + bw + 5:.1f}" y="{yy + row_h / 2 + 3}" font-size="8" '
            f'fill="#5A6472">{value:,.0f}</text>'
        )
    parts.append(
        f'<text x="{pad_l}" y="{12}" font-size="8" fill="#5A6472">{escape(unit)}</text>'
    )
    parts.append("</svg>")
    return "".join(parts)
