import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";
import { PlantResults, H2_SOURCE_INFO } from "@/lib/plant/simulation";

/**
 * Fluxograma de processo (PFD) animado da planta de amônia.
 * Correntes coloridas por fluido; espessura proporcional à vazão mássica.
 * Clique em um equipamento para ver seus detalhes.
 */

const COLORS = {
  n2: "#3b82f6", // azul
  h2: "#10b981", // verde
  syngas: "#8b5cf6", // roxo
  loop: "#f59e0b", // âmbar
  nh3: "#ef4444", // vermelho
  purge: "#94a3b8", // cinza
  water: "#06b6d4", // ciano
};

interface UnitInfo {
  id: string;
  title: string;
  lines: string[];
}

const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

export const PlantFlowsheet = ({ results }: { results: PlantResults }) => {
  const [selected, setSelected] = useState<UnitInfo | null>(null);
  const r = results;
  const isElec = r.inputs.h2Source !== "smr";

  const units: Record<string, UnitInfo> = {
    asu: {
      id: "asu",
      title: "ASU-201 — Separação de Ar",
      lines: [
        `Produção: ${fmt(r.n2KgH / 1000, 1)} t N₂/h (99,999%)`,
        "Coluna criogênica dupla, ciclo Linde",
        `Consumo: ${fmt(r.energyItems.find((e) => e.id === "asu")?.powerMW ?? 0, 2)} MW`,
      ],
    },
    h2gen: {
      id: "h2gen",
      title: isElec
        ? `EL-101 — ${H2_SOURCE_INFO[r.inputs.h2Source].label}`
        : "F-101 — Reforma a Vapor (SMR)",
      lines: [
        `Produção: ${fmt(r.h2KgH)} kg H₂/h`,
        H2_SOURCE_INFO[r.inputs.h2Source].note,
        isElec
          ? `Consumo: ${fmt(r.energyItems.find((e) => e.id === "h2")?.powerMW ?? 0, 1)} MW + ${fmt(r.waterM3H, 1)} m³/h água desmi`
          : `Gás natural: ${fmt(r.natGasGJH)} GJ/h`,
      ],
    },
    comp: {
      id: "comp",
      title: "K-301 — Compressor de Make-up",
      lines: [
        `Descarga: ${fmt(r.inputs.loopPressureBar)} bar`,
        `Potência: ${fmt(r.energyItems.find((e) => e.id === "syngas-comp")?.powerMW ?? 0, 2)} MW`,
        "Centrífugo multiestágio com resfriamento intermediário",
      ],
    },
    reactor: {
      id: "reactor",
      title: "R-401 — Reator de Síntese",
      lines: [
        `${r.reactorDesign.beds} leitos, ${fmt(r.reactorDesign.catalystVolumeM3, 1)} m³ de catalisador Fe₃O₄`,
        `${r.inputs.reactorTempC} °C / ${fmt(r.inputs.loopPressureBar)} bar`,
        `Conversão por passe: ${fmt(r.perPassConversion * 100, 1)}% — NH₃ na saída: ${fmt(r.nh3AtReactorOutlet * 100, 1)}%`,
        `Calor de reação: ${fmt(r.reactionHeatMW, 1)} MW (recupera ${fmt(r.steamCreditMW, 1)} MW em vapor HP)`,
      ],
    },
    chiller: {
      id: "chiller",
      title: "E-405 / V-406 — Condensação e Separação",
      lines: [
        `Separador a ${r.inputs.separatorTempC} °C`,
        `NH₃ residual no reciclo: ${fmt(r.separatorNH3Slip * 100, 1)}%`,
        `Refrigeração: ${fmt(r.energyItems.find((e) => e.id === "refrig")?.powerMW ?? 0, 2)} MW`,
      ],
    },
    recycle: {
      id: "recycle",
      title: "K-402 — Compressor de Reciclo",
      lines: [
        `Razão de reciclo: ${fmt(r.recycleRatio, 2)} mol/mol make-up`,
        `Vazão do loop: ${fmt(r.loopFlowKmolH)} kmol/h`,
        `Inertes no loop: ${fmt(r.loopInertFraction * 100, 1)}%`,
      ],
    },
    purge: {
      id: "purge",
      title: "Purga — Recuperação de H₂",
      lines: [
        `Purga: ${fmt(r.inputs.purgeFraction * 100, 1)}% do reciclo`,
        "Membrana / PSA recupera H₂ de volta ao processo",
        "Controla o acúmulo de Ar/CH₄ no loop",
      ],
    },
    tank: {
      id: "tank",
      title: "TQ-501 — Estocagem de NH₃",
      lines: [
        `Produto: ${fmt(r.nh3KgH / 1000, 1)} t/h (${fmt(r.nh3TPerDay)} t/dia)`,
        `Tanque refrigerado -33 °C, ${fmt(r.civil.storageTankM3)} m³`,
        "API 620 Anexo R, parede dupla com contenção integral",
      ],
    },
    ...(r.urea
      ? {
          urea: {
            id: "urea",
            title: "R-601/GR-601 — Síntese e Granulação de Ureia",
            lines: [
              `2 NH₃ + CO₂ → ureia: ${fmt(r.urea.ureaKgH / 1000, 1)} t/h (${fmt(r.productTPerDay)} t/dia)`,
              `Consumo de CO₂: ${fmt(r.urea.co2KgH / 1000, 1)} t/h — ${r.urea.co2Source}`,
              `Stripping a 150 bar + granulador de leito fluidizado`,
            ],
          },
        }
      : {}),
  };

  // Espessuras de linha proporcionais às vazões mássicas
  const w = (kgH: number) => Math.max(1.5, Math.min(8, kgH / 4000));
  const loopKgH = r.streams[3]?.kgH ?? 60000;

  const unitBox = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    label: string,
    sub: string,
  ) => (
    <g
      className="cursor-pointer transition-opacity hover:opacity-80"
      onClick={() => setSelected(units[id])}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={fill}
        stroke={selected?.id === id ? "#0f172a" : "#334155"}
        strokeWidth={selected?.id === id ? 2.5 : 1}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        className="fill-white text-[11px] font-bold"
      >
        {label}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 9}
        textAnchor="middle"
        className="fill-white/80 text-[9px]"
      >
        {sub}
      </text>
    </g>
  );

  const pipe = (d: string, color: string, width: number, dashed = false) => (
    <>
      <path d={d} fill="none" stroke={color} strokeWidth={width} opacity={0.35} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? "4 10" : "6 10"}
        className="pfd-flow"
      />
    </>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Workflow className="h-4 w-4" />
          Fluxograma de Processo (PFD) — clique nos equipamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <style>{`
          .pfd-flow { animation: pfd-dash 1.2s linear infinite; }
          @keyframes pfd-dash { to { stroke-dashoffset: -16; } }
        `}</style>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 980 430" className="min-w-[820px] w-full">
            {/* ---- correntes ---- */}
            {/* Ar -> ASU */}
            {pipe("M 20 90 H 70", "#64748b", 2)}
            {/* N2: ASU -> misturador */}
            {pipe("M 190 90 H 290 V 150", COLORS.n2, w(r.n2KgH))}
            {/* Água/GN -> H2 */}
            {pipe("M 20 240 H 70", COLORS.water, 2)}
            {/* H2 -> misturador */}
            {pipe("M 190 240 H 290 V 180", COLORS.h2, w(r.h2KgH * 6))}
            {/* make-up -> compressor */}
            {pipe("M 300 165 H 360", COLORS.syngas, w(r.n2KgH + r.h2KgH))}
            {/* compressor -> junção reciclo -> reator */}
            {pipe("M 470 165 H 540", COLORS.syngas, w(r.n2KgH + r.h2KgH))}
            {pipe("M 560 165 H 620", COLORS.loop, w(loopKgH))}
            {/* reator -> WHB -> chiller */}
            {pipe("M 740 165 H 810 V 240 H 780", COLORS.loop, w(loopKgH))}
            {/* chiller -> separador já embutido; gás reciclo volta */}
            {pipe("M 660 260 H 550 V 200", COLORS.loop, w(loopKgH * 0.8), true)}
            {/* purga */}
            {pipe("M 600 260 V 330 H 640", COLORS.purge, 2, true)}
            {/* NH3 líquida -> tanque */}
            {pipe("M 720 290 V 360 H 790", COLORS.nh3, w(r.nh3KgH))}

            {/* ---- rótulos de correntes ---- */}
            <text x={200} y={80} className="fill-blue-600 text-[10px] font-semibold">
              N₂ {fmt(r.n2KgH / 1000, 1)} t/h
            </text>
            <text x={200} y={232} className="fill-emerald-600 text-[10px] font-semibold">
              H₂ {fmt(r.h2KgH)} kg/h
            </text>
            <text x={478} y={155} className="fill-violet-600 text-[10px] font-semibold">
              {fmt(r.inputs.loopPressureBar)} bar
            </text>
            <text x={445} y={238} className="fill-amber-600 text-[10px] font-semibold">
              Loop {fmt(r.loopFlowKmolH)} kmol/h
            </text>
            <text x={445} y={252} className="fill-amber-600 text-[10px]">
              Reciclo (razão {fmt(r.recycleRatio, 2)})
            </text>
            <text x={555} y={345} className="fill-slate-500 text-[10px]">
              Purga {fmt(r.inputs.purgeFraction * 100, 1)}%
            </text>
            <text x={700} y={378} textAnchor="end" className="fill-red-600 text-[10px] font-semibold">
              NH₃ {fmt(r.nh3KgH / 1000, 1)} t/h
            </text>
            <text x={16} y={80} className="fill-slate-500 text-[10px]">
              Ar atm.
            </text>
            <text x={16} y={230} className="fill-cyan-600 text-[10px]">
              {isElec ? "H₂O desmi" : "GN + vapor"}
            </text>

            {/* ---- equipamentos ---- */}
            {unitBox("asu", 70, 60, 120, 60, "#1d4ed8", "ASU-201", "N₂ criogênico")}
            {unitBox(
              "h2gen",
              70,
              210,
              120,
              60,
              "#047857",
              isElec ? "EL-101" : "F-101",
              isElec ? "Eletrólise" : "SMR",
            )}
            {unitBox("comp", 360, 135, 110, 60, "#6d28d9", "K-301", "Make-up comp.")}
            {unitBox("reactor", 620, 115, 120, 100, "#b45309", "R-401", "Haber-Bosch")}
            {unitBox("chiller", 660, 240, 120, 60, "#0e7490", "E-405/V-406", "Chiller + Sep.")}
            {unitBox("recycle", 480, 175, 80, 50, "#a16207", "K-402", "Reciclo")}
            {unitBox("purge", 640, 310, 110, 44, "#475569", "PSA-407", "Recup. H₂")}
            {unitBox("tank", 790, 330, 130, 70, "#b91c1c", "TQ-501", "NH₃ -33 °C")}

            {/* Downstream de ureia (opcional) */}
            {r.urea && (
              <>
                {pipe("M 920 350 H 940 V 300 H 905", COLORS.nh3, 3)}
                {pipe("M 850 220 V 245", "#64748b", 2, true)}
                {unitBox("urea", 845, 245, 115, 55, "#15803d", "R-601/GR-601", "Ureia")}
                <text x={842} y={214} className="fill-slate-500 text-[10px]">
                  CO₂ {fmt(r.urea.co2KgH / 1000, 1)} t/h
                </text>
                <text x={958} y={238} textAnchor="end" className="fill-green-700 text-[10px] font-semibold">
                  Ureia {fmt(r.urea.ureaKgH / 1000, 1)} t/h
                </text>
              </>
            )}

            {/* Caldeira de recuperação */}
            <g className="cursor-pointer" onClick={() => setSelected(units.reactor)}>
              <rect x={790} y={130} width={44} height={70} rx={6} fill="#334155" />
              <text x={812} y={160} textAnchor="middle" className="fill-white text-[9px] font-bold">
                E-403
              </text>
              <text x={812} y={172} textAnchor="middle" className="fill-white/70 text-[8px]">
                WHB
              </text>
              <text x={812} y={186} textAnchor="middle" className="fill-orange-300 text-[8px]">
                {fmt(r.steamCreditMW, 1)} MW
              </text>
            </g>

            {/* KPI do reator */}
            <text x={680} y={105} textAnchor="middle" className="fill-slate-600 text-[10px] font-semibold">
              {r.inputs.reactorTempC} °C · conv./passe {fmt(r.perPassConversion * 100, 1)}%
            </text>
          </svg>
        </div>

        {selected && (
          <div className="mt-3 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{selected.title}</p>
            {selected.lines.map((l) => (
              <p key={l} className="text-xs text-muted-foreground">
                • {l}
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {(
            [
              ["N₂", COLORS.n2],
              ["H₂", COLORS.h2],
              ["Gás de síntese", COLORS.syngas],
              ["Loop de síntese", COLORS.loop],
              ["NH₃ produto", COLORS.nh3],
              ["Purga", COLORS.purge],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
