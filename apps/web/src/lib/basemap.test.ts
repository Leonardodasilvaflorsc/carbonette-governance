import { describe, expect, it } from "vitest";
import { BASEMAPS, DEFAULT_BASEMAP, SENTINEL2_TILE_URL } from "@orbital/shared";

describe("basemap", () => {
  it("Sentinel-2 é o default e tem resolução muito maior que o GIBS diário", () => {
    expect(DEFAULT_BASEMAP).toBe("SENTINEL2");
    expect(BASEMAPS.SENTINEL2.maxzoom).toBeGreaterThan(BASEMAPS.GIBS_DAILY.maxzoom);
  });

  it("URL do Sentinel-2 é um template WMTS válido sem chave/token", () => {
    expect(SENTINEL2_TILE_URL).toContain("{z}");
    expect(SENTINEL2_TILE_URL).toContain("{x}");
    expect(SENTINEL2_TILE_URL).toContain("{y}");
    expect(SENTINEL2_TILE_URL).not.toMatch(/key=|token=/i);
  });
});
