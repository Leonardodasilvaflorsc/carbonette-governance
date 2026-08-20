/**
 * Motor de cálculo do AHS TCO Fleet.
 *
 * O motor não compara veículo contra veículo: compara a capacidade de executar
 * a MESMA missão anual de transporte. Por isso a sequência é sempre
 *   massa → carga útil → penalidade de payload → consumo → disponibilidade →
 *   frota equivalente → fluxo de caixa → VPL.
 *
 * Toda operação relevante deixa um registro de auditoria (fórmula + valores
 * substituídos) consultável na interface.
 */
import type { Scenario } from "../defaults";
import type {
  Alerta,
  Auditoria,
  GrupoCusto,
  LinhaFluxo,
  ResultadoCenario,
  ResultadoRota,
  RouteKey,
} from "../types";
import { GRUPO_ORDEM, ROUTE_KEYS } from "../types";
import { CONST } from "./constantes";
import { cronogramaFinanciamento, depreciacaoLinear } from "./finance";
import { clamp, crf, curvaAno, esc, normalizar, npv, sum, zeros } from "./util";

/**
 * Formatação pt-BR local ao motor. Não usa toLocaleString: o motor é chamado
 * dezenas de milhares de vezes em Monte Carlo e nos solvers, e a formatação
 * intl domina o tempo de execução se usada aqui.
 */
function fmt(v: number, d = 2): string {
  if (!isFinite(v)) return "—";
  const neg = v < 0;
  const s = Math.abs(v).toFixed(d);
  const ponto = s.indexOf(".");
  const inteiro = ponto < 0 ? s : s.slice(0, ponto);
  const dec = ponto < 0 ? "" : s.slice(ponto + 1);
  let out = "";
  for (let i = 0; i < inteiro.length; i++) {
    if (i > 0 && (inteiro.length - i) % 3 === 0) out += ".";
    out += inteiro[i];
  }
  return (neg ? "-" : "") + out + (dec ? "," + dec : "");
}

/** Acumulador de linhas do fluxo de caixa de uma rota. */
class Fluxo {
  linhas: LinhaFluxo[] = [];
  auditoria: Auditoria[] = [];
  alertas: Alerta[] = [];
  constructor(private N: number, private rota: RouteKey) {}

  add(chave: string, rotulo: string, grupo: GrupoCusto, valores: number[]) {
    if (valores.every((v) => !v)) return;
    this.linhas.push({ chave, rotulo, grupo, valores: valores.slice(0, this.N + 1) });
  }

  /** Linha constante aplicada aos anos operacionais (1..N). */
  addOper(chave: string, rotulo: string, grupo: GrupoCusto, porAno: (t: number) => number) {
    const v = zeros(this.N + 1);
    for (let t = 1; t <= this.N; t++) v[t] = porAno(t);
    this.add(chave, rotulo, grupo, v);
  }

  aud(rotulo: string, formula: string, substituicao: string, resultado: number, unidade: string) {
    this.auditoria.push({ rotulo, formula, substituicao, resultado, unidade });
  }

  alerta(nivel: Alerta["nivel"], texto: string) {
    this.alertas.push({ nivel, rota: this.rota, texto });
  }

  soma(): number[] {
    const v = zeros(this.N + 1);
    for (const l of this.linhas) l.valores.forEach((x, t) => (v[t] += x));
    return v;
  }
}

export interface Ctx {
  sc: Scenario;
  N: number;
  wacc: number;
  pu: number;
  pr: number;
  prd: number;
  fTopo: number;
  dias: number;
  horasDia: number;
  horasCalendarioAno: number;
  velocidade: number;
  /** Energia na roda já escalada por topografia e perfil, antes do peso. */
  energiaRodaParcial: number;
  cargaAlvoT: number;
  demandaTKmAno: number;
  cargaUtil: Record<RouteKey, number>;
  massaEnergiaT: Record<RouteKey, number>;
  precoCarbono: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Massa e carga útil (item 8.1)
// ─────────────────────────────────────────────────────────────────────────────
function massaSistemaEnergiaKg(sc: Scenario, rota: RouteKey): number {
  if (rota === "diesel") {
    const d = sc.diesel;
    return (
      d.capacidadeTanqueL * CONST.DENSIDADE_DIESEL_KG_L +
      d.massaTanqueVazioKg +
      d.posTratamentoMassaKg +
      d.arlaTanqueL * CONST.DENSIDADE_ARLA_KG_L
    );
  }
  if (rota === "h2") {
    const h = sc.h2;
    return (
      h.capacidadeH2Kg * h.massaCilindroKgPorKgH2 +
      h.potenciaPilhaKW * h.massaPilhaKgPorKW +
      h.bateriaTampaoKWh * h.massaBateriaKgPorKWh
    );
  }
  const b = sc.bev;
  return b.capacidadeKWh * b.massaPackKgPorKWh + b.massaExtraSistemaKg;
}

function pbtcDe(sc: Scenario, rota: RouteKey) {
  return rota === "diesel" ? sc.diesel.pbtcT : rota === "h2" ? sc.h2.pbtcT : sc.bev.pbtcT;
}
function taraBaseDe(sc: Scenario, rota: RouteKey) {
  return rota === "diesel" ? sc.diesel.taraBaseT : rota === "h2" ? sc.h2.taraBaseT : sc.bev.taraBaseT;
}
function toleranciaDe(sc: Scenario, rota: RouteKey) {
  // A tolerância de peso vale apenas para veículos de emissão zero.
  return rota === "diesel" ? 0 : rota === "h2" ? sc.h2.toleranciaRegulatoriaT : sc.bev.toleranciaRegulatoriaT;
}
/** Seleciona, entre três campos homônimos, o que corresponde à rota. */
function porRota<T>(rota: RouteKey, diesel: T, h2: T, bev: T): T {
  return rota === "diesel" ? diesel : rota === "h2" ? h2 : bev;
}

function precoDe(sc: Scenario, rota: RouteKey): number {
  if (rota === "diesel") return sc.diesel.precoAquisicao;
  const r = rota === "h2" ? sc.h2 : sc.bev;
  if (r.modoPreco === "importacao") {
    const cif = r.impFobUsd * sc.econ.usdBrl * (1 + r.impFreteSeguroPct / 100);
    const comII = cif * (1 + r.impIiPct / 100);
    const comIPI = comII * (1 + r.impIpiPct / 100);
    // ICMS na importação é calculado "por dentro" sobre a base já formada.
    const comICMS = comIPI / (1 - r.impIcmsPct / 100);
    return comICMS + cif * (r.impDespachoPct / 100);
  }
  return r.precoAquisicao;
}
function residualCurvaDe(sc: Scenario, rota: RouteKey) {
  return rota === "diesel" ? sc.diesel.residual : rota === "h2" ? sc.h2.residual : sc.bev.residual;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloco econômico comum: aquisição, financiamento, seguro, tributos, residual
// ─────────────────────────────────────────────────────────────────────────────
interface BlocoAtivo {
  depreciacao: number[];
  juros: number[];
  valorAtivo: number[];
  residualValor: number;
  capexProprio: number;
}

function blocoAtivo(ctx: Ctx, f: Fluxo, rota: RouteKey): BlocoAtivo {
  const { sc, N } = ctx;
  const preco = precoDe(sc, rota);
  const curva = residualCurvaDe(sc, rota);
  const { trib, comuns, fin } = sc;
  const incentivoCapexPct = porRota(rota, trib.incentivoCapexPctDiesel, trib.incentivoCapexPctH2, trib.incentivoCapexPctBev);
  const incentivoAnual = porRota(rota, trib.incentivoAnualDiesel, trib.incentivoAnualH2, trib.incentivoAnualBev);
  const seguroPct = porRota(rota, comuns.seguroPctDiesel, comuns.seguroPctH2, comuns.seguroPctBev);
  const ipvaPct = porRota(rota, trib.ipvaPctDiesel, trib.ipvaPctH2, trib.ipvaPctBev);
  const depAnos = porRota(rota, trib.depAnosDiesel, trib.depAnosH2, trib.depAnosBev);
  const jurosAA = porRota(rota, fin.jurosDiesel, fin.jurosH2, fin.jurosBev);
  const aluguelMensal = porRota(rota, fin.aluguelMensalDiesel, fin.aluguelMensalH2, fin.aluguelMensalBev);
  const choque = porRota(rota, sc.diesel.choqueResidualPct, sc.h2.choqueResidualPct, sc.bev.choqueResidualPct);

  const capexLiquido = preco * (1 - incentivoCapexPct / 100);
  const aquisicao = zeros(N + 1);
  const financiamento = zeros(N + 1);
  const juros = zeros(N + 1);
  const regime = sc.econ.regime;

  if (regime === "avista") {
    aquisicao[0] = capexLiquido;
    f.aud(
      "CAPEX do veículo",
      "preço de aquisição × (1 − incentivo sobre CAPEX)",
      `${fmt(preco, 0)} × (1 − ${fmt(incentivoCapexPct, 1)}%)`,
      capexLiquido,
      "R$",
    );
  } else if (regime === "financiamento" || regime === "leasing") {
    const entrada = (capexLiquido * sc.fin.entradaPct) / 100;
    const financiado = capexLiquido - entrada;
    const custosOper = (financiado * (sc.fin.iofPct + sc.fin.estruturacaoPct)) / 100;
    const principal = financiado + custosOper;
    aquisicao[0] = entrada;
    const crono = cronogramaFinanciamento(
      principal,
      jurosAA,
      sc.fin.prazoMeses,
      sc.fin.carenciaMeses,
      sc.fin.sistema,
      N,
      sc.econ.ipca,
    );
    crono.forEach((c, t) => {
      financiamento[t] = c.juros + c.amortizacao;
      juros[t] = c.juros;
    });
    f.aud(
      "Valor financiado",
      "(CAPEX − entrada) × (1 + IOF + estruturação)",
      `(${fmt(capexLiquido, 0)} − ${fmt(entrada, 0)}) × (1 + ${fmt(sc.fin.iofPct + sc.fin.estruturacaoPct, 2)}%)`,
      principal,
      "R$",
    );
    f.aud(
      "Juros totais do financiamento",
      "Σ juros deflacionados pelo IPCA",
      `${sc.fin.sistema}, ${fmt(jurosAA, 2)}% a.a., ${sc.fin.prazoMeses} meses`,
      sum(juros),
      "R$",
    );
  } else {
    for (let t = 1; t <= N; t++) financiamento[t] = aluguelMensal * 12;
  }

  f.add("aquisicao", "Aquisição (entrada / à vista)", "aquisicao", aquisicao);
  f.add(
    "financiamento",
    regime === "aluguel" ? "Mensalidade de aluguel" : "Prestações (juros + amortização)",
    "financiamento",
    financiamento,
  );

  // Valor do ativo ao longo do tempo — base de seguro e IPVA.
  const valorAtivo = zeros(N + 1);
  for (let t = 0; t <= N; t++) valorAtivo[t] = (preco * curvaAno(curva, t)) / 100;

  if (regime !== "aluguel") {
    f.addOper("seguro", "Seguro", "seguroTributos", (t) => (valorAtivo[t] * seguroPct) / 100);
    f.addOper("ipva", "IPVA", "seguroTributos", (t) => (valorAtivo[t] * ipvaPct) / 100);
  }

  // Valor residual e tributação do ganho de capital.
  const depreciacao =
    regime === "aluguel" ? zeros(N + 1) : depreciacaoLinear(capexLiquido, depAnos, N);
  let residualValor = 0;
  if (regime !== "aluguel") {
    residualValor = (preco * curvaAno(curva, N)) / 100 * (1 - choque / 100);
    const residualLinha = zeros(N + 1);
    residualLinha[N] = -residualValor;
    f.add("residual", "Valor residual do veículo", "residual", residualLinha);
    const valorContabil = Math.max(0, capexLiquido - sum(depreciacao));
    const ganho = Math.max(0, residualValor - valorContabil);
    if (ganho > 0 && sc.trib.regime === "lucroReal") {
      const imposto = zeros(N + 1);
      imposto[N] = (ganho * sc.trib.aliquotaIRCSLL) / 100;
      f.add("irResidual", "IRPJ/CSLL sobre o ganho na revenda", "fiscal", imposto);
    }
    f.aud(
      "Valor residual no ano final",
      "preço × curva de residual(N) × (1 − choque)",
      `${fmt(preco, 0)} × ${fmt(curvaAno(curva, N), 1)}% × (1 − ${fmt(choque, 1)}%)`,
      residualValor,
      "R$",
    );
  }

  if (incentivoAnual > 0) {
    const inc = zeros(N + 1);
    for (let t = 1; t <= N; t++) inc[t] = -incentivoAnual;
    f.add("incentivoAnual", "Incentivos e créditos fiscais recorrentes", "seguroTributos", inc);
  }

  return { depreciacao, juros, valorAtivo, residualValor, capexProprio: capexLiquido };
}

// ─────────────────────────────────────────────────────────────────────────────
// Custos comuns de operação (mão de obra, pedágio, garagem, licenciamento)
// ─────────────────────────────────────────────────────────────────────────────
function custosComuns(ctx: Ctx, f: Fluxo, rota: RouteKey, kmAjustado: number[]) {
  const { sc, N } = ctx;
  const c = sc.comuns;
  const custoMotoristaAno =
    (c.salarioMotoristaMes * (1 + c.encargosPct / 100) + c.beneficiosMes) * 12 * c.motoristasPorVeiculo;

  f.addOper("motorista", "Motorista (salário, encargos e benefícios)", "maoDeObra", (t) =>
    custoMotoristaAno * esc(sc.econ.escMaoObra, t),
  );
  const trein = zeros(N + 1);
  trein[0] = porRota(rota, c.treinamentoDiesel, c.treinamentoH2, c.treinamentoBev) * c.motoristasPorVeiculo;
  f.add("treinamento", "Treinamento inicial da equipe", "maoDeObra", trein);

  f.addOper("pedagio", "Pedágio", "seguroTributos", (t) => c.pedagioPorKm * kmAjustado[t] * esc(sc.econ.escPecas, t));
  f.addOper("licenciamento", "Licenciamento, RNTRC e taxas", "seguroTributos", () => c.licenciamentoAno);
  f.addOper("telemetria", "Rastreamento e telemetria", "seguroTributos", () => c.telemetriaMes * 12);
  f.addOper("admin", "Administrativo e garagem", "seguroTributos", () => c.adminGaragemMes * 12);

  f.aud(
    "Custo anual de motorista",
    "(salário × (1 + encargos) + benefícios) × 12 × motoristas por veículo",
    `(${fmt(c.salarioMotoristaMes, 0)} × (1 + ${fmt(c.encargosPct, 0)}%) + ${fmt(c.beneficiosMes, 0)}) × 12 × ${fmt(c.motoristasPorVeiculo, 2)}`,
    custoMotoristaAno,
    "R$/ano",
  );
}

/** Pneus e freios são comuns às três rotas, com fatores de vida próprios. */
function pneusEFreios(ctx: Ctx, f: Fluxo, kmAjustado: number[], fatorPneu: number, fatorFreio: number) {
  const { sc } = ctx;
  const c = sc.comuns;
  const vidaTotalPneu = c.pneuVidaKm * (1 + c.recapagens) * fatorPneu;
  const custoCicloPneu = c.pneuPreco + c.recapagens * c.recapagemCusto;
  const pneuPorKm = vidaTotalPneu > 0 ? (custoCicloPneu / vidaTotalPneu) * c.pneusQtd : 0;
  const freioPorKm = c.freiosVidaKm * fatorFreio > 0 ? c.freiosCusto / (c.freiosVidaKm * fatorFreio) : 0;

  f.addOper("pneus", "Pneus (novos e recapagens)", "manutencao", (t) =>
    pneuPorKm * kmAjustado[t] * esc(sc.econ.escPecas, t),
  );
  f.addOper("freios", "Freios", "manutencao", (t) => freioPorKm * kmAjustado[t] * esc(sc.econ.escPecas, t));

  f.aud(
    "Custo de pneus por km",
    "(preço + recapagens × custo) ÷ (vida × (1 + recapagens) × fator da rota) × quantidade",
    `(${fmt(c.pneuPreco, 0)} + ${c.recapagens} × ${fmt(c.recapagemCusto, 0)}) ÷ (${fmt(c.pneuVidaKm, 0)} × ${1 + c.recapagens} × ${fmt(fatorPneu, 2)}) × ${c.pneusQtd}`,
    pneuPorKm,
    "R$/km",
  );
}

/** Indisponibilidade convertida em custo. */
function indisponibilidade(
  ctx: Ctx,
  f: Fluxo,
  horasAbastecimento: number,
  horasManut: number,
  horasFalha: number,
) {
  const { sc, N, horasCalendarioAno, horasDia } = ctx;
  const totalHoras = horasAbastecimento + horasManut + horasFalha;
  const disponibilidade = clamp(1 - totalHoras / Math.max(1, horasCalendarioAno), 0.05, 1);
  const diasParados = totalHoras / Math.max(1, horasDia);
  f.addOper("indisponibilidade", "Custo de indisponibilidade", "indisponibilidade", () =>
    diasParados * sc.comuns.custoDiaParado,
  );
  f.aud(
    "Disponibilidade operacional",
    "1 − (horas de abastecimento + manutenção + falha) ÷ horas de calendário operacional",
    `1 − (${fmt(horasAbastecimento, 0)} + ${fmt(horasManut, 0)} + ${fmt(horasFalha, 0)}) ÷ ${fmt(horasCalendarioAno, 0)}`,
    disponibilidade * 100,
    "%",
  );
  return { disponibilidade, diasParados, totalHoras };
}

// ─────────────────────────────────────────────────────────────────────────────
// Benefício fiscal, carbono e fechamento do fluxo de caixa
// ─────────────────────────────────────────────────────────────────────────────
const GRUPOS_DEDUTIVEIS: GrupoCusto[] = [
  "energia",
  "arla",
  "manutencao",
  "substituicao",
  "maoDeObra",
  "seguroTributos",
  "carbono",
];

function blocoCarbono(ctx: Ctx, f: Fluxo, emissoesT: number[]) {
  const { sc, N } = ctx;
  const v = zeros(N + 1);
  for (let t = 1; t <= N; t++) v[t] = emissoesT[t] * ctx.precoCarbono[t];
  f.add("carbono", "Custo de carbono", "carbono", v);
  if (sc.carbono.cbioElegivel && sc.carbono.cbioPorAno > 0) {
    const c = zeros(N + 1);
    for (let t = 1; t <= N; t++) c[t] = -sc.carbono.cbioPorAno * sc.carbono.cbioPreco;
    f.add("cbio", "Receita de CBIOs (RenovaBio)", "carbono", c);
  }
}

function blocoFiscal(ctx: Ctx, f: Fluxo, bloco: BlocoAtivo, depreciacaoExtra: number[]) {
  const { sc, N } = ctx;
  if (sc.trib.regime !== "lucroReal") {
    f.alerta(
      "info",
      "Regime tributário sem aproveitamento de benefício fiscal: depreciação e despesas não reduzem IRPJ/CSLL neste cenário.",
    );
    return zeros(N + 1);
  }
  const aliq = sc.trib.aliquotaIRCSLL / 100;
  const dedutivel = zeros(N + 1);
  for (let t = 0; t <= N; t++) {
    dedutivel[t] += bloco.depreciacao[t] + depreciacaoExtra[t] + bloco.juros[t];
    if (sc.econ.regime === "aluguel") {
      const l = f.linhas.find((x) => x.chave === "financiamento");
      if (l) dedutivel[t] += l.valores[t];
    }
    if (sc.trib.deduzirDespesasOperacionais) {
      for (const l of f.linhas) {
        if (GRUPOS_DEDUTIVEIS.includes(l.grupo) && l.chave !== "irResidual") dedutivel[t] += l.valores[t];
      }
    }
  }
  const beneficio = dedutivel.map((v) => -v * aliq);
  f.add("beneficioFiscal", "Benefício fiscal (IRPJ/CSLL)", "fiscal", beneficio);
  f.aud(
    "Benefício fiscal acumulado",
    "(depreciação + juros + despesas dedutíveis) × alíquota IRPJ/CSLL",
    `base de ${fmt(sum(dedutivel), 0)} × ${fmt(sc.trib.aliquotaIRCSLL, 1)}%`,
    -sum(beneficio),
    "R$",
  );
  return beneficio;
}

interface DadosRota {
  massaEnergiaT: number;
  cargaUtilT: number;
  cargaTransportadaT: number;
  fatorViagens: number;
  kmAjustado: number[];
  consumoEspecifico: number[];
  unidadeConsumo: string;
  energiaTanqueKWhKm: number;
  emissoesT: number[];
  noxKg: number;
  mpKg: number;
  horasAbastecimento: number;
  horasManut: number;
  horasFalha: number;
  autonomia: number[];
  anoSubstituicao: number;
  detalheSubstituicao: string;
  bloco: BlocoAtivo;
  depreciacaoExtra: number[];
  faixaEficiencia: [number, number];
}

function finalizar(ctx: Ctx, f: Fluxo, rota: RouteKey, d: DadosRota): ResultadoRota {
  const { sc, N, wacc } = ctx;
  blocoCarbono(ctx, f, d.emissoesT);
  const disp = indisponibilidade(ctx, f, d.horasAbastecimento, d.horasManut, d.horasFalha);
  blocoFiscal(ctx, f, d.bloco, d.depreciacaoExtra);

  const fluxoAnual = f.soma();
  const tco = npv(fluxoAnual, wacc);

  const kmDesc = d.kmAjustado.reduce((a, v, t) => a + v / Math.pow(1 + wacc, t), 0);
  const tkmAno = zeros(N + 1);
  for (let t = 1; t <= N; t++) {
    tkmAno[t] = ctx.demandaTKmAno;
  }
  const tkmDesc = tkmAno.reduce((a, v, t) => a + v / Math.pow(1 + wacc, t), 0);

  // Frota equivalente (item 8.4)
  const kmCapazAno = ctx.dias * ctx.horasDia * ctx.velocidade * disp.disponibilidade;
  const capacidadeTKmAno =
    kmCapazAno * (1 - sc.mission.retornoVazioPct / 100) * d.cargaTransportadaT;
  const nVeiculos = capacidadeTKmAno > 0 ? Math.ceil(ctx.demandaTKmAno / capacidadeTKmAno) : 0;
  f.aud(
    "Frota equivalente",
    "teto( demanda anual [t·km] ÷ (capacidade anual por veículo × disponibilidade) )",
    `teto( ${fmt(ctx.demandaTKmAno, 0)} ÷ (${fmt(ctx.dias * ctx.horasDia * ctx.velocidade * (1 - sc.mission.retornoVazioPct / 100) * d.cargaTransportadaT, 0)} × ${fmt(disp.disponibilidade * 100, 1)}%) )`,
    nVeiculos,
    "veículos",
  );

  const emissoesTotais = sum(d.emissoesT);
  const kmTotal = sum(d.kmAjustado);
  const taraParcial = taraBaseDe(sc, rota) + d.massaEnergiaT;
  const energiaRoda =
    ctx.energiaRodaParcial *
    ((taraParcial + d.cargaTransportadaT) / Math.max(1, sc.mission.pesoBrutoReferenciaT));
  const eficiencia = d.energiaTanqueKWhKm > 0 ? energiaRoda / d.energiaTanqueKWhKm : 0;
  f.aud(
    "Energia na roda desta rota",
    "energia de referência × fator topográfico × fator de perfil × (peso bruto ÷ peso de referência)",
    `${fmt(sc.mission.energiaRodaKWhKm, 3)} × fatores → peso bruto ${fmt(taraParcial + d.cargaTransportadaT, 2)} t`,
    energiaRoda,
    "kWh/km",
  );
  if (eficiencia < d.faixaEficiencia[0] || eficiencia > d.faixaEficiencia[1]) {
    f.alerta(
      "aviso",
      `Eficiência implícita do trem de força em ${fmt(eficiencia * 100, 1)}%, fora da faixa esperada de ${fmt(d.faixaEficiencia[0] * 100, 0)}% a ${fmt(d.faixaEficiencia[1] * 100, 0)}%. Reveja o consumo específico ou a energia requerida na roda.`,
    );
  }
  const taraTotal = taraParcial;
  if (taraTotal + d.cargaTransportadaT > pbtcDe(sc, rota) + toleranciaDe(sc, rota) + 1e-6) {
    f.alerta("erro", "Tara somada à carga transportada excede o PBTC declarado.");
  }
  if (d.cargaUtilT <= 0) {
    f.alerta("erro", "Carga útil resultante nula ou negativa: o sistema de energia consome todo o PBTC disponível.");
  }

  const porGrupo = {} as Record<GrupoCusto, number>;
  for (const g of GRUPO_ORDEM) porGrupo[g] = 0;
  for (const l of f.linhas) porGrupo[l.grupo] += npv(l.valores, wacc);

  return {
    rota,
    linhas: f.linhas,
    fluxoAnual,
    tco,
    tcoFrota: tco * nVeiculos,
    tcoPorKm: kmDesc > 0 ? tco / kmDesc : 0,
    tcoPorTKm: tkmDesc > 0 ? tco / tkmDesc : 0,
    custoMensalEquivalente: (tco * crf(wacc, N)) / 12,
    kmAjustado: d.kmAjustado,
    tkmAno,
    massaSistemaEnergiaT: d.massaEnergiaT,
    taraTotalT: taraTotal,
    cargaUtilT: d.cargaUtilT,
    cargaTransportadaT: d.cargaTransportadaT,
    fatorViagens: d.fatorViagens,
    horasAbastecimentoAno: d.horasAbastecimento,
    horasManutencaoAno: d.horasManut,
    horasFalhaAno: d.horasFalha,
    disponibilidade: disp.disponibilidade,
    diasParadosAno: disp.diasParados,
    nVeiculos,
    emissaoPorKmG: kmTotal > 0 ? (emissoesTotais * 1e6) / kmTotal : 0,
    emissoesAnuaisT: d.emissoesT,
    emissoesTotaisT: emissoesTotais,
    noxAnualKg: d.noxKg,
    mpAnualKg: d.mpKg,
    consumoEspecifico: d.consumoEspecifico,
    unidadeConsumo: d.unidadeConsumo,
    energiaTanqueKWhKm: d.energiaTanqueKWhKm,
    eficienciaImplicita: eficiencia,
    anoSubstituicao: d.anoSubstituicao,
    detalheSubstituicao: d.detalheSubstituicao,
    autonomiaAno: d.autonomia,
    auditoria: f.auditoria,
    alertas: f.alertas,
    porGrupo,
  };
}

/** Penalidade de payload (item 8.2), comum às três rotas. */
function payload(ctx: Ctx, f: Fluxo, rota: RouteKey) {
  const { sc, N } = ctx;
  const massaEnergiaT = massaSistemaEnergiaKg(sc, rota) / 1000;
  const cargaUtilT = ctx.cargaUtil[rota];
  const cargaTransportadaT = Math.max(0.1, Math.min(cargaUtilT, ctx.cargaAlvoT));
  const fatorViagens = sc.mission.aplicarPenalidadePayload
    ? ctx.cargaAlvoT / cargaTransportadaT
    : 1;
  const kmAjustado = zeros(N + 1);
  for (let t = 1; t <= N; t++) kmAjustado[t] = sc.mission.kmAno * fatorViagens;
  f.aud(
    "Carga útil disponível",
    "PBTC + tolerância regulatória − tara base − massa do sistema de energia",
    `${fmt(pbtcDe(sc, rota), 1)} + ${fmt(toleranciaDe(sc, rota), 2)} − ${fmt(taraBaseDe(sc, rota), 2)} − ${fmt(massaEnergiaT, 2)}`,
    cargaUtilT,
    "t",
  );
  f.aud(
    "Fator de viagens (penalidade de payload)",
    "carga-alvo da missão ÷ carga efetivamente transportada pela rota",
    `${fmt(ctx.cargaAlvoT, 2)} ÷ ${fmt(cargaTransportadaT, 2)}`,
    fatorViagens,
    "x",
  );
  return { massaEnergiaT, cargaUtilT, cargaTransportadaT, fatorViagens, kmAjustado };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTA DIESEL
// ─────────────────────────────────────────────────────────────────────────────
function calcDiesel(ctx: Ctx): ResultadoRota {
  const { sc, N } = ctx;
  const d = sc.diesel;
  const f = new Fluxo(N, "diesel");
  const pl = payload(ctx, f, "diesel");
  const km = pl.kmAjustado;

  // Consumo específico ponderado por perfil, topografia e carga.
  const invMedio = ctx.pu / d.consumoUrbanoKmL + ctx.pr / d.consumoRegionalKmL + ctx.prd / d.consumoRodoviarioKmL;
  const ajusteCarga = Math.max(
    0.5,
    1 + (d.ajusteConsumoPorTonPct / 100) * (pl.cargaTransportadaT - d.cargaReferenciaT),
  );
  const lPorKm = invMedio * ctx.fTopo * ajusteCarga;
  f.aud(
    "Consumo de rodagem",
    "Σ (perfil ÷ km/L) × fator topográfico × ajuste de carga",
    `${fmt(invMedio, 4)} × ${fmt(ctx.fTopo, 3)} × ${fmt(ajusteCarga, 3)}`,
    lPorKm,
    "L/km",
  );

  const horasOperacaoAno = km[1] / ctx.velocidade;
  const litrosMarchaLenta = horasOperacaoAno * (d.pctMarchaLenta / 100) * d.consumoMarchaLentaLh;
  const litrosPTO =
    (sc.mission.ptoPotenciaKW * sc.mission.ptoHorasDia * ctx.dias) /
    (CONST.PCI_DIESEL_KWH_L * d.eficienciaMotor);
  const litrosAno =
    (lPorKm * km[1] + litrosMarchaLenta + litrosPTO) / (1 - d.perdasEvaporacaoPct / 100);
  f.aud(
    "Consumo anual de diesel",
    "(rodagem + marcha lenta + PTO) ÷ (1 − perdas)",
    `(${fmt(lPorKm * km[1], 0)} + ${fmt(litrosMarchaLenta, 0)} + ${fmt(litrosPTO, 0)}) ÷ (1 − ${fmt(d.perdasEvaporacaoPct, 2)}%)`,
    litrosAno,
    "L/ano",
  );

  const precoBase = d.precoDieselL * (d.usarBasePropria ? 1 - d.descontoBasePropriaPct / 100 : 1);
  f.addOper("diesel", "Diesel S10", "energia", (t) => litrosAno * precoBase * esc(sc.econ.escDiesel, t));
  if (sc.trib.pisCofinsRecupera && sc.trib.regime === "lucroReal") {
    const aliq = sc.trib.pisCofinsCombustivelPct / 100;
    f.addOper("creditoDiesel", "Crédito de PIS/COFINS sobre o diesel", "energia", (t) =>
      -litrosAno * precoBase * aliq * esc(sc.econ.escDiesel, t),
    );
  }

  // ARLA 32 — bloco explícito e separado no gráfico de decomposição.
  const litrosArla =
    d.arlaMetodo === "pctDiesel" ? litrosAno * (d.arlaPctDiesel / 100) : (km[1] / 100) * d.arlaL100km;
  f.addOper("arla", "ARLA 32", "arla", (t) => litrosArla * d.arlaPrecoL * esc(sc.econ.escArla, t));
  f.addOper("arlaContaminacao", "Contaminação e cristalização do ARLA", "arla", (t) =>
    d.arlaEventosAno * d.arlaCustoEvento * esc(sc.econ.escPecas, t),
  );
  f.aud(
    "Consumo anual de ARLA 32",
    d.arlaMetodo === "pctDiesel" ? "consumo de diesel × % de ARLA" : "km ÷ 100 × L/100 km",
    d.arlaMetodo === "pctDiesel"
      ? `${fmt(litrosAno, 0)} × ${fmt(d.arlaPctDiesel, 2)}%`
      : `${fmt(km[1], 0)} ÷ 100 × ${fmt(d.arlaL100km, 2)}`,
    litrosArla,
    "L/ano",
  );

  // Lubrificantes
  const custoOleoPorKm =
    d.oleoIntervaloKm > 0
      ? (d.oleoVolumeL * d.oleoPrecoL * (1 + d.outrosFluidosPctOleo / 100)) / d.oleoIntervaloKm
      : 0;
  f.addOper("lubrificantes", "Lubrificantes", "energia", (t) =>
    custoOleoPorKm * km[t] * esc(sc.econ.escPecas, t),
  );

  // Manutenção
  f.addOper("preventiva", "Manutenção preventiva", "manutencao", (t) =>
    d.preventivaPorKm * km[t] * esc(sc.econ.escPecas, t),
  );
  f.addOper("filtros", "Filtros (ar, combustível, separador)", "manutencao", (t) =>
    (km[t] / d.filtrosIntervaloKm) * d.filtrosCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("scr", "Catalisador SCR", "manutencao", (t) =>
    (km[t] / d.scrVidaKm) * d.scrCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("dpf", "Limpeza e regeneração do DPF", "manutencao", (t) =>
    (km[t] / d.dpfIntervaloKm) * d.dpfCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("sensorNox", "Sensores de NOx", "manutencao", (t) =>
    (km[t] / d.sensorNoxVidaKm) * d.sensorNoxCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("derating", "Derating por falha do pós-tratamento", "manutencao", (t) =>
    d.deratingProbAno * d.deratingCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("altoValor", "Embreagem, retarder e arrefecimento", "manutencao", (t) =>
    (km[t] / d.altoValorVidaKm) * d.altoValorCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("corretiva", "Manutenção corretiva não programada", "manutencao", (t) =>
    d.corretivaAno1 * Math.pow(1 + d.corretivaCrescimentoPctAA / 100, t - 1) * esc(sc.econ.escPecas, t),
  );
  pneusEFreios(ctx, f, km, d.fatorVidaPneu, d.fatorVidaFreio);

  // Risco e obsolescência
  f.addOper("zonaRestrita", "Restrição de acesso a zonas de baixa emissão", "seguroTributos", () =>
    ((d.receitaAnual * d.zonaRestritaPctRotas) / 100) * (d.zonaRestritaCustoPct / 100),
  );
  f.addOper("descontoReceita", "Desconto exigido por clientes", "seguroTributos", () =>
    (d.receitaAnual * d.descontoReceitaPct) / 100,
  );

  custosComuns(ctx, f, "diesel", km);
  const bloco = blocoAtivo(ctx, f, "diesel");

  // Emissões
  const emissoes = zeros(N + 1);
  const fatorTotal = sc.carbono.fatorDieselKgL + sc.carbono.fatorDieselUpstreamKgL;
  for (let t = 1; t <= N; t++) emissoes[t] = (litrosAno * fatorTotal) / 1000;
  f.aud(
    "Emissões anuais WTW",
    "consumo anual × (fator TTW + upstream) ÷ 1000",
    `${fmt(litrosAno, 0)} × ${fmt(fatorTotal, 3)} ÷ 1000`,
    emissoes[1],
    "tCO₂e/ano",
  );

  const eventosAbast = litrosAno / (d.capacidadeTanqueL * CONST.USO_TANQUE_DIESEL);
  const horasAbast = (eventosAbast * d.tempoAbastecimentoMin) / 60;
  const autonomia = zeros(N + 1).map(() =>
    lPorKm > 0 ? (d.capacidadeTanqueL * CONST.USO_TANQUE_DIESEL) / lPorKm : 0,
  );

  return finalizar(ctx, f, "diesel", {
    ...pl,
    consumoEspecifico: zeros(N + 1).map((_, t) => (t === 0 ? 0 : lPorKm)),
    unidadeConsumo: "L/km",
    energiaTanqueKWhKm: lPorKm * CONST.PCI_DIESEL_KWH_L,
    emissoesT: emissoes,
    noxKg: (sc.carbono.noxDieselGkm * km[1]) / 1000,
    mpKg: (sc.carbono.mpDieselGkm * km[1]) / 1000,
    horasAbastecimento: horasAbast,
    horasManut: d.horasParadoManutAno,
    horasFalha: d.falhaProbAno * d.falhaHorasEvento,
    autonomia,
    anoSubstituicao: 0,
    detalheSubstituicao: "Sem substituição de sistema de energia no horizonte.",
    bloco,
    depreciacaoExtra: zeros(N + 1),
    faixaEficiencia: CONST.EFIC_DIESEL,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTA HIDROGÊNIO (FCEV)
// ─────────────────────────────────────────────────────────────────────────────
/** Custo do hidrogênio na porta do veículo, conforme o modo de suprimento. */
export function custoH2PorKg(ctx: Ctx, f?: Fluxo): number {
  const { sc } = ctx;
  const h = sc.h2;
  if (h.modoSuprimento === "A") {
    const comIcms = h.aPrecoIncluiIcms ? h.aPrecoKg : h.aPrecoKg / (1 - sc.trib.icmsH2Pct / 100);
    const custo = (comIcms + h.aCustoLogisticoKg) / (1 - h.aPerdasTransferenciaPct / 100);
    f?.aud(
      "Custo do H₂ (modo A — comprado)",
      "(preço na porta com ICMS + logística) ÷ (1 − perdas de transferência)",
      `(${fmt(comIcms, 2)} + ${fmt(h.aCustoLogisticoKg, 2)}) ÷ (1 − ${fmt(h.aPerdasTransferenciaPct, 2)}%)`,
      custo,
      "R$/kg",
    );
    return custo;
  }
  if (h.modoSuprimento === "B") {
    const producaoAno =
      (h.bPotenciaKW * CONST.HORAS_ANO * (h.bFatorCapacidadePct / 100)) / h.bConsumoKWhKg;
    const capex = h.bCapexEletrolisadorRSKW * h.bPotenciaKW + h.bCapexArmazenamentoRSKg * h.bEstoqueKg;
    const capexAnual = capex * crf(ctx.wacc, h.bVidaPlantaAnos);
    const opexFixo = (capex * h.bOpexFixoPctCapexAno) / 100;
    const horasAno = CONST.HORAS_ANO * (h.bFatorCapacidadePct / 100);
    const stackAnual =
      h.bVidaStackHoras > 0
        ? ((h.bCustoStackRSKW * h.bPotenciaKW) / h.bVidaStackHoras) * horasAno
        : 0;
    const energiaKWhKg = h.bConsumoKWhKg + h.bCompressaoKWhKg + h.bPreResfriamentoKWhKg;
    const custoEnergia = energiaKWhKg * h.bPrecoEnergiaRSKWh;
    const custoAgua = (h.bAguaLKg / 1000) * h.bCustoAguaRSm3;
    const custo =
      producaoAno > 0 ? (capexAnual + opexFixo + stackAnual) / producaoAno + custoEnergia + custoAgua : 0;
    f?.aud(
      "Produção anual da planta de eletrólise",
      "potência × 8760 h × fator de capacidade ÷ consumo específico",
      `${fmt(h.bPotenciaKW, 0)} × 8760 × ${fmt(h.bFatorCapacidadePct, 1)}% ÷ ${fmt(h.bConsumoKWhKg, 1)}`,
      producaoAno,
      "kg/ano",
    );
    f?.aud(
      "Custo nivelado do H₂ (modo B — eletrólise)",
      "(CAPEX anualizado + OPEX fixo + stack) ÷ produção + energia + água",
      `(${fmt(capexAnual, 0)} + ${fmt(opexFixo, 0)} + ${fmt(stackAnual, 0)}) ÷ ${fmt(producaoAno, 0)} + ${fmt(custoEnergia, 2)} + ${fmt(custoAgua, 3)}`,
      custo,
      "R$/kg",
    );
    return custo;
  }
  // Modo C — biomassa / looping químico
  const rendimentoPorTUmida = h.cRendimentoKgPorT * (1 - h.cUmidadePct / 100);
  const producaoAno = h.cCapacidadeKgDia * 365;
  const capexAnual = h.cCapexPlanta * crf(ctx.wacc, h.cVidaPlantaAnos);
  const opexFixo = (h.cCapexPlanta * h.cOpexFixoPctAno) / 100;
  const custoBiomassa = rendimentoPorTUmida > 0 ? h.cCustoBiomassaRSt / rendimentoPorTUmida : 0;
  const creditoCoproduto =
    rendimentoPorTUmida > 0 ? (h.cCreditoCoprodutoRSt * h.cCoprodutoTPorTBiomassa) / rendimentoPorTUmida : 0;
  const custo =
    producaoAno > 0
      ? (capexAnual + opexFixo) / producaoAno + custoBiomassa + h.cOpexVariavelRSKg - creditoCoproduto
      : 0;
  f?.aud(
    "Custo nivelado do H₂ (modo C — biomassa)",
    "(CAPEX anualizado + OPEX fixo) ÷ produção + biomassa + OPEX variável − crédito de coprodutos",
    `(${fmt(capexAnual, 0)} + ${fmt(opexFixo, 0)}) ÷ ${fmt(producaoAno, 0)} + ${fmt(custoBiomassa, 2)} + ${fmt(h.cOpexVariavelRSKg, 2)} − ${fmt(creditoCoproduto, 2)}`,
    custo,
    "R$/kg",
  );
  return custo;
}

function calcH2(ctx: Ctx): ResultadoRota {
  const { sc, N } = ctx;
  const h = sc.h2;
  const f = new Fluxo(N, "h2");
  const pl = payload(ctx, f, "h2");
  const km = pl.kmAjustado;

  const kgPor100Base =
    (ctx.pu * h.consumoUrbanoKg100km + ctx.pr * h.consumoRegionalKg100km + ctx.prd * h.consumoRodoviarioKg100km) *
      ctx.fTopo +
    h.ajusteConsumoPorTonKg100km * (pl.cargaTransportadaT - h.cargaReferenciaT);
  const consumoBase = Math.max(0.01, kgPor100Base) / 100; // kg/km
  const pesoBrutoT = h.taraBaseT + pl.massaEnergiaT + pl.cargaTransportadaT;
  const energiaRodaRota =
    ctx.energiaRodaParcial * (pesoBrutoT / Math.max(1, sc.mission.pesoBrutoReferenciaT));
  const minTeorico = energiaRodaRota / (CONST.PCI_H2_KWH_KG * h.eficienciaPilha);
  if (consumoBase < minTeorico) {
    f.alerta(
      "erro",
      `Consumo declarado (${fmt(consumoBase * 100, 2)} kg/100 km) está abaixo do mínimo teórico de ${fmt(minTeorico * 100, 2)} kg/100 km para a energia requerida na roda e a eficiência de pilha informadas.`,
    );
  }
  f.aud(
    "Consumo específico do FCEV",
    "Σ (perfil × kg/100 km) × fator topográfico + ajuste de carga",
    `${fmt(kgPor100Base, 3)} kg/100 km`,
    consumoBase * 100,
    "kg H₂/100 km",
  );

  const horasAno = km[1] / ctx.velocidade;
  const kgPTOAno =
    (sc.mission.ptoPotenciaKW * sc.mission.ptoHorasDia * ctx.dias) /
    (CONST.PCI_H2_KWH_KG * h.eficienciaPilha);

  // Laço anual: degradação da pilha e substituições.
  const consumoAno = zeros(N + 1);
  const kgAno = zeros(N + 1);
  const substituicao = zeros(N + 1);
  const autonomia = zeros(N + 1);
  let horasDesdeTroca = 0;
  let anoSubstituicao = 0;
  let detalhe = "Pilha não atinge o fim de vida dentro do horizonte analisado.";
  for (let t = 1; t <= N; t++) {
    const horasMedias = horasDesdeTroca + horasAno / 2;
    const fatorDeg = 1 + (h.degradacaoPilhaPct1000h / 100) * (horasMedias / 1000);
    consumoAno[t] = consumoBase * fatorDeg;
    kgAno[t] = (consumoAno[t] * km[t] + kgPTOAno) / (1 - h.perdasAbastecimentoPct / 100);
    autonomia[t] = (h.capacidadeH2Kg * CONST.USO_TANQUE_H2) / consumoAno[t];
    horasDesdeTroca += horasAno;
    if (h.vidaPilhaHoras > 0 && horasDesdeTroca >= h.vidaPilhaHoras) {
      substituicao[t] += h.potenciaPilhaKW * h.custoPilhaRSKW * esc(sc.econ.escPecas, t);
      horasDesdeTroca = 0;
      if (!anoSubstituicao) {
        anoSubstituicao = t;
        detalhe = `Pilha substituída no ano ${t}: ${fmt(h.vidaPilhaHoras, 0)} h de operação atingidas a ${fmt(horasAno, 0)} h/ano.`;
      }
    }
    if (autonomia[t] < sc.mission.distanciaMaxEntrePontosKm) {
      if (t === N)
        f.alerta(
          "aviso",
          `Autonomia no ano ${t} (${fmt(autonomia[t], 0)} km) não cobre o trecho máximo entre pontos de abastecimento (${fmt(sc.mission.distanciaMaxEntrePontosKm, 0)} km).`,
        );
    }
  }
  // Bateria tampão
  for (let t = h.bateriaTampaoVidaAnos; t <= N; t += Math.max(1, h.bateriaTampaoVidaAnos)) {
    if (t >= 1 && t <= N) substituicao[t] += h.bateriaTampaoKWh * h.custoBateriaTampaoRSKWh;
  }
  f.add("substituicao", "Substituição de pilha e bateria tampão", "substituicao", substituicao);

  // Suprimento de hidrogênio
  const custoKg = custoH2PorKg(ctx, f);
  f.addOper("h2", "Hidrogênio", "energia", (t) => kgAno[t] * custoKg * esc(sc.econ.escH2, t));
  if (sc.trib.pisCofinsRecupera && sc.trib.regime === "lucroReal") {
    f.addOper("creditoH2", "Crédito de PIS/COFINS sobre o H₂", "energia", (t) =>
      -kgAno[t] * custoKg * (sc.trib.pisCofinsCombustivelPct / 100) * esc(sc.econ.escH2, t),
    );
  }
  if (h.aTakeOrPayKgAno > 0 && h.modoSuprimento === "A") {
    f.addOper("takeOrPay", "Penalidade de take-or-pay", "energia", (t) =>
      Math.max(0, h.aTakeOrPayKgAno - kgAno[t]) * h.aPenalidadeKg,
    );
  }

  // Estação de abastecimento — CAPEX rateado pelo volume efetivamente despachado.
  const depreciacaoExtra = zeros(N + 1);
  const kgVeiculoAno = kgAno[1];
  const kgDespachadosAno = h.hrsCapacidadeKgDia * 365 * (h.hrsUtilizacaoPct / 100);
  const veiculosEquivalentes = kgVeiculoAno > 0 ? kgDespachadosAno / kgVeiculoAno : 1;
  if (h.usarHrsPropria) {
    const share = kgDespachadosAno > 0 ? Math.min(1, kgVeiculoAno / kgDespachadosAno) : 1;
    const capexImputado = h.hrsCapex * share;
    const infra = zeros(N + 1);
    infra[0] = capexImputado;
    if (N < h.hrsVidaAnos) infra[N] -= capexImputado * (1 - N / h.hrsVidaAnos);
    f.add("hrsCapex", "Estação de abastecimento (CAPEX rateado)", "infraestrutura", infra);
    f.addOper("hrsOpex", "O&M da estação de abastecimento", "infraestrutura", () =>
      ((h.hrsCapex * h.hrsOpexPctCapexAno) / 100) * share,
    );
    f.addOper("hrsEnergia", "Energia da estação (compressão e pré-resfriamento)", "infraestrutura", (t) =>
      kgAno[t] * h.hrsConsumoKWhKg * h.hrsPrecoEnergiaRSKWh * esc(sc.econ.escEnergia, t),
    );
    depreciacaoLinear(capexImputado, sc.trib.depAnosH2, N).forEach((v, t) => (depreciacaoExtra[t] += v));
    f.aud(
      "Rateio da estação de abastecimento",
      "consumo anual do veículo ÷ (capacidade × 365 × utilização)",
      `${fmt(kgVeiculoAno, 0)} ÷ (${fmt(h.hrsCapacidadeKgDia, 0)} × 365 × ${fmt(h.hrsUtilizacaoPct, 1)}%)`,
      share * 100,
      "% do CAPEX da estação",
    );
    f.aud(
      "Veículos equivalentes atendidos pela estação",
      "volume despachado ÷ consumo anual por veículo",
      `${fmt(kgDespachadosAno, 0)} ÷ ${fmt(kgVeiculoAno, 0)}`,
      veiculosEquivalentes,
      "veículos",
    );
  } else {
    f.addOper("hrsMovel", "Abastecimento móvel", "infraestrutura", (t) =>
      kgAno[t] * h.hrsMovelRSKg * esc(sc.econ.escH2, t),
    );
  }

  // Adequação de garagem, rateada pelos veículos atendidos pela mesma base.
  const rateioBase = Math.max(1, Math.round(veiculosEquivalentes));
  const garagem = zeros(N + 1);
  garagem[0] = h.adequacaoGaragemCapex / rateioBase;
  f.add("garagemH2", "Adequação da garagem para H₂", "infraestrutura", garagem);
  f.addOper("garagemH2Opex", "O&M da adequação de garagem", "infraestrutura", () =>
    h.adequacaoGaragemOpexAno / rateioBase,
  );
  f.addOper("treinamentoH2", "Treinamento recorrente em H₂", "maoDeObra", () =>
    h.treinamentoRecorrenteAno / rateioBase,
  );
  depreciacaoLinear(garagem[0], sc.trib.depAnosH2, N).forEach((v, t) => (depreciacaoExtra[t] += v));

  // Manutenção
  f.addOper("preventivaH2", "Manutenção preventiva", "manutencao", (t) =>
    h.preventivaPorKm * km[t] * esc(sc.econ.escPecas, t),
  );
  f.addOper("consumiveisH2", "Filtro catalítico, resina DI e umidificação", "manutencao", (t) =>
    (km[t] / h.consumiveisIntervaloKm) * h.consumiveisCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("inspecaoCilindros", "Inspeção periódica dos cilindros", "manutencao", (t) =>
    h.inspecaoCilindrosAnos > 0 ? h.inspecaoCilindrosCusto / h.inspecaoCilindrosAnos : 0,
  );
  f.addOper("corretivaH2", "Manutenção corretiva não programada", "manutencao", (t) =>
    h.corretivaAno1 * Math.pow(1 + h.corretivaCrescimentoPctAA / 100, t - 1) * esc(sc.econ.escPecas, t),
  );
  pneusEFreios(ctx, f, km, h.fatorVidaPneu, h.fatorVidaFreio);
  if (h.vidaNormativaCilindrosAnos <= N) {
    f.alerta(
      "aviso",
      `Os cilindros atingem a vida normativa de ${h.vidaNormativaCilindrosAnos} anos dentro do horizonte: prever substituição ou recertificação.`,
    );
  }

  custosComuns(ctx, f, "h2", km);
  const bloco = blocoAtivo(ctx, f, "h2");

  // Emissões conforme a rota de produção selecionada.
  const fatorH2 =
    sc.carbono.rotaH2 === "eletriseGrid"
      ? sc.carbono.energiaRenovavelIREC
        ? sc.carbono.fatorH2RenovavelKgKg
        : sc.carbono.fatorH2GridKgKg
      : sc.carbono.rotaH2 === "eletroliseRenovavel"
        ? sc.carbono.fatorH2RenovavelKgKg
        : sc.carbono.rotaH2 === "biomassa"
          ? sc.carbono.fatorH2BiomassaKgKg
          : sc.carbono.fatorH2SmrKgKg;
  const emissoes = zeros(N + 1);
  for (let t = 1; t <= N; t++) emissoes[t] = (kgAno[t] * fatorH2) / 1000;

  const eventosAbast = kgAno[1] / (h.capacidadeH2Kg * CONST.USO_TANQUE_H2);
  const horasAbast = (eventosAbast * h.tempoAbastecimentoMin) / 60;

  return finalizar(ctx, f, "h2", {
    ...pl,
    consumoEspecifico: consumoAno.map((v) => v * 100),
    unidadeConsumo: "kg H₂/100 km",
    energiaTanqueKWhKm: consumoBase * CONST.PCI_H2_KWH_KG,
    emissoesT: emissoes,
    noxKg: (sc.carbono.noxH2Gkm * km[1]) / 1000,
    mpKg: (sc.carbono.mpH2Gkm * km[1]) / 1000,
    horasAbastecimento: horasAbast,
    horasManut: h.horasParadoManutAno,
    horasFalha: h.falhaProbAno * h.falhaHorasEvento,
    autonomia,
    anoSubstituicao,
    detalheSubstituicao: detalhe,
    bloco,
    depreciacaoExtra,
    faixaEficiencia: CONST.EFIC_FCEV,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTA ELÉTRICA (BEV)
// ─────────────────────────────────────────────────────────────────────────────
function calcBev(ctx: Ctx): ResultadoRota {
  const { sc, N } = ctx;
  const b = sc.bev;
  const f = new Fluxo(N, "bev");
  const pl = payload(ctx, f, "bev");
  const km = pl.kmAjustado;

  // Consumo específico no pack.
  const [ru, rr, rrd] = [b.regenUrbanoPct, b.regenRegionalPct, b.regenRodoviarioPct];
  const consumoBase =
    Math.max(
      0.05,
      (ctx.pu * b.consumoUrbanoKWhKm * (1 - ru / 100) +
        ctx.pr * b.consumoRegionalKWhKm * (1 - rr / 100) +
        ctx.prd * b.consumoRodoviarioKWhKm * (1 - rrd / 100)) *
        ctx.fTopo +
        b.ajusteConsumoPorTonKWhKm * (pl.cargaTransportadaT - b.cargaReferenciaT),
    );
  // A energia bruta na roda é comparada com a energia bruta do pack: o consumo
  // declarado já é líquido da recuperação regenerativa, então ela é reposta
  // antes de aferir a eficiência implícita do trem de força.
  const regenPonderado = (ctx.pu * ru + ctx.pr * rr + ctx.prd * rrd) / 100;
  f.aud(
    "Consumo específico do BEV",
    "Σ (perfil × kWh/km × (1 − regeneração)) × fator topográfico + ajuste de carga",
    `perfis ponderados × ${fmt(ctx.fTopo, 3)}`,
    consumoBase,
    "kWh/km",
  );

  const parasitaAno =
    (b.climatizacaoBaseKWhDia + b.climatizacaoPorGrauKWhDia * Math.abs(sc.mission.temperaturaMediaC - 20)) *
      ctx.dias +
    sc.mission.ptoPotenciaKW * sc.mission.ptoHorasDia * ctx.dias;
  const autodescargaAno = (b.capacidadeKWh * b.autodescargaPctDia * 365) / 100;
  const energiaPackAno = consumoBase * km[1] + parasitaAno + autodescargaAno;
  const energiaTomadaAno = energiaPackAno / (b.eficienciaCarregamentoPct / 100);
  f.aud(
    "Energia anual na tomada",
    "(tração + parasitas + autodescarga) ÷ eficiência de carregamento",
    `(${fmt(consumoBase * km[1], 0)} + ${fmt(parasitaAno, 0)} + ${fmt(autodescargaAno, 0)}) ÷ ${fmt(b.eficienciaCarregamentoPct, 1)}%`,
    energiaTomadaAno,
    "kWh/ano",
  );

  // Tarifa média de energia da base.
  const [pp, pfp, pmad] = normalizar([b.pctPonta, b.pctForaPonta, b.pctMadrugada]).map((v) => v / 100);
  const teMed = pp * b.tePontaRSMWh + pfp * b.teForaPontaRSMWh + pmad * b.teForaPontaRSMWh * (1 - b.descontoMadrugadaPct / 100);
  const tusdMed = pp * b.tusdPontaRSMWh + (pfp + pmad) * b.tusdForaPontaRSMWh;
  const semImpostos = teMed + tusdMed + b.bandeiraRSMWh;
  const cargaTributaria = (b.icmsEnergiaPct + sc.trib.pisCofinsEnergiaPct) / 100;
  const comImpostos = semImpostos / Math.max(0.05, 1 - cargaTributaria);
  const creditoPisCofins =
    sc.trib.pisCofinsRecupera && sc.trib.regime === "lucroReal"
      ? (comImpostos * sc.trib.pisCofinsEnergiaPct) / 100
      : 0;
  const precoRedeKWh = (comImpostos - creditoPisCofins) / 1000;
  f.aud(
    "Preço da energia da base",
    "(TE + TUSD + bandeira) ÷ (1 − ICMS − PIS/COFINS) − crédito de PIS/COFINS",
    `(${fmt(teMed, 2)} + ${fmt(tusdMed, 2)} + ${fmt(b.bandeiraRSMWh, 2)}) ÷ (1 − ${fmt(cargaTributaria * 100, 2)}%) − ${fmt(creditoPisCofins, 2)}`,
    precoRedeKWh,
    "R$/kWh",
  );

  // Geração solar própria (Lei 14.300/2022), amortizada pelo próprio CAPEX.
  const geracaoSolarAno = b.solarUsar ? (b.solarKWp * CONST.HORAS_ANO * b.solarFatorCapacidadePct) / 100 : 0;
  const solarPorVeiculo = geracaoSolarAno / Math.max(1, b.infraVeiculosRateio);
  const custoSolarKWh =
    geracaoSolarAno > 0
      ? (b.solarKWp * b.solarCapexRSkWp * crf(ctx.wacc, b.solarVidaAnos)) / geracaoSolarAno
      : 0;

  // Laço anual: degradação, autonomia, substituição do pack.
  const capacidadeUtilPct = (b.socMaxPct - b.socMinPct) / 100;
  const efcAno = energiaPackAno / Math.max(1, b.capacidadeKWh);
  const ciclosReaisAno = energiaPackAno / Math.max(1, b.capacidadeKWh * (b.dodMedioPct / 100));
  const fatorAgravante =
    (1 + (b.fatorAltaPotencia - 1) * (b.pctRecargaAltaPotencia / 100)) *
    (1 + b.fatorTemperaturaPorGrau * Math.max(0, sc.mission.temperaturaMediaC - 25)) *
    b.fatorSocAlto;
  const degPorEfc = CONST.QUEDA_SOH_FIM_VIDA_PCT / Math.max(1, b.ciclosAte80Soh);
  f.aud(
    "Ciclos equivalentes por ano",
    "energia anual no pack ÷ capacidade nominal",
    `${fmt(energiaPackAno, 0)} ÷ ${fmt(b.capacidadeKWh, 0)}`,
    efcAno,
    "ciclos equivalentes/ano",
  );
  f.aud(
    "Degradação por ciclagem",
    "(queda de 20 pontos de SOH ÷ ciclos até 80%) × ciclos/ano × agravantes",
    `(20 ÷ ${fmt(b.ciclosAte80Soh, 0)}) × ${fmt(efcAno, 1)} × ${fmt(fatorAgravante, 3)}`,
    degPorEfc * efcAno * fatorAgravante,
    "pontos de SOH/ano",
  );

  const substituicao = zeros(N + 1);
  const autonomia = zeros(N + 1);
  const sohAno = zeros(N + 1);
  const fracaoIntermediaria = zeros(N + 1);
  let soh = 100;
  let kmAcumulado = 0;
  let anoSubstituicao = 0;
  let detalhe = "Pack não atinge o critério de substituição dentro do horizonte.";
  const kmPorDia = km[1] / ctx.dias;
  for (let t = 1; t <= N; t++) {
    const perda = b.degradacaoCalendariaPctAno + degPorEfc * efcAno * fatorAgravante;
    const sohFim = soh - perda;
    const sohMedio = soh - perda / 2;
    sohAno[t] = sohMedio;
    kmAcumulado += km[t];
    autonomia[t] = (b.capacidadeKWh * (sohMedio / 100) * capacidadeUtilPct) / consumoBase;
    // Recarga intermediária quando a autonomia não cobre a jornada diária.
    if (autonomia[t] < kmPorDia) {
      fracaoIntermediaria[t] = clamp(1 - autonomia[t] / Math.max(1, kmPorDia), 0, 0.8);
    }
    const falhaSoh = sohFim < b.sohMinimoPct;
    const falhaAutonomia = autonomia[t] < sc.mission.distanciaMaxEntrePontosKm;
    if (falhaSoh || falhaAutonomia) {
      const custoUnit = b.custoPackRSKWh * Math.pow(1 + b.curvaAprendizadoPackPctAA / 100, t);
      const cobertoGarantia =
        t <= b.garantiaAnos && kmAcumulado <= b.garantiaKm && sohFim < b.garantiaSohPct;
      const custo = cobertoGarantia ? 0 : b.capacidadeKWh * custoUnit;
      const valorRemovido = b.capacidadeKWh * (b.valorSecondLifeRSKWh - b.custoReciclagemRSKWh);
      substituicao[t] += custo - valorRemovido;
      if (!anoSubstituicao) {
        anoSubstituicao = t;
        detalhe = falhaSoh
          ? `Pack substituído no ano ${t} por SOH de ${fmt(sohFim, 1)}% abaixo do mínimo de ${fmt(b.sohMinimoPct, 0)}%.${cobertoGarantia ? " Custo coberto pela garantia." : ""}`
          : `Pack substituído no ano ${t}: autonomia degradada de ${fmt(autonomia[t], 0)} km não cobre o trecho máximo de ${fmt(sc.mission.distanciaMaxEntrePontosKm, 0)} km.${cobertoGarantia ? " Custo coberto pela garantia." : ""}`;
      }
      soh = 100;
      kmAcumulado = 0;
    } else {
      soh = sohFim;
    }
  }
  f.add("substituicaoPack", "Substituição do pack (líquida do valor do pack removido)", "substituicao", substituicao);
  if (fracaoIntermediaria.some((v) => v > 0)) {
    f.alerta(
      "aviso",
      "A autonomia útil fica abaixo da jornada diária em pelo menos um ano: o modelo insere recarga intermediária, com energia mais cara e perda de disponibilidade.",
    );
  }

  // Energia — alocação entre base, geração própria e recarga fora da base.
  const energiaBaseAno = zeros(N + 1);
  const energiaPublicaAno = zeros(N + 1);
  const custoEnergia = zeros(N + 1);
  for (let t = 1; t <= N; t++) {
    const publicaPct = clamp(b.pctRecargaPublica / 100 + fracaoIntermediaria[t], 0, 1);
    const publica = energiaTomadaAno * publicaPct;
    const base = energiaTomadaAno - publica;
    const solar = Math.min(solarPorVeiculo, base);
    const rede = base - solar;
    energiaBaseAno[t] = base;
    energiaPublicaAno[t] = publica;
    custoEnergia[t] =
      rede * precoRedeKWh * esc(sc.econ.escEnergia, t) +
      solar * custoSolarKWh +
      publica * b.precoRecargaPublicaRSKWh * esc(sc.econ.escEnergia, t);
  }
  f.add("energiaBev", "Energia elétrica", "energia", custoEnergia);

  // Demanda contratada e ultrapassagem.
  const picoKW = b.numCarregadores * b.potenciaCarregadorKW * b.fatorSimultaneidade;
  const ultrapassagem = Math.max(0, picoKW - b.demandaContratadaKW);
  const custoDemandaAno =
    (12 * (b.demandaContratadaKW * b.tarifaDemandaRSKWMes + ultrapassagem * b.tarifaDemandaRSKWMes * b.multaUltrapassagemFator)) /
    Math.max(1, b.infraVeiculosRateio);
  f.addOper("demanda", "Demanda contratada e ultrapassagem", "energia", (t) =>
    custoDemandaAno * esc(sc.econ.escEnergia, t),
  );
  f.aud(
    "Pico de demanda gerado pela recarga",
    "número de carregadores × potência × fator de simultaneidade",
    `${b.numCarregadores} × ${fmt(b.potenciaCarregadorKW, 0)} × ${fmt(b.fatorSimultaneidade, 2)}`,
    picoKW,
    "kW",
  );
  if (ultrapassagem > 0) {
    f.alerta(
      "aviso",
      `Pico de recarga de ${fmt(picoKW, 0)} kW excede a demanda contratada de ${fmt(b.demandaContratadaKW, 0)} kW: há multa por ultrapassagem no cenário atual.`,
    );
  }

  // Infraestrutura de recarga (o CAPEX solar é remunerado via custo por kWh).
  const capexInfra =
    (b.numCarregadores * b.capexPorCarregador +
      b.obraCivil +
      b.subestacao +
      b.conexaoReforcoRede +
      b.armazenamentoKWh * b.armazenamentoRSKWh) /
    Math.max(1, b.infraVeiculosRateio);
  const infra = zeros(N + 1);
  infra[0] = capexInfra;
  if (N < b.infraVidaAnos) infra[N] -= capexInfra * (1 - N / b.infraVidaAnos);
  f.add("infraBev", "Infraestrutura de recarga (CAPEX rateado)", "infraestrutura", infra);
  f.addOper("infraOem", "O&M, software e rede de recarga", "infraestrutura", () =>
    ((capexInfra * b.infraOemPctAno) / 100 + (b.infraSoftwareMes * 12 * b.numCarregadores) / Math.max(1, b.infraVeiculosRateio)),
  );
  const depreciacaoExtra = zeros(N + 1);
  depreciacaoLinear(capexInfra, sc.trib.depAnosBev, N).forEach((v, t) => (depreciacaoExtra[t] += v));

  // Manutenção
  f.addOper("preventivaBev", "Manutenção preventiva", "manutencao", (t) =>
    b.preventivaPorKm * km[t] * esc(sc.econ.escPecas, t),
  );
  f.addOper("fluidosBev", "Arrefecimento do pack, inversor e motor", "manutencao", (t) =>
    (km[t] / b.fluidosIntervaloKm) * b.fluidosCusto * esc(sc.econ.escPecas, t),
  );
  f.addOper("falhaPack", "Falha do pack fora da garantia", "manutencao", (t) =>
    t > b.garantiaAnos ? (b.falhaPackProbAnoPct / 100) * b.falhaPackCusto : 0,
  );
  f.addOper("corretivaBev", "Manutenção corretiva não programada", "manutencao", (t) =>
    b.corretivaAno1 * Math.pow(1 + b.corretivaCrescimentoPctAA / 100, t - 1) * esc(sc.econ.escPecas, t),
  );
  pneusEFreios(ctx, f, km, b.fatorVidaPneu, b.fatorVidaFreio);

  custosComuns(ctx, f, "bev", km);
  const bloco = blocoAtivo(ctx, f, "bev");

  // Emissões
  const fatorRede = sc.carbono.energiaRenovavelIREC ? 0 : sc.carbono.fatorEletricidadeKgKWh;
  const emissoes = zeros(N + 1);
  for (let t = 1; t <= N; t++) {
    const solar = Math.min(solarPorVeiculo, energiaBaseAno[t]);
    emissoes[t] = ((energiaBaseAno[t] - solar + energiaPublicaAno[t]) * fatorRede) / 1000;
  }

  // Tempo de recarga e disponibilidade.
  const potenciaEfetiva = b.potenciaCarregadorKW * b.taperFator * b.filaFator;
  const horasBase = energiaBaseAno[1] / Math.max(1, potenciaEfetiva);
  const horasPublica = energiaPublicaAno[1] / Math.max(1, b.potenciaRecargaCcKW * b.taperFator);
  const horasAbast = horasBase * (1 - b.pctRecargaForaJanela / 100) + horasPublica;
  f.aud(
    "Horas de recarga que geram indisponibilidade",
    "energia na base ÷ potência efetiva × (1 − recarga fora da janela) + energia fora da base ÷ potência CC",
    `${fmt(energiaBaseAno[1], 0)} ÷ ${fmt(potenciaEfetiva, 0)} × (1 − ${fmt(b.pctRecargaForaJanela, 1)}%) + ${fmt(energiaPublicaAno[1], 0)} ÷ ${fmt(b.potenciaRecargaCcKW * b.taperFator, 0)}`,
    horasAbast,
    "h/ano",
  );
  f.aud(
    "Ciclos reais por ano (na profundidade média)",
    "energia anual no pack ÷ (capacidade × DOD médio)",
    `${fmt(energiaPackAno, 0)} ÷ (${fmt(b.capacidadeKWh, 0)} × ${fmt(b.dodMedioPct, 0)}%)`,
    ciclosReaisAno,
    "ciclos/ano",
  );

  return finalizar(ctx, f, "bev", {
    ...pl,
    consumoEspecifico: zeros(N + 1).map((_, t) => (t === 0 ? 0 : consumoBase)),
    unidadeConsumo: "kWh/km",
    energiaTanqueKWhKm: consumoBase / Math.max(0.5, 1 - regenPonderado),
    emissoesT: emissoes,
    noxKg: (sc.carbono.noxBevGkm * km[1]) / 1000,
    mpKg: (sc.carbono.mpBevGkm * km[1]) / 1000,
    horasAbastecimento: horasAbast,
    horasManut: b.horasParadoManutAno,
    horasFalha: b.falhaProbAno * b.falhaHorasEvento,
    autonomia,
    anoSubstituicao,
    detalheSubstituicao: detalhe,
    bloco,
    depreciacaoExtra,
    faixaEficiencia: CONST.EFIC_BEV,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Orquestração
// ─────────────────────────────────────────────────────────────────────────────
/** Custo efetivo do hidrogênio na porta do veículo, no modo de suprimento ativo. */
export function custoH2Efetivo(sc: Scenario): number {
  // Só os dois campos usados pelo cálculo do custo por quilo são necessários.
  return custoH2PorKg({ sc, wacc: sc.econ.wacc / 100 } as unknown as Ctx);
}

export function computeScenario(sc: Scenario): ResultadoCenario {
  const N = Math.max(1, Math.round(sc.mission.horizonteAnos));
  const wacc = sc.econ.wacc / 100;
  const alertas: Alerta[] = [];

  const somaPerfil = sc.mission.perfilUrbanoPct + sc.mission.perfilRegionalPct + sc.mission.perfilRodoviarioPct;
  if (Math.abs(somaPerfil - 100) > 0.5)
    alertas.push({ nivel: "aviso", texto: `Os percentuais de perfil de rota somam ${somaPerfil.toFixed(1)}%; foram normalizados para 100%.` });
  const somaTopo = sc.mission.topoPlanoPct + sc.mission.topoOnduladoPct + sc.mission.topoMontanhosoPct;
  if (Math.abs(somaTopo - 100) > 0.5)
    alertas.push({ nivel: "aviso", texto: `Os percentuais de topografia somam ${somaTopo.toFixed(1)}%; foram normalizados para 100%.` });

  const [pu, pr, prd] = normalizar([
    sc.mission.perfilUrbanoPct,
    sc.mission.perfilRegionalPct,
    sc.mission.perfilRodoviarioPct,
  ]).map((v) => v / 100);
  const [tp, to, tm] = normalizar([
    sc.mission.topoPlanoPct,
    sc.mission.topoOnduladoPct,
    sc.mission.topoMontanhosoPct,
  ]).map((v) => v / 100);
  const fTopo =
    tp * sc.mission.fatorTopoPlano + to * sc.mission.fatorTopoOndulado + tm * sc.mission.fatorTopoMontanhoso;
  const fPerfilRoda =
    pu * sc.mission.fatorRodaUrbano +
    pr * sc.mission.fatorRodaRegional +
    prd * sc.mission.fatorRodaRodoviario;

  const dias = sc.mission.diasOperacionaisAno;
  const horasDia = sc.mission.horasOperacaoDia * sc.mission.jornadasDia;
  const horasCalendarioAno = dias * horasDia;

  const cargaUtil = {} as Record<RouteKey, number>;
  const massaEnergiaT = {} as Record<RouteKey, number>;
  for (const r of ROUTE_KEYS) {
    massaEnergiaT[r] = massaSistemaEnergiaKg(sc, r) / 1000;
    cargaUtil[r] = pbtcDe(sc, r) + toleranciaDe(sc, r) - taraBaseDe(sc, r) - massaEnergiaT[r];
  }
  const cargaAlvoT = Math.max(
    0.1,
    Math.min(cargaUtil.diesel, (sc.mission.cargaUtilMediaT * sc.mission.fatorOcupacaoPct) / 100),
  );
  const demandaTKmAno = sc.mission.kmAno * (1 - sc.mission.retornoVazioPct / 100) * cargaAlvoT;

  const precoCarbonoBase =
    sc.carbono.cenarioCarbono === "zero"
      ? sc.carbono.precoCarbonoZero
      : sc.carbono.cenarioCarbono === "voluntario"
        ? sc.carbono.precoCarbonoVoluntario
        : sc.carbono.cenarioCarbono === "sbce"
          ? sc.carbono.precoCarbonoSbce
          : sc.carbono.precoCarbonoCbam;
  const precoCarbono = zeros(N + 1).map((_, t) => precoCarbonoBase * esc(sc.econ.escCarbono, t));

  const ctx: Ctx = {
    sc,
    N,
    wacc,
    pu,
    pr,
    prd,
    fTopo,
    dias,
    horasDia,
    horasCalendarioAno,
    velocidade: Math.max(1, sc.mission.velocidadeMediaKmH),
    energiaRodaParcial: sc.mission.energiaRodaKWhKm * fTopo * fPerfilRoda,
    cargaAlvoT,
    demandaTKmAno,
    cargaUtil,
    massaEnergiaT,
    precoCarbono,
  };

  const rotas = {
    diesel: calcDiesel(ctx),
    h2: calcH2(ctx),
    bev: calcBev(ctx),
  } as Record<RouteKey, ResultadoRota>;

  // Custo marginal de abatimento e payback contra a rota diesel.
  const mac = {} as Record<RouteKey, number | null>;
  const payback = {} as Record<RouteKey, number | null>;
  for (const r of ROUTE_KEYS) {
    if (r === "diesel") {
      mac[r] = null;
      payback[r] = null;
      continue;
    }
    const evitadas = rotas.diesel.emissoesTotaisT - rotas[r].emissoesTotaisT;
    mac[r] = Math.abs(evitadas) > 1e-9 ? (rotas[r].tco - rotas.diesel.tco) / evitadas : null;
    payback[r] = null;
    let acumAlt = 0;
    let acumDie = 0;
    for (let t = 0; t <= N; t++) {
      acumAlt += rotas[r].fluxoAnual[t] / Math.pow(1 + wacc, t);
      acumDie += rotas.diesel.fluxoAnual[t] / Math.pow(1 + wacc, t);
      if (t > 0 && acumAlt <= acumDie) {
        payback[r] = t;
        break;
      }
    }
  }

  const vencedor = ROUTE_KEYS.reduce((a, r) => (rotas[r].tcoPorTKm < rotas[a].tcoPorTKm ? r : a), "diesel" as RouteKey);

  return {
    rotas,
    vencedor,
    mac,
    payback,
    demandaTKmAno,
    cargaAlvoT,
    alertas,
    anos: Array.from({ length: N + 1 }, (_, i) => i),
  };
}
