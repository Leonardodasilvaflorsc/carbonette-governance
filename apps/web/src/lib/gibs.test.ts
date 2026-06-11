import { describe, expect, it } from "vitest";
import { GIBS_LAYERS, gibsDefaultDate, gibsTileUrl, GASES, GWP100_AR6 } from "@orbital/shared";

describe("gibsTileUrl", () => {
  it("monta URL WMTS GoogleMapsCompatible com data e formato da camada", () => {
    const url = gibsTileUrl(GIBS_LAYERS.TRUE_COLOR, "2026-06-10");
    expect(url).toBe(
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-06-10/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
    );
  });

  it("camadas científicas usam png", () => {
    const url = gibsTileUrl(GIBS_LAYERS.NO2, "2026-06-10");
    expect(url).toContain("OMI_Nitrogen_Dioxide_Tropo_Column");
    expect(url.endsWith(".png")).toBe(true);
  });
});

describe("gibsDefaultDate", () => {
  it("retorna o dia anterior em UTC (latência de publicação do GIBS)", () => {
    expect(gibsDefaultDate(new Date("2026-06-11T03:00:00Z"))).toBe("2026-06-10");
    expect(gibsDefaultDate(new Date("2026-01-01T00:30:00Z"))).toBe("2025-12-31");
  });
});

describe("constantes científicas", () => {
  it("rastreia os cinco gases do escopo", () => {
    expect(GASES).toEqual(["CH4", "CO2", "NO2", "SO2", "CO"]);
  });

  it("GWP100 AR6 distingue CH4 fóssil de biogênico", () => {
    expect(GWP100_AR6.CH4_FOSSIL).toBe(29.8);
    expect(GWP100_AR6.CH4_BIOGENIC).toBe(27.2);
  });
});
