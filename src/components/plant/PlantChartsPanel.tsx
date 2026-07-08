import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  LabelList,
  Cell,
} from "recharts";
import { equilibriumNH3Fraction, equilibriumConversion } from "@/lib/plant/thermo";
import {
  PlantResults,
  H2_SOURCE_INFO,
  H2Source,
  simulatePlant,
} from "@/lib/plant/simulation";

const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

// Rampa ordinal azul validada (claro → escuro = pressão crescente)
const ISOBAR_COLORS = ["#86b6ef", "#2a78d6", "#0d366b"];
const ISOBARS = [100, 200, 300];
const SERIES_BLUE = "#2a78d6";

export const PlantChartsPanel = ({ results }: { results: PlantResults }) => {
  const r = results;

  // Curvas de equilíbrio: fração molar de NH3 vs T para 3 isóbaras
  const eqData = useMemo(() => {
    const rows: Record<string, number>[] = [];
    for (let t = 300; t <= 600; t += 10) {
      const row: Record<string, number> = { T: t };
      for (const p of ISOBARS) {
        row[`P${p}`] = +(equilibriumNH3Fraction(t + 273.15, p) * 100).toFixed(2);
      }
      rows.push(row);
    }
    return rows;
  }, []);

  const opPointEq =
    equilibriumNH3Fraction(r.inputs.reactorTempC + 273.15, r.inputs.loopPressureBar) * 100;

  // Conversão de equilíbrio por passe vs pressão (na T e composição atuais)
  const convData = useMemo(() => {
    const comp = r.streams[3].composition;
    const T = r.inputs.reactorTempC + 273.15;
    const rows: { P: number; conv: number }[] = [];
    for (let p = 80; p <= 350; p += 10) {
      rows.push({
        P: p,
        conv: +(equilibriumConversion(comp, T, p) * r.inputs.equilibriumApproach * 100).toFixed(1),
      });
    }
    return rows;
  }, [r]);

  // Comparativo de rotas de H2 (energia específica)
  const routeData = useMemo(
    () =>
      (Object.keys(H2_SOURCE_INFO) as H2Source[]).map((k) => {
        const sim = simulatePlant({ ...r.inputs, h2Source: k });
        return {
          route: H2_SOURCE_INFO[k].label,
          key: k,
          eletrica: +sim.specificEnergyMWhPerT.toFixed(2),
          custo: +sim.energyCostUSDPerT.toFixed(0),
        };
      }),
    [r.inputs],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Equilíbrio Haber-Bosch — NH₃ no equilíbrio vs. temperatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={eqData} margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="T"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  label={{ value: "T [°C]", position: "insideBottomRight", offset: -4, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  label={{ value: "% NH₃", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <Tooltip formatter={(v: number, name: string) => [`${fmt(v)}%`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ISOBARS.map((p, i) => (
                  <Line
                    key={p}
                    dataKey={`P${p}`}
                    name={`${p} bar`}
                    stroke={ISOBAR_COLORS[i]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
                <ReferenceDot
                  x={Math.round(r.inputs.reactorTempC / 10) * 10}
                  y={+opPointEq.toFixed(2)}
                  r={6}
                  fill="#e34948"
                  stroke="#fff"
                  strokeWidth={2}
                  label={{ value: "operação", position: "top", fontSize: 10, fill: "#e34948" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Reação exotérmica: menor T favorece o equilíbrio, mas reduz a cinética — o ponto
              de operação equilibra os dois efeitos (Gillespie-Beattie + fugacidade Dyson-Simon).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Conversão por passe vs. pressão do loop (T = {r.inputs.reactorTempC} °C)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={convData} margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="P"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  label={{ value: "P [bar]", position: "insideBottomRight", offset: -4, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  label={{ value: "% conv. N₂", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <Tooltip formatter={(v: number) => [`${fmt(v)}%`, "Conversão/passe"]} />
                <Line dataKey="conv" stroke={SERIES_BLUE} strokeWidth={2} dot={false} name="Conversão/passe" />
                <ReferenceDot
                  x={r.inputs.loopPressureBar}
                  y={+(r.perPassConversion * 100).toFixed(1)}
                  r={6}
                  fill="#e34948"
                  stroke="#fff"
                  strokeWidth={2}
                  label={{ value: "operação", position: "top", fontSize: 10, fill: "#e34948" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Maior pressão aumenta a conversão (Le Chatelier), ao custo de mais potência de
              compressão e maior espessura do vaso — trade-off central do projeto.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Comparativo de rotas de H₂ — energia elétrica específica [MWh/t NH₃]
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={routeData} margin={{ top: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="route" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === "eletrica" ? [`${fmt(v, 2)} MWh/t`, "Elétrica"] : [v, name]
                }
                cursor={{ fill: "rgba(42,120,214,0.06)" }}
              />
              <Bar dataKey="eletrica" radius={[4, 4, 0, 0]} barSize={48}>
                <LabelList
                  dataKey="eletrica"
                  position="top"
                  formatter={(v: number) => fmt(v, 1)}
                  style={{ fontSize: 11, fill: "#334155" }}
                />
                {routeData.map((d) => (
                  <Cell
                    key={d.key}
                    fill={d.key === r.inputs.h2Source ? SERIES_BLUE : "#9ec5f4"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Barra destacada = rota selecionada. A rota SMR consome pouca eletricidade, mas
            adiciona {fmt(26.5)} GJ de gás natural por tonelada e ~1,9 t CO₂/t NH₃.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
