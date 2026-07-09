"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGlobeStore } from "@/state/globeStore";
import { useGibsMap } from "./useGibsMap";

/**
 * Modo comparação A/B: dois globos sincronizados com a mesma câmera,
 * datas diferentes, divididos por um slider de cortina (clip-path).
 */
export default function CompareGlobes() {
  const gasKey = useGlobeStore((s) => s.gasKey);
  const date = useGlobeStore((s) => s.date);
  const dateB = useGlobeStore((s) => s.dateB);
  const opacity = useGlobeStore((s) => s.opacity);
  const basemap = useGlobeStore((s) => s.basemap);

  const a = useGibsMap({ gasKey, date: dateB, opacity, basemap }); // esquerda: data anterior
  const b = useGibsMap({ gasKey, date, opacity, basemap }); // direita: data atual

  const [split, setSplit] = useState(50); // % da largura onde está a cortina
  const dragging = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // sincroniza câmera entre os dois mapas
  useEffect(() => {
    const mapA = a.mapRef.current;
    const mapB = b.mapRef.current;
    if (!mapA || !mapB || !a.ready || !b.ready) return;

    let syncing = false;
    const follow = (from: typeof mapA, to: typeof mapA) => () => {
      if (syncing) return;
      syncing = true;
      to.jumpTo({
        center: from.getCenter(),
        zoom: from.getZoom(),
        bearing: from.getBearing(),
        pitch: from.getPitch(),
      });
      syncing = false;
    };
    const syncAB = follow(mapA, mapB);
    const syncBA = follow(mapB, mapA);
    mapA.on("move", syncAB);
    mapB.on("move", syncBA);
    syncAB();

    return () => {
      mapA.off("move", syncAB);
      mapB.off("move", syncBA);
    };
  }, [a.mapRef, b.mapRef, a.ready, b.ready]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(95, Math.max(5, pct)));
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      onPointerMove={onPointerMove}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <div ref={a.containerRef} className="absolute inset-0" />
      <div
        ref={b.containerRef}
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
      />

      {/* cortina */}
      <div
        role="separator"
        aria-label="Divisor de comparação A/B"
        className="absolute inset-y-0 z-10 w-1 cursor-col-resize bg-accent-teal/70"
        style={{ left: `calc(${split}% - 2px)` }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
      >
        <div className="absolute left-1/2 top-1/2 h-10 w-5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/20 bg-[#101620]" />
      </div>

      <span className="glass-panel absolute bottom-4 left-4 z-10 rounded px-2 py-1 font-mono text-xs text-text-secondary">
        A · {dateB}
      </span>
      <span className="glass-panel absolute bottom-4 right-4 z-10 rounded px-2 py-1 font-mono text-xs text-text-secondary">
        B · {date}
      </span>
    </div>
  );
}
