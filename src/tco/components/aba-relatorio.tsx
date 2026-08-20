/** Aba de relatório: sumário executivo, premissas, exportações e comparação de cenários. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { computeScenario } from "../engine";
import { FIELDS } from "../fields";
import {
  exportarJson,
  exportarPdf,
  exportarXlsx,
  importarJson,
  linhasPremissas,
  rodandoNoVisualizador,
  AVISO_LEGAL,
} from "../exportar";
import { moeda, nf, pct } from "../format";
import { sumarioExecutivo } from "../resumo";
import { useTco } from "../store";
import { GRUPO_LABEL, GRUPO_ORDEM, ROUTE_COLOR, ROUTE_KEYS, ROUTE_LABEL } from "../types";
import { Aviso, Secao } from "./ui";
import { LogoAhs } from "./logo";

export function AbaRelatorio() {
  const { scenario, resultado, substituir, salvos, salvar, carregar, excluir } = useTco();
  const [nomeSalvar, setNomeSalvar] = useState("");
  const [comparar, setComparar] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [noVisualizador, setNoVisualizador] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // No visualizador de artefatos a página não pode iniciar um download por
  // conta própria: o arquivo é entregue pelo host, com confirmação, e a
  // planilha fica fora dos formatos aceitos.
  useEffect(() => {
    let vivo = true;
    rodandoNoVisualizador().then((v) => vivo && setNoVisualizador(v));
    return () => {
      vivo = false;
    };
  }, []);

  const paragrafos = useMemo(() => sumarioExecutivo(scenario, resultado), [scenario, resultado]);
  const premissas = useMemo(() => linhasPremissas(scenario).slice(1), [scenario]);

  const comparativos = useMemo(
    () =>
      comparar
        .map((id) => salvos.find((s) => s.id === id))
        .filter(Boolean)
        .slice(0, 4)
        .map((s) => ({ nome: s!.nome, res: computeScenario(s!.scenario) })),
    [comparar, salvos],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <button onClick={exportarPdf} className="border border-[#0D2B55] bg-[#0D2B55] px-4 py-2 text-[12px] text-white">
          Exportar PDF (impressão)
        </button>
        <button
          onClick={async () => {
            const r = await exportarXlsx(scenario, resultado);
            setErro(r.ok ? null : r.motivo ?? null);
          }}
          className="border border-[#0D2B55] px-4 py-2 text-[12px] text-[#0D2B55] hover:bg-[#0D2B55] hover:text-white"
        >
          Exportar XLSX
        </button>
        <button
          onClick={async () => {
            const r = await exportarJson(scenario);
            setErro(r.ok ? null : r.motivo ?? null);
          }}
          className="border border-[#0D2B55] px-4 py-2 text-[12px] text-[#0D2B55] hover:bg-[#0D2B55] hover:text-white"
        >
          Exportar JSON do cenário
        </button>
        <button
          onClick={() => arquivoRef.current?.click()}
          className="border border-[#0D2B55] px-4 py-2 text-[12px] text-[#0D2B55] hover:bg-[#0D2B55] hover:text-white"
        >
          Importar JSON
        </button>
        <input
          ref={arquivoRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              substituir(await importarJson(f));
              setErro(null);
            } catch (err) {
              setErro((err as Error).message);
            }
            e.target.value = "";
          }}
        />
      </div>
      {erro && (
        <div className="mb-4 print:hidden">
          <Aviso nivel="erro">{erro}</Aviso>
        </div>
      )}
      {noVisualizador && (
        <div className="mb-4 print:hidden">
          <Aviso nivel="info">
            Esta é a versão publicada do simulador. O JSON do cenário é entregue mediante confirmação; a planilha
            XLSX e a impressão em PDF só funcionam rodando o projeto localmente. O cálculo, os solvers e a
            simulação de Monte Carlo funcionam integralmente aqui.
          </Aviso>
        </div>
      )}

      <div id="relatorio-impressao">
        <div className="mb-4 hidden items-center gap-3 border-b border-[#0D2B55] pb-3 print:flex">
          <LogoAhs altura={32} />
          <div>
            <div className="text-[15px] font-semibold text-[#0D2B55]">
              AHS TCO Fleet — Comparador de Custo Total de Propriedade
            </div>
            <div className="text-[11px] text-[#666666]">
              {scenario.meta.nome} · {scenario.meta.autor || "sem autor informado"} · data-base {scenario.meta.data}
            </div>
          </div>
        </div>

        <Secao titulo="Sumário executivo" colunas={1}>
          <ul className="space-y-2 text-[12px] leading-relaxed text-[#1A1A1A]">
            {paragrafos.map((p, i) => (
              <li key={i} className="border-l-2 border-[#8DC63F] pl-3">
                {p}
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Indicadores consolidados" colunas={1}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0D2B55] text-white">
                  <th className="p-2 text-left font-medium">Indicador</th>
                  {ROUTE_KEYS.map((r) => (
                    <th key={r} className="p-2 text-right font-medium">{ROUTE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
                <tr><td>TCO por veículo (VPL)</td>{ROUTE_KEYS.map((r) => <td key={r}>{moeda(resultado.rotas[r].tco)}</td>)}</tr>
                <tr><td>TCO da frota equivalente</td>{ROUTE_KEYS.map((r) => <td key={r}>{moeda(resultado.rotas[r].tcoFrota)}</td>)}</tr>
                <tr><td>R$/km</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].tcoPorKm, 3)}</td>)}</tr>
                <tr className="bg-[#F7FBF0] font-semibold"><td>R$/t·km</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].tcoPorTKm, 4)}</td>)}</tr>
                <tr><td>Custo mensal equivalente</td>{ROUTE_KEYS.map((r) => <td key={r}>{moeda(resultado.rotas[r].custoMensalEquivalente)}</td>)}</tr>
                <tr><td>Frota equivalente (veículos)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].nVeiculos, 0)}</td>)}</tr>
                <tr><td>Emissões acumuladas (tCO₂e)</td>{ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].emissoesTotaisT, 1)}</td>)}</tr>
                <tr><td>MAC vs diesel (R$/tCO₂e)</td>{ROUTE_KEYS.map((r) => <td key={r}>{r === "diesel" ? "—" : resultado.mac[r] === null ? "n/d" : nf(resultado.mac[r]!, 0)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao titulo="Decomposição do TCO por componente (VPL)" colunas={1}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0D2B55] text-white">
                  <th className="p-2 text-left font-medium">Componente</th>
                  {ROUTE_KEYS.map((r) => <th key={r} className="p-2 text-right font-medium">{ROUTE_LABEL[r]}</th>)}
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
                {GRUPO_ORDEM.map((g) => {
                  const vals = ROUTE_KEYS.map((r) => resultado.rotas[r].porGrupo[g]);
                  if (vals.every((v) => !v)) return null;
                  return (
                    <tr key={g}>
                      <td>{GRUPO_LABEL[g]}</td>
                      {vals.map((v, i) => <td key={i}>{moeda(v)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao titulo="Tabela completa de premissas" descricao="Todos os parâmetros do cenário, com unidade e fonte declarada." colunas={1}>
          <div className="max-h-[520px] overflow-auto print:max-h-none">
            <table className="w-full border-collapse text-[10px]">
              <thead className="sticky top-0">
                <tr className="bg-[#F4F4F4] text-[#0D2B55]">
                  <th className="p-1.5 text-left font-medium">Parâmetro</th>
                  <th className="p-1.5 text-left font-medium">Unidade</th>
                  <th className="p-1.5 text-right font-medium">Valor</th>
                  <th className="p-1.5 text-left font-medium">Definição e fonte</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5 [&_td]:align-top">
                {premissas.map((l, i) => (
                  <tr key={i}>
                    <td>{l[1]}</td>
                    <td className="whitespace-nowrap text-[#666666]">{l[2]}</td>
                    <td className="whitespace-nowrap text-right font-mono tabular-nums">
                      {typeof l[3] === "number" ? nf(l[3], FIELDS[String(l[0])]?.dec ?? 2) : String(l[3])}
                    </td>
                    <td className="text-[#666666]">{l[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>

        <footer className="mt-4 border-t border-[#E2E2E2] pt-3 text-[10px] leading-snug text-[#666666]">
          <div className="mb-2 hidden print:block">
            <LogoAhs altura={24} />
          </div>
          {AVISO_LEGAL}
        </footer>
      </div>

      <div className="print:hidden">
        <Secao titulo="Cenários salvos" descricao="Persistidos neste navegador. Selecione até quatro para comparar lado a lado." colunas={1}>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={nomeSalvar}
              onChange={(e) => setNomeSalvar(e.target.value)}
              placeholder={scenario.meta.nome}
              className="h-8 min-w-[240px] flex-1 border border-[#D8D8D8] px-2 text-[12px]"
            />
            <button
              onClick={() => {
                salvar(nomeSalvar);
                setNomeSalvar("");
              }}
              className="border border-[#0D2B55] bg-[#0D2B55] px-4 text-[12px] text-white"
            >
              Salvar cenário atual
            </button>
          </div>
          {salvos.length === 0 ? (
            <p className="text-[11px] text-[#666666]">Nenhum cenário salvo ainda.</p>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#F4F4F4] text-[#0D2B55]">
                  <th className="p-2 text-left font-medium">Comparar</th>
                  <th className="p-2 text-left font-medium">Nome</th>
                  <th className="p-2 text-left font-medium">Autor</th>
                  <th className="p-2 text-left font-medium">Salvo em</th>
                  <th className="p-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2">
                {salvos.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={comparar.includes(s.id)}
                        onChange={(e) =>
                          setComparar((c) => (e.target.checked ? [...c, s.id].slice(-4) : c.filter((x) => x !== s.id)))
                        }
                      />
                    </td>
                    <td>{s.nome}</td>
                    <td className="text-[#666666]">{s.autor || "—"}</td>
                    <td className="text-[#666666]">{new Date(s.data).toLocaleString("pt-BR")}</td>
                    <td className="text-right">
                      <button onClick={() => carregar(s.id)} className="mr-2 text-[#0D2B55] underline">Carregar</button>
                      <button onClick={() => excluir(s.id)} className="text-[#C0392B] underline">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>

        {comparativos.length > 0 && (
          <Secao titulo="Comparação lado a lado" colunas={1}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0D2B55] text-white">
                    <th className="p-2 text-left font-medium">Cenário</th>
                    {ROUTE_KEYS.map((r) => (
                      <th key={r} className="p-2 text-right font-medium">{ROUTE_LABEL[r]} (R$/t·km)</th>
                    ))}
                    <th className="p-2 text-right font-medium">Vencedor</th>
                    <th className="p-2 text-right font-medium">MAC H₂</th>
                    <th className="p-2 text-right font-medium">MAC BEV</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-2 [&_td:not(:first-child)]:text-right [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
                  <tr className="bg-[#F7FBF0]">
                    <td className="font-semibold">Cenário atual</td>
                    {ROUTE_KEYS.map((r) => <td key={r}>{nf(resultado.rotas[r].tcoPorTKm, 4)}</td>)}
                    <td style={{ color: ROUTE_COLOR[resultado.vencedor] }}>{ROUTE_LABEL[resultado.vencedor]}</td>
                    <td>{resultado.mac.h2 === null ? "n/d" : nf(resultado.mac.h2, 0)}</td>
                    <td>{resultado.mac.bev === null ? "n/d" : nf(resultado.mac.bev, 0)}</td>
                  </tr>
                  {comparativos.map((c, i) => (
                    <tr key={i}>
                      <td>{c.nome}</td>
                      {ROUTE_KEYS.map((r) => <td key={r}>{nf(c.res.rotas[r].tcoPorTKm, 4)}</td>)}
                      <td style={{ color: ROUTE_COLOR[c.res.vencedor] }}>{ROUTE_LABEL[c.res.vencedor]}</td>
                      <td>{c.res.mac.h2 === null ? "n/d" : nf(c.res.mac.h2, 0)}</td>
                      <td>{c.res.mac.bev === null ? "n/d" : nf(c.res.mac.bev, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}
      </div>
    </>
  );
}
