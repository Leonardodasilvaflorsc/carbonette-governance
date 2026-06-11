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
