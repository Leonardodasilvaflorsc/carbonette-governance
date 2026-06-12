"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPlumes } from "@/lib/api";
import { useGlobeStore } from "@/state/globeStore";

const SRC = "plumes-src";

/**
 * Plumas detectadas como camada nativa (halo pulsado em âmbar). O fluxo
 * com incerteza aparece na ficha da instalação associada (FacilityCard).
 */
export function usePlumesLayer(
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  ready: boolean
) {
  const viewportBbox = useGlobeStore((s) => s.viewportBbox);
  const showFacilities = useGlobeStore((s) => s.showFacilities);

  const { data } = useQuery({
    queryKey: ["plumes", viewportBbox],
    queryFn: () => fetchPlumes({ bbox: viewportBbox ?? undefined }),
    enabled: showFacilities && viewportBbox !== null,
    staleTime: 120_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "plumes-halo",
        type: "circle",
        source: SRC,
        paint: {
          "circle-radius": 14,
          "circle-color": "#C9963C",
          "circle-opacity": 0.18,
          "circle-stroke-color": "#C9963C",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "plumes-core",
        type: "circle",
        source: SRC,
        paint: { "circle-radius": 4, "circle-color": "#C9963C" },
      });
    }
  }, [mapRef, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: (showFacilities ? (data?.plumes ?? []) : []).map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { id: p.id, gas: p.gas },
      })),
    });
  }, [mapRef, ready, data, showFacilities]);
}
