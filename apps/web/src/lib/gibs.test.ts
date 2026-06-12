import { describe, expect, it } from "vitest";
import {
  GASES,
  GIBS_LAYERS,
  GWP100_AR6,
  gibsDefaultDate,
  gibsDefaultDateFor,
  gibsLayerDate,
  gibsTileUrl,
  stepIsoDate,
  timelineDates,
} from "@orbital/shared";

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

describe("datas por cadência", () => {
  it("normaliza data de camada mensal para o dia 01", () => {
    expect(gibsLayerDate(GIBS_LAYERS.CH4, "2026-05-17")).toBe("2026-05-01");
    expect(gibsLayerDate(GIBS_LAYERS.NO2, "2026-05-17")).toBe("2026-05-17");
  });

  it("default mensal fica dois meses atrás (latência de publicação L3)", () => {
    expect(gibsDefaultDateFor(GIBS_LAYERS.CH4, new Date("2026-06-12T12:00:00Z"))).toBe(
      "2026-04-01"
    );
  });

  it("avança e retrocede datas respeitando a cadência", () => {
    expect(stepIsoDate("2026-03-01", "daily", -1)).toBe("2026-02-28");
    expect(stepIsoDate("2026-01-01", "monthly", -1)).toBe("2025-12-01");
    expect(stepIsoDate("2026-01-15", "monthly", 2)).toBe("2026-03-01");
  });

  it("timeline gera N passos em ordem crescente terminando na data final", () => {
    const dates = timelineDates(GIBS_LAYERS.NO2, "2026-06-10", 5);
    expect(dates).toEqual(["2026-06-06", "2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10"]);
    const months = timelineDates(GIBS_LAYERS.CH4, "2026-04-15", 3);
    expect(months).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
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
