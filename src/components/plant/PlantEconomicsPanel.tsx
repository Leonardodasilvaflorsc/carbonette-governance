import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Wallet, Timer, PiggyBank } from "lucide-react";
import {
  PlantResults,
  H2_SOURCE_INFO,
  H2Source,
  simulatePlant,
  FINAL_PRODUCT_INFO,
} from "@/lib/plant/simulation";
import {
  computeEconomics,
  DISCOUNT_RATE,
  PLANT_LIFE_YEARS,
} from "@/lib/plant/economics";

const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const SERIES_BLUE = "#2a78d6";
// Paleta categórica validada (ordem fixa; rótulos diretos na legenda)
const ROUTE_COLORS: Record<H2Source, string> = {
  pem: "#2a78d6",
  alkaline: "#1baf7a",
  soec: "#eda100",
  smr: "#4a3aa7",
};

const Kpi = ({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  negative,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  unit: string;
  sub?: string;
  negative?: boolean;
}) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${negative ? "text-red-600" : ""}`}
      >
        {value}{" "}
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

export const PlantEconomicsPanel = ({ results }: { results: PlantResults }) => {
  const r = results;
  const eco = useMemo(() => computeEconomics(r), [r]);
  const productLabel = FINAL_PRODUCT_INFO[r.inputs.finalProduct].label;

  const breakdownData = eco.breakdown
    .map((b) => ({ name: b.label, valor: +b.usdPerT.toFixed(1) }))
    .sort((a, b) => b.valor - a.valor);

  // Sensibilidade: custo nivelado vs tarifa, por rota de H2.
  // Cada rota é simulada uma única vez; a tarifa entra só na economia.
  const sensitivityData = useMemo(() => {
    const routeSims = (Object.keys(H2_SOURCE_INFO) as H2Source[]).map((k) => ({
      key: k,
      sim: k === r.inputs.h2Source ? r : simulatePlant({ ...r.inputs, h2Source: k }),
    }));
    const rows: Record<string, number>[] = [];
    for (let tariff = 15; tariff <= 150; tariff += 15) {
      const row: Record<string, number> = { tariff };
      for (const { key, sim } of routeSims) {
        row[key] = +computeEconomics(sim, tariff).levelizedCostUSDPerT.toFixed(0);
      }
      rows.push(row);
    }
    return rows;
  }, [r]);

  const infinitePayback = !Number.isFinite(eco.paybackYears);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label={`Custo nivelado (${r.inputs.finalProduct === "urea" ? "LCOU" : "LCOA"})`}
          value={fmt(eco.levelizedCostUSDPerT)}
          unit="USD/t"
          sub={`WACC ${DISCOUNT_RATE * 100}% · ${PLANT_LIFE_YEARS} anos`}
        />
        <Kpi
          icon={TrendingUp}
          label="EBITDA anual"
          value={fmt(eco.ebitdaMUSD, 1)}
          unit="MUSD"
          sub={`Margem ${fmt(eco.ebitdaMargin * 100)}% · preço ${fmt(r.inputs.productPriceUSDPerT)} USD/t`}
          negative={eco.ebitdaMUSD < 0}
        />
        <Kpi
          icon={Timer}
          label="Payback simples"
          value={infinitePayback ? "—" : fmt(eco.paybackYears, 1)}
          unit={infinitePayback ? "EBITDA negativo" : "anos"}
          negative={infinitePayback}
        />
        <Kpi
          icon={PiggyBank}
          label="VPL do projeto"
          value={fmt(eco.npvMUSD)}
          unit="MUSD"
          sub={`CAPEX ${fmt(r.capexMUSD)} MUSD (classe 5)`}
          negative={eco.npvMUSD < 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Composição do custo nivelado — {productLabel} [USD/t]
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, breakdownData.length * 42)}>
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 8, right: 52 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={210}
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  formatter={(v: number) => [`${fmt(v, 1)} USD/t`, "Custo"]}
                  cursor={{ fill: "rgba(42,120,214,0.06)" }}
                />
                <Bar dataKey="valor" fill={SERIES_BLUE} radius={[0, 4, 4, 0]} barSize={20}>
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: number) => fmt(v, 0)}
                    style={{ fontSize: 11, fill: "#334155" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Sensibilidade — custo nivelado vs. tarifa de energia [USD/t]
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={sensitivityData} margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="tariff"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  label={{
                    value: "Tarifa [USD/MWh]",
                    position: "insideBottomRight",
                    offset: -4,
                    fontSize: 11,
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${fmt(v)} USD/t`,
                    H2_SOURCE_INFO[name as H2Source]?.label ?? name,
                  ]}
                  labelFormatter={(l) => `${l} USD/MWh`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => H2_SOURCE_INFO[v as H2Source]?.label ?? v}
                />
                {(Object.keys(H2_SOURCE_INFO) as H2Source[]).map((k) => (
                  <Line
                    key={k}
                    dataKey={k}
                    stroke={ROUTE_COLORS[k]}
                    strokeWidth={k === r.inputs.h2Source ? 3 : 1.8}
                    dot={false}
                  />
                ))}
                <ReferenceLine
                  x={r.inputs.electricityUSDPerMWh}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: "tarifa atual", fontSize: 10, fill: "#64748b", position: "top" }}
                />
                <ReferenceLine
                  y={r.inputs.productPriceUSDPerT}
                  stroke="#e34948"
                  strokeDasharray="4 4"
                  label={{
                    value: "preço de venda",
                    fontSize: 10,
                    fill: "#e34948",
                    position: "insideBottomRight",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Linha destacada = rota selecionada. Abaixo da linha vermelha o produto é
              competitivo ao preço configurado. As rotas eletrolíticas são fortemente
              sensíveis à tarifa; o SMR, ao preço do gás natural.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
          <p>
            <b>Premissas:</b> WACC real {DISCOUNT_RATE * 100}% a.a., vida útil{" "}
            {PLANT_LIFE_YEARS} anos, disponibilidade 92%, OPEX fixo 3% do CAPEX/ano, gás
            natural 4,5 USD/GJ, água 0,80 USD/m³, CO₂ importado 35 USD/t (ureia verde).
            CAPEX classe 5 (AACE ±40%) — resultados indicativos para estudo conceitual,
            não para decisão final de investimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
