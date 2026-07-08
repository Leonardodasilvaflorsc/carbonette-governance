import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Zap, Flame, Leaf, DollarSign } from "lucide-react";
import { PlantResults } from "@/lib/plant/simulation";

const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const SERIES_BLUE = "#2a78d6";

const Kpi = ({
  icon: Icon,
  label,
  value,
  unit,
  sub,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

export const PlantEnergyPanel = ({ results }: { results: PlantResults }) => {
  const r = results;
  const electric = r.energyItems.filter((e) => e.type === "electric");
  const thermal = r.energyItems.filter((e) => e.type !== "electric");

  const chartData = electric
    .map((e) => ({ name: e.label.split("(")[0].trim(), MW: +e.powerMW.toFixed(2) }))
    .sort((a, b) => b.MW - a.MW);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Zap}
          label="Potência elétrica total"
          value={fmt(r.totalElectricMW)}
          unit="MW"
          sub={`Demanda ${fmt(r.electrical.demandMVA)} MVA (FP 0,93)`}
        />
        <Kpi
          icon={Flame}
          label="Consumo específico"
          value={fmt(r.specificEnergyMWhPerT, 2)}
          unit="MWh/t NH₃"
          sub={
            r.natGasGJH > 0
              ? `+ ${fmt(r.natGasGJH / (r.nh3KgH / 1000))} GJ GN/t`
              : "Referência mundial: 9,5–11 (verde)"
          }
        />
        <Kpi
          icon={DollarSign}
          label="Custo de energia"
          value={fmt(r.energyCostUSDPerT, 0)}
          unit="USD/t"
          sub={`Tarifa ${fmt(r.inputs.electricityUSDPerMWh, 0)} USD/MWh`}
        />
        <Kpi
          icon={Leaf}
          label="CO₂ evitado"
          value={fmt(r.co2AvoidedTPerYear / 1000, 1)}
          unit="kt/ano"
          sub="vs. rota SMR convencional (1,9 t CO₂/t)"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cargas elétricas por sistema [MW]</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 56 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis
                type="category"
                dataKey="name"
                width={230}
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
              />
              <Tooltip
                formatter={(v: number) => [`${fmt(v, 2)} MW`, "Potência"]}
                cursor={{ fill: "rgba(42,120,214,0.06)" }}
              />
              <Bar dataKey="MW" fill={SERIES_BLUE} radius={[0, 4, 4, 0]} barSize={20}>
                <LabelList
                  dataKey="MW"
                  position="right"
                  formatter={(v: number) => fmt(v, 2)}
                  style={{ fontSize: 11, fill: "#334155" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Balanço térmico e integração energética</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fluxo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Potência [MW]</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thermal.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.area}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(e.powerMW)}</TableCell>
                  <TableCell>
                    {e.type === "thermal-in" ? (
                      <Badge variant="outline" className="border-orange-400 text-orange-600">
                        entrada térmica
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                        recuperação
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="text-sm font-medium">
                  Água de processo / desmineralizada
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">Utilidades</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(r.waterM3H)} m³/h</TableCell>
                <TableCell>
                  <Badge variant="outline">insumo</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            O calor exotérmico da síntese ({fmt(r.reactionHeatMW)} MW) é recuperado na caldeira
            E-403 gerando vapor de alta pressão ({fmt(r.steamCreditMW)} MW), usado no
            acionamento de turbinas e no deaerador — prática padrão em plantas KBR/Topsoe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
