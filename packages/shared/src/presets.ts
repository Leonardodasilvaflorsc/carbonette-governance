import type { GIBS_LAYERS } from "./gibs";

export type GasLayerKey = keyof typeof GIBS_LAYERS;

/**
 * Presets de clusters de emissão — pontos de partida configuráveis para a
 * exploração do globo (seção E1 do plano). White-label: esta lista é o
 * default; instâncias podem sobrescrever.
 */
export interface GlobePreset {
  id: string;
  label: string;
  description: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  gas: GasLayerKey | null;
}

export const GLOBE_PRESETS: GlobePreset[] = [
  {
    id: "joinville-sc",
    label: "Joinville — SC, Brasil",
    description: "Polo metalmecânico do norte catarinense",
    center: [-48.846, -26.304],
    zoom: 9.2,
    gas: "NO2",
  },
  {
    id: "grande-sp",
    label: "Grande São Paulo — Brasil",
    description: "Maior cluster urbano-industrial do hemisfério sul",
    center: [-46.633, -23.55],
    zoom: 8.2,
    gas: "NO2",
  },
  {
    id: "permian-basin",
    label: "Permian Basin — EUA",
    description: "Maior província de óleo e gás onshore; hotspots de CH₄",
    center: [-102.0, 31.8],
    zoom: 6.8,
    gas: "CH4",
  },
  {
    id: "vaca-muerta",
    label: "Vaca Muerta — Argentina",
    description: "Shale de O&G em expansão na Patagônia",
    center: [-68.9, -38.5],
    zoom: 7.0,
    gas: "CH4",
  },
  {
    id: "ruhr",
    label: "Vale do Ruhr — Alemanha",
    description: "Aço, química e termelétricas; NO₂ de combustão",
    center: [7.0, 51.5],
    zoom: 7.2,
    gas: "NO2",
  },
  {
    id: "shanxi",
    label: "Shanxi — China",
    description: "Cinturão de carvão e siderurgia",
    center: [112.5, 37.8],
    zoom: 6.5,
    gas: "SO2",
  },
];
