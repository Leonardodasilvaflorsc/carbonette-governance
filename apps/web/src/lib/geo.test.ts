import { describe, expect, it } from "vitest";
import type maplibregl from "maplibre-gl";
import { bboxFromBounds } from "./geo";
import { formatTons } from "./api";

function bounds(west: number, south: number, east: number, north: number) {
  return {
    getWest: () => west,
    getSouth: () => south,
    getEast: () => east,
    getNorth: () => north,
  } as maplibregl.LngLatBounds;
}

describe("bboxFromBounds", () => {
  it("converte bounds normais em 'w,s,e,n' arredondado", () => {
    expect(bboxFromBounds(bounds(-49.1234, -26.5678, -48.5, -26.0))).toBe(
      "-49.123,-26.568,-48.5,-26"
    );
  });

  it("clampa latitudes ao válido para a API", () => {
    expect(bboxFromBounds(bounds(-10, -95, 10, 95))).toBe("-10,-85,10,85");
  });

  it("degrada para o mundo inteiro no globo/antimeridiano", () => {
    expect(bboxFromBounds(bounds(-250, -60, 250, 60))).toBe("-180,-60,180,60");
    expect(bboxFromBounds(bounds(170, -10, -170, 10))).toBe("-180,-10,180,10");
  });
});

describe("formatTons", () => {
  it("escala t → kt → Mt em pt-BR", () => {
    expect(formatTons(null)).toBe("—");
    expect(formatTons(820)).toBe("820 t");
    expect(formatTons(9_800)).toBe("9,8 kt");
    expect(formatTons(4_615_496)).toBe("4,62 Mt");
  });
});
