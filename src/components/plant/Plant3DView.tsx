import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes } from "lucide-react";
import { PlantResults, H2_SOURCE_INFO } from "@/lib/plant/simulation";

/**
 * Vista 3D isométrica (plot plan) da planta, desenhada em SVG puro —
 * projeção isométrica clássica (30°), sem dependências externas.
 */

// Projeção isométrica: (x, y, z) em metros de planta → coordenadas de tela
const ISO_COS = Math.cos(Math.PI / 6);
const ISO_SIN = Math.sin(Math.PI / 6);
const SCALE = 2.1;
const OX = 470;
const OY = 96;

function iso(x: number, y: number, z: number): [number, number] {
  return [
    OX + (x - y) * ISO_COS * SCALE,
    OY + (x + y) * ISO_SIN * SCALE - z * SCALE,
  ];
}

const pts = (list: [number, number][]) => list.map((p) => p.join(",")).join(" ");

/** Paralelepípedo isométrico com três faces sombreadas. */
function IsoBox({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  color,
  onClick,
  highlight,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const p000 = iso(x, y, z);
  const p100 = iso(x + w, y, z);
  const p010 = iso(x, y + d, z);
  const p110 = iso(x + w, y + d, z);
  const p001 = iso(x, y, z + h);
  const p101 = iso(x + w, y, z + h);
  const p011 = iso(x, y + d, z + h);
  const p111 = iso(x + w, y + d, z + h);
  return (
    <g
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:opacity-80" : undefined}
      stroke={highlight ? "#0f172a" : "rgba(15,23,42,0.35)"}
      strokeWidth={highlight ? 1.6 : 0.6}
      strokeLinejoin="round"
    >
      <polygon points={pts([p001, p101, p111, p011])} fill={color} />
      <polygon
        points={pts([p010, p110, p111, p011])}
        fill={color}
        style={{ filter: "brightness(0.78)" }}
      />
      <polygon
        points={pts([p100, p110, p111, p101])}
        fill={color}
        style={{ filter: "brightness(0.6)" }}
      />
    </g>
  );
}

/** Cilindro vertical isométrico (vaso/tanque/coluna). */
function IsoCylinder({
  x,
  y,
  r,
  h,
  color,
  onClick,
  highlight,
}: {
  x: number;
  y: number;
  r: number;
  h: number;
  color: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const [cxB, cyB] = iso(x, y, 0);
  const [cxT, cyT] = iso(x, y, h);
  const rx = r * ISO_COS * SCALE * 1.41;
  const ry = r * ISO_SIN * SCALE * 1.41;
  return (
    <g
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:opacity-80" : undefined}
      stroke={highlight ? "#0f172a" : "rgba(15,23,42,0.35)"}
      strokeWidth={highlight ? 1.6 : 0.6}
    >
      <path
        d={`M ${cxB - rx} ${cyB} L ${cxT - rx} ${cyT} A ${rx} ${ry} 0 0 1 ${cxT + rx} ${cyT} L ${cxB + rx} ${cyB} A ${rx} ${ry} 0 0 1 ${cxB - rx} ${cyB} Z`}
        fill={color}
        style={{ filter: "brightness(0.72)" }}
      />
      <ellipse cx={cxT} cy={cyT} rx={rx} ry={ry} fill={color} />
    </g>
  );
}

interface PlotItem {
  id: string;
  label: string;
  desc: (r: PlantResults) => string;
}

const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

export const Plant3DView = ({ results }: { results: PlantResults }) => {
  const [sel, setSel] = useState<string | null>(null);
  const r = results;
  const isElec = r.inputs.h2Source !== "smr";

  const items: Record<string, PlotItem> = {
    h2: {
      id: "h2",
      label: isElec ? "Prédio de eletrólise EL-101" : "Reformador F-101",
      desc: () =>
        `${H2_SOURCE_INFO[r.inputs.h2Source].label} — ${fmt(r.h2KgH)} kg H₂/h`,
    },
    asu: {
      id: "asu",
      label: "ASU-201 (cold box)",
      desc: () => `Coluna criogênica — ${fmt(r.n2KgH / 1000, 1)} t N₂/h`,
    },
    comp: {
      id: "comp",
      label: "Casa de compressores K-301/K-402",
      desc: () => `Make-up até ${fmt(r.inputs.loopPressureBar)} bar + reciclo`,
    },
    reactor: {
      id: "reactor",
      label: "Reator R-401 + WHB E-403",
      desc: () =>
        `Ø ${fmt(r.reactorDesign.innerDiameterM, 2)} m × ${fmt(r.reactorDesign.lengthM, 1)} m, parede ${fmt(r.reactorDesign.wallThicknessMm)} mm`,
    },
    chiller: {
      id: "chiller",
      label: "Refrigeração e separação E-405/V-406",
      desc: () => `Separador a ${r.inputs.separatorTempC} °C`,
    },
    tank: {
      id: "tank",
      label: "Tanque TQ-501 (NH₃ a -33 °C)",
      desc: () => `${fmt(r.civil.storageTankM3)} m³ — 15 dias de produção`,
    },
    sub: {
      id: "sub",
      label: "Subestação SE-01",
      desc: () =>
        `${r.electrical.mainVoltageKV} kV — ${fmt(r.electrical.demandMVA, 1)} MVA`,
    },
    ct: {
      id: "ct",
      label: "Torre de resfriamento",
      desc: () => "Circuito de água de resfriamento + utilidades",
    },
    adm: {
      id: "adm",
      label: "Administração / sala de controle",
      desc: () => "SDCD, SIS SIL-3, laboratório e COI",
    },
    flare: {
      id: "flare",
      label: "Flare",
      desc: () => "Despressurização de emergência do loop",
    },
  };

  const click = (id: string) => () => setSel(id === sel ? null : id);
  const hl = (id: string) => sel === id;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Boxes className="h-4 w-4" />
          Virtualização 3D — Plot Plan Isométrico (clique nos equipamentos)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 950 480" className="min-w-[820px] w-full">
            {/* terreno */}
            <polygon
              points={pts([iso(-20, -20, 0), iso(220, -20, 0), iso(220, 160, 0), iso(-20, 160, 0)])}
              fill="#e7ecef"
              stroke="#cbd5e1"
            />
            {/* vias internas */}
            <polygon
              points={pts([iso(95, -20, 0.1), iso(110, -20, 0.1), iso(110, 160, 0.1), iso(95, 160, 0.1)])}
              fill="#cbd5e1"
            />
            <polygon
              points={pts([iso(-20, 62, 0.1), iso(220, 62, 0.1), iso(220, 76, 0.1), iso(-20, 76, 0.1)])}
              fill="#cbd5e1"
            />

            {/* Área 100 — geração de H2 */}
            <IsoBox x={0} y={0} w={70} d={40} h={12} color={isElec ? "#34d399" : "#94a3b8"} onClick={click("h2")} highlight={hl("h2")} />
            {isElec &&
              [0, 1, 2].map((i) => (
                <IsoBox key={i} x={8 + i * 20} y={8} w={12} d={24} h={16} color="#059669" onClick={click("h2")} highlight={hl("h2")} />
              ))}
            {!isElec && <IsoCylinder x={30} y={20} r={6} h={34} color="#64748b" onClick={click("h2")} highlight={hl("h2")} />}

            {/* Área 200 — ASU */}
            <IsoBox x={0} y={90} w={40} d={40} h={10} color="#93c5fd" onClick={click("asu")} highlight={hl("asu")} />
            <IsoCylinder x={14} y={104} r={5} h={40} color="#3b82f6" onClick={click("asu")} highlight={hl("asu")} />
            <IsoCylinder x={30} y={112} r={3.5} h={28} color="#60a5fa" onClick={click("asu")} highlight={hl("asu")} />

            {/* Área 300 — compressão */}
            <IsoBox x={118} y={10} w={44} d={26} h={14} color="#a78bfa" onClick={click("comp")} highlight={hl("comp")} />

            {/* Área 400 — síntese */}
            <IsoBox x={118} y={86} w={56} d={44} h={4} color="#fcd34d" onClick={click("reactor")} highlight={hl("reactor")} />
            <IsoCylinder x={132} y={100} r={4.5} h={44} color="#d97706" onClick={click("reactor")} highlight={hl("reactor")} />
            <IsoCylinder x={148} y={108} r={3} h={26} color="#f59e0b" onClick={click("reactor")} highlight={hl("reactor")} />
            <IsoBox x={156} y={92} w={14} d={10} h={10} color="#0e7490" onClick={click("chiller")} highlight={hl("chiller")} />
            <IsoBox x={158} y={116} w={12} d={12} h={8} color="#155e75" onClick={click("chiller")} highlight={hl("chiller")} />

            {/* Área 500 — tancagem */}
            <IsoCylinder x={200} y={110} r={13} h={22} color="#f87171" onClick={click("tank")} highlight={hl("tank")} />
            <IsoCylinder x={200} y={110} r={13.6} h={4} color="#fca5a5" onClick={click("tank")} highlight={hl("tank")} />

            {/* Subestação + utilidades */}
            <IsoBox x={186} y={10} w={30} d={20} h={8} color="#fbbf24" onClick={click("sub")} highlight={hl("sub")} />
            <IsoBox x={186} y={40} w={26} d={14} h={10} color="#22d3ee" onClick={click("ct")} highlight={hl("ct")} />
            <IsoBox x={40} y={140} w={30} d={16} h={9} color="#e2e8f0" onClick={click("adm")} highlight={hl("adm")} />

            {/* Flare */}
            <IsoCylinder x={210} y={86} r={1.2} h={54} color="#94a3b8" onClick={click("flare")} highlight={hl("flare")} />
            <circle cx={iso(210, 86, 56)[0]} cy={iso(210, 86, 56)[1]} r={5} fill="#fb923c">
              <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
            </circle>

            {/* pipe-rack principal */}
            <polyline
              points={pts([iso(70, 20, 8), iso(118, 20, 8), iso(140, 20, 8), iso(140, 86, 8)])}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={2.4}
            />
            <polyline
              points={pts([iso(40, 108, 8), iso(118, 108, 8)])}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.4}
            />
            <polyline
              points={pts([iso(174, 112, 6), iso(196, 112, 6)])}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2.4}
            />

            {/* rótulos */}
            {(
              [
                ["Área 100 — H₂", 30, -6, 20],
                ["Área 200 — ASU (N₂)", 12, 84, 46],
                ["Área 300 — Compressão", 140, 4, 22],
                ["Área 400 — Síntese", 146, 82, 50],
                ["Área 500 — Tancagem", 204, 132, 30],
                ["SE-01", 200, 6, 14],
                ["Torre resfr.", 198, 38, 16],
                ["ADM/COI", 55, 138, 15],
              ] as const
            ).map(([label, x, y, z]) => {
              const [tx, ty] = iso(x, y, z);
              return (
                <text key={label} x={tx} y={ty} textAnchor="middle" className="fill-slate-600 text-[10px] font-semibold">
                  {label}
                </text>
              );
            })}
          </svg>
        </div>

        {sel && (
          <div className="mt-3 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{items[sel].label}</p>
            <p className="text-xs text-muted-foreground">{items[sel].desc(r)}</p>
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Arranjo típico com afastamentos de segurança (API RP 752 / NR-20): tancagem de NH₃
          afastada da área de processo, flare a sotavento, subestação e prédio administrativo
          fora da zona classificada. Área total: {fmt(r.civil.totalAreaM2 / 10000, 1)} ha.
        </p>
      </CardContent>
    </Card>
  );
};
