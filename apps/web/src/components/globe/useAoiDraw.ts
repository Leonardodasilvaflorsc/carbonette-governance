"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { fetchAois } from "@/lib/api";
import { useGlobeStore } from "@/state/globeStore";

const DRAFT_SRC = "aoi-draft-src";
const AOIS_SRC = "aois-src";

/**
 * Ferramenta de desenho de AOI: clique adiciona vértice, duplo clique
 * fecha o polígono, Esc cancela. AOIs salvas e o rascunho são renderizados
 * como camadas GeoJSON nativas do MapLibre.
 */
export function useAoiDraw(
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  ready: boolean
) {
  const drawingAoi = useGlobeStore((s) => s.drawingAoi);
  const draftVertices = useGlobeStore((s) => s.draftVertices);
  const addDraftVertex = useGlobeStore((s) => s.addDraftVertex);
  const finishDrawingAoi = useGlobeStore((s) => s.finishDrawingAoi);
  const clearDraftAoi = useGlobeStore((s) => s.clearDraftAoi);
  const selectedAoiId = useGlobeStore((s) => s.selectedAoiId);

  const { data: aois } = useQuery({ queryKey: ["aois"], queryFn: fetchAois, staleTime: 30_000 });

  // fontes e camadas (uma vez, quando o mapa está pronto)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const empty = { type: "FeatureCollection" as const, features: [] };

    if (!map.getSource(AOIS_SRC)) {
      map.addSource(AOIS_SRC, { type: "geojson", data: empty });
      map.addLayer({
        id: "aois-fill",
        type: "fill",
        source: AOIS_SRC,
        paint: { "fill-color": "#2D7FF9", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "aois-line",
        type: "line",
        source: AOIS_SRC,
        paint: { "line-color": "#2D7FF9", "line-width": 1.5 },
      });
    }
    if (!map.getSource(DRAFT_SRC)) {
      map.addSource(DRAFT_SRC, { type: "geojson", data: empty });
      map.addLayer({
        id: "aoi-draft-line",
        type: "line",
        source: DRAFT_SRC,
        paint: { "line-color": "#1FB6A6", "line-width": 2, "line-dasharray": [2, 1.5] },
      });
      map.addLayer({
        id: "aoi-draft-vertices",
        type: "circle",
        source: DRAFT_SRC,
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 4, "circle-color": "#1FB6A6" },
      });
    }
  }, [mapRef, ready]);

  // interação de desenho
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !drawingAoi) return;

    map.getCanvas().style.cursor = "crosshair";
    map.doubleClickZoom.disable();

    const onClick = (e: maplibregl.MapMouseEvent) => {
      addDraftVertex([e.lngLat.lng, e.lngLat.lat]);
    };
    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      finishDrawingAoi();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearDraftAoi();
      if (e.key === "Enter") finishDrawingAoi();
    };
    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
      map.getCanvas().style.cursor = "";
      map.doubleClickZoom.enable();
    };
  }, [mapRef, ready, drawingAoi, addDraftVertex, finishDrawingAoi, clearDraftAoi]);

  // render do rascunho
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(DRAFT_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = draftVertices.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: v },
      properties: {},
    }));
    if (draftVertices.length >= 2) {
      const ring = drawingAoi ? draftVertices : [...draftVertices, draftVertices[0]];
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: ring },
        properties: {},
      });
    }
    src.setData({ type: "FeatureCollection", features });
  }, [mapRef, ready, draftVertices, drawingAoi]);

  // render das AOIs salvas (selecionada com destaque)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(AOIS_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: (aois ?? []).map((a) => ({
        type: "Feature",
        geometry: a.geometry as GeoJSON.Polygon,
        properties: { id: a.id, selected: a.id === selectedAoiId },
      })),
    });
    if (map.getLayer("aois-line")) {
      map.setPaintProperty("aois-line", "line-width", [
        "case",
        ["==", ["get", "selected"], true],
        3,
        1.5,
      ]);
    }
  }, [mapRef, ready, aois, selectedAoiId]);
}
