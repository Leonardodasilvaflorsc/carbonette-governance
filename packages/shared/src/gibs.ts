/**
 * NASA GIBS — WMTS público, sem autenticação (Trilho A: visualização imediata).
 *
 * IDs de camada mudam entre versões do GIBS; estes são os defaults conhecidos.
 * A FASE 1 adiciona um serviço de descoberta que valida estes IDs contra o
 * WMTSCapabilities.xml em runtime e os substitui se necessário.
 */
export const GIBS_WMTS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export interface GibsLayerDef {
  /** ID da camada no GIBS (validar via GetCapabilities). */
  id: string;
  /** Extensão do tile (camadas científicas são png; reflectância é jpg). */
  format: "png" | "jpg";
  /** TileMatrixSet GoogleMapsCompatible_Level{N}. */
  maxLevel: number;
  /** Cadência temporal do produto. */
  cadence: "daily" | "monthly";
  label: string;
}

export const GIBS_LAYERS: Record<string, GibsLayerDef> = {
  TRUE_COLOR: {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "jpg",
    maxLevel: 9,
    cadence: "daily",
    label: "Visão de satélite (MODIS Terra)",
  },
  NO2: {
    id: "OMI_Nitrogen_Dioxide_Tropo_Column",
    format: "png",
    maxLevel: 6,
    cadence: "daily",
    label: "NO₂ troposférico (OMI)",
  },
  SO2: {
    id: "OMI_Sulfur_Dioxide_Planetary_Boundary_Layer",
    format: "png",
    maxLevel: 6,
    cadence: "daily",
    label: "SO₂ camada limite (OMI)",
  },
  CH4: {
    id: "AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Monthly",
    format: "png",
    maxLevel: 6,
    cadence: "monthly",
    label: "CH₄ 400 hPa (AIRS, mensal)",
  },
  CO: {
    id: "AIRS_L3_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Monthly",
    format: "png",
    maxLevel: 6,
    cadence: "monthly",
    label: "CO 500 hPa (AIRS, mensal)",
  },
  AEROSOL: {
    id: "MODIS_Terra_Aerosol",
    format: "png",
    maxLevel: 6,
    cadence: "daily",
    label: "Aerossóis / queimadas (MODIS)",
  },
  NIGHT_LIGHTS: {
    id: "VIIRS_SNPP_DayNightBand_ENCC",
    format: "png",
    maxLevel: 8,
    cadence: "daily",
    label: "Luzes noturnas (VIIRS)",
  },
};

/** Monta a URL de template WMTS ({z}/{y}/{x}) para uma camada e data ISO (YYYY-MM-DD). */
export function gibsTileUrl(layer: GibsLayerDef, isoDate: string): string {
  return `${GIBS_WMTS_BASE}/${layer.id}/default/${isoDate}/GoogleMapsCompatible_Level${layer.maxLevel}/{z}/{y}/{x}.${layer.format}`;
}

/**
 * Data padrão para camadas diárias: ontem (UTC) — o GIBS publica com latência
 * de algumas horas; o dia corrente frequentemente ainda não existe.
 */
export function gibsDefaultDate(now: Date = new Date()): string {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Normaliza uma data ISO para o que a camada espera:
 * camadas mensais usam sempre o dia 01 do mês.
 */
export function gibsLayerDate(layer: GibsLayerDef, isoDate: string): string {
  return layer.cadence === "monthly" ? `${isoDate.slice(0, 7)}-01` : isoDate;
}

/**
 * Data padrão por camada: diária → ontem (UTC); mensal → dia 01 de dois
 * meses atrás (produtos L3 mensais publicam com 1–2 meses de latência).
 */
export function gibsDefaultDateFor(layer: GibsLayerDef, now: Date = new Date()): string {
  if (layer.cadence === "daily") return gibsDefaultDate(now);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  return d.toISOString().slice(0, 10);
}

/** Avança/retrocede uma data ISO em `delta` passos da cadência da camada. */
export function stepIsoDate(isoDate: string, cadence: GibsLayerDef["cadence"], delta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date =
    cadence === "daily"
      ? new Date(Date.UTC(y, m - 1, d + delta))
      : new Date(Date.UTC(y, m - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

/**
 * Datas da timeline: `count` passos na cadência da camada, terminando em
 * `end` (ordem cronológica crescente).
 */
export function timelineDates(layer: GibsLayerDef, end: string, count: number): string[] {
  const endNorm = gibsLayerDate(layer, end);
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(stepIsoDate(endNorm, layer.cadence, -i));
  }
  return dates;
}

/** Parada de cor de uma legenda (valor físico → cor). */
export interface LegendStop {
  color: string;
  value: number;
}

/** Legenda com escala física real, derivada do colormap oficial do GIBS. */
export interface LayerLegend {
  units: string;
  min: number;
  max: number;
  stops: LegendStop[];
}

/**
 * Metadados de camada após descoberta via WMTSCapabilities.
 * `source: "fallback"` indica que a descoberta falhou e os defaults
 * estáticos estão em uso (modo offline / degradação graciosa).
 */
export interface DiscoveredLayer extends GibsLayerDef {
  key: string;
  available: boolean;
  startDate?: string;
  endDate?: string;
  legend?: LayerLegend;
  source: "capabilities" | "fallback";
}
