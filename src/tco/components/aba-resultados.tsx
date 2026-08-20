/** Aba de resultados: comparativo, decomposição, fluxo de caixa e emissões. */
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { moeda, moedaCompacta, nf, pct } from "../format";
import { useTco } from "../store";
import { GRUPO_LABEL, GRUPO_ORDEM, ROUTE_COLOR, ROUTE_KEYS, ROUTE_LABEL, type GrupoCusto, type RouteKey } from "../types";
import { Aviso, Secao } from "./ui";

/** Paleta dos componentes de custo, derivada das cores institucionais. */
const COR_GRUPO: Record<GrupoCusto, string> = {
  aquisicao: "#0D2B55",
  financiamento: "#1F4A82",
  energia: "#8DC63F",
  arla: "#B7DE7C",
  manutencao: "#6E7B8B",
  substituicao: "#C77B2B",
  infraestrutura: "#3E8BC4",
  maoDeObra: "#9AA5B1",
  seguroTributos: "#4B5563",
  carbono: "#1A1A1A",
  indisponibilidade: "#A0522D",
  fiscal: "#2F6F6B",
  residual: "#9CC9E8",
};

export function AbaResultados() {
  const { resultado, scenario, abrirAuditoria } = useTco();
  const [rotaTabela, setRotaTabela] = useState<RouteKey>("diesel");
  const N = scenario.mission.horizonteAnos;

  const decomposicao = useMemo(
    () =>
      ROUTE_KEYS.map((r) => {
        const linha: Record<string, number | string> = { rota: ROUTE_LABEL[r] };
        for (const g of GRUPO_ORDEM) linha[g] = resultado.rotas[r].porGrupo[g] || 0;
        return linha;
      }),
    [resultado],
  );

  const acumulado = useMemo(() => {
    const wacc = scenario.econ.wacc / 100;
    const acc: Record<RouteKey, number> = { diesel: 0, h2: 0, bev: 0 };
    return resultado.anos.map((t) => {
      const p: Record<string, number> = { ano: t };
      for (const r of ROUTE_KEYS) {
        acc[r] += resultado.rotas[r].fluxoAnual[t] / Math.pow(1 + wacc, t);
        p[r] = acc[r];
      }
      return p;
    });
  }, [resultado, scenario.econ.wacc]);

  /** Anos em que a curva de uma rota alternativa cruza a do diesel. */
  const cruzamentos = useMemo(() => {
    const out: { ano: number; valor: number; rota: RouteKey }[] = [];
    for (const r of ["h2", "bev"] as RouteKey[]) {
      for (let i = 1; i < acumulado.length; i++) {
        const a = acumulado[i - 1][r] - acumulado[i - 1].diesel;
        const b = acumulado[i][r] - acumulado[i].diesel;
        if (a > 0 && b <= 0) out.push({ ano: acumulado[i].ano, valor: acumulado[i][r], rota: r });
      }
    }
    return out;
  }, [acumulado]);

  const rt = resultado.rotas[rotaTabela];
  const todosAlertas = [
    ...resultado.alertas,
    ...ROUTE_KEYS.flatMap((r) => resultado.rotas[r].alertas.map((a) => ({ ...a, rota: r }))),
  ];

  return (
    <>
      {todosAlertas.length > 0 && (
        <div className="mb-4 space-y-2">
          {todosAlertas.map((a, i) => (
            <Aviso key={i} nivel={a.nivel}>
              {a.rota ? <strong>{ROUTE_LABEL[a.rota]}: </strong> : null}
              {a.texto}
            </Aviso>
          ))}
        </div>
      )}

      <Secao titulo="Indicadores por rota" descricao="Clique em qualquer cartão para abrir o painel de auditoria com as fórmulas aplicadas e os valores substituídos." colunas={3}>
        {ROUTE_KEYS.map((r) => {
          const x = resultado.rotas[r];
          const venceu = resultado.vencedor === r;
          return (
            <div key={r} className={`border p-3 ${venceu ? "border-[#8DC63F] bg-[#F7FBF0]" : "border-[#E2E2E2] bg-white"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: ROUTE_COLOR[r] }}>
                  <span className="inline-block h-3 w-3" style={{ background: ROUTE_COLOR[r] }} />
                  {ROUTE_LABEL[r]}
                </span>
                {venceu && <span className="bg-[#8DC63F] px-1.5 py-0.5 text-[10px] font-bold text-white">MENOR CUSTO</span>}
              </div>
              <table className="w-full text-[11px]">
                <tbody className="[&_td]:py-0.5 [&_td:last-child]:text-right [&_td:last-child]:font-mono [&_td:last-child]:tabular-nums">
                  <tr><td className="text-[#666666]">TCO total (VPL)</td><td>{moeda(x.tco)}</td></tr>
                  <tr><td className="text-[#666666]">TCO da frota equivalente</td><td>{moeda(x.tcoFrota)}</td></tr>
                  <tr><td className="text-[#666666]">R$/km</td><td>{nf(x.tcoPorKm, 3)}</td></tr>
                  <tr><td className="text-[#666666]">R$/t·km</td><td>{nf(x.tcoPorTKm, 4)}</td></tr>
                  <tr><td className="text-[#666666]">Custo mensal equivalente</td><td>{moeda(x.custoMensalEquivalente)}</td></tr>
                  <tr><td className="text-[#666666]">Frota equivalente</td><td>{nf(x.nVeiculos, 0)}</td></tr>
                  <tr><td className="text-[#666666]">Emissões acumuladas</td><td>{nf(x.emissoesTotaisT, 0)} tCO₂e</td></tr>
                  <tr><td className="text-[#666666]">Emissão específica</td><td>{nf(x.emissaoPorKmG, 0)} gCO₂e/km</td></tr>
                  <tr>
                    <td className="text-[#666666]">MAC vs diesel</td>
                    <td>
                      {r === "diesel"
                        ? "—"
                        : resultado.mac[r] === null
                          ? "n/d"
                          : `${nf(resultado.mac[r]!, 0)} R$/tCO₂e`}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-[#666666]">Payback vs diesel</td>
                    <td>{r === "diesel" ? "—" : resultado.payback[r] === null ? "não ocorre" : `ano ${resultado.payback[r]}`}</td>
                  </tr>
                </tbody>
              </table>
              {r !== "diesel" && resultado.mac[r] !== null && resultado.mac[r]! < 0 && (
                <p className="mt-2 border-l-4 border-[#8DC63F] bg-[#F2F9E8] px-2 py-1 text-[10px] leading-snug text-[#3C6B0A]">
                  Abatimento com ganho econômico: esta rota reduz emissões e custa menos que o diesel.
                </p>
              )}
              <button
                onClick={() => abrirAuditoria(r)}
                className="mt-2 w-full border border-[#0D2B55] px-2 py-1 text-[11px] text-[#0D2B55] hover:bg-[#0D2B55] hover:text-white"
              >
                Auditar cálculo
              </button>
            </div>
          );
        })}
      </Secao>

      <Secao titulo="Decomposição do TCO por componente" descricao="Valores em VPL por veículo. Barras negativas representam entradas de caixa: valor residual e benefício fiscal." colunas={1}>
        <div className="h-[420px] w-full">
          <ResponsiveContainer>
            <BarChart data={decomposicao} stackOffset="sign" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
              <XAxis dataKey="rota" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => moedaCompacta(v)} tick={{ fontSize: 11 }} width={90} />
              <RTooltip
                formatter={(v: number, n: string) => [moeda(v), GRUPO_LABEL[n as GrupoCusto] ?? n]}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend formatter={(v) => <span className="text-[11px]">{GRUPO_LABEL[v as GrupoCusto] ?? v}</span>} />
              {GRUPO_ORDEM.map((g) => (
                <Bar key={g} dataKey={g} stackId="tco" fill={COR_GRUPO[g]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      <Secao titulo="TCO acumulado ano a ano" descricao="Valor presente acumulado do fluxo de caixa. Os degraus correspondem a substituições de bateria ou de pilha; os pontos marcam o cruzamento com a curva do diesel." colunas={1}>
        <div className="h-[380px] w-full">
          <ResponsiveContainer>
            <LineChart data={acumulado} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
              <XAxis
                dataKey="ano"
                type="number"
                domain={[0, N]}
                allowDecimals={false}
                tickCount={Math.min(12, N + 1)}
                tick={{ fontSize: 11 }}
                label={{ value: "Ano", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis tickFormatter={(v) => moedaCompacta(v)} tick={{ fontSize: 11 }} width={90} />
              <RTooltip formatter={(v: number, n: string) => [moeda(v), ROUTE_LABEL[n as RouteKey] ?? n]} contentStyle={{ fontSize: 11 }} />
              <Legend formatter={(v) => <span className="text-[11px]">{ROUTE_LABEL[v as RouteKey] ?? v}</span>} />
              {ROUTE_KEYS.map((r) => (
                <Line key={r} type="monotone" dataKey={r} stroke={ROUTE_COLOR[r]} strokeWidth={2} dot={false} />
              ))}
              {cruzamentos.map((c, i) => (
                <ReferenceDot key={i} x={c.ano} y={c.valor} r={5} fill={ROUTE_COLOR[c.rota]} stroke="#1A1A1A" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {cruzamentos.length === 0 && (
          <p className="text-[11px] text-[#666666]">
            Nenhuma curva alternativa cruza a do diesel dentro do horizonte de {N} anos com as premissas atuais.
          </p>
        )}
      </Secao>

      <Secao titulo="Carga, disponibilidade e frota equivalente" descricao="A comparação é feita sobre a mesma missão anual de transporte, e não veículo contra veículo." colunas={1}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0D2B55] text-white">
                <th className="p-2 text-left font-medium">Indicador</th>
                {ROUTE_KEYS.map((r) => (
                  <th key={r} className="p-2 text-right font-medium">{ROUTE_LABEL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
              <tr><td>Massa do sistema de energia (t)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].massaSistemaEnergiaT, 2)}</td>)}</tr>
              <tr><td>Tara total (t)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].taraTotalT, 2)}</td>)}</tr>
              <tr><td>Carga útil disponível (t)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].cargaUtilT, 2)}</td>)}</tr>
              <tr className="bg-[#F7FBF0]">
                <td>Carga útil perdida vs diesel (t)</td>
                {ROUTE_KEYS.map((r) => (
                  <td key={r}>{nf(resultado.rotas.diesel.cargaUtilT - resultado.rotas[r].cargaUtilT, 2)}</td>
                ))}
              </tr>
              <tr><td>Carga efetivamente transportada (t)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].cargaTransportadaT, 2)}</td>)}</tr>
              <tr><td>Fator de viagens (penalidade de payload)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].fatorViagens, 3)}</td>)}</tr>
              <tr><td>Quilometragem ajustada (km/ano)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].kmAjustado[1], 0)}</td>)}</tr>
              <tr><td>t·km produtivas por ano</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].tkmAno[1], 0)}</td>)}</tr>
              <tr><td>Horas anuais de abastecimento ou recarga</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].horasAbastecimentoAno, 0)}</td>)}</tr>
              <tr><td>Horas anuais em manutenção e falha</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].horasManutencaoAno + resultado.rotas[r].horasFalhaAno, 0)}</td>)}</tr>
              <tr><td>Disponibilidade</td>{ROUTE_KEYS.map((r) => <td key={r}>{pct(resultado.rotas[r].disponibilidade * 100)}</td>)}</tr>
              <tr><td>Dias parados por ano</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].diasParadosAno, 1)}</td>)}</tr>
              <tr className="font-semibold"><td>Frota equivalente (veículos)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].nVeiculos, 0)}</td>)}</tr>
              <tr><td>Consumo específico ({ROUTE_KEYS.map((r) => resultado.rotas[r].unidadeConsumo).join(" / ")})</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].consumoEspecifico[1], 3)}</td>)}</tr>
              <tr><td>Eficiência implícita do trem de força</td>{ROUTE_KEYS.map((r) => <td key={r}>{pct(resultado.rotas[r].eficienciaImplicita * 100)}</td>)}</tr>
              <tr><td>Substituição de bateria ou pilha</td>{ROUTE_KEYS.map((r) => <td key={r}>{resultado.rotas[r].anoSubstituicao ? `ano ${resultado.rotas[r].anoSubstituicao}` : "não ocorre"}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Emissões e poluentes locais" colunas={1}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0D2B55] text-white">
                <th className="p-2 text-left font-medium">Indicador</th>
                {ROUTE_KEYS.map((r) => <th key={r} className="p-2 text-right font-medium">{ROUTE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
              <tr><td>Emissão WTW (gCO₂e/km)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].emissaoPorKmG, 0)}</td>)}</tr>
              <tr><td>Emissões acumuladas (tCO₂e)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].emissoesTotaisT, 1)}</td>)}</tr>
              <tr><td>tCO₂e evitadas vs diesel</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas.diesel.emissoesTotaisT - resultado.rotas[r].emissoesTotaisT, 1)}</td>)}</tr>
              <tr><td>NOx (kg/ano)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].noxAnualKg, 1)}</td>)}</tr>
              <tr><td>Material particulado (kg/ano)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].mpAnualKg, 2)}</td>)}</tr>
              <tr><td>Custo marginal de abatimento (R$/tCO₂e)</td>{ROUTE_KEYS.map((r) => <td key={r}>{r === "diesel" ? "—" : resultado.mac[r] === null ? "n/d" : nf(resultado.mac[r]!, 0)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Delta contra o diesel por componente de custo" descricao="Quanto cada rota alternativa economiza ou gasta a mais, em VPL e em percentual." colunas={1}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0D2B55] text-white">
                <th className="p-2 text-left font-medium">Componente</th>
                <th className="p-2 text-right font-medium">Diesel</th>
                <th className="p-2 text-right font-medium">Hidrogênio</th>
                <th className="p-2 text-right font-medium">Δ H₂</th>
                <th className="p-2 text-right font-medium">Δ H₂ %</th>
                <th className="p-2 text-right font-medium">Elétrico</th>
                <th className="p-2 text-right font-medium">Δ BEV</th>
                <th className="p-2 text-right font-medium">Δ BEV %</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
              {GRUPO_ORDEM.map((g) => {
                const d = resultado.rotas.diesel.porGrupo[g];
                const h = resultado.rotas.h2.porGrupo[g];
                const b = resultado.rotas.bev.porGrupo[g];
                if (!d && !h && !b) return null;
                const p = (v: number) => (Math.abs(d) > 1e-6 ? pct(((v - d) / Math.abs(d)) * 100, 0) : "—");
                return (
                  <tr key={g}>
                    <td>{GRUPO_LABEL[g]}</td>
                    <td>{moeda(d)}</td>
                    <td>{moeda(h)}</td>
                    <td className={h - d > 0 ? "text-[#C0392B]" : "text-[#3C6B0A]"}>{moeda(h - d)}</td>
                    <td>{p(h)}</td>
                    <td>{moeda(b)}</td>
                    <td className={b - d > 0 ? "text-[#C0392B]" : "text-[#3C6B0A]"}>{moeda(b - d)}</td>
                    <td>{p(b)}</td>
                  </tr>
                );
              })}
              <tr className="bg-[#F4F4F4] font-semibold">
                <td>TCO total</td>
                <td>{moeda(resultado.rotas.diesel.tco)}</td>
                <td>{moeda(resultado.rotas.h2.tco)}</td>
                <td>{moeda(resultado.rotas.h2.tco - resultado.rotas.diesel.tco)}</td>
                <td>{pct(((resultado.rotas.h2.tco - resultado.rotas.diesel.tco) / resultado.rotas.diesel.tco) * 100, 0)}</td>
                <td>{moeda(resultado.rotas.bev.tco)}</td>
                <td>{moeda(resultado.rotas.bev.tco - resultado.rotas.diesel.tco)}</td>
                <td>{pct(((resultado.rotas.bev.tco - resultado.rotas.diesel.tco) / resultado.rotas.diesel.tco) * 100, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Fluxo de caixa ano a ano" descricao="Todas as linhas do fluxo, na moeda selecionada na aba Missão. Custos positivos, entradas negativas." colunas={1}>
        <div className="mb-2 flex gap-2">
          {ROUTE_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => setRotaTabela(r)}
              className={`border px-3 py-1 text-[11px] ${rotaTabela === r ? "border-transparent text-white" : "border-[#D8D8D8] text-[#666666]"}`}
              style={rotaTabela === r ? { background: ROUTE_COLOR[r] } : undefined}
            >
              {ROUTE_LABEL[r]}
            </button>
          ))}
        </div>
        <TabelaFluxo rota={rotaTabela} />
      </Secao>
    </>
  );
}

/** Tabela do fluxo de caixa de uma rota, com conversão para a base nominal. */
export function TabelaFluxo({ rota }: { rota: RouteKey }) {
  const { resultado, scenario } = useTco();
  const r = resultado.rotas[rota];
  const nominal = scenario.econ.baseValores === "nominal";
  const ipca = scenario.econ.ipca / 100;
  const conv = (v: number, t: number) => (nominal ? v * Math.pow(1 + ipca, t) : v);
  const wacc = scenario.econ.wacc / 100;
  const taxaDesconto = nominal ? (1 + wacc) * (1 + ipca) - 1 : wacc;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#0D2B55] text-white">
            <th className="sticky left-0 z-10 bg-[#0D2B55] p-2 text-left font-medium">Linha</th>
            {resultado.anos.map((t) => (
              <th key={t} className="p-2 text-right font-medium">{t}</th>
            ))}
            <th className="p-2 text-right font-medium">VPL</th>
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
          {r.linhas.map((l) => {
            const vpl = l.valores.reduce((a, v, t) => a + conv(v, t) / Math.pow(1 + taxaDesconto, t), 0);
            return (
              <tr key={l.chave}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white">{l.rotulo}</td>
                {l.valores.map((v, t) => (
                  <td key={t} className={v < 0 ? "text-[#3C6B0A]" : ""}>{v ? nf(conv(v, t), 0) : "—"}</td>
                ))}
                <td className="font-semibold">{nf(vpl, 0)}</td>
              </tr>
            );
          })}
          <tr className="bg-[#F4F4F4] font-semibold">
            <td className="sticky left-0 z-10 bg-[#F4F4F4]">Fluxo de caixa líquido</td>
            {r.fluxoAnual.map((v, t) => (
              <td key={t}>{nf(conv(v, t), 0)}</td>
            ))}
            <td>{nf(r.tco, 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
