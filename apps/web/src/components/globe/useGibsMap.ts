"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { DEFAULT_BASEMAP, GIBS_LAYERS, type BasemapKey, type GasLayerKey } from "@orbital/shared";
import { applyBasemap, applyGasOverlay, buildGlobeStyle } from "@/lib/map";

export interface GibsMapOptions {
  gasKey: GasLayerKey | null;
  date: string;
  opacity: number;
  basemap?: BasemapKey;
  center?: [number, number];
  zoom?: number;
}

/**
 * Cria e mantém um mapa MapLibre em projeção globe com base de satélite
 * e overlay de gás reativos. Usado pelo globo principal e pelo modo de
 * comparação A/B (duas instâncias sincronizadas).
 */
export function useGibsMap(opts: GibsMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  // opções iniciais congeladas para o efeito de criação (executa uma vez)
  const initialRef = useRef(opts);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = initialRef.current;
    const basemap = initial.basemap ?? DEFAULT_BASEMAP;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildGlobeStyle(basemap, initial.date),
      center: initial.center ?? [-50, -15],
      zoom: initial.zoom ?? 1.8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      const { gasKey, date, opacity } = initialRef.current;
      if (gasKey) applyGasOverlay(map, { layer: GIBS_LAYERS[gasKey], date, opacity });
      setReady(true);
    });

    return () => {
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // mantém o ref de iniciais atualizado para o 'load' usar o estado corrente
  initialRef.current = opts;

  const { gasKey, date, opacity, basemap = DEFAULT_BASEMAP } = opts;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyBasemap(map, basemap, date);
    applyGasOverlay(map, gasKey ? { layer: GIBS_LAYERS[gasKey], date, opacity } : null);
  }, [ready, gasKey, date, opacity, basemap]);

  return { containerRef, mapRef, ready };
}
