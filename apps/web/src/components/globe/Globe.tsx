"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGlobeStore } from "@/state/globeStore";
import { CINEMATIC_FLY } from "@/lib/map";
import { useGibsMap } from "./useGibsMap";
import { useFacilitiesOverlay } from "./useFacilitiesOverlay";

export default function Globe() {
  const gasKey = useGlobeStore((s) => s.gasKey);
  const date = useGlobeStore((s) => s.date);
  const opacity = useGlobeStore((s) => s.opacity);
  const cameraTarget = useGlobeStore((s) => s.cameraTarget);

  const { containerRef, mapRef, ready } = useGibsMap({ gasKey, date, opacity });
  const rotatingRef = useRef(true);

  useFacilitiesOverlay(mapRef, ready);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    // Rotação idle suave; qualquer interação do usuário a interrompe
    let frame = 0;
    const rotate = () => {
      if (rotatingRef.current && map.getZoom() < 4) {
        const center = map.getCenter();
        center.lng -= 0.015;
        map.setCenter(center);
      }
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);

    const stopRotation = () => {
      rotatingRef.current = false;
    };
    map.on("mousedown", stopRotation);
    map.on("wheel", stopRotation);
    map.on("touchstart", stopRotation);
    map.on("dragstart", stopRotation);

    return () => cancelAnimationFrame(frame);
    // mapRef/ready controlam o ciclo de vida; controles montam uma vez
  }, [mapRef, ready]);

  // flyTo cinematográfico (globo → cidade em uma animação contínua)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !cameraTarget) return;
    rotatingRef.current = false;
    map.flyTo({ center: cameraTarget.center, zoom: cameraTarget.zoom, ...CINEMATIC_FLY });
  }, [mapRef, ready, cameraTarget]);

  return <div ref={containerRef} className="h-full w-full" data-testid="globe-canvas" />;
}
