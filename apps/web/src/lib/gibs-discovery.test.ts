import { describe, expect, it } from "vitest";
import { parseCapabilities, parseColormap } from "./gibs-discovery";
import { CAPABILITIES_FIXTURE, COLORMAP_FIXTURE } from "./__fixtures__/gibs-xml";

describe("parseCapabilities", () => {
  const candidates = [
    "OMI_Nitrogen_Dioxide_Tropo_Column",
    "AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day",
    "VIIRS_SNPP_DayNightBand_ENCC", // não existe na fixture
  ];

  it("extrai intervalo temporal de camada diária", () => {
    const map = parseCapabilities(CAPABILITIES_FIXTURE, candidates);
    const no2 = map.get("OMI_Nitrogen_Dioxide_Tropo_Column");
    expect(no2?.startDate).toBe("2004-10-01");
    expect(no2?.endDate).toBe("2026-06-10");
  });

  it("usa o último intervalo quando a série temporal tem lacunas", () => {
    const map = parseCapabilities(CAPABILITIES_FIXTURE, candidates);
    const ch4 = map.get("AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day");
    expect(ch4?.startDate).toBe("2002-09-01");
    expect(ch4?.endDate).toBe("2026-06-09");
  });

  it("prefere o colormap v1.3 quando há múltiplas versões", () => {
    const map = parseCapabilities(CAPABILITIES_FIXTURE, candidates);
    expect(map.get("OMI_Nitrogen_Dioxide_Tropo_Column")?.colormapUrl).toContain("colormaps/v1.3");
  });

  it("camadas ausentes do capabilities não aparecem no resultado", () => {
    const map = parseCapabilities(CAPABILITIES_FIXTURE, candidates);
    expect(map.has("VIIRS_SNPP_DayNightBand_ENCC")).toBe(false);
    // e camadas não candidatas são ignoradas
    expect(map.has("MODIS_Terra_Aerosol_Optical_Depth")).toBe(false);
  });
});

describe("parseColormap", () => {
  it("ignora o bloco 'No Data' e extrai escala física com unidades", () => {
    const legend = parseColormap(COLORMAP_FIXTURE);
    expect(legend).not.toBeNull();
    expect(legend!.units).toBe("molecules/cm2");
    expect(legend!.min).toBe(0);
    expect(legend!.max).toBe(5.92e15);
    expect(legend!.stops.length).toBeGreaterThanOrEqual(2);
    expect(legend!.stops[0].color).toBe("rgb(33,31,74)");
    expect(legend!.stops.at(-1)!.color).toBe("rgb(138,17,21)");
  });

  it("retorna null para XML sem colormap utilizável", () => {
    expect(parseColormap("<ColorMaps></ColorMaps>")).toBeNull();
  });
});
