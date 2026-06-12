import type maplibregl from "maplibre-gl";

/**
 * Converte os bounds do mapa em bbox "west,south,east,north" válida para a
 * API. Em zoom baixo (globo) ou cruzando o antimeridiano, degrada para o
 * mundo inteiro — melhor um superset do que uma consulta inválida.
 */
export function bboxFromBounds(bounds: maplibregl.LngLatBounds): string {
  let west = bounds.getWest();
  let east = bounds.getEast();
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());

  if (east - west >= 360 || west < -180 || east > 180 || west > east) {
    west = -180;
    east = 180;
  }
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return `${r(west)},${r(south)},${r(east)},${r(north)}`;
}
