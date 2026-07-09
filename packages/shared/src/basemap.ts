/**
 * Base de satélite do globo (distinta das camadas de gás em gibs.ts).
 *
 * MODIS Terra (usada como base na FASE 1) atualiza diariamente mas sua
 * resolução nativa é ~250 m/pixel — nítido no planeta inteiro, muito
 * borrado no "mergulho" até cidade/instalação, que é o momento central do
 * produto. Sentinel-2 cloudless (EOX, mosaico anual, sem token) entrega
 * ~10 m/pixel — 25× mais nítido — e vira o default; o GIBS diário continua
 * disponível como opção de "imagem de ontem" para quem prioriza frescor
 * sobre nitidez.
 */
export type BasemapKey = "SENTINEL2" | "GIBS_DAILY";

export interface BasemapDef {
  key: BasemapKey;
  label: string;
  tileSize: 256 | 512;
  maxzoom: number;
  attribution: string;
}

export const BASEMAPS: Record<BasemapKey, BasemapDef> = {
  SENTINEL2: {
    key: "SENTINEL2",
    label: "Nítida — Sentinel-2 (10 m/pixel)",
    tileSize: 256,
    maxzoom: 14,
    attribution:
      "Sentinel-2 cloudless — s2maps.eu by EOX IT Services GmbH (contém dados Copernicus Sentinel modificados, mosaico anual)",
  },
  GIBS_DAILY: {
    key: "GIBS_DAILY",
    label: "Diária — NASA GIBS (~250 m/pixel)",
    tileSize: 256,
    maxzoom: 9,
    attribution: "Imagery © NASA EOSDIS GIBS / MODIS Terra",
  },
};

export const DEFAULT_BASEMAP: BasemapKey = "SENTINEL2";

/** WMTS público da EOX, sem chave/token. */
export const SENTINEL2_TILE_URL =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";
