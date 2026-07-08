/**
 * Simulador de planta de amônia (fertilizante nitrogenado)
 *
 * Fluxo geral:
 *   ASU (N2) ─┐
 *             ├─> compressão de make-up ─> loop de síntese (Haber-Bosch)
 *   H2 ───────┘        (reator 3 leitos, resfriador, separador, reciclo, purga)
 *
 * O loop de síntese é resolvido por iteração de ponto fixo até convergência
 * do balanço de massa com purga controlando o acúmulo de inertes.
 */

import {
  MW,
  DELTA_H_RXN,
  NH3_LATENT_HEAT,
  CP_SYNGAS,
  NM3_PER_KMOL,
  GasComposition,
  equilibriumConversion,
  nh3VaporPressure,
  compressionPower,
} from "./thermo";

export type H2Source = "pem" | "alkaline" | "soec" | "smr";

export interface PlantInputs {
  /** Capacidade nominal de produção [t NH3/dia] */
  capacityTpd: number;
  /** Tecnologia de geração de H2 */
  h2Source: H2Source;
  /** Pressão do loop de síntese [bar] */
  loopPressureBar: number;
  /** Temperatura média dos leitos do reator [°C] */
  reactorTempC: number;
  /** Temperatura de condensação no separador [°C] */
  separatorTempC: number;
  /** Fração de purga do reciclo (0–0.12) */
  purgeFraction: number;
  /** Aproximação ao equilíbrio no reator (0.6–0.95) */
  equilibriumApproach: number;
  /** Tarifa de energia elétrica [USD/MWh] */
  electricityUSDPerMWh: number;
  /** Produto final da planta */
  finalProduct: FinalProduct;
  /** Preço de venda do produto final [USD/t] */
  productPriceUSDPerT: number;
}

export type FinalProduct = "nh3" | "urea";

export const FINAL_PRODUCT_INFO: Record<
  FinalProduct,
  { label: string; note: string }
> = {
  nh3: {
    label: "Amônia anidra (NH₃)",
    note: "Produto intermediário — venda direta ou matéria-prima",
  },
  urea: {
    label: "Ureia granulada",
    note: "2 NH₃ + CO₂ → ureia — processo de stripping de CO₂ + granulação",
  },
};

export const DEFAULT_INPUTS: PlantInputs = {
  capacityTpd: 300,
  h2Source: "pem",
  loopPressureBar: 200,
  reactorTempC: 450,
  separatorTempC: -10,
  purgeFraction: 0.03,
  equilibriumApproach: 0.85,
  electricityUSDPerMWh: 42,
  finalProduct: "nh3",
  productPriceUSDPerT: 550,
};

export const H2_SOURCE_INFO: Record<
  H2Source,
  { label: string; specKWhPerKgH2: number; inertFraction: number; note: string }
> = {
  pem: {
    label: "Eletrólise PEM",
    specKWhPerKgH2: 53,
    inertFraction: 0.002,
    note: "H2 verde — membrana polimérica, 30 bar na saída",
  },
  alkaline: {
    label: "Eletrólise Alcalina",
    specKWhPerKgH2: 50,
    inertFraction: 0.003,
    note: "H2 verde — KOH 30%, menor CAPEX por MW",
  },
  soec: {
    label: "Eletrólise SOEC",
    specKWhPerKgH2: 40,
    inertFraction: 0.003,
    note: "Óxido sólido, alta eficiência com integração térmica",
  },
  smr: {
    label: "Reforma a Vapor (SMR)",
    specKWhPerKgH2: 1.2,
    inertFraction: 0.012,
    note: "H2 cinza — CH4 + H2O, energia principal via gás natural",
  },
};

/** Consumo específico da ASU criogênica [kWh/kg N2] */
const ASU_KWH_PER_KG_N2 = 0.11;
/** Consumo de gás natural do SMR [GJ/t NH3] (base PCI, inclui queima) */
const SMR_GJ_PER_T_NH3 = 26.5;
/** COP do ciclo de refrigeração de NH3 */
const REFRIG_COP = 1.9;
/** Água desmineralizada para eletrólise [L/kg H2] */
const DEMIN_WATER_L_PER_KG_H2 = 10;

export interface Stream {
  id: string;
  name: string;
  kmolH: number;
  kgH: number;
  nm3H: number;
  pressureBar: number;
  tempC: number;
  composition: GasComposition;
}

export interface EnergyItem {
  id: string;
  label: string;
  area: string;
  powerMW: number;
  type: "electric" | "thermal-in" | "thermal-out";
}

export interface EquipmentItem {
  tag: string;
  name: string;
  discipline: "mecânica" | "elétrica" | "civil" | "instrumentação";
  spec: string;
  value: string;
}

export interface UreaResults {
  ureaKgH: number;
  co2KgH: number;
  electricMW: number;
  steamTH: number;
  co2Source: string;
}

export interface PlantResults {
  inputs: PlantInputs;
  converged: boolean;
  // Produção
  nh3KgH: number;
  nh3TPerDay: number;
  nh3TPerYear: number;
  // Produto final (NH3 ou ureia)
  productKgH: number;
  productTPerDay: number;
  productTPerYear: number;
  urea: UreaResults | null;
  // Consumo de matérias-primas
  h2KgH: number;
  n2KgH: number;
  waterM3H: number;
  natGasGJH: number;
  // Loop de síntese
  perPassConversion: number;
  overallConversion: number;
  recycleRatio: number;
  loopFlowKmolH: number;
  loopInertFraction: number;
  nh3AtReactorOutlet: number;
  separatorNH3Slip: number;
  // Energia
  energyItems: EnergyItem[];
  totalElectricMW: number;
  reactionHeatMW: number;
  steamCreditMW: number;
  specificEnergyMWhPerT: number;
  energyCostUSDPerT: number;
  co2AvoidedTPerYear: number;
  // Correntes principais
  streams: Stream[];
  // Engenharia
  equipment: EquipmentItem[];
  reactorDesign: ReactorDesign;
  civil: CivilDesign;
  electrical: ElectricalDesign;
  capexMUSD: number;
}

export interface ReactorDesign {
  catalystVolumeM3: number;
  beds: number;
  innerDiameterM: number;
  lengthM: number;
  wallThicknessMm: number;
  designPressureBar: number;
  shellMassT: number;
  material: string;
}

export interface CivilDesign {
  totalAreaM2: number;
  processAreaM2: number;
  tankFarmAreaM2: number;
  concreteM3: number;
  structuralSteelT: number;
  pilingCount: number;
  storageTankM3: number;
}

export interface ElectricalDesign {
  installedMW: number;
  demandMVA: number;
  mainVoltageKV: number;
  transformers: string;
  largestMotorKW: number;
  emergencyGenMVA: number;
}

/** Resolve o loop de síntese e retorna o balanço completo da planta. */
export function simulatePlant(inputs: PlantInputs): PlantResults {
  const {
    capacityTpd,
    h2Source,
    loopPressureBar,
    reactorTempC,
    separatorTempC,
    purgeFraction,
    equilibriumApproach,
    electricityUSDPerMWh,
  } = inputs;

  const T = reactorTempC + 273.15;
  const Tsep = separatorTempC + 273.15;
  const h2Info = H2_SOURCE_INFO[h2Source];

  // ------------------------------------------------------------------
  // 1. Meta de produção
  // ------------------------------------------------------------------
  const nh3KgH = (capacityTpd * 1000) / 24;
  const nh3KmolH = nh3KgH / MW.NH3;

  // ------------------------------------------------------------------
  // 2. Loop de síntese — iteração de ponto fixo
  //    Incógnita: vazão e composição do gás na entrada do reator.
  // ------------------------------------------------------------------
  // NH3 residual no gás de reciclo (equilíbrio líquido-vapor no separador)
  const nh3Slip = Math.min(
    0.08,
    nh3VaporPressure(Tsep) / loopPressureBar,
  );

  // Make-up estequiométrico necessário será ajustado pela conversão global
  let makeupKmolH = nh3KmolH * 2.2; // chute inicial (N2+3H2 por 2 NH3 + perdas)
  let comp: GasComposition = {
    yN2: 0.24,
    yH2: 0.72,
    yNH3: nh3Slip,
    yInert: 0.04 - nh3Slip > 0 ? 0.04 - nh3Slip : 0.01,
  };
  let loopIn = makeupKmolH * 4;
  let perPass = 0.25;
  let converged = false;
  let makeupN2KmolH = makeupKmolH * 0.25;
  let makeupH2KmolH = makeupKmolH * 0.75;

  const inertInMakeup = h2Info.inertFraction + 0.003; // eletrólise/SMR + Ar da ASU

  for (let iter = 0; iter < 3000; iter++) {
    // Reator: conversão por passe = aproximação × equilíbrio
    const xEq = equilibriumConversion(comp, T, loopPressureBar);
    perPass = Math.max(0.02, equilibriumApproach * xEq);

    const n2In = loopIn * comp.yN2;
    const h2In = loopIn * comp.yH2;
    const nh3In = loopIn * comp.yNH3;
    const inertIn = loopIn * comp.yInert;

    const n2Reacted = n2In * perPass;
    const outN2 = n2In - n2Reacted;
    const outH2 = h2In - 3 * n2Reacted;
    const outNH3 = nh3In + 2 * n2Reacted;
    const outTotal = outN2 + outH2 + outNH3 + inertIn;

    // Separador: condensa NH3 até a fração de escape (slip)
    const gasAfterSepNH3 =
      (nh3Slip * (outN2 + outH2 + inertIn)) / (1 - nh3Slip);
    const nh3Condensed = Math.max(0, outNH3 - gasAfterSepNH3);
    const recycleGas = outTotal - nh3Condensed;

    // Purga
    const purge = recycleGas * purgeFraction;
    const recycle = recycleGas - purge;

    // Make-up para repor N2/H2 consumidos + perdas na purga
    const yN2r = outN2 / recycleGas;
    const yH2r = outH2 / recycleGas;
    const yNH3r = gasAfterSepNH3 / recycleGas;
    const yIr = inertIn / recycleGas;

    // Make-up: H2 repõe consumo + purga; N2 é controlado para manter a
    // razão H2:N2 = 3 na entrada do reator (malha de controle da planta —
    // sem essa âncora a razão do loop tem estabilidade neutra e deriva).
    const makeupH2 = 3 * n2Reacted + purge * yH2r;
    const makeupN2 = Math.max(
      0,
      (recycle * yH2r + makeupH2) / 3 - recycle * yN2r,
    );
    const makeupInert = (makeupN2 + makeupH2) * inertInMakeup;
    const newMakeup = makeupN2 + makeupH2 + makeupInert;

    // Nova entrada do reator = reciclo + make-up (com amortecimento 0,5
    // para estabilizar a iteração de ponto fixo)
    const newLoopIn = recycle + newMakeup;
    const damp = 0.5;
    const rawComp: GasComposition = {
      yN2: (recycle * yN2r + makeupN2) / newLoopIn,
      yH2: (recycle * yH2r + makeupH2) / newLoopIn,
      yNH3: (recycle * yNH3r) / newLoopIn,
      yInert: (recycle * yIr + makeupInert) / newLoopIn,
    };
    const newComp: GasComposition = {
      yN2: comp.yN2 + damp * (rawComp.yN2 - comp.yN2),
      yH2: comp.yH2 + damp * (rawComp.yH2 - comp.yH2),
      yNH3: comp.yNH3 + damp * (rawComp.yNH3 - comp.yNH3),
      yInert: comp.yInert + damp * (rawComp.yInert - comp.yInert),
    };

    // Escala do loop para produzir exatamente nh3KmolH condensada
    const scale = nh3KmolH / Math.max(nh3Condensed, 1e-9);
    const scaledLoopIn = newLoopIn * scale;

    const deltaComp =
      Math.abs(newComp.yN2 - comp.yN2) +
      Math.abs(newComp.yH2 - comp.yH2) +
      Math.abs(newComp.yNH3 - comp.yNH3) +
      Math.abs(newComp.yInert - comp.yInert);
    const deltaFlow = Math.abs(scaledLoopIn - loopIn) / scaledLoopIn;

    comp = newComp;
    loopIn = scaledLoopIn;
    makeupKmolH = newMakeup * scale;
    makeupN2KmolH = makeupN2 * scale;
    makeupH2KmolH = makeupH2 * scale;

    if (deltaComp < 1e-6 && deltaFlow < 1e-6) {
      converged = true;
      break;
    }
  }

  // Valores finais do loop convergido
  const n2InLoop = loopIn * comp.yN2;
  const n2Reacted = n2InLoop * perPass;
  const outN2 = n2InLoop - n2Reacted;
  const outH2 = loopIn * comp.yH2 - 3 * n2Reacted;
  const outInert = loopIn * comp.yInert;
  const outNH3 = loopIn * comp.yNH3 + 2 * n2Reacted;
  const outTotal = outN2 + outH2 + outInert + outNH3;
  const nh3OutletFraction = outNH3 / outTotal;
  // Composição na saída do reator
  const outComp: GasComposition = {
    yN2: outN2 / outTotal,
    yH2: outH2 / outTotal,
    yNH3: nh3OutletFraction,
    yInert: outInert / outTotal,
  };
  // Composição do gás de reciclo (após condensação da NH3 no separador)
  const recycleDry = outN2 + outH2 + outInert;
  const recycleNH3 = (nh3Slip * recycleDry) / (1 - nh3Slip);
  const recycleTotal = recycleDry + recycleNH3;
  const recycleGasComp: GasComposition = {
    yN2: outN2 / recycleTotal,
    yH2: outH2 / recycleTotal,
    yNH3: recycleNH3 / recycleTotal,
    yInert: outInert / recycleTotal,
  };

  const h2KgH = makeupH2KmolH * MW.H2;
  const n2KgH = makeupN2KmolH * MW.N2;
  const overallConversion =
    (2 * nh3KmolH) / (2 * (makeupN2KmolH + makeupH2KmolH / 3));
  const recycleRatio = (loopIn - makeupKmolH) / makeupKmolH;

  // ------------------------------------------------------------------
  // 3. Balanço de energia
  // ------------------------------------------------------------------
  const energyItems: EnergyItem[] = [];

  // Geração de H2
  const isElectrolysis = h2Source !== "smr";
  const h2PowerMW = (h2KgH * h2Info.specKWhPerKgH2) / 1000;
  const natGasGJH = isElectrolysis
    ? 0
    : (SMR_GJ_PER_T_NH3 * nh3KgH) / 1000;
  energyItems.push({
    id: "h2",
    label: isElectrolysis
      ? `Eletrolisadores (${h2Info.label})`
      : "SMR — auxiliares elétricos",
    area: "Geração de H2",
    powerMW: h2PowerMW,
    type: "electric",
  });
  if (!isElectrolysis) {
    energyItems.push({
      id: "natgas",
      label: "Gás natural (reforma + queima)",
      area: "Geração de H2",
      powerMW: natGasGJH / 3.6,
      type: "thermal-in",
    });
  }

  // ASU
  const asuPowerMW = (n2KgH * ASU_KWH_PER_KG_N2) / 1000;
  energyItems.push({
    id: "asu",
    label: "ASU criogênica (compressor de ar principal)",
    area: "Geração de N2",
    powerMW: asuPowerMW,
    type: "electric",
  });

  // Compressor de make-up (syngas)
  const makeupSuctionBar = isElectrolysis ? 28 : 24;
  const syngasComp = compressionPower(
    makeupKmolH,
    308,
    makeupSuctionBar,
    loopPressureBar,
  );
  energyItems.push({
    id: "syngas-comp",
    label: `Compressor de make-up (${syngasComp.stages} estágios)`,
    area: "Compressão",
    powerMW: syngasComp.powerKW / 1000,
    type: "electric",
  });

  // Compressor de reciclo (ΔP do loop ~ 12 bar)
  const recycleComp = compressionPower(
    loopIn - makeupKmolH,
    278,
    loopPressureBar - 12,
    loopPressureBar,
    0.8,
  );
  energyItems.push({
    id: "recycle-comp",
    label: "Compressor de reciclo",
    area: "Compressão",
    powerMW: recycleComp.powerKW / 1000,
    type: "electric",
  });

  // Refrigeração: condensar NH3 + resfriar gás do loop de 25 °C a Tsep
  const coolingDutyMW =
    (nh3KgH * NH3_LATENT_HEAT) / 3600 / 1000 +
    (loopIn * CP_SYNGAS * Math.max(0, 298 - Tsep)) / 3600 / 1000;
  const refrigPowerMW = coolingDutyMW / REFRIG_COP;
  energyItems.push({
    id: "refrig",
    label: `Ciclo de refrigeração NH3 (COP ${REFRIG_COP})`,
    area: "Loop de síntese",
    powerMW: refrigPowerMW,
    type: "electric",
  });

  // Utilidades e BOP (bombas de água de resfriamento, torre, iluminação…)
  const processPowerMW =
    h2PowerMW +
    asuPowerMW +
    syngasComp.powerKW / 1000 +
    recycleComp.powerKW / 1000 +
    refrigPowerMW;
  const bopPowerMW = processPowerMW * 0.035;
  energyItems.push({
    id: "bop",
    label: "Utilidades e BOP (água, torre, ar comprimido, iluminação)",
    area: "Utilidades",
    powerMW: bopPowerMW,
    type: "electric",
  });

  // Calor de reação liberado [MW]:
  // n2Reacted [kmol/h] × 91,8 [kJ/mol] × 1000 [mol/kmol] / 3600 [s/h] / 1000 [kW/MW]
  const reactionHeatTotalMW = (n2Reacted * -DELTA_H_RXN * 1000) / 3600 / 1000;
  const steamCreditMW = reactionHeatTotalMW * 0.55; // recuperado na caldeira do loop
  energyItems.push({
    id: "rxn-heat",
    label: "Calor de reação (exotérmico)",
    area: "Loop de síntese",
    powerMW: reactionHeatTotalMW,
    type: "thermal-out",
  });
  energyItems.push({
    id: "steam",
    label: "Vapor de alta pressão recuperado (crédito)",
    area: "Loop de síntese",
    powerMW: steamCreditMW,
    type: "thermal-out",
  });

  // ------------------------------------------------------------------
  // 3b. Downstream de ureia (opcional): 2 NH3 + CO2 → NH2CONH2 + H2O
  // ------------------------------------------------------------------
  const isUrea = inputs.finalProduct === "urea";
  let urea: UreaResults | null = null;
  if (isUrea) {
    const ureaKgH = nh3KgH / 0.567; // 0,567 t NH3/t ureia
    const co2KgH = ureaKgH * 0.733; // 0,733 t CO2/t ureia
    // Elétrico: bombas de alta pressão do carbamato + compressor de CO2
    // (~150 bar) + granulação ≈ 0,115 MWh/t ureia
    const electricMW = (ureaKgH * 0.115) / 1000;
    // Vapor: ~0,92 t/t ureia (stripping) ≈ 0,59 MWh térmico/t
    const steamTH = (ureaKgH * 0.92) / 1000;
    const steamMW = steamTH * 0.64;
    energyItems.push({
      id: "urea-elec",
      label: "Planta de ureia (compressor de CO2, bombas HP, granulação)",
      area: "Ureia",
      powerMW: electricMW,
      type: "electric",
    });
    energyItems.push({
      id: "urea-steam",
      label: "Vapor de stripping da ureia (parcialmente coberto pela WHB)",
      area: "Ureia",
      powerMW: steamMW,
      type: "thermal-in",
    });
    urea = {
      ureaKgH,
      co2KgH,
      electricMW,
      steamTH,
      co2Source: isElectrolysis
        ? "CO₂ importado (biogênico/captura) — necessário para a rota verde"
        : "CO₂ capturado do próprio gás de processo do SMR",
    };
  }
  const ureaElectricMW = urea?.electricMW ?? 0;

  const totalElectricMW = processPowerMW + bopPowerMW + ureaElectricMW;
  const specificEnergyMWhPerT =
    (processPowerMW + bopPowerMW) / (nh3KgH / 1000); // benchmark por t NH3
  const energyCostUSDPerT =
    specificEnergyMWhPerT * electricityUSDPerMWh +
    (natGasGJH / (nh3KgH / 1000)) * 4.5; // GN a ~4,5 USD/GJ

  // CO2 evitado vs rota SMR convencional (1,9 t CO2/t NH3)
  const nh3TPerYear = capacityTpd * 365 * 0.92; // fator de disponibilidade
  const co2AvoidedTPerYear = isElectrolysis ? nh3TPerYear * 1.9 : 0;

  // Produto final
  const productKgH = isUrea ? urea!.ureaKgH : nh3KgH;
  const productTPerDay = (productKgH * 24) / 1000;
  const productTPerYear = productTPerDay * 365 * 0.92;

  // Água
  const waterM3H = isElectrolysis
    ? (h2KgH * DEMIN_WATER_L_PER_KG_H2) / 1000
    : nh3KgH * 0.0015;

  // ------------------------------------------------------------------
  // 4. Correntes principais
  // ------------------------------------------------------------------
  const mkStream = (
    id: string,
    name: string,
    kmolH: number,
    mwAvg: number,
    p: number,
    t: number,
    c: GasComposition,
  ): Stream => ({
    id,
    name,
    kmolH,
    kgH: kmolH * mwAvg,
    nm3H: kmolH * NM3_PER_KMOL,
    pressureBar: p,
    tempC: t,
    composition: c,
  });

  const pureN2: GasComposition = { yN2: 0.997, yH2: 0, yNH3: 0, yInert: 0.003 };
  const pureH2: GasComposition = {
    yN2: 0,
    yH2: 1 - h2Info.inertFraction,
    yNH3: 0,
    yInert: h2Info.inertFraction,
  };
  const loopMW =
    comp.yN2 * MW.N2 + comp.yH2 * MW.H2 + comp.yNH3 * MW.NH3 + comp.yInert * MW.AR;

  const streams: Stream[] = [
    mkStream("S1", "N2 da ASU", makeupN2KmolH, MW.N2, 8, 25, pureN2),
    mkStream("S2", "H2 gerado", makeupH2KmolH, MW.H2, makeupSuctionBar, 30, pureH2),
    mkStream(
      "S3",
      "Make-up comprimido",
      makeupKmolH,
      (n2KgH + h2KgH) / makeupKmolH,
      loopPressureBar,
      40,
      { yN2: makeupN2KmolH / makeupKmolH, yH2: makeupH2KmolH / makeupKmolH, yNH3: 0, yInert: inertInMakeup },
    ),
    mkStream("S4", "Entrada do reator", loopIn, loopMW, loopPressureBar, reactorTempC - 50, comp),
    mkStream(
      "S5",
      "Saída do reator",
      loopIn - 2 * n2Reacted,
      loopMW,
      loopPressureBar - 4,
      reactorTempC + 30,
      outComp,
    ),
    mkStream(
      "S6",
      "Reciclo",
      loopIn - makeupKmolH,
      loopMW,
      loopPressureBar - 12,
      separatorTempC,
      recycleGasComp,
    ),
    mkStream(
      "S7",
      "Purga (→ recuperação de H2)",
      (loopIn - makeupKmolH) * purgeFraction / (1 - purgeFraction),
      loopMW,
      loopPressureBar - 12,
      separatorTempC,
      recycleGasComp,
    ),
    mkStream("S8", "NH3 líquida produto", nh3KmolH, MW.NH3, 18, -33, {
      yN2: 0,
      yH2: 0,
      yNH3: 1,
      yInert: 0,
    }),
  ];

  // ------------------------------------------------------------------
  // 5. Engenharia — mecânica, civil, elétrica
  // ------------------------------------------------------------------
  const reactorDesign = designReactor(loopIn, loopPressureBar);
  const civil = designCivil(capacityTpd, isElectrolysis);
  const electrical = designElectrical(totalElectricMW, energyItems);
  const equipment = buildEquipmentList(
    inputs,
    reactorDesign,
    civil,
    electrical,
    { h2KgH, n2KgH, syngasStages: syngasComp.stages, coolingDutyMW, steamCreditMW },
  );

  // Equipamentos adicionais da planta de ureia
  if (urea) {
    const fmtLocal = (v: number, d = 0) =>
      v.toLocaleString("pt-BR", { maximumFractionDigits: d });
    equipment.push(
      {
        tag: "R-601",
        name: "Reator de síntese de ureia",
        discipline: "mecânica",
        spec: "Stripping de CO2 (Stamicarbon/Saipem), 150 bar / 185 °C, aço inox 25-22-2",
        value: `${fmtLocal(urea.ureaKgH / 1000, 1)} t ureia/h`,
      },
      {
        tag: "K-601",
        name: "Compressor de CO2",
        discipline: "mecânica",
        spec: "Centrífugo, descarga 150 bar",
        value: `${fmtLocal(urea.co2KgH / 1000, 1)} t CO2/h`,
      },
      {
        tag: "GR-601",
        name: "Granulador de ureia",
        discipline: "mecânica",
        spec: "Leito fluidizado, scrubber de pó, produto 2–4 mm",
        value: `${fmtLocal((urea.ureaKgH * 24) / 1000, 0)} t/dia`,
      },
    );
  }

  // CAPEX classe 5 (AACE ±40%) — curva de escala expoente 0,62
  // Downstream de ureia adiciona ~45% ao investimento
  const baseUSDPerTpa = isElectrolysis ? 1350 : 950;
  const capexMUSD =
    ((baseUSDPerTpa * (capacityTpd * 365) * Math.pow(capacityTpd / 300, -0.15)) /
      1e6) *
    (isUrea ? 1.45 : 1);

  return {
    inputs,
    converged,
    nh3KgH,
    nh3TPerDay: capacityTpd,
    nh3TPerYear,
    productKgH,
    productTPerDay,
    productTPerYear,
    urea,
    h2KgH,
    n2KgH,
    waterM3H,
    natGasGJH,
    perPassConversion: perPass,
    overallConversion,
    recycleRatio,
    loopFlowKmolH: loopIn,
    loopInertFraction: comp.yInert,
    nh3AtReactorOutlet: nh3OutletFraction,
    separatorNH3Slip: nh3Slip,
    energyItems,
    totalElectricMW,
    reactionHeatMW: reactionHeatTotalMW,
    steamCreditMW,
    specificEnergyMWhPerT,
    energyCostUSDPerT,
    co2AvoidedTPerYear,
    streams,
    equipment,
    reactorDesign,
    civil,
    electrical,
    capexMUSD,
  };
}

/** Dimensionamento mecânico do reator de síntese (ASME VIII Div. 2). */
function designReactor(loopKmolH: number, loopPressureBar: number): ReactorDesign {
  // Velocidade espacial típica para catalisador de magnetita promovida
  const spaceVelocity = 12000; // Nm³/(m³cat·h)
  const loopNm3H = loopKmolH * NM3_PER_KMOL;
  const catalystVolumeM3 = loopNm3H / spaceVelocity;
  const beds = catalystVolumeM3 > 20 ? 4 : 3;

  // Vaso: volume interno ≈ 1,7 × volume de catalisador (internos, trocador)
  const vesselVolume = catalystVolumeM3 * 1.7;
  const LoverD = 6;
  const innerDiameterM = Math.pow((4 * vesselVolume) / (Math.PI * LoverD), 1 / 3);
  const lengthM = innerDiameterM * LoverD;

  // Espessura de parede — casca cilíndrica, ASME VIII
  const designPressureBar = loopPressureBar * 1.1;
  const P = designPressureBar / 10; // MPa
  const S = 165; // MPa — SA-542 Gr. B (2.25Cr-1Mo), tensão admissível
  const E = 1.0;
  const CA = 3; // mm corrosão
  const R = (innerDiameterM / 2) * 1000; // mm
  const wallThicknessMm = (P * R) / (S * E - 0.6 * P) + CA;

  // Massa da casca (aço 7850 kg/m³) + tampos (+18%)
  const Dm = innerDiameterM + wallThicknessMm / 1000;
  const shellMassT =
    (Math.PI * Dm * (wallThicknessMm / 1000) * lengthM * 7850 * 1.18) / 1000;

  return {
    catalystVolumeM3,
    beds,
    innerDiameterM,
    lengthM,
    wallThicknessMm,
    designPressureBar,
    shellMassT,
    material: "SA-542 Gr. B Cl. 4 (2¼Cr-1Mo) — resistência a H2 (curvas de Nelson, API 941)",
  };
}

/** Quantitativos civis paramétricos (base: plantas de 100–1000 t/d). */
function designCivil(capacityTpd: number, isElectrolysis: boolean): CivilDesign {
  const s = Math.pow(capacityTpd / 300, 0.6);
  const processAreaM2 = Math.round((isElectrolysis ? 26000 : 20000) * s);
  const tankFarmAreaM2 = Math.round(6500 * s);
  const totalAreaM2 = Math.round(processAreaM2 * 2.4 + tankFarmAreaM2);
  // Estocagem: 15 dias de produção, NH3 líquida a -33 °C (682 kg/m³)
  const storageTankM3 = Math.round((capacityTpd * 15 * 1000) / 682);
  return {
    totalAreaM2,
    processAreaM2,
    tankFarmAreaM2,
    concreteM3: Math.round(9500 * s),
    structuralSteelT: Math.round(1400 * s),
    pilingCount: Math.round(850 * s),
    storageTankM3,
  };
}

/** Sistema elétrico — subestação, transformação e distribuição. */
function designElectrical(
  totalMW: number,
  items: EnergyItem[],
): ElectricalDesign {
  const demandMVA = (totalMW / 0.93) * 1.1; // FP 0,93 + reserva
  const mainVoltageKV = totalMW > 60 ? 230 : totalMW > 15 ? 138 : 34.5;
  const trafoUnit = totalMW > 60 ? 80 : totalMW > 15 ? 40 : 15;
  const nTrafos = Math.max(2, Math.ceil(demandMVA / trafoUnit) + 1); // N+1
  const compressors = items.filter((i) => i.id.includes("comp"));
  const largestMotorKW = Math.round(
    Math.max(...compressors.map((c) => c.powerMW * 1000), 500),
  );
  return {
    installedMW: totalMW,
    demandMVA,
    mainVoltageKV,
    transformers: `${nTrafos} × ${trafoUnit} MVA (${mainVoltageKV}/13,8 kV, ONAF, N+1)`,
    largestMotorKW,
    emergencyGenMVA: Math.max(1.5, totalMW * 0.02),
  };
}

function buildEquipmentList(
  inputs: PlantInputs,
  reactor: ReactorDesign,
  civil: CivilDesign,
  electrical: ElectricalDesign,
  extra: {
    h2KgH: number;
    n2KgH: number;
    syngasStages: number;
    coolingDutyMW: number;
    steamCreditMW: number;
  },
): EquipmentItem[] {
  const isElec = inputs.h2Source !== "smr";
  const fmt = (v: number, d = 1) =>
    v.toLocaleString("pt-BR", { maximumFractionDigits: d });

  const list: EquipmentItem[] = [
    {
      tag: "R-401",
      name: "Reator de síntese Haber-Bosch",
      discipline: "mecânica",
      spec: `${reactor.beds} leitos radiais, ${reactor.material}`,
      value: `Ø ${fmt(reactor.innerDiameterM, 2)} m × ${fmt(reactor.lengthM, 1)} m, parede ${fmt(reactor.wallThicknessMm, 0)} mm, ${fmt(reactor.shellMassT, 0)} t`,
    },
    {
      tag: "R-401-CAT",
      name: "Carga de catalisador",
      discipline: "mecânica",
      spec: "Magnetita promovida (Fe3O4/K2O/Al2O3) ou rutênio",
      value: `${fmt(reactor.catalystVolumeM3, 1)} m³`,
    },
    {
      tag: "K-301",
      name: "Compressor de make-up",
      discipline: "mecânica",
      spec: `Centrífugo, ${extra.syngasStages} estágios, acionamento elétrico com VFD`,
      value: `Descarga ${fmt(inputs.loopPressureBar, 0)} bar`,
    },
    {
      tag: "K-402",
      name: "Compressor de reciclo",
      discipline: "mecânica",
      spec: "Centrífugo 1 estágio, integrado à carcaça do K-301",
      value: "ΔP ≈ 12 bar",
    },
    {
      tag: "E-403",
      name: "Caldeira de recuperação (waste heat boiler)",
      discipline: "mecânica",
      spec: "Vapor HP 105 bar sat. a partir do calor de reação",
      value: `${fmt(extra.steamCreditMW, 1)} MW recuperados`,
    },
    {
      tag: "E-405/V-406",
      name: "Chiller e separador de NH3",
      discipline: "mecânica",
      spec: `Ciclo frigorífico de NH3, separador a ${fmt(inputs.separatorTempC, 0)} °C`,
      value: `Carga térmica ${fmt(extra.coolingDutyMW, 1)} MW`,
    },
    {
      tag: "TQ-501",
      name: "Tanque de estocagem de NH3",
      discipline: "mecânica",
      spec: "Atmosférico refrigerado -33 °C, parede dupla (API 620 An. R)",
      value: `${fmt(civil.storageTankM3, 0)} m³ (15 dias)`,
    },
    {
      tag: isElec ? "EL-101" : "F-101",
      name: isElec ? "Eletrolisadores" : "Forno reformador (SMR)",
      discipline: "mecânica",
      spec: isElec
        ? H2_SOURCE_INFO[inputs.h2Source].note
        : "Reforma primária + shift + PSA",
      value: `${fmt(extra.h2KgH, 0)} kg H2/h`,
    },
    {
      tag: "ASU-201",
      name: "Unidade de separação de ar (N2)",
      discipline: "mecânica",
      spec: "Criogênica, coluna dupla, pureza 99,999%",
      value: `${fmt(extra.n2KgH / 1000, 1)} t N2/h`,
    },
    {
      tag: "SE-01",
      name: "Subestação principal",
      discipline: "elétrica",
      spec: `Entrada ${electrical.mainVoltageKV} kV, ${electrical.transformers}`,
      value: `${fmt(electrical.demandMVA, 1)} MVA de demanda`,
    },
    {
      tag: "MCC-01/02",
      name: "CCMs e VFDs",
      discipline: "elétrica",
      spec: "13,8 kV / 4,16 kV / 480 V, maior motor com partida por inversor",
      value: `Maior motor: ${fmt(electrical.largestMotorKW, 0)} kW`,
    },
    {
      tag: "GE-01",
      name: "Geração de emergência",
      discipline: "elétrica",
      spec: "Diesel, atende cargas essenciais e parada segura",
      value: `${fmt(electrical.emergencyGenMVA, 1)} MVA`,
    },
    {
      tag: "CIV-01",
      name: "Fundações e estruturas",
      discipline: "civil",
      spec: "Estacas pré-moldadas, pipe-racks metálicos, bacias de contenção",
      value: `${fmt(civil.concreteM3, 0)} m³ concreto, ${fmt(civil.structuralSteelT, 0)} t aço, ${fmt(civil.pilingCount, 0)} estacas`,
    },
    {
      tag: "CIV-02",
      name: "Terreno industrial",
      discipline: "civil",
      spec: "Área de processo + tancagem + utilidades + administrativo",
      value: `${fmt(civil.totalAreaM2 / 10000, 1)} ha`,
    },
    {
      tag: "SDCD-01",
      name: "Automação e SIS",
      discipline: "instrumentação",
      spec: "SDCD + SIS SIL-3 (IEC 61511), ESD do loop, analisadores em linha",
      value: "≈ 2.800 I/O",
    },
  ];
  return list;
}
