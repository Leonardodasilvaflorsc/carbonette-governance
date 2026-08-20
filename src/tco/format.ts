/** Formatação pt-BR para a interface (separador de milhar ponto, decimal vírgula). */
export const nf = (v: number, dec = 2): string =>
  !isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const moeda = (v: number, dec = 0): string =>
  !isFinite(v) ? "—" : `R$ ${nf(v, dec)}`;

/** Valores grandes em notação compacta para cartões e eixos de gráfico. */
export const moedaCompacta = (v: number): string => {
  if (!isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${nf(v / 1e6, 2)} mi`;
  if (a >= 1e3) return `R$ ${nf(v / 1e3, 0)} mil`;
  return `R$ ${nf(v, 0)}`;
};

export const pct = (v: number, dec = 1): string => `${nf(v, dec)}%`;

export const inteiro = (v: number): string => nf(v, 0);
