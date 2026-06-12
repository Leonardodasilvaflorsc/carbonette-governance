"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { GIBS_LAYERS, type GasLayerKey } from "@orbital/shared";
import { applyGasOverlay, buildGlobeStyle, setBaseDate } from "@/lib/map";

export interface GibsMapOptions {
  gasKey: GasLayerKey | null;
  date: string;
  opacity: number;
  center?: [number, number];
  zoom?: number;
}

/**
 * Cria e mantém um mapa MapLibre em projeção globe com base de satélite
 * GIBS e overlay de gás reativos. Usado pelo globo principal e pelo modo
 * de comparação A/B (duas instâncias sincronizadas).
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildGlobeStyle(initial.date),
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

  const { gasKey, date, opacity } = opts;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setBaseDate(map, date);
    applyGasOverlay(map, gasKey ? { layer: GIBS_LAYERS[gasKey], date, opacity } : null);
  }, [ready, gasKey, date, opacity]);

  return { containerRef, mapRef, ready };
}
