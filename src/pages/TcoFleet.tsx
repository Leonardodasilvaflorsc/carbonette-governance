/** AHS TCO Fleet — página única do comparador de custo total de propriedade. */
import React, { useEffect, useRef, useState } from "react";
import { AbaEquilibrio } from "@/tco/components/aba-equilibrio";
import { AbaRelatorio } from "@/tco/components/aba-relatorio";
import { AbaResultados } from "@/tco/components/aba-resultados";
import { TabBev, TabDiesel, TabGas, TabH2, TabMissao } from "@/tco/components/abas-inputs";
import { LogoAhs } from "@/tco/components/logo";
import { PainelAuditoria } from "@/tco/components/painel-auditoria";
import { Dica } from "@/tco/components/ui";
import { getPath } from "@/tco/engine/util";
import { moeda, nf } from "@/tco/format";
import { PRESETS } from "@/tco/presets";
import { fraseVencedor } from "@/tco/resumo";
import { TcoProvider, useTco } from "@/tco/store";
import { ROTAS_ALTERNATIVAS, ROUTE_COLOR, ROUTE_KEYS, ROUTE_LABEL } from "@/tco/types";

const ABAS = [
  { id: "missao", rotulo: "1. Missão" },
  { id: "diesel", rotulo: "2. Diesel" },
  { id: "gas", rotulo: "3. Gás / Biometano" },
  { id: "h2", rotulo: "4. Hidrogênio" },
  { id: "bev", rotulo: "5. Elétrico" },
  { id: "resultados", rotulo: "6. Resultados" },
  { id: "equilibrio", rotulo: "7. Ponto de equilíbrio" },
  { id: "relatorio", rotulo: "8. Relatório" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

const ESTILO_IMPRESSAO = `
@media print {
  body { background: #fff; }
  .print\\:hidden { display: none !important; }
  .tco-shell { display: block !important; }
  .tco-sidebar { display: none !important; }
  .tco-conteudo { max-height: none !important; overflow: visible !important; }
  section { break-inside: avoid; }
  @page { size: A4; margin: 12mm; }
}
`;

function Cabecalho() {
  const { scenario, resultado, usarPreset, presetAtivo, resetar } = useTco();
  return (
    <header className="border-b border-[#0D2B55] bg-[#0D2B55] text-white print:hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <LogoAhs altura={32} />
        <div className="mr-auto">
          <h1 className="text-[15px] font-semibold leading-tight">
            AHS TCO Fleet — Comparador de Custo Total de Propriedade
          </h1>
          <p className="text-[11px] leading-tight text-white/70">
            Diesel · Gás natural · Biometano · Hidrogênio · Elétrico — mesma missão, mesmo horizonte, mesma base
          </p>
        </div>
        <select
          value={presetAtivo ?? ""}
          onChange={(e) => e.target.value && usarPreset(e.target.value)}
          className="h-8 border border-white/40 bg-[#0D2B55] px-2 text-[12px] text-white"
        >
          <option value="">Cenário personalizado</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <button
          onClick={resetar}
          className="h-8 border border-white/40 px-3 text-[12px] hover:bg-white/10"
          title="Voltar a todos os defaults de fábrica"
        >
          Restaurar padrões
        </button>
      </div>
      <div className="border-t border-white/15 bg-[#0A2247] px-4 py-1.5 text-[11px] text-white/80">
        {fraseVencedor(resultado)}
      </div>
    </header>
  );
}

/** Controles deslizantes de comparação rápida, para uso em reunião. */
function ComparacaoRapida() {
  const { scenario, set } = useTco();
  const controles = [
    { path: "diesel.precoDieselL", rotulo: "Diesel", unidade: "R$/L", min: 3, max: 15, passo: 0.05, dec: 2 },
    { path: "gas.gnvPrecoM3", rotulo: "Gás natural", unidade: "R$/m³", min: 1, max: 12, passo: 0.05, dec: 2 },
    { path: "gas.bioPrecoM3", rotulo: "Biometano", unidade: "R$/m³", min: 1, max: 12, passo: 0.05, dec: 2 },
    { path: "h2.aPrecoKg", rotulo: "Hidrogênio", unidade: "R$/kg", min: 5, max: 90, passo: 0.5, dec: 2 },
    { path: "bev.teForaPontaRSMWh", rotulo: "Energia (TE fora de ponta)", unidade: "R$/MWh", min: 50, max: 1200, passo: 5, dec: 0 },
  ];
  const modoH2 = scenario.h2.modoSuprimento;
  return (
    <div className="border-b border-[#E2E2E2] bg-[#F4F4F4] px-4 py-2 print:hidden">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#0D2B55]">
          Comparação rápida
          <Dica texto="Move os três preços que mais deslocam a decisão, com recálculo imediato das três curvas. Útil para explorar cenários ao vivo em reunião." />
        </span>
        {controles.map((c) => {
          const valor = getPath<number>(scenario, c.path);
          const desabilitado =
            (c.path === "h2.aPrecoKg" && modoH2 !== "A") ||
            (c.path === "gas.gnvPrecoM3" && scenario.gas.gnvMetodoPreco !== "m3") ||
            (c.path === "gas.bioPrecoM3" &&
              (scenario.gas.bioMetodoPreco !== "m3" || scenario.gas.bioModoSuprimento !== "A"));
          return (
            <label key={c.path} className={`flex items-center gap-2 text-[11px] ${desabilitado ? "opacity-40" : ""}`}>
              <span className="text-[#666666]">{c.rotulo}</span>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step={c.passo}
                value={valor}
                disabled={desabilitado}
                onChange={(e) => set(c.path, Number(e.target.value))}
                className="w-36"
              />
              <span className="w-24 font-mono tabular-nums">
                {nf(valor, c.dec)} {c.unidade}
              </span>
            </label>
          );
        })}
        {modoH2 !== "A" && (
          <span className="text-[10px] text-[#666666]">
            O controle de preço do H₂ atua no modo A; o modo {modoH2} calcula o custo pela planta.
          </span>
        )}
      </div>
    </div>
  );
}

function PainelLateral() {
  const { resultado, abrirAuditoria } = useTco();
  return (
    <aside className="tco-sidebar hidden w-[290px] shrink-0 border-l border-[#E2E2E2] bg-[#FAFAFA] lg:block print:hidden">
      <div
        className="sticky overflow-y-auto p-3"
        style={{ top: "var(--tco-topo, 104px)", maxHeight: "calc(100vh - var(--tco-topo, 104px))" }}
      >
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#0D2B55]">
          Resultado em tempo real
        </h2>
        {ROUTE_KEYS.map((r) => {
          const x = resultado.rotas[r];
          const venceu = resultado.vencedor === r;
          return (
            <div
              key={r}
              onClick={() => abrirAuditoria(r)}
              className={`mb-2 cursor-pointer border bg-white p-2.5 hover:border-[#0D2B55] ${
                venceu ? "border-[#8DC63F] shadow-[inset_0_0_0_1px_#8DC63F]" : "border-[#E2E2E2]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: ROUTE_COLOR[r] }}>
                  <span className="inline-block h-2.5 w-2.5" style={{ background: ROUTE_COLOR[r] }} />
                  {ROUTE_LABEL[r]}
                </span>
                {venceu && <span className="bg-[#8DC63F] px-1 py-0.5 text-[9px] font-bold text-white">MENOR</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-[9px] uppercase text-[#666666]">TCO (VPL)</div>
                  <div className="font-mono text-[12px] font-semibold tabular-nums">{moeda(x.tco / 1e6, 2)} mi</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-[#666666]">R$/km</div>
                  <div className="font-mono text-[12px] font-semibold tabular-nums">{nf(x.tcoPorKm, 2)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-[#666666]">R$/t·km</div>
                  <div className="font-mono text-[12px] font-semibold tabular-nums">{nf(x.tcoPorTKm, 3)}</div>
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 border-t border-[#EEEEEE] pt-1.5 text-[10px] text-[#666666]">
                <div>Frota: <span className="font-mono text-[#1A1A1A]">{x.nVeiculos}</span></div>
                <div>Disp.: <span className="font-mono text-[#1A1A1A]">{nf(x.disponibilidade * 100, 1)}%</span></div>
                <div>Carga: <span className="font-mono text-[#1A1A1A]">{nf(x.cargaUtilT, 1)} t</span></div>
                <div>tCO₂e: <span className="font-mono text-[#1A1A1A]">{nf(x.emissoesTotaisT, 0)}</span></div>
              </div>
            </div>
          );
        })}
        <div className="border border-[#E2E2E2] bg-white p-2.5 text-[10px] leading-snug text-[#666666]">
          <div className="mb-1 text-[11px] font-semibold text-[#0D2B55]">Custo de abatimento</div>
          {ROTAS_ALTERNATIVAS.map((r) => (
            <div key={r} className="flex justify-between">
              <span>{ROUTE_LABEL[r]}</span>
              <span className="font-mono tabular-nums text-[#1A1A1A]">
                {resultado.mac[r] === null ? "n/d" : `${nf(resultado.mac[r]!, 0)} R$/tCO₂e`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Conteudo() {
  const [aba, setAba] = useState<AbaId>("missao");
  const topoRef = useRef<HTMLDivElement>(null);

  // O bloco superior (cabeçalho, comparação rápida e abas) fica fixo. Sua
  // altura varia com a quebra de linha, então é publicada como variável CSS
  // para que o painel lateral se ancore logo abaixo dele em qualquer largura.
  useEffect(() => {
    const el = topoRef.current;
    if (!el) return;
    const publicar = () =>
      document.documentElement.style.setProperty("--tco-topo", `${el.offsetHeight}px`);
    publicar();
    const ro = new ResizeObserver(publicar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A]">
      <style>{ESTILO_IMPRESSAO}</style>
      <div ref={topoRef} className="sticky top-0 z-40 bg-white print:static">
        <Cabecalho />
        <ComparacaoRapida />
        <nav className="flex flex-wrap border-b border-[#E2E2E2] bg-white print:hidden">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`border-b-2 px-4 py-2 text-[12px] font-medium ${
                aba === a.id
                  ? "border-[#8DC63F] text-[#0D2B55]"
                  : "border-transparent text-[#666666] hover:text-[#0D2B55]"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>
      </div>

      <div className="tco-shell flex">
        <main className="tco-conteudo min-w-0 flex-1 p-4">
          {aba === "missao" && <TabMissao />}
          {aba === "diesel" && <TabDiesel />}
          {aba === "gas" && <TabGas />}
          {aba === "h2" && <TabH2 />}
          {aba === "bev" && <TabBev />}
          {aba === "resultados" && <AbaResultados />}
          {aba === "equilibrio" && <AbaEquilibrio />}
          {aba === "relatorio" && <AbaRelatorio />}
        </main>
        <PainelLateral />
      </div>

      <footer className="border-t border-[#E2E2E2] bg-[#F4F4F4] px-4 py-3 text-[10px] leading-snug text-[#666666] print:hidden">
        Simulação baseada em premissas fornecidas pelo usuário. Os resultados não constituem garantia de desempenho,
        recomendação de investimento ou proposta comercial. Valide os parâmetros com fornecedores e com a legislação
        vigente antes de qualquer decisão.
      </footer>
      <PainelAuditoria />
    </div>
  );
}

export default function TcoFleet() {
  return (
    <TcoProvider>
      <Conteudo />
    </TcoProvider>
  );
}
