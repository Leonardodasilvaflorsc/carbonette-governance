import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Map,
  X,
} from "lucide-react";
import { PlantResults, H2_SOURCE_INFO } from "@/lib/plant/simulation";

/**
 * Tour virtual pela planta — navegação cena a cena sobre imagens
 * fotorrealistas geradas por IA (ver docs/prompts-imagens-planta.md).
 *
 * As imagens devem ser colocadas em public/plant-tour/<id>.jpg .
 * Cada cena tem hotspots (portais para cenas vizinhas, posições em %)
 * e um painel de dados ao vivo alimentado pela simulação.
 */

interface Hotspot {
  to: string;
  label: string;
  x: number; // % da largura
  y: number; // % da altura
}

interface SceneDef {
  id: string;
  title: string;
  area: string;
  description: string;
  hotspots: Hotspot[];
  /** Dados ao vivo exibidos no overlay da cena */
  data: (r: PlantResults) => { k: string; v: string }[];
  /** Cena só existe quando a planta produz ureia */
  ureaOnly?: boolean;
}

const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const SCENES: SceneDef[] = [
  {
    id: "aerial",
    title: "Vista aérea geral",
    area: "Planta completa",
    description:
      "Visão de drone de toda a planta: áreas 100–500, utilidades, subestação e tancagem.",
    hotspots: [
      { to: "electrolysis", label: "Área 100 — H₂", x: 22, y: 38 },
      { to: "asu", label: "Área 200 — ASU", x: 14, y: 66 },
      { to: "compression", label: "Área 300 — Compressão", x: 52, y: 30 },
      { to: "synthesis", label: "Área 400 — Síntese", x: 58, y: 58 },
      { to: "tank-farm", label: "Área 500 — Tancagem", x: 80, y: 68 },
      { to: "substation", label: "Subestação", x: 84, y: 24 },
    ],
    data: (r) => [
      { k: "Produção", v: `${fmt(r.productTPerDay, 0)} t/dia` },
      { k: "Potência total", v: `${fmt(r.totalElectricMW, 1)} MW` },
      { k: "Área total", v: `${fmt(r.civil.totalAreaM2 / 10000, 1)} ha` },
      { k: "CAPEX", v: `${fmt(r.capexMUSD, 0)} MUSD` },
    ],
  },
  {
    id: "electrolysis",
    title: "Geração de H₂",
    area: "Área 100",
    description:
      "Prédio dos eletrolisadores (ou reformador SMR): módulos, retificadores e tratamento de água.",
    hotspots: [
      { to: "asu", label: "ASU →", x: 12, y: 70 },
      { to: "compression", label: "Compressão →", x: 86, y: 55 },
      { to: "aerial", label: "Vista aérea", x: 50, y: 10 },
    ],
    data: (r) => [
      { k: "Tecnologia", v: H2_SOURCE_INFO[r.inputs.h2Source].label },
      { k: "Produção de H₂", v: `${fmt(r.h2KgH, 0)} kg/h` },
      {
        k: "Potência",
        v: `${fmt(r.energyItems.find((e) => e.id === "h2")?.powerMW ?? 0, 1)} MW`,
      },
      { k: "Água desmi", v: `${fmt(r.waterM3H, 1)} m³/h` },
    ],
  },
  {
    id: "asu",
    title: "Separação de Ar (N₂)",
    area: "Área 200",
    description:
      "Cold box da ASU criogênica: coluna dupla, compressor de ar principal e estocagem de N₂ líquido.",
    hotspots: [
      { to: "electrolysis", label: "← Área 100", x: 12, y: 55 },
      { to: "compression", label: "Compressão →", x: 86, y: 55 },
      { to: "aerial", label: "Vista aérea", x: 50, y: 10 },
    ],
    data: (r) => [
      { k: "Produção de N₂", v: `${fmt(r.n2KgH / 1000, 1)} t/h` },
      { k: "Pureza", v: "99,999%" },
      {
        k: "Potência",
        v: `${fmt(r.energyItems.find((e) => e.id === "asu")?.powerMW ?? 0, 2)} MW`,
      },
    ],
  },
  {
    id: "compression",
    title: "Casa de Compressores",
    area: "Área 300",
    description:
      "Compressores centrífugos de make-up (K-301) e reciclo (K-402), com VFDs e sistema de óleo.",
    hotspots: [
      { to: "asu", label: "← ASU", x: 10, y: 60 },
      { to: "synthesis", label: "Loop de síntese →", x: 88, y: 50 },
      { to: "substation", label: "Subestação", x: 70, y: 15 },
      { to: "aerial", label: "Vista aérea", x: 30, y: 10 },
    ],
    data: (r) => [
      {
        k: "K-301 make-up",
        v: `${fmt(r.energyItems.find((e) => e.id === "syngas-comp")?.powerMW ?? 0, 2)} MW`,
      },
      { k: "Descarga", v: `${fmt(r.inputs.loopPressureBar, 0)} bar` },
      {
        k: "K-402 reciclo",
        v: `${fmt(r.energyItems.find((e) => e.id === "recycle-comp")?.powerMW ?? 0, 2)} MW`,
      },
      { k: "Maior motor", v: `${fmt(r.electrical.largestMotorKW, 0)} kW` },
    ],
  },
  {
    id: "synthesis",
    title: "Loop de Síntese Haber-Bosch",
    area: "Área 400",
    description:
      "Reator R-401, caldeira de recuperação E-403 e trocadores do loop de alta pressão.",
    hotspots: [
      { to: "compression", label: "← Compressão", x: 10, y: 50 },
      { to: "chiller", label: "Separação →", x: 88, y: 60 },
      { to: "flare", label: "Flare", x: 75, y: 12 },
      { to: "aerial", label: "Vista aérea", x: 30, y: 10 },
    ],
    data: (r) => [
      {
        k: "R-401",
        v: `${r.inputs.reactorTempC} °C · ${fmt(r.inputs.loopPressureBar, 0)} bar`,
      },
      { k: "Conversão/passe", v: `${fmt(r.perPassConversion * 100, 1)}%` },
      { k: "NH₃ na saída", v: `${fmt(r.nh3AtReactorOutlet * 100, 1)}%` },
      { k: "Calor recuperado", v: `${fmt(r.steamCreditMW, 1)} MW vapor HP` },
      {
        k: "Vaso",
        v: `Ø ${fmt(r.reactorDesign.innerDiameterM, 2)} m · parede ${fmt(r.reactorDesign.wallThicknessMm, 0)} mm`,
      },
    ],
  },
  {
    id: "chiller",
    title: "Condensação e Separação",
    area: "Área 400",
    description:
      "Chiller E-405, separador V-406 e ciclo de refrigeração de amônia; purga para o PSA de H₂.",
    hotspots: [
      { to: "synthesis", label: "← Reator", x: 10, y: 50 },
      { to: "urea", label: "Planta de ureia →", x: 88, y: 40 },
      { to: "tank-farm", label: "Tancagem →", x: 88, y: 70 },
      { to: "aerial", label: "Vista aérea", x: 40, y: 10 },
    ],
    data: (r) => [
      { k: "Separador", v: `${r.inputs.separatorTempC} °C` },
      {
        k: "Refrigeração",
        v: `${fmt(r.energyItems.find((e) => e.id === "refrig")?.powerMW ?? 0, 2)} MW`,
      },
      { k: "NH₃ residual", v: `${fmt(r.separatorNH3Slip * 100, 1)}%` },
      { k: "Purga", v: `${fmt(r.inputs.purgeFraction * 100, 1)}%` },
    ],
  },
  {
    id: "urea",
    title: "Planta de Ureia",
    area: "Área 600",
    description:
      "Reator de ureia R-601 (stripping de CO₂), granulador de leito fluidizado e ensaque.",
    ureaOnly: true,
    hotspots: [
      { to: "chiller", label: "← Separação", x: 10, y: 55 },
      { to: "tank-farm", label: "Tancagem →", x: 88, y: 60 },
      { to: "aerial", label: "Vista aérea", x: 50, y: 10 },
    ],
    data: (r) =>
      r.urea
        ? [
            { k: "Produção", v: `${fmt(r.urea.ureaKgH / 1000, 1)} t/h` },
            { k: "Consumo de CO₂", v: `${fmt(r.urea.co2KgH / 1000, 1)} t/h` },
            { k: "Vapor de stripping", v: `${fmt(r.urea.steamTH, 1)} t/h` },
            { k: "R-601", v: "150 bar · 185 °C" },
          ]
        : [],
  },
  {
    id: "tank-farm",
    title: "Tancagem e Expedição",
    area: "Área 500",
    description:
      "Tanque refrigerado TQ-501 (-33 °C, parede dupla), bacia de contenção e baias de carregamento.",
    hotspots: [
      { to: "chiller", label: "← Separação", x: 10, y: 55 },
      { to: "cooling", label: "Utilidades", x: 80, y: 20 },
      { to: "aerial", label: "Vista aérea", x: 45, y: 10 },
    ],
    data: (r) => [
      { k: "TQ-501", v: `${fmt(r.civil.storageTankM3, 0)} m³` },
      { k: "Autonomia", v: "15 dias de produção" },
      { k: "Produto", v: `${fmt(r.productKgH / 1000, 1)} t/h` },
      { k: "Norma", v: "API 620 Anexo R" },
    ],
  },
  {
    id: "substation",
    title: "Subestação Principal",
    area: "SE-01",
    description:
      "Pátio de manobra, transformadores e casa de controle elétrico com CCMs e VFDs.",
    hotspots: [
      { to: "compression", label: "← Compressão", x: 15, y: 60 },
      { to: "electrolysis", label: "Eletrólise", x: 80, y: 55 },
      { to: "aerial", label: "Vista aérea", x: 45, y: 10 },
    ],
    data: (r) => [
      { k: "Tensão de entrada", v: `${r.electrical.mainVoltageKV} kV` },
      { k: "Demanda", v: `${fmt(r.electrical.demandMVA, 1)} MVA` },
      { k: "Transformadores", v: r.electrical.transformers },
      { k: "Emergência", v: `${fmt(r.electrical.emergencyGenMVA, 1)} MVA diesel` },
    ],
  },
  {
    id: "cooling",
    title: "Utilidades",
    area: "Off-sites",
    description:
      "Torre de resfriamento, tratamento de água, ar comprimido e estação de água desmineralizada.",
    hotspots: [
      { to: "tank-farm", label: "← Tancagem", x: 12, y: 60 },
      { to: "control-room", label: "Sala de controle →", x: 85, y: 50 },
      { to: "aerial", label: "Vista aérea", x: 45, y: 10 },
    ],
    data: (r) => [
      {
        k: "BOP",
        v: `${fmt(r.energyItems.find((e) => e.id === "bop")?.powerMW ?? 0, 2)} MW`,
      },
      { k: "Água de processo", v: `${fmt(r.waterM3H, 1)} m³/h` },
    ],
  },
  {
    id: "control-room",
    title: "Sala de Controle (COI)",
    area: "Administração",
    description:
      "Centro de operações integrado: SDCD, SIS SIL-3, telas do processo e supervisão em tempo real.",
    hotspots: [
      { to: "cooling", label: "← Utilidades", x: 12, y: 55 },
      { to: "aerial", label: "Vista aérea", x: 50, y: 10 },
    ],
    data: (r) => [
      { k: "Automação", v: "SDCD + SIS SIL-3 (IEC 61511)" },
      { k: "I/O", v: "≈ 2.800 pontos" },
      { k: "Status do balanço", v: r.converged ? "Convergido" : "Não convergido" },
    ],
  },
  {
    id: "flare",
    title: "Flare",
    area: "Segurança",
    description:
      "Tocha de despressurização de emergência do loop de síntese, com selo e piloto contínuo.",
    hotspots: [
      { to: "synthesis", label: "← Loop de síntese", x: 15, y: 60 },
      { to: "aerial", label: "Vista aérea", x: 50, y: 10 },
    ],
    data: (r) => [
      { k: "Função", v: "ESD / despressurização do loop" },
      { k: "Pressão do loop", v: `${fmt(r.inputs.loopPressureBar, 0)} bar` },
    ],
  },
];

export const PlantVirtualTour = ({ results }: { results: PlantResults }) => {
  const scenes = useMemo(
    () => SCENES.filter((s) => !s.ureaOnly || results.urea),
    [results.urea],
  );
  const [sceneId, setSceneId] = useState("aerial");
  // Tenta .jpg, .png e .webp antes de considerar a imagem ausente
  const EXTENSIONS = ["jpg", "png", "webp"];
  const [extIdx, setExtIdx] = useState<Record<string, number>>({});
  const [showMap, setShowMap] = useState(false);

  const idx = Math.max(0, scenes.findIndex((s) => s.id === sceneId));
  const scene = scenes[idx];
  const sceneExt = extIdx[scene.id] ?? 0;
  const imgMissing = sceneExt >= EXTENSIONS.length;
  const imgSrc = `/plant-tour/${scene.id}.${EXTENSIONS[Math.min(sceneExt, EXTENSIONS.length - 1)]}`;

  const go = (id: string) => {
    if (scenes.some((s) => s.id === id)) setSceneId(id);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Barra superior */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="text-sm font-semibold">{scene.title}</span>
            <Badge variant="outline">{scene.area}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSceneId(scenes[(idx - 1 + scenes.length) % scenes.length].id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
              <Map className="mr-1 h-4 w-4" />
              Mapa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSceneId(scenes[(idx + 1) % scenes.length].id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cena */}
        <div className="relative overflow-hidden rounded-xl border bg-slate-900" style={{ aspectRatio: "16/9" }}>
          {!imgMissing ? (
            <img
              src={imgSrc}
              alt={scene.title}
              className="h-full w-full object-cover"
              onError={() => setExtIdx((f) => ({ ...f, [scene.id]: (f[scene.id] ?? 0) + 1 }))}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-300">
              <ImageOff className="h-10 w-10 opacity-60" />
              <p className="text-sm font-medium">{scene.title}</p>
              <p className="max-w-md px-6 text-center text-xs opacity-70">
                Imagem ainda não gerada. Crie-a com o prompt correspondente em{" "}
                <code>docs/prompts-imagens-planta.md</code> e salve como{" "}
                <code>public/plant-tour/{scene.id}.jpg</code> (ou .png/.webp, 16:9).
              </p>
            </div>
          )}

          {/* Hotspots */}
          {scene.hotspots
            .filter((h) => scenes.some((s) => s.id === h.to))
            .map((h) => (
              <button
                key={h.to + h.label}
                onClick={() => go(h.to)}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                  <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-cyan-500 shadow-lg" />
                </span>
                <span className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[11px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                  {h.label}
                </span>
              </button>
            ))}

          {/* Painel de dados ao vivo */}
          <div className="absolute bottom-3 left-3 max-w-xs rounded-lg bg-black/65 p-3 text-white backdrop-blur-sm">
            <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
              Dados ao vivo — simulação
            </p>
            {scene.data(results).map(({ k, v }) => (
              <div key={k} className="flex justify-between gap-4 text-xs">
                <span className="opacity-75">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>

          {/* Minimapa / navegação rápida */}
          {showMap && (
            <div className="absolute right-3 top-3 w-52 rounded-lg bg-black/75 p-3 text-white backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide opacity-70">Áreas</p>
                <button onClick={() => setShowMap(false)}>
                  <X className="h-3.5 w-3.5 opacity-70" />
                </button>
              </div>
              {scenes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(s.id)}
                  className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-white/15 ${
                    s.id === scene.id ? "bg-cyan-500/30 font-semibold" : ""
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{scene.description}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Clique nos pontos ciano para se mover entre as áreas. Os valores do painel são
          recalculados ao vivo conforme os parâmetros do simulador. Prompts para gerar as
          imagens fotorrealistas: <code>docs/prompts-imagens-planta.md</code>.
        </p>
      </CardContent>
    </Card>
  );
};
