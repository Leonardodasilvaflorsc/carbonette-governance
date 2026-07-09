"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyzedPoint } from "@/lib/api";

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: AnalyzedPoint;
}

/** Marca apenas pontos anômalos (z ≥ 2) sobre a linha de concentração. */
function AnomalyDot({ cx, cy, payload }: DotProps) {
  if (!payload?.anomaly || cx === undefined || cy === undefined) return <g />;
  return <circle cx={cx} cy={cy} r={4.5} fill="#C25450" stroke="#E6EBF2" strokeWidth={1} />;
}

export default function TimeseriesChart({ points, unit }: { points: AnalyzedPoint[]; unit: string }) {
  const data = points.map((p) => ({ ...p, label: p.date.slice(0, 7) }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8A94A6", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#8A94A6", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(16,22,32,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              fontSize: 11,
            }}
            labelStyle={{ color: "#8A94A6" }}
            formatter={(value, name) => [
              typeof value === "number" ? `${value} ${unit}` : "—",
              name,
            ]}
          />
          <Line
            type="monotone"
            dataKey="background"
            name="Background regional"
            stroke="#2D7FF9"
            strokeWidth={1}
            strokeDasharray="2 3"
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="climatology"
            name="Climatologia"
            stroke="#8A94A6"
            strokeWidth={1}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="value"
            name="AOI"
            stroke="#1FB6A6"
            strokeWidth={1.8}
            dot={<AnomalyDot />}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
