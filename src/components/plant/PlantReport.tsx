import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";
import {
  PlantResults,
  H2_SOURCE_INFO,
  FINAL_PRODUCT_INFO,
} from "@/lib/plant/simulation";
import { computeEconomics } from "@/lib/plant/economics";

const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });
const pct = (v: number) => (v * 100).toFixed(1) + "%";

/**
 * Relatório técnico consolidado — visualização em aba e exportação para
 * PDF via impressão do navegador (Ctrl+P / botão abaixo).
 */
export const PlantReport = ({ results }: { results: PlantResults }) => {
  const r = results;
  const eco = computeEconomics(r);
  const isUrea = r.inputs.finalProduct === "urea";
  const today = new Date().toLocaleDateString("pt-BR");

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 border-b pb-1 text-base font-bold">{title}</h2>
      {children}
    </section>
  );

  const Row = ({ k, v }: { k: string; v: string }) => (
    <tr className="border-b border-gray-100">
      <td className="py-1 pr-4 text-gray-600">{k}</td>
      <td className="py-1 text-right font-medium tabular-nums">{v}</td>
    </tr>
  );

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .plant-report, .plant-report * { visibility: visible; }
          .plant-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-3 flex justify-end">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Exportar PDF / Imprimir
        </Button>
      </div>

      <Card>
        <CardContent className="plant-report pt-6 text-sm">
          <header className="mb-6 border-b-2 border-gray-800 pb-3">
            <h1 className="text-xl font-bold">
              Relatório Técnico — Planta de {FINAL_PRODUCT_INFO[r.inputs.finalProduct].label}
            </h1>
            <p className="text-xs text-gray-500">
              Estudo conceitual (FEL-1) · Síntese Haber-Bosch ·{" "}
              {H2_SOURCE_INFO[r.inputs.h2Source].label} · emitido em {today} · Rev. 0
            </p>
          </header>

          <Section title="1. Sumário executivo">
            <p className="text-gray-700 leading-relaxed">
              Planta de {FINAL_PRODUCT_INFO[r.inputs.finalProduct].label.toLowerCase()} com
              capacidade de <b>{fmt(r.productTPerDay, 0)} t/dia</b> (
              {fmt(r.productTPerYear / 1000, 1)} kt/ano com disponibilidade de 92%), baseada
              em {H2_SOURCE_INFO[r.inputs.h2Source].label.toLowerCase()} e loop de síntese a{" "}
              {r.inputs.loopPressureBar} bar / {r.inputs.reactorTempC} °C. Potência elétrica
              instalada de {fmt(r.totalElectricMW, 1)} MW, investimento estimado de{" "}
              {fmt(r.capexMUSD, 0)} MUSD (classe 5, ±40%), custo nivelado de{" "}
              {fmt(eco.levelizedCostUSDPerT, 0)} USD/t e payback simples de{" "}
              {Number.isFinite(eco.paybackYears) ? `${fmt(eco.paybackYears, 1)} anos` : "— (EBITDA negativo)"} ao
              preço de {fmt(r.inputs.productPriceUSDPerT, 0)} USD/t.
              {r.inputs.h2Source !== "smr" &&
                ` A rota verde evita ${fmt(r.co2AvoidedTPerYear / 1000, 1)} kt CO₂/ano vs. SMR convencional.`}
            </p>
          </Section>

          <div className="grid grid-cols-2 gap-6">
            <Section title="2. Parâmetros de processo">
              <table className="w-full text-xs">
                <tbody>
                  <Row k="Produto final" v={FINAL_PRODUCT_INFO[r.inputs.finalProduct].label} />
                  <Row k="Rota de H₂" v={H2_SOURCE_INFO[r.inputs.h2Source].label} />
                  <Row k="Capacidade (NH₃)" v={`${fmt(r.nh3TPerDay, 0)} t/dia`} />
                  <Row k="Pressão do loop" v={`${fmt(r.inputs.loopPressureBar, 0)} bar`} />
                  <Row k="Temperatura do reator" v={`${fmt(r.inputs.reactorTempC, 0)} °C`} />
                  <Row k="Temperatura do separador" v={`${fmt(r.inputs.separatorTempC, 0)} °C`} />
                  <Row k="Purga do reciclo" v={pct(r.inputs.purgeFraction)} />
                  <Row k="Aproximação ao equilíbrio" v={pct(r.inputs.equilibriumApproach)} />
                </tbody>
              </table>
            </Section>

            <Section title="3. Resultados do loop de síntese">
              <table className="w-full text-xs">
                <tbody>
                  <Row k="Conversão por passe (N₂)" v={pct(r.perPassConversion)} />
                  <Row k="NH₃ na saída do reator" v={pct(r.nh3AtReactorOutlet)} />
                  <Row k="Razão de reciclo" v={`${fmt(r.recycleRatio, 2)} mol/mol`} />
                  <Row k="Vazão do loop" v={`${fmt(r.loopFlowKmolH, 0)} kmol/h`} />
                  <Row k="Inertes no loop" v={pct(r.loopInertFraction)} />
                  <Row k="Conversão global" v={pct(r.overallConversion)} />
                  <Row k="Consumo de H₂" v={`${fmt(r.h2KgH, 0)} kg/h`} />
                  <Row k="Consumo de N₂" v={`${fmt(r.n2KgH / 1000, 1)} t/h`} />
                </tbody>
              </table>
            </Section>
          </div>

          {isUrea && r.urea && (
            <Section title="4. Downstream de ureia">
              <table className="w-full text-xs">
                <tbody>
                  <Row k="Produção de ureia" v={`${fmt(r.urea.ureaKgH / 1000, 1)} t/h (${fmt(r.productTPerDay, 0)} t/dia)`} />
                  <Row k="Consumo de CO₂" v={`${fmt(r.urea.co2KgH / 1000, 1)} t/h`} />
                  <Row k="Fonte de CO₂" v={r.urea.co2Source} />
                  <Row k="Vapor de stripping" v={`${fmt(r.urea.steamTH, 1)} t/h`} />
                  <Row k="Carga elétrica adicional" v={`${fmt(r.urea.electricMW, 1)} MW`} />
                </tbody>
              </table>
            </Section>
          )}

          <Section title={`${isUrea ? 5 : 4}. Balanço de energia`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-500">
                  <th className="py-1">Sistema</th>
                  <th className="py-1">Área</th>
                  <th className="py-1 text-right">MW</th>
                </tr>
              </thead>
              <tbody>
                {r.energyItems
                  .filter((e) => e.type === "electric")
                  .map((e) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-1">{e.label}</td>
                      <td className="py-1 text-gray-500">{e.area}</td>
                      <td className="py-1 text-right tabular-nums">{fmt(e.powerMW, 2)}</td>
                    </tr>
                  ))}
                <tr className="font-bold">
                  <td className="py-1">Total elétrico</td>
                  <td />
                  <td className="py-1 text-right tabular-nums">{fmt(r.totalElectricMW, 1)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-gray-500">
              Consumo específico: {fmt(r.specificEnergyMWhPerT, 2)} MWh/t NH₃
              {r.natGasGJH > 0 && ` + ${fmt(r.natGasGJH / (r.nh3KgH / 1000), 1)} GJ GN/t NH₃`}.
              Calor de reação recuperado: {fmt(r.steamCreditMW, 1)} MW em vapor HP.
            </p>
          </Section>

          <Section title={`${isUrea ? 6 : 5}. Balanço de massa — correntes`}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-500">
                  <th className="py-1">#</th>
                  <th className="py-1">Corrente</th>
                  <th className="py-1 text-right">kmol/h</th>
                  <th className="py-1 text-right">t/h</th>
                  <th className="py-1 text-right">P [bar]</th>
                  <th className="py-1 text-right">T [°C]</th>
                  <th className="py-1 text-right">N₂/H₂/NH₃/inertes</th>
                </tr>
              </thead>
              <tbody>
                {r.streams.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-0.5 font-mono">{s.id}</td>
                    <td className="py-0.5">{s.name}</td>
                    <td className="py-0.5 text-right tabular-nums">{fmt(s.kmolH, 0)}</td>
                    <td className="py-0.5 text-right tabular-nums">{fmt(s.kgH / 1000, 1)}</td>
                    <td className="py-0.5 text-right tabular-nums">{fmt(s.pressureBar, 0)}</td>
                    <td className="py-0.5 text-right tabular-nums">{fmt(s.tempC, 0)}</td>
                    <td className="py-0.5 text-right tabular-nums">
                      {pct(s.composition.yN2)} / {pct(s.composition.yH2)} /{" "}
                      {pct(s.composition.yNH3)} / {pct(s.composition.yInert)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={`${isUrea ? 7 : 6}. Lista de equipamentos principais`}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-500">
                  <th className="py-1">TAG</th>
                  <th className="py-1">Equipamento</th>
                  <th className="py-1">Disciplina</th>
                  <th className="py-1 text-right">Dimensionamento</th>
                </tr>
              </thead>
              <tbody>
                {r.equipment.map((e) => (
                  <tr key={e.tag} className="border-b border-gray-100">
                    <td className="py-0.5 font-mono">{e.tag}</td>
                    <td className="py-0.5">{e.name}</td>
                    <td className="py-0.5 capitalize text-gray-500">{e.discipline}</td>
                    <td className="py-0.5 text-right">{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={`${isUrea ? 8 : 7}. Análise econômica`}>
            <div className="grid grid-cols-2 gap-6">
              <table className="w-full text-xs">
                <tbody>
                  <Row k="CAPEX (classe 5, ±40%)" v={`${fmt(r.capexMUSD, 0)} MUSD`} />
                  <Row k="Custo nivelado" v={`${fmt(eco.levelizedCostUSDPerT, 0)} USD/t`} />
                  <Row k="Receita anual" v={`${fmt(eco.annualRevenueMUSD, 1)} MUSD`} />
                  <Row k="EBITDA anual" v={`${fmt(eco.ebitdaMUSD, 1)} MUSD (${pct(eco.ebitdaMargin)})`} />
                  <Row
                    k="Payback simples"
                    v={Number.isFinite(eco.paybackYears) ? `${fmt(eco.paybackYears, 1)} anos` : "—"}
                  />
                  <Row k="VPL (WACC 8%, 25 anos)" v={`${fmt(eco.npvMUSD, 0)} MUSD`} />
                </tbody>
              </table>
              <table className="w-full text-xs">
                <tbody>
                  {eco.breakdown.map((b) => (
                    <Row key={b.id} k={b.label} v={`${fmt(b.usdPerT, 0)} USD/t`} />
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <footer className="mt-6 border-t pt-2 text-[10px] text-gray-400">
            Documento gerado pelo simulador Carbonette — modelos: Gillespie-Beattie,
            Dyson & Simon (fugacidade), Antoine (NIST), ASME VIII Div. 2. Resultados de
            nível conceitual (FEL-1); não utilizar para decisão final de investimento sem
            simulação rigorosa e estimativa de custos classe 3 ou superior.
          </footer>
        </CardContent>
      </Card>
    </div>
  );
};
