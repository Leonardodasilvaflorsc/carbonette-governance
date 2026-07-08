/**
 * Termodinâmica da síntese de amônia (Haber-Bosch)
 *
 * N2 + 3 H2 <=> 2 NH3   (ΔH° = -91,8 kJ/mol N2)
 *
 * - Constante de equilíbrio: correlação de Gillespie & Beattie (1930)
 * - Coeficientes de fugacidade: correlações de Dyson & Simon (1968)
 * - Pressão de vapor da NH3: equação de Antoine (NIST)
 */

export const MW = {
  N2: 28.014, // kg/kmol
  H2: 2.016,
  NH3: 17.031,
  AR: 39.948,
  CH4: 16.043,
};

/** Entalpia de reação por mol de N2 convertido [kJ/mol] */
export const DELTA_H_RXN = -91.8;

/** Calor latente de vaporização da NH3 a -33 °C [kJ/kg] */
export const NH3_LATENT_HEAT = 1370;

/** cp médio do gás de síntese [kJ/(kmol·K)] */
export const CP_SYNGAS = 29.5;

/** Volume molar nas CNTP [Nm³/kmol] */
export const NM3_PER_KMOL = 22.414;

/**
 * Constante de equilíbrio Ka (base atividade) — Gillespie & Beattie.
 * ATENÇÃO: correlação para a meia-reação ½N2 + 3/2H2 <=> NH3 [atm⁻¹].
 * Para a reação completa usar Ka².
 * T em Kelvin.
 */
export function equilibriumKa(T: number): number {
  const log10Ka =
    -2.691122 * Math.log10(T) -
    5.519265e-5 * T +
    1.848863e-7 * T * T +
    2001.6 / T +
    2.6899;
  return Math.pow(10, log10Ka);
}

/** Coeficiente de fugacidade do H2 — Dyson & Simon (T em K, P em atm). */
function phiH2(T: number, P: number): number {
  const t1 = Math.exp(-3.8402 * Math.pow(T, 0.125) + 0.541) * P;
  const t2 = Math.exp(-0.1263 * Math.pow(T, 0.5) - 15.98) * P * P;
  const t3 =
    300 *
    Math.exp(-0.011901 * T - 5.941) *
    (Math.exp(-P / 300) - 1);
  return Math.exp(t1 - t2 + t3);
}

/** Coeficiente de fugacidade do N2 — Dyson & Simon. */
function phiN2(T: number, P: number): number {
  return (
    0.93431737 +
    0.3101804e-3 * T +
    0.295896e-3 * P -
    0.2707279e-6 * T * T +
    0.4775207e-6 * P * P
  );
}

/** Coeficiente de fugacidade da NH3 — Dyson & Simon. */
function phiNH3(T: number, P: number): number {
  return (
    0.1438996 +
    0.2028538e-2 * T -
    0.4487672e-3 * P -
    0.1142945e-5 * T * T +
    0.2761216e-6 * P * P
  );
}

/** Razão de coeficientes de fugacidade Kφ = φNH3² / (φN2 · φH2³). */
export function fugacityRatio(T: number, Pbar: number): number {
  const Patm = Pbar / 1.01325;
  const n2 = phiN2(T, Patm);
  const h2 = phiH2(T, Patm);
  const nh3 = phiNH3(T, Patm);
  return (nh3 * nh3) / (n2 * Math.pow(h2, 3));
}

export interface GasComposition {
  yN2: number;
  yH2: number;
  yNH3: number;
  yInert: number;
}

/**
 * Conversão de equilíbrio de N2 por passe.
 * Resolve  yNH3²/(yN2·yH2³) = Ka·P²/Kφ  por bissecção na extensão de reação.
 *
 * @param feed composição na entrada do leito
 * @param T temperatura [K]
 * @param Pbar pressão [bar]
 * @returns fração do N2 alimentado que converte no equilíbrio (0–1)
 */
export function equilibriumConversion(
  feed: GasComposition,
  T: number,
  Pbar: number,
): number {
  const Ka = equilibriumKa(T); // meia-reação [atm⁻¹]
  const Kphi = fugacityRatio(T, Pbar);
  const Patm = Pbar / 1.01325;
  // Reação completa: Ka² = Kφ · Ky · P⁻² → Ky = Ka²·P²/Kφ
  const target = (Ka * Ka * Patm * Patm) / Kphi;

  const { yN2, yH2, yNH3, yInert } = feed;
  // Base: 1 mol de gás. Extensão e = mols de N2 reagidos.
  const f = (e: number): number => {
    const total = 1 - 2 * e;
    const n2 = yN2 - e;
    const h2 = yH2 - 3 * e;
    const nh3 = yNH3 + 2 * e;
    if (n2 <= 0 || h2 <= 0 || total <= 0) return Number.POSITIVE_INFINITY;
    const q =
      (nh3 / total) ** 2 / ((n2 / total) * (h2 / total) ** 3);
    return q - target;
  };

  const eMax = Math.min(yN2, yH2 / 3) * 0.9999;
  let lo = 0;
  let hi = eMax;
  if (f(0) >= 0) return 0; // já além do equilíbrio
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  const e = 0.5 * (lo + hi);
  void yInert;
  return e / feed.yN2;
}

/**
 * Fração molar de NH3 no equilíbrio para alimentação estequiométrica
 * (usada nas curvas de sensibilidade).
 */
export function equilibriumNH3Fraction(
  T: number,
  Pbar: number,
  yInert = 0,
): number {
  const base: GasComposition = {
    yN2: 0.25 * (1 - yInert),
    yH2: 0.75 * (1 - yInert),
    yNH3: 0,
    yInert,
  };
  const x = equilibriumConversion(base, T, Pbar);
  const e = x * base.yN2;
  return (2 * e) / (1 - 2 * e);
}

/**
 * Pressão de vapor da amônia [bar] — Antoine (NIST, 239–371 K).
 */
export function nh3VaporPressure(T: number): number {
  const A = 4.86886;
  const B = 1113.928;
  const C = -10.409;
  return Math.pow(10, A - B / (T + C));
}

/**
 * Trabalho de compressão adiabática multiestágio com resfriamento
 * intermediário [kW].
 *
 * @param flowKmolH vazão molar [kmol/h]
 * @param T1 temperatura de sucção [K]
 * @param P1 pressão de sucção [bar]
 * @param P2 pressão de descarga [bar]
 * @param etaPoly eficiência politrópica
 */
export function compressionPower(
  flowKmolH: number,
  T1: number,
  P1: number,
  P2: number,
  etaPoly = 0.78,
): { powerKW: number; stages: number } {
  if (P2 <= P1 || flowKmolH <= 0) return { powerKW: 0, stages: 0 };
  const R = 8.314; // kJ/(kmol·K)
  const gamma = 1.4;
  const maxRatioPerStage = 2.6;
  const stages = Math.max(
    1,
    Math.ceil(Math.log(P2 / P1) / Math.log(maxRatioPerStage)),
  );
  const rStage = Math.pow(P2 / P1, 1 / stages);
  const k = (gamma - 1) / gamma;
  const wPerStage =
    (R * T1 * (Math.pow(rStage, k) - 1)) / k / etaPoly; // kJ/kmol
  const etaMech = 0.97;
  const powerKW = (flowKmolH * wPerStage * stages) / 3600 / etaMech;
  return { powerKW, stages };
}
