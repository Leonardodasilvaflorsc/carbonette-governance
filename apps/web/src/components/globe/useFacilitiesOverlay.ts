"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import Supercluster from "supercluster";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchFacilities, type Facility } from "@/lib/api";
import { bboxFromBounds } from "@/lib/geo";
import { useGlobeStore } from "@/state/globeStore";

interface ClusterProps {
  cluster: true;
  point_count: number;
}

interface PointProps {
  cluster?: false;
  facility: Facility;
}

type FeatureProps = ClusterProps | PointProps;

/**
 * Camada de instalações (Atlas de Emissores) sobre o globo: clustering
 * supercluster + deck.gl ScatterplotLayer/TextLayer via MapboxOverlay.
 *
 * Overlay em modo "overlaid" (não interleaved): o suporte interleaved à
 * projeção globe do MapLibre ainda é instável no deck.gl 9; pontos sobre
 * o globo renderizam corretamente em ambos.
 */
export function useFacilitiesOverlay(
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  ready: boolean
) {
  const showFacilities = useGlobeStore((s) => s.showFacilities);
  const sector = useGlobeStore((s) => s.sector);
  const viewportBbox = useGlobeStore((s) => s.viewportBbox);
  const setViewportBbox = useGlobeStore((s) => s.setViewportBbox);
  const selectFacility = useGlobeStore((s) => s.selectFacility);
  const setAtlasSource = useGlobeStore((s) => s.setAtlasSource);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [zoom, setZoom] = useState(2);

  // bbox/zoom da viewport → estado (consultas reagem a moveend, não a cada frame)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const update = () => {
      setViewportBbox(bboxFromBounds(map.getBounds()));
      setZoom(map.getZoom());
    };
    update();
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
    };
  }, [mapRef, ready, setViewportBbox]);

  const { data } = useQuery({
    queryKey: ["facilities", viewportBbox, sector],
    queryFn: () => fetchFacilities({ bbox: viewportBbox ?? undefined, sector: sector ?? undefined }),
    enabled: showFacilities && viewportBbox !== null,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data) setAtlasSource(data.source);
  }, [data, setAtlasSource]);

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({ radius: 48, maxZoom: 11 });
    sc.load(
      (data?.facilities ?? []).map((facility) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [facility.lon, facility.lat] },
        properties: { facility },
      }))
    );
    return sc;
  }, [data]);

  // monta o overlay deck.gl uma única vez
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;
    return () => {
      map.removeControl(overlay);
      overlayRef.current = null;
    };
  }, [mapRef, ready]);

  // reconstrói as camadas quando dados/zoom/visibilidade mudam
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    if (!showFacilities) {
      overlay.setProps({ layers: [] });
      return;
    }

    const clusters = index.getClusters([-180, -85, 180, 85], Math.round(zoom));

    const layers = [
      new ScatterplotLayer<(typeof clusters)[number]>({
        id: "facilities",
        data: clusters,
        pickable: true,
        radiusUnits: "pixels",
        stroked: true,
        lineWidthMinPixels: 1,
        getPosition: (f) => f.geometry.coordinates as [number, number],
        getRadius: (f) => {
          const p = f.properties as FeatureProps;
          if ("cluster" in p && p.cluster) return 14 + Math.min(14, Math.sqrt(p.point_count) * 3);
          const co2e = (p as PointProps).facility.co2e_t ?? 0;
          return 6 + Math.min(10, Math.log10(Math.max(co2e, 1)));
        },
        getFillColor: (f) => {
          const p = f.properties as FeatureProps;
          if ("cluster" in p && p.cluster) return [31, 182, 166, 170];
          const co2e = (p as PointProps).facility.co2e_t ?? 0;
          return co2e >= 1_000_000 ? [194, 84, 80, 210] : [45, 127, 249, 200];
        },
        getLineColor: [230, 235, 242, 120],
        onClick: ({ object }) => {
          if (!object) return;
          const p = object.properties as FeatureProps;
          const [lng, lat] = object.geometry.coordinates as [number, number];
          if ("cluster" in p && p.cluster) {
            const clusterId = (object as { id?: number }).id;
            const targetZoom =
              clusterId !== undefined ? index.getClusterExpansionZoom(clusterId) : zoom + 2;
            flyTo([lng, lat], Math.min(targetZoom + 0.3, 13));
          } else {
            selectFacility((p as PointProps).facility);
            flyTo([lng, lat], Math.max(zoom, 10.5));
          }
        },
      }),
      new TextLayer<(typeof clusters)[number]>({
        id: "facility-counts",
        data: clusters.filter((f) => "cluster" in f.properties && f.properties.cluster),
        getPosition: (f) => f.geometry.coordinates as [number, number],
        getText: (f) => String((f.properties as ClusterProps).point_count),
        getSize: 12,
        getColor: [230, 235, 242, 255],
        fontFamily: "JetBrains Mono, monospace",
      }),
    ];

    overlay.setProps({ layers });
  }, [index, zoom, showFacilities, flyTo, selectFacility]);
}
