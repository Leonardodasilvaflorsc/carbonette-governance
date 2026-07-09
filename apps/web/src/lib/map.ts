import maplibregl, { type StyleSpecification } from "maplibre-gl";
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  GIBS_LAYERS,
  SENTINEL2_TILE_URL,
  THEME,
  type BasemapKey,
  type GibsLayerDef,
  gibsLayerDate,
  gibsTileUrl,
} from "@orbital/shared";

export const BASE_SOURCE_ID = "base-src";
const BASE_LAYER_ID = "base-imagery";
const GAS_SOURCE_ID = "gas-src";
const GAS_LAYER_ID = "gas-layer";

/** Parâmetros de câmera para o flyTo cinematográfico (globo → solo). */
export const CINEMATIC_FLY = { curve: 1.55, speed: 0.85, essential: true } as const;

function baseTileUrl(basemap: BasemapKey, isoDate: string): string {
  if (basemap === "SENTINEL2") return SENTINEL2_TILE_URL;
  const trueColor = GIBS_LAYERS.TRUE_COLOR;
  return gibsTileUrl(trueColor, gibsLayerDate(trueColor, isoDate));
}

export function buildGlobeStyle(
  basemap: BasemapKey = DEFAULT_BASEMAP,
  baseDate = ""
): StyleSpecification {
  const def = BASEMAPS[basemap];
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
        tiles: [baseTileUrl(basemap, baseDate)],
        tileSize: def.tileSize,
        maxzoom: def.maxzoom,
        attribution: def.attribution,
      },
    },
    layers: [
      // Fundo "espaço": visível fora do disco do globo e onde tiles falharem
      { id: "space", type: "background", paint: { "background-color": "#02050A" } },
      {
        id: BASE_LAYER_ID,
        type: "raster",
        source: BASE_SOURCE_ID,
        paint: {
          "raster-fade-duration": 300,
          // suaviza a ampliação além da resolução nativa do tile (evita
          // blocos visíveis ao mergulhar até cidade/instalação)
          "raster-resampling": "linear",
        },
      },
    ],
  };
}

// rastreia qual base está aplicada em cada mapa (key pode mudar)
const appliedBasemap = new WeakMap<maplibregl.Map, BasemapKey>();

/**
 * Aplica/troca a base de satélite. Trocar de provedor (Sentinel-2 ↔ GIBS)
 * recria a fonte (resolução/tileSize diferem); no GIBS diário, mudança só
 * de data atualiza os tiles in-place.
 */
export function applyBasemap(map: maplibregl.Map, basemap: BasemapKey, isoDate: string): void {
  const current = appliedBasemap.get(map);
  const def = BASEMAPS[basemap];

  if (current !== basemap) {
    if (map.getLayer(BASE_LAYER_ID)) map.removeLayer(BASE_LAYER_ID);
    if (map.getSource(BASE_SOURCE_ID)) map.removeSource(BASE_SOURCE_ID);
    map.addSource(BASE_SOURCE_ID, {
      type: "raster",
      tiles: [baseTileUrl(basemap, isoDate)],
      tileSize: def.tileSize,
      maxzoom: def.maxzoom,
      attribution: def.attribution,
    });
    // reinserida abaixo da camada de gás (se existir), acima do espaço
    const beforeId = map.getLayer(GAS_LAYER_ID) ? GAS_LAYER_ID : undefined;
    map.addLayer(
      {
        id: BASE_LAYER_ID,
        type: "raster",
        source: BASE_SOURCE_ID,
        paint: { "raster-fade-duration": 300, "raster-resampling": "linear" },
      },
      beforeId
    );
    appliedBasemap.set(map, basemap);
    return;
  }

  if (basemap === "GIBS_DAILY") {
    const source = map.getSource(BASE_SOURCE_ID) as maplibregl.RasterTileSource | undefined;
    source?.setTiles([baseTileUrl(basemap, isoDate)]);
  }
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
      paint: {
        "raster-opacity": overlay.opacity,
        "raster-fade-duration": 150,
        "raster-resampling": "linear",
      },
    });
    appliedGasLayer.set(map, overlay.layer.id);
    return;
  }

  const source = map.getSource(GAS_SOURCE_ID) as maplibregl.RasterTileSource | undefined;
  source?.setTiles([url]);
  map.setPaintProperty(GAS_LAYER_ID, "raster-opacity", overlay.opacity);
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
