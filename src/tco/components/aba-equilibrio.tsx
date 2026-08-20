/** Aba de ponto de equilíbrio: solvers, sensibilidade, mapas de calor e Monte Carlo. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Scenario } from "../defaults";
import {
  mapaCalor,
  monteCarlo,
  resolverEquilibrio,
  tornado,
  varredura,
  correlacionar,
  VARIAVEIS,
  type BarraTornado,
  type Equilibrio,
  type ResultadoMC,
} from "../engine/analysis";
import { getPath, setPathMut } from "../engine/util";
import { FIELDS, NUMERIC_PATHS } from "../fields";
import { moeda, nf, pct } from "../format";
import { useTco } from "../store";
import { ROUTE_COLOR, ROUTE_KEYS, ROUTE_LABEL, type McSpec, type RouteKey } from "../types";
import { Aviso, Dica, Secao } from "./ui";

const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));

/** Pares e variáveis apresentados como cartões de equilíbrio. */
const CARTOES: { varKey: string; par: [RouteKey, RouteKey] }[] = [
  { varKey: "precoH2", par: ["h2", "diesel"] },
  { varKey: "precoH2", par: ["h2", "bev"] },
  { varKey: "precoDiesel", par: ["h2", "diesel"] },
  { varKey: "precoDiesel", par: ["bev", "diesel"] },
  { varKey: "precoEnergia", par: ["bev", "diesel"] },
  { varKey: "capexH2", par: ["h2", "diesel"] },
  { varKey: "capexBev", par: ["bev", "diesel"] },
  { varKey: "kmAno", par: ["bev", "diesel"] },
  { varKey: "kmAno", par: ["h2", "diesel"] },
  { varKey: "precoCarbono", par: ["bev", "diesel"] },
  { varKey: "precoCarbono", par: ["h2", "diesel"] },
  { varKey: "custoPack", par: ["bev", "diesel"] },
  { varKey: "ciclosBateria", par: ["bev", "diesel"] },
  { varKey: "consumoH2", par: ["h2", "diesel"] },
  { varKey: "consumoBev", par: ["bev", "diesel"] },
  { varKey: "utilizacaoHrs", par: ["h2", "diesel"] },
  { varKey: "veiculosInfraBev", par: ["bev", "diesel"] },
];

function CartaoEquilibrio({ e }: { e: Equilibrio }) {
  const [a, b] = e.par;
  const semCruzamento = e.equilibrio === null;
  return (
    <div className="border border-[#E2E2E2] bg-white p-3">
      <div className="text-[11px] font-semibold text-[#0D2B55]">
        {e.variavel.label}
        {e.variavel.nota && <Dica texto={e.variavel.nota} />}
      </div>
      <div className="mb-2 text-[10px] uppercase tracking-wide text-[#666666]">
        {ROUTE_LABEL[a]} × {ROUTE_LABEL[b]}
      </div>
      <table className="w-full text-[11px]">
        <tbody className="[&_td]:py-0.5 [&_td:last-child]:text-right [&_td:last-child]:font-mono [&_td:last-child]:tabular-nums">
          <tr>
            <td className="text-[#666666]">Valor atual</td>
            <td>{nf(e.atual, e.variavel.dec)} {e.variavel.unit}</td>
          </tr>
          <tr>
            <td className="text-[#666666]">Valor de equilíbrio</td>
            <td className={semCruzamento ? "text-[#C0392B]" : "font-semibold text-[#0D2B55]"}>
              {semCruzamento ? "não existe" : `${nf(e.equilibrio!, e.variavel.dec)} ${e.variavel.unit}`}
            </td>
          </tr>
          <tr>
            <td className="text-[#666666]">Distância</td>
            <td>{e.distanciaPct === null ? "—" : pct(e.distanciaPct, 1)}</td>
          </tr>
          <tr>
            <td className="text-[#666666]">Vencedor no valor atual</td>
            <td style={{ color: ROUTE_COLOR[e.vencedorAtual] }}>{ROUTE_LABEL[e.vencedorAtual]}</td>
          </tr>
        </tbody>
      </table>
      {semCruzamento && (
        <p className="mt-2 text-[10px] leading-snug text-[#666666]">
          Não há valor dentro da faixa plausível ({nf(e.variavel.min, 0)} a {nf(e.variavel.max, 0)} {e.variavel.unit})
          que iguale as duas rotas: a decisão não se inverte movendo apenas esta variável.
        </p>
      )}
    </div>
  );
}

/** Deslocamentos coordenados para os cenários conservador e agressivo. */
const MULTIPLICADORES: Record<string, Record<string, number>> = {
  conservador: {
    "h2.aPrecoKg": 1.3,
    "h2.bPrecoEnergiaRSKWh": 1.25,
    "h2.precoAquisicao": 1.15,
    "bev.precoAquisicao": 1.15,
    "bev.custoPackRSKWh": 1.2,
    "bev.teForaPontaRSMWh": 1.2,
    "bev.tePontaRSMWh": 1.2,
    "bev.ciclosAte80Soh": 0.8,
    "diesel.precoDieselL": 0.9,
  },
  agressivo: {
    "h2.aPrecoKg": 0.65,
    "h2.bPrecoEnergiaRSKWh": 0.8,
    "h2.precoAquisicao": 0.75,
    "bev.precoAquisicao": 0.75,
    "bev.custoPackRSKWh": 0.7,
    "bev.teForaPontaRSMWh": 0.85,
    "bev.tePontaRSMWh": 0.85,
    "bev.ciclosAte80Soh": 1.25,
    "diesel.precoDieselL": 1.2,
  },
};

export function AbaEquilibrio() {
  const { scenario, resultado, set, substituir, sensiveis, mc, definirMc } = useTco();
  const [equilibrios, setEquilibrios] = useState<Equilibrio[]>([]);
  const [calculando, setCalculando] = useState(false);

  // Solvers rodam fora do caminho crítico da digitação, em lotes assíncronos.
  useEffect(() => {
    let cancelado = false;
    setCalculando(true);
    const id = setTimeout(() => {
      const saida: Equilibrio[] = [];
      const passo = (i: number) => {
        if (cancelado) return;
        if (i >= CARTOES.length) {
          setEquilibrios(saida);
          setCalculando(false);
          return;
        }
        const c = CARTOES[i];
        saida.push(resolverEquilibrio(scenario, c.varKey, c.par[0], c.par[1]));
        setTimeout(() => passo(i + 1), 0);
      };
      passo(0);
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [scenario]);

  return (
    <>
      <Secao
        titulo="Solvers de ponto de equilíbrio"
        descricao="Para cada par de rotas, o valor da variável que iguala o custo por tonelada-quilômetro, mantido tudo o mais constante. Resolvido numericamente por bisseção sobre o próprio motor de cálculo."
        colunas={3}
      >
        {calculando && equilibrios.length === 0 && (
          <p className="text-[11px] text-[#666666]">Resolvendo os pontos de equilíbrio…</p>
        )}
        {equilibrios.map((e, i) => (
          <CartaoEquilibrio key={i} e={e} />
        ))}
      </Secao>

      <Tornado />
      <Sensibilidade1D />
      <MapaCalor />

      <Secao
        titulo="Análise de cenários"
        descricao="Deslocamento coordenado dos principais direcionadores de incerteza. Aplica-se sobre o cenário atual e pode ser revertido pelo botão base."
        colunas={1}
      >
        <div className="flex flex-wrap gap-2">
          {(["conservador", "base", "agressivo"] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                if (c === "base") return;
                const s = clone(scenario);
                for (const [p, f] of Object.entries(MULTIPLICADORES[c])) setPathMut(s, p, getPath(s, p) * f);
                if (c === "agressivo") s.carbono.cenarioCarbono = "sbce";
                if (c === "conservador") s.carbono.cenarioCarbono = "zero";
                substituir(s);
              }}
              className="border border-[#0D2B55] px-3 py-1.5 text-[11px] text-[#0D2B55] hover:bg-[#0D2B55] hover:text-white"
            >
              {c === "conservador"
                ? "Conservador (desfavorável às alternativas)"
                : c === "base"
                  ? "Base (sem deslocamento)"
                  : "Agressivo (favorável às alternativas)"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#666666]">
          Conservador: hidrogênio +30%, energia +20%, CAPEX das alternativas +15%, pack +20%, vida da bateria −20%,
          diesel −10% e sem preço de carbono. Agressivo: hidrogênio −35%, CAPEX das alternativas −25%, pack −30%,
          vida da bateria +25%, diesel +20% e carbono precificado pelo SBCE.
        </p>
      </Secao>

      <MonteCarlo mc={mc} definirMc={definirMc} sensiveis={sensiveis} />
    </>
  );
}

function Tornado() {
  const { scenario, sensiveis } = useTco();
  const [rota, setRota] = useState<RouteKey>("bev");
  const [delta, setDelta] = useState(20);
  const [barras, setBarras] = useState<BarraTornado[]>([]);

  const paths = useMemo(
    () => (sensiveis.length > 0 ? sensiveis : NUMERIC_PATHS.filter((p) => FIELDS[p].sens)),
    [sensiveis],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setBarras(
        tornado(scenario, paths, rota, delta, (p) => ({
          label: FIELDS[p]?.label ?? p,
          unit: FIELDS[p]?.unit ?? "",
        })).slice(0, 18),
      );
    }, 250);
    return () => clearTimeout(id);
  }, [scenario, paths, rota, delta]);

  const dados = barras.map((b) => ({ nome: b.label, baixo: b.baixo, alto: b.alto }));

  return (
    <Secao
      titulo="Tornado — sensibilidade a ±variação em cada input"
      descricao="Impacto no TCO da rota selecionada quando cada variável marcada com a estrela é deslocada para cima e para baixo. Sem nenhuma marcação, o gráfico usa a lista sugerida de variáveis críticas."
      colunas={1}
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {ROUTE_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => setRota(r)}
              className={`border px-3 py-1 text-[11px] ${rota === r ? "border-transparent text-white" : "border-[#D8D8D8] text-[#666666]"}`}
              style={rota === r ? { background: ROUTE_COLOR[r] } : undefined}
            >
              {ROUTE_LABEL[r]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-[#666666]">
          Variação
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="w-32"
          />
          ±{delta}%
        </label>
        <span className="text-[11px] text-[#666666]">{paths.length} variáveis avaliadas</span>
      </div>
      <div style={{ height: Math.max(240, dados.length * 26 + 60) }}>
        <ResponsiveContainer>
          <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
            <XAxis type="number" tickFormatter={(v) => nf(v / 1000, 0) + "k"} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" width={240} tick={{ fontSize: 10 }} />
            <RTooltip formatter={(v: number) => moeda(v)} contentStyle={{ fontSize: 11 }} />
            <Legend formatter={(v) => <span className="text-[11px]">{v === "baixo" ? "Redução do input" : "Aumento do input"}</span>} />
            <Bar dataKey="baixo" fill="#0D2B55" />
            <Bar dataKey="alto" fill="#8DC63F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Secao>
  );
}

function Sensibilidade1D() {
  const { scenario } = useTco();
  const [varKey, setVarKey] = useState("precoDiesel");
  const v = VARIAVEIS[varKey];
  const atual = useMemo(() => v.ler(scenario), [scenario, v]);
  const [lo, setLo] = useState<number | null>(null);
  const [hi, setHi] = useState<number | null>(null);
  const arredondar = (x: number) => Number(x.toFixed(Math.max(0, v.dec)));
  const faixaLo = lo ?? arredondar(Math.max(v.min, atual * 0.4));
  const faixaHi = hi ?? arredondar(Math.min(v.max, Math.max(atual * 2.2, atual + 1)));
  const [pontos, setPontos] = useState<{ x: number; diesel: number; h2: number; bev: number }[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setPontos(varredura(scenario, varKey, faixaLo, faixaHi, 24)), 250);
    return () => clearTimeout(id);
  }, [scenario, varKey, faixaLo, faixaHi]);

  return (
    <Secao
      titulo="Sensibilidade unidimensional"
      descricao="Custo por tonelada-quilômetro das três rotas em função de uma variável. O cruzamento das curvas é o ponto de indiferença."
      colunas={1}
    >
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px]">
        <select
          value={varKey}
          onChange={(e) => {
            setVarKey(e.target.value);
            setLo(null);
            setHi(null);
          }}
          className="h-8 border border-[#D8D8D8] px-2 text-[12px]"
        >
          {Object.values(VARIAVEIS).map((x) => (
            <option key={x.key} value={x.key}>
              {x.label} ({x.unit})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[#666666]">
          de
          <input
            type="number"
            value={faixaLo}
            onChange={(e) => setLo(Number(e.target.value))}
            className="h-8 w-28 border border-[#D8D8D8] px-2 text-right font-mono"
          />
        </label>
        <label className="flex items-center gap-1 text-[#666666]">
          até
          <input
            type="number"
            value={faixaHi}
            onChange={(e) => setHi(Number(e.target.value))}
            className="h-8 w-28 border border-[#D8D8D8] px-2 text-right font-mono"
          />
        </label>
        <span className="text-[#666666]">Valor atual: {nf(atual, v.dec)} {v.unit}</span>
      </div>
      <div className="h-[360px]">
        <ResponsiveContainer>
          <LineChart data={pontos} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(x) => nf(x, v.dec)}
              tick={{ fontSize: 11 }}
              label={{ value: `${v.label} (${v.unit})`, position: "insideBottom", offset: -8, fontSize: 11 }}
            />
            <YAxis tickFormatter={(y) => nf(y, 3)} tick={{ fontSize: 11 }} width={70} label={{ value: "R$/t·km", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <RTooltip
              formatter={(y: number, n: string) => [nf(y, 4) + " R$/t·km", ROUTE_LABEL[n as RouteKey] ?? n]}
              labelFormatter={(x) => `${v.label}: ${nf(Number(x), v.dec)} ${v.unit}`}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend formatter={(x) => <span className="text-[11px]">{ROUTE_LABEL[x as RouteKey] ?? x}</span>} />
            {ROUTE_KEYS.map((r) => (
              <Line key={r} type="monotone" dataKey={r} stroke={ROUTE_COLOR[r]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Secao>
  );
}

function MapaCalor() {
  const { scenario } = useTco();
  const [vx, setVx] = useState("precoH2");
  const [vy, setVy] = useState("precoDiesel");
  const [dados, setDados] = useState<ReturnType<typeof mapaCalor> | null>(null);
  const [carregando, setCarregando] = useState(false);
  const X = VARIAVEIS[vx];
  const Y = VARIAVEIS[vy];
  const ax = X.ler(scenario);
  const ay = Y.ler(scenario);
  // Faixa ampla o suficiente para que a fronteira de indiferença apareça
  // quando ela existir dentro dos limites plausíveis de cada variável.
  const loX = Math.max(X.min, ax * 0.25);
  const hiX = Math.min(X.max, ax * 3.5 || X.max);
  const loY = Math.max(Y.min, ay * 0.25);
  const hiY = Math.min(Y.max, ay * 3.5 || Y.max);

  const calcular = useCallback(() => {
    setCarregando(true);
    setTimeout(() => {
      setDados(mapaCalor(scenario, vx, loX, hiX, vy, loY, hiY, 16));
      setCarregando(false);
    }, 10);
  }, [scenario, vx, vy, loX, hiX, loY, hiY]);

  useEffect(() => {
    const id = setTimeout(calcular, 400);
    return () => clearTimeout(id);
  }, [calcular]);

  const n = dados?.n ?? 0;
  return (
    <Secao
      titulo="Mapa de calor bidimensional"
      descricao="Rota vencedora em cada combinação das duas variáveis. A intensidade da cor indica a margem sobre a segunda colocada; a fronteira entre cores é a curva de indiferença."
      colunas={1}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px]">
        <label className="flex items-center gap-1">
          Eixo X
          <select value={vx} onChange={(e) => setVx(e.target.value)} className="h-8 border border-[#D8D8D8] px-2 text-[12px]">
            {Object.values(VARIAVEIS).map((x) => (
              <option key={x.key} value={x.key}>{x.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Eixo Y
          <select value={vy} onChange={(e) => setVy(e.target.value)} className="h-8 border border-[#D8D8D8] px-2 text-[12px]">
            {Object.values(VARIAVEIS).map((x) => (
              <option key={x.key} value={x.key}>{x.label}</option>
            ))}
          </select>
        </label>
        {carregando && <span className="text-[#666666]">Calculando {(n + 1) * (n + 1) || 289} combinações…</span>}
        <div className="flex items-center gap-3">
          {ROUTE_KEYS.map((r) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3" style={{ background: ROUTE_COLOR[r] }} />
              {ROUTE_LABEL[r]}
            </span>
          ))}
        </div>
      </div>

      {dados && (
        <div className="flex gap-2">
          <div className="flex w-16 flex-col justify-between py-1 text-right text-[10px] text-[#666666]">
            <span>{nf(hiY, Y.dec)}</span>
            <span>{nf((hiY + loY) / 2, Y.dec)}</span>
            <span>{nf(loY, Y.dec)}</span>
          </div>
          <div className="w-full max-w-[520px]">
            <div
              className="grid w-full border border-[#E2E2E2]"
              style={{ gridTemplateColumns: `repeat(${n + 1}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: n + 1 }, (_, jj) => n - jj).flatMap((j) =>
                Array.from({ length: n + 1 }, (_, i) => {
                  const c = dados.celulas[i * (n + 1) + j];
                  // Margem sobre a segunda colocada: quanto mais escura a célula,
                  // mais folgada é a vitória daquela rota.
                  const alpha = 0.35 + Math.min(0.65, c.margemPct / 30);
                  return (
                    <div
                      key={`${i}-${j}`}
                      title={`${X.label}: ${nf(c.x, X.dec)} ${X.unit} | ${Y.label}: ${nf(c.y, Y.dec)} ${Y.unit} → ${ROUTE_LABEL[c.vencedor]} (margem ${nf(c.margemPct, 1)}%)`}
                      style={{ background: ROUTE_COLOR[c.vencedor], opacity: alpha, aspectRatio: "1 / 1" }}
                    />
                  );
                }),
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#666666]">
              <span>{nf(loX, X.dec)}</span>
              <span>{X.label} ({X.unit})</span>
              <span>{nf(hiX, X.dec)}</span>
            </div>
          </div>
          <div className="max-w-[280px] text-[11px] leading-snug text-[#666666]">{resumoMapa(dados)}</div>
        </div>
      )}
    </Secao>
  );
}

/** Lê o mapa e diz, em uma frase, o que ele mostra. */
function resumoMapa(dados: ReturnType<typeof mapaCalor>) {
  const total = dados.celulas.length;
  const contagem = ROUTE_KEYS.map((r) => ({
    r,
    n: dados.celulas.filter((c) => c.vencedor === r).length,
  })).filter((x) => x.n > 0);
  if (contagem.length === 1) {
    return `${ROUTE_LABEL[contagem[0].r]} vence em todas as ${total} combinações desta faixa: nenhuma dessas duas variáveis, isoladamente ou em conjunto, inverte a decisão dentro dos limites plausíveis. Amplie a faixa nos eixos ou combine com preço de carbono e CAPEX.`;
  }
  return `Fronteira de indiferença visível. ${contagem
    .map((x) => `${ROUTE_LABEL[x.r]} vence em ${nf((x.n / total) * 100, 1)}% da área`)
    .join("; ")}.`;
}

function MonteCarlo({
  mc,
  definirMc,
  sensiveis,
}: {
  mc: Record<string, McSpec>;
  definirMc: (path: string, spec: McSpec | null) => void;
  sensiveis: string[];
}) {
  const { scenario } = useTco();
  const [iteracoes, setIteracoes] = useState(10000);
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [res, setRes] = useState<ResultadoMC | null>(null);
  const cancelar = useRef(false);

  const candidatos = useMemo(
    () => (sensiveis.length > 0 ? sensiveis : NUMERIC_PATHS.filter((p) => FIELDS[p].sens)).slice(0, 40),
    [sensiveis],
  );

  const rodar = () => {
    const specs = Object.keys(mc).length > 0 ? mc : null;
    if (!specs) return;
    setRodando(true);
    setProgresso(0);
    cancelar.current = false;
    const lote = 500;
    const parciais: ResultadoMC[] = [];
    const executar = (feitas: number) => {
      if (cancelar.current) {
        setRodando(false);
        return;
      }
      const n = Math.min(lote, iteracoes - feitas);
      parciais.push(monteCarlo(scenario, specs, n, (p) => FIELDS[p]?.label ?? p));
      const total = feitas + n;
      setProgresso(total);
      if (total >= iteracoes) {
        setRes(consolidar(parciais));
        setRodando(false);
        return;
      }
      setTimeout(() => executar(total), 0);
    };
    executar(0);
  };

  const histograma = useMemo(() => {
    if (!res) return [];
    const todos = ROUTE_KEYS.flatMap((r) => res.amostras[r]);
    const min = Math.min(...todos);
    const max = Math.max(...todos);
    const nb = 30;
    const largura = (max - min) / nb || 1;
    return Array.from({ length: nb }, (_, i) => {
      const x0 = min + i * largura;
      const linha: Record<string, number | string> = { faixa: nf(x0, 3) };
      for (const r of ROUTE_KEYS)
        linha[r] = res.amostras[r].filter((v) => v >= x0 && v < x0 + largura).length;
      return linha;
    });
  }, [res]);

  return (
    <Secao
      titulo="Simulação de Monte Carlo"
      descricao="Declare a distribuição de cada input incerto e a simulação devolve a probabilidade de cada rota ser a mais barata. Marque campos com a estrela nas abas de entrada para que apareçam aqui."
      colunas={1}
    >
      <div className="mb-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0D2B55] text-white">
              <th className="p-2 text-left font-medium">Variável</th>
              <th className="p-2 text-left font-medium">Distribuição</th>
              <th className="p-2 text-right font-medium">Parâmetro 1</th>
              <th className="p-2 text-right font-medium">Parâmetro 2</th>
              <th className="p-2 text-right font-medium">Parâmetro 3</th>
              <th className="p-2 text-center font-medium">Incluir</th>
            </tr>
          </thead>
          <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5">
            {candidatos.map((p) => {
              const meta = FIELDS[p];
              const base = getPath<number>(scenario, p);
              const spec = mc[p];
              const ativo = !!spec;
              const atualizar = (campo: keyof McSpec, valor: McSpec[keyof McSpec]) =>
                definirMc(p, { ...(spec as McSpec), [campo]: valor });
              return (
                <tr key={p}>
                  <td>
                    {meta?.label ?? p} <span className="text-[#666666]">({meta?.unit})</span>
                  </td>
                  <td>
                    <select
                      disabled={!ativo}
                      value={spec?.dist ?? "triangular"}
                      onChange={(e) => atualizar("dist", e.target.value as McSpec["dist"])}
                      className="h-7 border border-[#D8D8D8] px-1 text-[11px] disabled:bg-[#F4F4F4]"
                    >
                      <option value="triangular">Triangular (mín, moda, máx)</option>
                      <option value="normal">Normal (média, desvio)</option>
                      <option value="uniforme">Uniforme (mín, máx)</option>
                    </select>
                  </td>
                  {(["p1", "p2", "p3"] as const).map((k) => (
                    <td key={k} className="text-right">
                      <input
                        type="number"
                        disabled={!ativo || (k === "p3" && spec?.dist !== "triangular")}
                        value={spec?.[k] ?? ""}
                        onChange={(e) => atualizar(k, Number(e.target.value))}
                        className="h-7 w-28 border border-[#D8D8D8] px-1 text-right font-mono text-[11px] disabled:bg-[#F4F4F4]"
                      />
                    </td>
                  ))}
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) =>
                        definirMc(
                          p,
                          e.target.checked
                            ? { dist: "triangular", p1: base * 0.8, p2: base, p3: base * 1.25 }
                            : null,
                        )
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px]">
        <label className="flex items-center gap-2">
          Iterações
          <input
            type="number"
            min={100}
            max={50000}
            step={500}
            value={iteracoes}
            onChange={(e) => setIteracoes(Number(e.target.value))}
            className="h-8 w-28 border border-[#D8D8D8] px-2 text-right font-mono"
          />
        </label>
        <button
          onClick={rodando ? () => (cancelar.current = true) : rodar}
          disabled={Object.keys(mc).length === 0}
          className="border border-[#0D2B55] bg-[#0D2B55] px-4 py-1.5 text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {rodando ? `Cancelar (${nf(progresso, 0)} de ${nf(iteracoes, 0)})` : "Rodar simulação"}
        </button>
        {Object.keys(mc).length === 0 && (
          <span className="text-[#666666]">Marque ao menos uma variável na coluna “Incluir”.</span>
        )}
      </div>

      {res && (
        <>
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0D2B55] text-white">
                  <th className="p-2 text-left font-medium">Rota</th>
                  <th className="p-2 text-right font-medium">Probabilidade de ser a mais barata</th>
                  <th className="p-2 text-right font-medium">Probabilidade de superar o diesel</th>
                  <th className="p-2 text-right font-medium">P10</th>
                  <th className="p-2 text-right font-medium">P50</th>
                  <th className="p-2 text-right font-medium">P90</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
                {ROUTE_KEYS.map((r) => (
                  <tr key={r}>
                    <td style={{ color: ROUTE_COLOR[r] }}>{ROUTE_LABEL[r]}</td>
                    <td className="font-semibold">{pct(res.probVitoria[r], 1)}</td>
                    <td>{r === "diesel" ? "—" : pct(res.probMelhorQueDiesel[r], 1)}</td>
                    <td>{nf(res.p10[r], 4)}</td>
                    <td>{nf(res.p50[r], 4)}</td>
                    <td>{nf(res.p90[r], 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-[#666666]">Percentis em R$/t·km, sobre {nf(res.iteracoes, 0)} iterações.</p>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={histograma} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
                <XAxis dataKey="faixa" tick={{ fontSize: 10 }} label={{ value: "R$/t·km", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <RTooltip contentStyle={{ fontSize: 11 }} formatter={(v: number, n: string) => [nf(v, 0), ROUTE_LABEL[n as RouteKey] ?? n]} />
                <Legend formatter={(v) => <span className="text-[11px]">{ROUTE_LABEL[v as RouteKey] ?? v}</span>} />
                {ROUTE_KEYS.map((r) => (
                  <Bar key={r} dataKey={r} fill={ROUTE_COLOR[r]} fillOpacity={0.75} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#F4F4F4] text-[#0D2B55]">
                  <th className="p-2 text-left font-medium">Correlação entre input e resultado</th>
                  <th className="p-2 text-left font-medium">Rota</th>
                  <th className="p-2 text-right font-medium">Coeficiente de Pearson</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5">
                {res.correlacoes.slice(0, 12).map((c, i) => (
                  <tr key={i}>
                    <td>{c.label}</td>
                    <td style={{ color: ROUTE_COLOR[c.rota] }}>{ROUTE_LABEL[c.rota]}</td>
                    <td className="text-right font-mono tabular-nums">{nf(c.r, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Secao>
  );
}

/** Junta os lotes parciais da simulação em um único resultado. */
function consolidar(partes: ResultadoMC[]): ResultadoMC {
  if (partes.length === 1) return partes[0];
  const amostras = { diesel: [], h2: [], bev: [] } as Record<RouteKey, number[]>;
  const entradas: Record<string, number[]> = {};
  let iteracoes = 0;
  const vit = { diesel: 0, h2: 0, bev: 0 } as Record<RouteKey, number>;
  const melhor = { diesel: 0, h2: 0, bev: 0 } as Record<RouteKey, number>;
  for (const p of partes) {
    iteracoes += p.iteracoes;
    for (const [chave, vals] of Object.entries(p.entradas)) {
      entradas[chave] = (entradas[chave] || []).concat(vals);
    }
    for (const r of ROUTE_KEYS) {
      amostras[r].push(...p.amostras[r]);
      vit[r] += (p.probVitoria[r] / 100) * p.iteracoes;
      melhor[r] += (p.probMelhorQueDiesel[r] / 100) * p.iteracoes;
    }
  }
  const percentil = (arr: number[], q: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.round((q / 100) * (s.length - 1))))];
  };
  const mk = (fn: (k: RouteKey) => number) =>
    ({ diesel: fn("diesel"), h2: fn("h2"), bev: fn("bev") }) as Record<RouteKey, number>;
  return {
    iteracoes,
    amostras,
    probVitoria: mk((k) => (vit[k] / iteracoes) * 100),
    probMelhorQueDiesel: mk((k) => (melhor[k] / iteracoes) * 100),
    p10: mk((k) => percentil(amostras[k], 10)),
    p50: mk((k) => percentil(amostras[k], 50)),
    p90: mk((k) => percentil(amostras[k], 90)),
    media: mk((k) => amostras[k].reduce((a, b) => a + b, 0) / iteracoes),
    correlacoes: correlacionar(entradas, amostras, (p) => FIELDS[p]?.label ?? p),
    entradas,
  };
}
