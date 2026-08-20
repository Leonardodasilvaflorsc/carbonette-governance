/** Financiamento, depreciação fiscal e conversões real/nominal. */
import { crf, zeros } from "./util";

export interface ParcelaAnual {
  juros: number;
  amortizacao: number;
  saldoFinal: number;
}

/**
 * Cronograma de financiamento agregado por ano.
 *
 * As prestações são contratadas em valores nominais; como o motor trabalha em
 * moeda real, cada parcela é deflacionada pelo IPCA do mês correspondente.
 */
export function cronogramaFinanciamento(
  principal: number,
  jurosAA: number,
  prazoMeses: number,
  carenciaMeses: number,
  sistema: "SAC" | "PRICE",
  horizonteAnos: number,
  ipcaAA: number,
): ParcelaAnual[] {
  const anos: ParcelaAnual[] = Array.from({ length: horizonteAnos + 1 }, () => ({
    juros: 0,
    amortizacao: 0,
    saldoFinal: 0,
  }));
  if (principal <= 0 || prazoMeses <= 0) return anos;

  const im = Math.pow(1 + jurosAA / 100, 1 / 12) - 1;
  const ipm = Math.pow(1 + ipcaAA / 100, 1 / 12) - 1;
  const nAmort = Math.max(1, prazoMeses - carenciaMeses);
  let saldo = principal;

  const parcelaPrice =
    im === 0
      ? principal / nAmort
      : (principal * im) / (1 - Math.pow(1 + im, -nAmort));

  for (let mes = 1; mes <= prazoMeses; mes++) {
    const ano = Math.min(horizonteAnos, Math.ceil(mes / 12));
    const deflator = Math.pow(1 + ipm, mes);
    const juros = saldo * im;
    let amort = 0;
    if (mes > carenciaMeses) {
      amort = sistema === "SAC" ? principal / nAmort : parcelaPrice - juros;
      amort = Math.min(amort, saldo);
    }
    saldo -= amort;
    anos[ano].juros += juros / deflator;
    anos[ano].amortizacao += amort / deflator;
    anos[ano].saldoFinal = saldo;
  }
  return anos;
}

/** Depreciação fiscal linear, limitada ao horizonte de análise. */
export function depreciacaoLinear(
  base: number,
  anosFiscais: number,
  horizonteAnos: number,
): number[] {
  const v = zeros(horizonteAnos + 1);
  if (base <= 0 || anosFiscais <= 0) return v;
  const parcela = base / anosFiscais;
  for (let t = 1; t <= horizonteAnos && t <= anosFiscais; t++) v[t] = parcela;
  return v;
}

/** Custo anualizado de um CAPEX de infraestrutura ao longo de sua vida útil. */
export const anualizarCapex = (capex: number, wacc: number, vidaAnos: number) =>
  capex * crf(wacc, vidaAnos);
