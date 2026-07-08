/**
 * Análise econômica da planta — LCOA/LCOU (custo nivelado), OPEX,
 * receita, EBITDA e payback.
 *
 * Metodologia: custo nivelado = (CAPEX × FRC + OPEX fixo)/produção anual
 * + custos variáveis por tonelada. FRC = fator de recuperação de capital.
 */

import { PlantResults } from "./simulation";

/** Taxa de desconto real (WACC) */
export const DISCOUNT_RATE = 0.08;
/** Vida útil econômica [anos] */
export const PLANT_LIFE_YEARS = 25;
/** OPEX fixo anual como fração do CAPEX (O&M + seguros + pessoal) */
const FIXED_OPEX_FRACTION = 0.03;
/** Preço do gás natural [USD/GJ] */
const NATGAS_USD_PER_GJ = 4.5;
/** Catalisadores, químicos e consumíveis [USD/t produto] */
const CONSUMABLES_USD_PER_T = 4;
/** Água bruta + tratamento [USD/m³] */
const WATER_USD_PER_M3 = 0.8;
/** CO2 importado para ureia verde [USD/t CO2] */
const CO2_USD_PER_T = 35;

export interface CostItem {
  id: string;
  label: string;
  usdPerT: number;
}

export interface EconomicsResults {
  /** Custo nivelado do produto [USD/t] */
  levelizedCostUSDPerT: number;
  breakdown: CostItem[];
  /** Fator de recuperação de capital */
  crf: number;
  annualProductionT: number;
  annualRevenueMUSD: number;
  annualCostMUSD: number;
  ebitdaMUSD: number;
  /** Margem sobre a receita */
  ebitdaMargin: number;
  /** Payback simples [anos]; Infinity se EBITDA <= 0 */
  paybackYears: number;
  /** Valor presente líquido [MUSD] */
  npvMUSD: number;
}

/** Fator de recuperação de capital. */
export function capitalRecoveryFactor(
  rate = DISCOUNT_RATE,
  years = PLANT_LIFE_YEARS,
): number {
  const f = Math.pow(1 + rate, years);
  return (rate * f) / (f - 1);
}

/**
 * Calcula a economia da planta a partir dos resultados da simulação.
 * @param electricityUSDPerMWh permite sobrepor a tarifa (curvas de
 * sensibilidade) sem re-simular o processo.
 */
export function computeEconomics(
  r: PlantResults,
  electricityUSDPerMWh = r.inputs.electricityUSDPerMWh,
): EconomicsResults {
  const annualProductionT = r.productTPerYear;
  const hoursPerYear = 365 * 24 * 0.92;
  const crf = capitalRecoveryFactor();

  // --- custos por tonelada de produto final ---
  const electricityUSDPerT =
    (r.totalElectricMW * hoursPerYear * electricityUSDPerMWh) /
    annualProductionT;
  const natGasUSDPerT =
    (r.natGasGJH * hoursPerYear * NATGAS_USD_PER_GJ) / annualProductionT;
  const waterUSDPerT =
    (r.waterM3H * hoursPerYear * WATER_USD_PER_M3) / annualProductionT;
  const co2USDPerT =
    r.urea && r.inputs.h2Source !== "smr"
      ? ((r.urea.co2KgH / 1000) * hoursPerYear * CO2_USD_PER_T) /
        annualProductionT
      : 0;
  const capitalUSDPerT = (r.capexMUSD * 1e6 * crf) / annualProductionT;
  const fixedOpexUSDPerT =
    (r.capexMUSD * 1e6 * FIXED_OPEX_FRACTION) / annualProductionT;

  const breakdown: CostItem[] = [
    { id: "capital", label: "Capital (CAPEX × FRC)", usdPerT: capitalUSDPerT },
    { id: "electricity", label: "Energia elétrica", usdPerT: electricityUSDPerT },
    ...(natGasUSDPerT > 0
      ? [{ id: "natgas", label: "Gás natural", usdPerT: natGasUSDPerT }]
      : []),
    ...(co2USDPerT > 0
      ? [{ id: "co2", label: "CO₂ importado (ureia verde)", usdPerT: co2USDPerT }]
      : []),
    { id: "fixed", label: "OPEX fixo (O&M, pessoal, seguros)", usdPerT: fixedOpexUSDPerT },
    { id: "consumables", label: "Catalisadores e consumíveis", usdPerT: CONSUMABLES_USD_PER_T },
    { id: "water", label: "Água", usdPerT: waterUSDPerT },
  ];

  const levelizedCostUSDPerT = breakdown.reduce((s, b) => s + b.usdPerT, 0);

  // --- fluxo anual ---
  const annualRevenueMUSD =
    (annualProductionT * r.inputs.productPriceUSDPerT) / 1e6;
  const cashCostUSDPerT = levelizedCostUSDPerT - capitalUSDPerT;
  const annualCostMUSD = (annualProductionT * cashCostUSDPerT) / 1e6;
  const ebitdaMUSD = annualRevenueMUSD - annualCostMUSD;
  const ebitdaMargin = annualRevenueMUSD > 0 ? ebitdaMUSD / annualRevenueMUSD : 0;
  const paybackYears =
    ebitdaMUSD > 0 ? r.capexMUSD / ebitdaMUSD : Number.POSITIVE_INFINITY;

  // NPV: -CAPEX + EBITDA anuidade descontada
  const npvMUSD = -r.capexMUSD + ebitdaMUSD / crf;

  return {
    levelizedCostUSDPerT,
    breakdown,
    crf,
    annualProductionT,
    annualRevenueMUSD,
    annualCostMUSD,
    ebitdaMUSD,
    ebitdaMargin,
    paybackYears,
    npvMUSD,
  };
}
