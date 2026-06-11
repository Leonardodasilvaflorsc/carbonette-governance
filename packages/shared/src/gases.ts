/**
 * Gases rastreados pela plataforma.
 *
 * Regra científica central (seção 7 do plano): concentração de coluna
 * (molec/cm² ou ppb) NUNCA é apresentada como emissão (kg/h ou t/ano).
 * Os tipos abaixo carregam a unidade para tornar essa distinção explícita
 * em todo o código.
 */
export const GASES = ["CH4", "CO2", "NO2", "SO2", "CO"] as const;
export type Gas = (typeof GASES)[number];

export const GAS_LABELS: Record<Gas, string> = {
  CH4: "Metano (CH₄)",
  CO2: "Dióxido de carbono (CO₂)",
  NO2: "Dióxido de nitrogênio (NO₂)",
  SO2: "Dióxido de enxofre (SO₂)",
  CO: "Monóxido de carbono (CO)",
};

/** Unidades de CONCENTRAÇÃO de coluna (sensoriamento remoto). */
export type ColumnUnit = "molec/cm2" | "ppb" | "mol/m2";

/** Unidades de FLUXO/EMISSÃO (quantificação). */
export type FluxUnit = "kg/h" | "t/ano";

/**
 * GWP100 — IPCC AR6 (usado nas conversões para CO₂e do dossiê, FASE 5).
 * CH₄ fóssil ≠ biogênico por definição do AR6.
 */
export const GWP100_AR6 = {
  CH4_FOSSIL: 29.8,
  CH4_BIOGENIC: 27.2,
  CO2: 1,
} as const;
