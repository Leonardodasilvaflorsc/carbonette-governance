import { create } from "zustand";
import type { Facility } from "@/lib/api";
import {
  GIBS_LAYERS,
  type DiscoveredLayer,
  type GasLayerKey,
  type GlobePreset,
  gibsDefaultDateFor,
  gibsLayerDate,
  stepIsoDate,
} from "@orbital/shared";

export interface CameraTarget {
  center: [number, number];
  zoom: number;
  nonce: number;
}

export type LayersMeta = Record<string, DiscoveredLayer>;

function clampDate(gasKey: GasLayerKey, date: string, meta: LayersMeta | null): string {
  const def = GIBS_LAYERS[gasKey];
  let d = gibsLayerDate(def, date);
  const end = meta?.[gasKey]?.endDate;
  if (end && d > end) d = gibsLayerDate(def, end);
  const start = meta?.[gasKey]?.startDate;
  if (start && d < start) d = gibsLayerDate(def, start);
  return d;
}

interface GlobeState {
  gasKey: GasLayerKey | null;
  date: string;
  dateB: string;
  compare: boolean;
  opacity: number;
  layersMeta: LayersMeta | null;
  metaSource: "capabilities" | "fallback" | null;
  cameraTarget: CameraTarget | null;

  // --- Atlas de Emissores (FASE 2) ---
  showFacilities: boolean;
  sector: string | null;
  selectedFacility: Facility | null;
  viewportBbox: string | null;
  atlasSource: "db" | "mock" | null;

  setGas: (key: GasLayerKey | null) => void;
  setDate: (date: string) => void;
  setDateB: (date: string) => void;
  setCompare: (enabled: boolean) => void;
  setOpacity: (opacity: number) => void;
  setLayersMeta: (meta: LayersMeta, source: "capabilities" | "fallback") => void;
  flyTo: (center: [number, number], zoom: number) => void;
  applyPreset: (preset: GlobePreset) => void;

  setShowFacilities: (show: boolean) => void;
  setSector: (sector: string | null) => void;
  selectFacility: (facility: Facility | null) => void;
  setViewportBbox: (bbox: string) => void;
  setAtlasSource: (source: "db" | "mock") => void;
}

const initialGas: GasLayerKey = "NO2";
const initialDate = gibsDefaultDateFor(GIBS_LAYERS[initialGas]);

export const useGlobeStore = create<GlobeState>((set, get) => ({
  gasKey: initialGas,
  date: initialDate,
  dateB: stepIsoDate(initialDate, "daily", -30),
  compare: false,
  opacity: 0.75,
  layersMeta: null,
  metaSource: null,
  cameraTarget: null,

  showFacilities: true,
  sector: null,
  selectedFacility: null,
  viewportBbox: null,
  atlasSource: null,

  setGas: (key) => {
    if (key === null) {
      set({ gasKey: null, compare: false });
      return;
    }
    const def = GIBS_LAYERS[key];
    const meta = get().layersMeta;
    // cadência pode mudar (diária ↔ mensal): recalcula datas válidas
    const date = clampDate(key, gibsDefaultDateFor(def), meta);
    const dateB = clampDate(key, stepIsoDate(date, def.cadence, def.cadence === "daily" ? -30 : -12), meta);
    set({ gasKey: key, date, dateB });
  },

  setDate: (date) => {
    const { gasKey, layersMeta } = get();
    set({ date: gasKey ? clampDate(gasKey, date, layersMeta) : date });
  },

  setDateB: (dateB) => {
    const { gasKey, layersMeta } = get();
    set({ dateB: gasKey ? clampDate(gasKey, dateB, layersMeta) : dateB });
  },

  setCompare: (compare) => set({ compare }),
  setOpacity: (opacity) => set({ opacity }),

  setLayersMeta: (meta, source) => {
    const { gasKey, date, dateB } = get();
    set({
      layersMeta: meta,
      metaSource: source,
      // datas escolhidas antes da descoberta podem estar fora do intervalo real
      date: gasKey ? clampDate(gasKey, date, meta) : date,
      dateB: gasKey ? clampDate(gasKey, dateB, meta) : dateB,
    });
  },

  flyTo: (center, zoom) =>
    set((s) => ({ cameraTarget: { center, zoom, nonce: (s.cameraTarget?.nonce ?? 0) + 1 } })),

  applyPreset: (preset) => {
    get().setGas(preset.gas);
    get().flyTo(preset.center, preset.zoom);
  },

  setShowFacilities: (showFacilities) => set({ showFacilities }),
  setSector: (sector) => set({ sector }),
  selectFacility: (selectedFacility) => set({ selectedFacility }),
  setViewportBbox: (viewportBbox) => set({ viewportBbox }),
  setAtlasSource: (atlasSource) => set({ atlasSource }),
}));
