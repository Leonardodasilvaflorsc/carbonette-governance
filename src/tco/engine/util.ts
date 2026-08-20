/** Utilitários numéricos e de acesso por caminho usados por todo o motor. */

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const sum = (a: number[]) => a.reduce((x, y) => x + (y || 0), 0);

export const zeros = (n: number) => new Array(n).fill(0);

/** Nó genérico percorrido por caminho. O acesso é dinâmico por natureza. */
type No = Record<string, unknown>;

/**
 * Leitura de valor por dot-path, ex.: "bev.capacidadeKWh".
 * O tipo de retorno é declarado pelo chamador; o padrão é numérico porque é
 * o caso de uso dominante (solvers, sensibilidade e Monte Carlo).
 */
export function getPath<T = number>(obj: unknown, path: string): T {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as No)[k]), obj) as T;
}

/** Escrita imutável por dot-path: devolve uma cópia com o valor alterado. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const raiz = (Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as unknown as No) }) as No;
  let cur = raiz;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const filho = cur[k];
    cur[k] = Array.isArray(filho) ? [...(filho as unknown[])] : { ...(filho as No) };
    cur = cur[k] as No;
  }
  cur[keys[keys.length - 1]] = value;
  return raiz as unknown as T;
}

/** Escrita destrutiva — usada nos laços de Monte Carlo, sobre cópias. */
export function setPathMut(obj: unknown, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur = obj as No;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as No;
  cur[keys[keys.length - 1]] = value;
}

/** Fator de recuperação de capital (CRF): anualiza um CAPEX em n anos. */
export function crf(taxa: number, anos: number): number {
  if (anos <= 0) return 0;
  if (taxa === 0) return 1 / anos;
  const f = Math.pow(1 + taxa, anos);
  return (taxa * f) / (f - 1);
}

/** Valor presente líquido de um vetor de fluxos indexado pelo ano. */
export function npv(fluxos: number[], taxa: number): number {
  return fluxos.reduce((acc, v, t) => acc + v / Math.pow(1 + taxa, t), 0);
}

/** Pagamento equivalente (anuidade) de um valor presente. */
export function anuidade(vp: number, taxa: number, anos: number): number {
  return vp * crf(taxa, anos);
}

/** Interpola linearmente uma curva definida ponto a ponto por ano. */
export function curvaAno(curva: number[], ano: number): number {
  if (!curva || curva.length === 0) return 0;
  if (ano < 0) return curva[0];
  if (ano < curva.length) return curva[ano];
  // Extrapolação: mantém a última variação anual observada, sem cruzar zero.
  const ultimo = curva[curva.length - 1];
  const penultimo = curva.length > 1 ? curva[curva.length - 2] : ultimo;
  const passo = ultimo - penultimo;
  return Math.max(0, ultimo + passo * (ano - (curva.length - 1)));
}

/** Escalonamento real composto aplicado ao ano t. */
export const esc = (taxaPctAA: number, t: number) =>
  Math.pow(1 + taxaPctAA / 100, t);

/** Normaliza um conjunto de percentuais para somar 100. */
export function normalizar(pcts: number[]): number[] {
  const s = sum(pcts);
  if (s <= 0) return pcts.map(() => 0);
  return pcts.map((v) => (v / s) * 100);
}

/**
 * Bisseção robusta: varre o intervalo em busca de troca de sinal e refina.
 * Devolve null quando não há raiz no intervalo — situação legítima e comum
 * (por exemplo, não existe preço de H₂ que empate com o diesel).
 */
export function resolverRaiz(
  f: (x: number) => number,
  lo: number,
  hi: number,
  amostras = 60,
  tol = 1e-6,
  iter = 80,
): number | null {
  let xa = lo;
  let fa = f(xa);
  if (!isFinite(fa)) return null;
  if (Math.abs(fa) < tol) return xa;
  const passo = (hi - lo) / amostras;
  for (let i = 1; i <= amostras; i++) {
    const xb = lo + passo * i;
    const fb = f(xb);
    if (!isFinite(fb)) continue;
    if (Math.abs(fb) < tol) return xb;
    if (fa * fb < 0) {
      let a = xa;
      let bb = xb;
      let faL = fa;
      for (let k = 0; k < iter; k++) {
        const mid = (a + bb) / 2;
        const fm = f(mid);
        if (Math.abs(fm) < tol || (bb - a) / 2 < tol) return mid;
        if (faL * fm < 0) bb = mid;
        else {
          a = mid;
          faL = fm;
        }
      }
      return (a + bb) / 2;
    }
    xa = xb;
    fa = fb;
  }
  return null;
}
