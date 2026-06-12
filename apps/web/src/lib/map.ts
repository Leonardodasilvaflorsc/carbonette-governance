import maplibregl, { type StyleSpecification } from "maplibre-gl";
import {
  GIBS_LAYERS,
  THEME,
  type GibsLayerDef,
  gibsLayerDate,
  gibsTileUrl,
} from "@orbital/shared";

export const BASE_SOURCE_ID = "gibs-truecolor";
const GAS_SOURCE_ID = "gas-src";
const GAS_LAYER_ID = "gas-layer";

/** Parâmetros de câmera para o flyTo cinematográfico (globo → solo). */
export const CINEMATIC_FLY = { curve: 1.55, speed: 0.85, essential: true } as const;

export function buildGlobeStyle(baseDate: string): StyleSpecification {
  const trueColor = GIBS_LAYERS.TRUE_COLOR;
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": THEME.background,
      "horizon-color": "#143A57",
      "fog-color": THEME.background,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.1],
    },
    sources: {
      [BASE_SOURCE_ID]: {
        type: "raster",
        tiles: [gibsTileUrl(trueColor, gibsLayerDate(trueColor, baseDate))],
        tileSize: 256,
        maxzoom: trueColor.maxLevel,
        attribution: "Imagery © NASA EOSDIS GIBS / MODIS Terra",
      },
    },
    layers: [
      // Fundo "espaço": visível fora do disco do globo e onde tiles falharem
      { id: "space", type: "background", paint: { "background-color": "#02050A" } },
      {
        id: "base-truecolor",
        type: "raster",
        source: BASE_SOURCE_ID,
        paint: { "raster-fade-duration": 300 },
      },
    ],
  };
}

export interface GasOverlay {
  layer: GibsLayerDef;
  date: string;
  opacity: number;
}

// rastreia qual camada de gás está aplicada em cada mapa (id pode mudar)
const appliedGasLayer = new WeakMap<maplibregl.Map, string>();

/**
 * Aplica/atualiza/remove a camada de gás sobre a base. Mudança só de data
 * troca os tiles in-place (sem flicker); mudança de gás recria a camada.
 */
export function applyGasOverlay(map: maplibregl.Map, overlay: GasOverlay | null): void {
  if (!overlay) {
    if (map.getLayer(GAS_LAYER_ID)) map.removeLayer(GAS_LAYER_ID);
    if (map.getSource(GAS_SOURCE_ID)) map.removeSource(GAS_SOURCE_ID);
    appliedGasLayer.delete(map);
    return;
  }

  const url = gibsTileUrl(overlay.layer, gibsLayerDate(overlay.layer, overlay.date));
  const current = appliedGasLayer.get(map);

  if (current !== overlay.layer.id) {
    if (map.getLayer(GAS_LAYER_ID)) map.removeLayer(GAS_LAYER_ID);
    if (map.getSource(GAS_SOURCE_ID)) map.removeSource(GAS_SOURCE_ID);
    map.addSource(GAS_SOURCE_ID, {
      type: "raster",
      tiles: [url],
      tileSize: 256,
      maxzoom: overlay.layer.maxLevel,
      attribution: "NASA EOSDIS GIBS",
    });
    map.addLayer({
      id: GAS_LAYER_ID,
      type: "raster",
      source: GAS_SOURCE_ID,
      paint: { "raster-opacity": overlay.opacity, "raster-fade-duration": 150 },
    });
    appliedGasLayer.set(map, overlay.layer.id);
    return;
  }

  const source = map.getSource(GAS_SOURCE_ID) as maplibregl.RasterTileSource | undefined;
  source?.setTiles([url]);
  map.setPaintProperty(GAS_LAYER_ID, "raster-opacity", overlay.opacity);
}

/** Atualiza a data da base de satélite (true color é um produto diário). */
export function setBaseDate(map: maplibregl.Map, isoDate: string): void {
  const trueColor = GIBS_LAYERS.TRUE_COLOR;
  const source = map.getSource(BASE_SOURCE_ID) as maplibregl.RasterTileSource | undefined;
  source?.setTiles([gibsTileUrl(trueColor, gibsLayerDate(trueColor, isoDate))]);
}

/** Zoom-alvo por tipo de lugar do geocoder (país → instalação). */
export function zoomForPlaceType(type: string): number {
  switch (type) {
    case "country":
      return 3.8;
    case "state":
    case "region":
    case "province":
      return 5.5;
    case "county":
    case "municipality":
      return 7.5;
    case "city":
      return 9.3;
    case "town":
      return 10.3;
    case "village":
    case "suburb":
    case "industrial":
      return 11.2;
    default:
      return 9;
  }
}
