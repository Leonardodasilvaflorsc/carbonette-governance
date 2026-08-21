/**
 * Camada analítica: solvers de ponto de equilíbrio, sensibilidade, mapas de
 * calor e Monte Carlo. Tudo aqui opera sobre o mesmo motor de cálculo, sem
 * fórmulas paralelas — o que garante que a análise e o resultado principal
 * nunca divirjam.
 */
import type { Scenario } from "../defaults";
import type { McSpec, ResultadoCenario, RouteKey } from "../types";
import { porRotas, ROUTE_KEYS } from "../types";
import { computeScenario, custoGasPorKg, custoH2Efetivo, type Ctx as CtxGas } from "./index";
import { getPath, resolverRaiz, setPathMut } from "./util";

const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));

/**
 * Variável de análise: pode escrever em mais de um campo do cenário
 * (por exemplo, o preço da energia move TE de ponta e fora de ponta juntos).
 */
export interface Variavel {
  key: string;
  label: string;
  unit: string;
  dec: number;
  min: number;
  max: number;
  ler: (s: Scenario) => number;
  aplicar: (s: Scenario, x: number) => void;
  /** Texto curto explicando o que o solver está movendo. */
  nota?: string;
}

/**
 * Preço do gás em R$/m³ equivalente na porta do veículo, qualquer que seja a
 * base de cotação ou o modo de suprimento declarado. É essa grandeza que os
 * solvers movem.
 */
export function precoGasEquivalenteM3(s: Scenario, rota: "gnv" | "bio"): number {
  const ctx = { sc: s, wacc: s.econ.wacc / 100 } as unknown as CtxGas;
  const porKg = custoGasPorKg(ctx, rota);
  const densidade = rota === "bio" ? s.gas.bioDensidadeKgM3 : s.gas.densidadeKgM3;
  return porKg * densidade;
}

/** Converte qualquer modo de suprimento de H₂ em um preço direto equivalente. */
export function normalizarSuprimentoH2(s: Scenario): Scenario {
  if (s.h2.modoSuprimento === "A") return s;
  const custo = custoH2Efetivo(s);
  const c = clone(s);
  c.h2.modoSuprimento = "A";
  c.h2.aPrecoKg = custo;
  c.h2.aPrecoIncluiIcms = true;
  c.h2.aCustoLogisticoKg = 0;
  c.h2.aPerdasTransferenciaPct = 0;
  return c;
}

const escalar = (paths: string[]) => (s: Scenario, fator: number) => {
  paths.forEach((p) => setPathMut(s, p, getPath(s, p) * fator));
};

export const VARIAVEIS: Record<string, Variavel> = {
  precoH2: {
    key: "precoH2",
    label: "Preço do hidrogênio",
    unit: "R$/kg",
    dec: 2,
    min: 0,
    max: 150,
    ler: (s) => custoH2Efetivo(s),
    aplicar: (s, x) => {
      s.h2.modoSuprimento = "A";
      s.h2.aPrecoKg = x;
      s.h2.aPrecoIncluiIcms = true;
      s.h2.aCustoLogisticoKg = 0;
      s.h2.aPerdasTransferenciaPct = 0;
    },
    nota: "Preço equivalente na porta do veículo, já somada a logística do modo de suprimento ativo.",
  },
  precoGnv: {
    key: "precoGnv",
    label: "Preço do gás natural",
    unit: "R$/m³",
    dec: 2,
    min: 0,
    max: 30,
    ler: (s) => precoGasEquivalenteM3(s, "gnv"),
    aplicar: (s, x) => {
      s.gas.gnvMetodoPreco = "m3";
      s.gas.gnvPrecoM3 = x;
      s.gas.gnvCustoLogisticoKg = 0;
    },
    nota: "Preço equivalente por metro cúbico na porta do veículo, já somada a logística da base de cotação ativa.",
  },
  precoBio: {
    key: "precoBio",
    label: "Preço do biometano",
    unit: "R$/m³",
    dec: 2,
    min: 0,
    max: 30,
    ler: (s) => precoGasEquivalenteM3(s, "bio"),
    aplicar: (s, x) => {
      s.gas.bioModoSuprimento = "A";
      s.gas.bioMetodoPreco = "m3";
      s.gas.bioPrecoM3 = x;
      s.gas.bioCustoLogisticoKg = 0;
    },
    nota: "Preço equivalente por metro cúbico na porta do veículo. Quando o modo de suprimento é produção própria, o solver converte o custo nivelado da planta em preço equivalente.",
  },
  capexGas: {
    key: "capexGas",
    label: "CAPEX do caminhão a gás",
    unit: "R$",
    dec: 0,
    min: 0,
    max: 6000000,
    ler: (s) => s.gas.precoAquisicao,
    aplicar: (s, x) => {
      s.gas.modoPreco = "direto";
      s.gas.precoAquisicao = x;
    },
  },
  consumoGas: {
    key: "consumoGas",
    label: "Consumo específico do motor a gás",
    unit: "kg/100 km (rodoviário)",
    dec: 2,
    min: 5,
    max: 80,
    ler: (s) => s.gas.consumoRodoviarioKg100km,
    aplicar: (s, x) => {
      const f = s.gas.consumoRodoviarioKg100km > 0 ? x / s.gas.consumoRodoviarioKg100km : 1;
      escalar(["gas.consumoUrbanoKg100km", "gas.consumoRegionalKg100km"])(s, f);
      s.gas.consumoRodoviarioKg100km = x;
    },
    nota: "Os perfis urbano e regional acompanham na mesma proporção.",
  },
  slipMetano: {
    key: "slipMetano",
    label: "Metano não queimado",
    unit: "%",
    dec: 2,
    min: 0,
    max: 10,
    ler: (s) => s.gas.slipMetanoPct,
    aplicar: (s, x) => {
      s.gas.slipMetanoPct = x;
    },
    nota: "Só altera emissões e custo de carbono; não muda o consumo declarado.",
  },
  utilizacaoEstacaoGas: {
    key: "utilizacaoEstacaoGas",
    label: "Taxa de utilização da estação de gás",
    unit: "%",
    dec: 1,
    min: 1,
    max: 100,
    ler: (s) => s.gas.estacaoUtilizacaoPct,
    aplicar: (s, x) => {
      s.gas.estacaoUtilizacaoPct = x;
    },
  },
  precoDiesel: {
    key: "precoDiesel",
    label: "Preço do diesel S10",
    unit: "R$/L",
    dec: 2,
    min: 0,
    max: 40,
    ler: (s) => s.diesel.precoDieselL,
    aplicar: (s, x) => {
      s.diesel.precoDieselL = x;
    },
  },
  precoEnergia: {
    key: "precoEnergia",
    label: "Preço da energia elétrica (TE)",
    unit: "R$/MWh",
    dec: 0,
    min: 0,
    max: 3000,
    ler: (s) => s.bev.teForaPontaRSMWh,
    aplicar: (s, x) => {
      const razao = s.bev.teForaPontaRSMWh > 0 ? x / s.bev.teForaPontaRSMWh : 1;
      s.bev.tePontaRSMWh *= razao;
      s.bev.teForaPontaRSMWh = x;
    },
    nota: "A tarifa de ponta acompanha a variação na mesma proporção.",
  },
  capexH2: {
    key: "capexH2",
    label: "CAPEX do FCEV",
    unit: "R$",
    dec: 0,
    min: 0,
    max: 12000000,
    ler: (s) => s.h2.precoAquisicao,
    aplicar: (s, x) => {
      s.h2.modoPreco = "direto";
      s.h2.precoAquisicao = x;
    },
  },
  capexBev: {
    key: "capexBev",
    label: "CAPEX do BEV",
    unit: "R$",
    dec: 0,
    min: 0,
    max: 12000000,
    ler: (s) => s.bev.precoAquisicao,
    aplicar: (s, x) => {
      s.bev.modoPreco = "direto";
      s.bev.precoAquisicao = x;
    },
  },
  kmAno: {
    key: "kmAno",
    label: "Quilometragem anual",
    unit: "km/ano",
    dec: 0,
    min: 5000,
    max: 400000,
    ler: (s) => s.mission.kmAno,
    aplicar: (s, x) => {
      s.mission.kmAno = x;
    },
  },
  precoCarbono: {
    key: "precoCarbono",
    label: "Preço do carbono",
    unit: "R$/tCO₂e",
    dec: 0,
    min: 0,
    max: 5000,
    ler: (s) =>
      s.carbono.cenarioCarbono === "zero"
        ? 0
        : s.carbono.cenarioCarbono === "voluntario"
          ? s.carbono.precoCarbonoVoluntario
          : s.carbono.cenarioCarbono === "sbce"
            ? s.carbono.precoCarbonoSbce
            : s.carbono.precoCarbonoCbam,
    aplicar: (s, x) => {
      if (s.carbono.cenarioCarbono === "zero") s.carbono.cenarioCarbono = "voluntario";
      if (s.carbono.cenarioCarbono === "voluntario") s.carbono.precoCarbonoVoluntario = x;
      else if (s.carbono.cenarioCarbono === "sbce") s.carbono.precoCarbonoSbce = x;
      else s.carbono.precoCarbonoCbam = x;
    },
    nota: "Quando o cenário ativo é 'sem preço de carbono', o solver passa a operar sobre o preço do mercado voluntário.",
  },
  custoPack: {
    key: "custoPack",
    label: "Custo do pack de reposição",
    unit: "R$/kWh",
    dec: 0,
    min: 0,
    max: 4000,
    ler: (s) => s.bev.custoPackRSKWh,
    aplicar: (s, x) => {
      s.bev.custoPackRSKWh = x;
    },
  },
  ciclosBateria: {
    key: "ciclosBateria",
    label: "Vida da bateria",
    unit: "ciclos até 80% de SOH",
    dec: 0,
    min: 200,
    max: 12000,
    ler: (s) => s.bev.ciclosAte80Soh,
    aplicar: (s, x) => {
      s.bev.ciclosAte80Soh = x;
    },
  },
  consumoH2: {
    key: "consumoH2",
    label: "Consumo específico do FCEV",
    unit: "kg H₂/100 km (rodoviário)",
    dec: 2,
    min: 1,
    max: 30,
    ler: (s) => s.h2.consumoRodoviarioKg100km,
    aplicar: (s, x) => {
      const f = s.h2.consumoRodoviarioKg100km > 0 ? x / s.h2.consumoRodoviarioKg100km : 1;
      escalar(["h2.consumoUrbanoKg100km", "h2.consumoRegionalKg100km"])(s, f);
      s.h2.consumoRodoviarioKg100km = x;
    },
    nota: "Os perfis urbano e regional acompanham na mesma proporção.",
  },
  consumoBev: {
    key: "consumoBev",
    label: "Consumo específico do BEV",
    unit: "kWh/km (rodoviário)",
    dec: 3,
    min: 0.2,
    max: 4,
    ler: (s) => s.bev.consumoRodoviarioKWhKm,
    aplicar: (s, x) => {
      const f = s.bev.consumoRodoviarioKWhKm > 0 ? x / s.bev.consumoRodoviarioKWhKm : 1;
      escalar(["bev.consumoUrbanoKWhKm", "bev.consumoRegionalKWhKm"])(s, f);
      s.bev.consumoRodoviarioKWhKm = x;
    },
    nota: "Os perfis urbano e regional acompanham na mesma proporção.",
  },
  utilizacaoHrs: {
    key: "utilizacaoHrs",
    label: "Taxa de utilização da estação de H₂",
    unit: "%",
    dec: 1,
    min: 1,
    max: 100,
    ler: (s) => s.h2.hrsUtilizacaoPct,
    aplicar: (s, x) => {
      s.h2.hrsUtilizacaoPct = x;
    },
  },
  veiculosInfraBev: {
    key: "veiculosInfraBev",
    label: "Veículos no rateio da infraestrutura de recarga",
    unit: "veículos",
    dec: 0,
    min: 1,
    max: 300,
    ler: (s) => s.bev.infraVeiculosRateio,
    aplicar: (s, x) => {
      s.bev.infraVeiculosRateio = Math.max(1, Math.round(x));
    },
  },
  wacc: {
    key: "wacc",
    label: "Taxa de desconto real",
    unit: "% a.a.",
    dec: 2,
    min: 0,
    max: 40,
    ler: (s) => s.econ.wacc,
    aplicar: (s, x) => {
      s.econ.wacc = x;
    },
  },
  horizonte: {
    key: "horizonte",
    label: "Horizonte de análise",
    unit: "anos",
    dec: 0,
    min: 1,
    max: 25,
    ler: (s) => s.mission.horizonteAnos,
    aplicar: (s, x) => {
      s.mission.horizonteAnos = Math.max(1, Math.round(x));
    },
  },
};

/**
 * Antes de mover um preço de combustível, o cenário é convertido para o modo
 * de compra direta equivalente, para que o solver tenha uma variável contínua
 * sobre a qual atuar mesmo quando o suprimento é produção própria.
 */
function normalizarSuprimento(s: Scenario, varKey: string): Scenario {
  if (varKey === "precoH2") return normalizarSuprimentoH2(s);
  if (varKey === "precoBio" && s.gas.bioModoSuprimento === "B") {
    const equivalente = precoGasEquivalenteM3(s, "bio");
    const c = clone(s);
    c.gas.bioModoSuprimento = "A";
    c.gas.bioMetodoPreco = "m3";
    c.gas.bioPrecoM3 = equivalente;
    c.gas.bioPrecoIncluiIcms = true;
    c.gas.bioCustoLogisticoKg = 0;
    c.gas.bioPerdasTransferenciaPct = 0;
    return c;
  }
  return s;
}

/** Métrica comparável entre rotas: R$ por tonelada-quilômetro. */
export const metrica = (r: ResultadoCenario, rota: RouteKey) => r.rotas[rota].tcoPorTKm;

export interface Equilibrio {
  variavel: Variavel;
  par: [RouteKey, RouteKey];
  atual: number;
  equilibrio: number | null;
  distanciaPct: number | null;
  /** Rota vencedora no valor atual da variável. */
  vencedorAtual: RouteKey;
  /** Sentido: a rota alternativa melhora quando a variável sobe? */
  sentido: "sobe" | "desce" | "indefinido";
}

export function resolverEquilibrio(
  sc: Scenario,
  varKey: string,
  a: RouteKey,
  b: RouteKey,
): Equilibrio {
  const v = VARIAVEIS[varKey];
  const base = normalizarSuprimento(sc, varKey);
  const atual = v.ler(base);
  const f = (x: number) => {
    const c = clone(base);
    v.aplicar(c, x);
    const r = computeScenario(c);
    return metrica(r, a) - metrica(r, b);
  };
  const raiz = resolverRaiz(f, v.min, v.max, 60, 1e-7);
  const rBase = computeScenario(base);
  const vencedorAtual = metrica(rBase, a) < metrica(rBase, b) ? a : b;
  const dLo = f(Math.max(v.min, atual * 0.9 || v.min));
  const dHi = f(Math.min(v.max, atual * 1.1 || v.max));
  const sentido = dHi === dLo ? "indefinido" : dHi > dLo ? "desce" : "sobe";
  return {
    variavel: v,
    par: [a, b],
    atual,
    equilibrio: raiz,
    distanciaPct: raiz !== null && atual !== 0 ? ((raiz - atual) / Math.abs(atual)) * 100 : null,
    vencedorAtual,
    sentido,
  };
}

/** Varredura unidimensional: TCO/t·km das três rotas ao longo de uma variável. */
export function varredura(sc: Scenario, varKey: string, lo: number, hi: number, passos = 25) {
  const v = VARIAVEIS[varKey];
  const base = normalizarSuprimento(sc, varKey);
  const pontos: { x: number; diesel: number; h2: number; bev: number }[] = [];
  for (let i = 0; i <= passos; i++) {
    const x = lo + ((hi - lo) * i) / passos;
    const c = clone(base);
    v.aplicar(c, x);
    const r = computeScenario(c);
    pontos.push({ x, diesel: metrica(r, "diesel"), h2: metrica(r, "h2"), bev: metrica(r, "bev") });
  }
  return pontos;
}

/** Mapa de calor bidimensional com a rota vencedora em cada célula. */
export function mapaCalor(
  sc: Scenario,
  varX: string,
  loX: number,
  hiX: number,
  varY: string,
  loY: number,
  hiY: number,
  n = 18,
) {
  const vx = VARIAVEIS[varX];
  const vy = VARIAVEIS[varY];
  const base = normalizarSuprimento(normalizarSuprimento(sc, varX), varY);
  const celulas: { x: number; y: number; vencedor: RouteKey; margemPct: number }[] = [];
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = loX + ((hiX - loX) * i) / n;
      const y = loY + ((hiY - loY) * j) / n;
      const c = clone(base);
      vx.aplicar(c, x);
      vy.aplicar(c, y);
      const r = computeScenario(c);
      const ord = ROUTE_KEYS.map((k) => ({ k, v: metrica(r, k) })).sort((p, q) => p.v - q.v);
      celulas.push({
        x,
        y,
        vencedor: ord[0].k,
        margemPct: ord[1].v > 0 ? ((ord[1].v - ord[0].v) / ord[1].v) * 100 : 0,
      });
    }
  }
  return { celulas, n };
}

/** Gráfico tornado: variação de ±delta% em cada variável marcada. */
export interface BarraTornado {
  path: string;
  label: string;
  unidade: string;
  baixo: number;
  alto: number;
  amplitude: number;
  valorBase: number;
}

export function tornado(
  sc: Scenario,
  paths: string[],
  rota: RouteKey,
  deltaPct = 20,
  rotulo: (p: string) => { label: string; unit: string },
): BarraTornado[] {
  const base = computeScenario(sc);
  const tcoBase = base.rotas[rota].tco;
  const barras: BarraTornado[] = [];
  for (const path of paths) {
    const v0 = getPath(sc, path);
    if (typeof v0 !== "number" || !isFinite(v0)) continue;
    const calc = (fator: number) => {
      const c = clone(sc);
      setPathMut(c, path, v0 * fator);
      return computeScenario(c).rotas[rota].tco - tcoBase;
    };
    const baixo = calc(1 - deltaPct / 100);
    const alto = calc(1 + deltaPct / 100);
    const meta = rotulo(path);
    barras.push({
      path,
      label: meta.label,
      unidade: meta.unit,
      baixo,
      alto,
      amplitude: Math.abs(alto - baixo),
      valorBase: v0,
    });
  }
  return barras.sort((a, b) => b.amplitude - a.amplitude);
}

// ─────────────────────────────────────────────────────────────────────────────
// Monte Carlo
// ─────────────────────────────────────────────────────────────────────────────
function amostrar(spec: McSpec): number {
  if (spec.dist === "uniforme") return spec.p1 + Math.random() * (spec.p2 - spec.p1);
  if (spec.dist === "triangular") {
    const [a, c, b] = [spec.p1, spec.p2, spec.p3 ?? spec.p2];
    const u = Math.random();
    const fc = b > a ? (c - a) / (b - a) : 0;
    return u < fc
      ? a + Math.sqrt(u * (b - a) * (c - a))
      : b - Math.sqrt((1 - u) * (b - a) * (b - c));
  }
  // Normal por Box-Muller, truncada em zero para grandezas não negativas.
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return spec.p1 + z * spec.p2;
}

export interface ResultadoMC {
  iteracoes: number;
  amostras: Record<RouteKey, number[]>;
  probVitoria: Record<RouteKey, number>;
  p10: Record<RouteKey, number>;
  p50: Record<RouteKey, number>;
  p90: Record<RouteKey, number>;
  media: Record<RouteKey, number>;
  /** Probabilidade de a rota alternativa ficar abaixo do diesel. */
  probMelhorQueDiesel: Record<RouteKey, number>;
  correlacoes: { path: string; label: string; rota: RouteKey; r: number }[];
  /** Valores sorteados de cada input, preservados para consolidar lotes. */
  entradas: Record<string, number[]>;
}

const percentil = (arr: number[], p: number) => {
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[i];
};

const pearson = (x: number[], y: number[]) => {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
};

export function monteCarlo(
  sc: Scenario,
  specs: Record<string, McSpec>,
  iteracoes: number,
  rotulo: (p: string) => string,
): ResultadoMC {
  const paths = Object.keys(specs);
  const amostras: Record<RouteKey, number[]> = porRotas(() => [] as number[]);
  const entradas: Record<string, number[]> = {};
  paths.forEach((p) => (entradas[p] = []));
  const vitorias: Record<RouteKey, number> = porRotas(() => 0);
  const melhorQueDiesel: Record<RouteKey, number> = porRotas(() => 0);

  const trabalho = clone(sc);
  for (let i = 0; i < iteracoes; i++) {
    for (const p of paths) {
      const v = Math.max(0, amostrar(specs[p]));
      entradas[p].push(v);
      setPathMut(trabalho, p, v);
    }
    const r = computeScenario(trabalho);
    let melhor: RouteKey = "diesel";
    for (const k of ROUTE_KEYS) {
      amostras[k].push(r.rotas[k].tcoPorTKm);
      if (r.rotas[k].tcoPorTKm < r.rotas[melhor].tcoPorTKm) melhor = k;
    }
    vitorias[melhor]++;
    for (const k of ROUTE_KEYS)
      if (r.rotas[k].tcoPorTKm < r.rotas.diesel.tcoPorTKm) melhorQueDiesel[k]++;
  }

  const mk = (fn: (k: RouteKey) => number) => porRotas(fn);

  return {
    iteracoes,
    amostras,
    probVitoria: mk((k) => (vitorias[k] / Math.max(1, iteracoes)) * 100),
    probMelhorQueDiesel: mk((k) => (melhorQueDiesel[k] / Math.max(1, iteracoes)) * 100),
    p10: mk((k) => percentil(amostras[k], 10)),
    p50: mk((k) => percentil(amostras[k], 50)),
    p90: mk((k) => percentil(amostras[k], 90)),
    media: mk((k) => amostras[k].reduce((a, b) => a + b, 0) / Math.max(1, iteracoes)),
    correlacoes: correlacionar(entradas, amostras, rotulo),
    entradas,
  };
}

/** Correlação de Pearson entre cada input sorteado e o TCO de cada rota. */
export function correlacionar(
  entradas: Record<string, number[]>,
  amostras: Record<RouteKey, number[]>,
  rotulo: (p: string) => string,
): ResultadoMC["correlacoes"] {
  const out: ResultadoMC["correlacoes"] = [];
  for (const p of Object.keys(entradas)) {
    for (const k of ROUTE_KEYS) {
      out.push({ path: p, label: rotulo(p), rota: k, r: pearson(entradas[p], amostras[k]) });
    }
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}
