/**
 * AHS TCO Fleet — tipos base do simulador de Custo Total de Propriedade.
 *
 * Convenções adotadas em todo o motor:
 *  - Valores monetários em R$ correntes da data-base (moeda real, deflacionada).
 *  - Escalonamentos de preço são REAIS (% a.a. acima do IPCA); o VPL é invariante
 *    à escolha real/nominal desde que a taxa de desconto acompanhe a base.
 *  - Energia sempre em kWh, massa em kg (ou t quando explicitado no nome do campo).
 */

export type RouteKey = "diesel" | "h2" | "bev";

export const ROUTE_KEYS: RouteKey[] = ["diesel", "h2", "bev"];

export const ROUTE_LABEL: Record<RouteKey, string> = {
  diesel: "Diesel",
  h2: "Hidrogênio",
  bev: "Elétrico",
};

/** Paleta AHS — a associação cor/rota deve ser idêntica em toda a aplicação. */
export const ROUTE_COLOR: Record<RouteKey, string> = {
  diesel: "#666666",
  h2: "#8DC63F",
  bev: "#0D2B55",
};

export const AHS = {
  azul: "#0D2B55",
  verde: "#8DC63F",
  preto: "#1A1A1A",
  cinzaClaro: "#F4F4F4",
  cinzaTexto: "#666666",
};

export type PerfilRota = "urbano" | "regional" | "rodoviario";
export type Topografia = "plano" | "ondulado" | "montanhoso";
export type BaseValores = "real" | "nominal";
export type RegimeAquisicao = "avista" | "financiamento" | "leasing" | "aluguel";
export type SistemaAmortizacao = "SAC" | "PRICE";
export type RegimeTributario = "lucroReal" | "lucroPresumido" | "simples";
export type RotaH2 = "eletriseGrid" | "eletroliseRenovavel" | "biomassa" | "smr";
export type CenarioCarbono = "zero" | "voluntario" | "sbce" | "cbam";
export type ModoSuprimentoH2 = "A" | "B" | "C";
export type QuimicaBateria = "LFP" | "NMC" | "semiSolida";
export type ModalidadeEnergia = "cativoVerde" | "cativoAzul" | "livre" | "autoproducao";
export type MetodoArla = "pctDiesel" | "litros100km";
export type ModoPrecoVeiculo = "direto" | "importacao";
export type DistribuicaoMC = "normal" | "triangular" | "uniforme";

/** Distribuição declarada para um input incerto na simulação de Monte Carlo. */
export interface McSpec {
  dist: DistribuicaoMC;
  /** normal: média | triangular: mínimo | uniforme: mínimo */
  p1: number;
  /** normal: desvio-padrão | triangular: moda | uniforme: máximo */
  p2: number;
  /** triangular: máximo */
  p3?: number;
}

/** Uma linha de custo do fluxo de caixa, ano a ano. */
export interface LinhaFluxo {
  chave: string;
  rotulo: string;
  /** Componente do gráfico de decomposição a que esta linha pertence. */
  grupo: GrupoCusto;
  /** Valores nominais de cada ano (índice = ano, 0..N). Positivo = custo. */
  valores: number[];
}

export type GrupoCusto =
  | "aquisicao"
  | "financiamento"
  | "energia"
  | "arla"
  | "manutencao"
  | "substituicao"
  | "infraestrutura"
  | "maoDeObra"
  | "seguroTributos"
  | "carbono"
  | "indisponibilidade"
  | "fiscal"
  | "residual";

export const GRUPO_LABEL: Record<GrupoCusto, string> = {
  aquisicao: "Aquisição",
  financiamento: "Financiamento",
  energia: "Energia / combustível",
  arla: "ARLA 32",
  manutencao: "Manutenção",
  substituicao: "Substituição bateria/pilha",
  infraestrutura: "Infraestrutura",
  maoDeObra: "Mão de obra",
  seguroTributos: "Seguro e tributos",
  carbono: "Carbono",
  indisponibilidade: "Indisponibilidade",
  fiscal: "Benefício fiscal",
  residual: "Valor residual",
};

export const GRUPO_ORDEM: GrupoCusto[] = [
  "aquisicao",
  "financiamento",
  "energia",
  "arla",
  "manutencao",
  "substituicao",
  "infraestrutura",
  "maoDeObra",
  "seguroTributos",
  "carbono",
  "indisponibilidade",
  "fiscal",
  "residual",
];

/** Registro de auditoria: fórmula aplicada e valores substituídos. */
export interface Auditoria {
  rotulo: string;
  formula: string;
  substituicao: string;
  resultado: number;
  unidade: string;
}

export interface Alerta {
  nivel: "erro" | "aviso" | "info";
  rota?: RouteKey;
  texto: string;
}

export interface ResultadoRota {
  rota: RouteKey;
  /** Fluxo de caixa por linha, ano a ano (custo positivo). */
  linhas: LinhaFluxo[];
  /** Fluxo de caixa líquido por ano, já com receitas e benefício fiscal. */
  fluxoAnual: number[];
  /** VPL do fluxo de caixa = TCO por veículo. */
  tco: number;
  tcoFrota: number;
  tcoPorKm: number;
  tcoPorTKm: number;
  custoMensalEquivalente: number;
  /** km percorridos por ano já ajustados pela penalidade de payload. */
  kmAjustado: number[];
  tkmAno: number[];
  /** Massa e capacidade. */
  massaSistemaEnergiaT: number;
  taraTotalT: number;
  cargaUtilT: number;
  cargaTransportadaT: number;
  fatorViagens: number;
  /** Disponibilidade operacional. */
  horasAbastecimentoAno: number;
  horasManutencaoAno: number;
  horasFalhaAno: number;
  disponibilidade: number;
  diasParadosAno: number;
  nVeiculos: number;
  /** Emissões. */
  emissaoPorKmG: number;
  emissoesAnuaisT: number[];
  emissoesTotaisT: number;
  noxAnualKg: number;
  mpAnualKg: number;
  /** Energia por km (consumo específico já ajustado, ano a ano). */
  consumoEspecifico: number[];
  unidadeConsumo: string;
  energiaTanqueKWhKm: number;
  eficienciaImplicita: number;
  /** Ano de substituição de bateria (BEV) ou pilha (FCEV); 0 = não ocorre. */
  anoSubstituicao: number;
  detalheSubstituicao: string;
  /** Autonomia útil por ano (km) — usada nos alertas de missão. */
  autonomiaAno: number[];
  auditoria: Auditoria[];
  alertas: Alerta[];
  /** Agregados por grupo de custo (VPL). */
  porGrupo: Record<GrupoCusto, number>;
}

export interface ResultadoCenario {
  rotas: Record<RouteKey, ResultadoRota>;
  vencedor: RouteKey;
  /** tCO2e evitadas e custo marginal de abatimento por rota (vs diesel). */
  mac: Record<RouteKey, number | null>;
  payback: Record<RouteKey, number | null>;
  demandaTKmAno: number;
  cargaAlvoT: number;
  alertas: Alerta[];
  anos: number[];
}
