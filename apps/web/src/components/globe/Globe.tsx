"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GIBS_LAYERS, gibsDefaultDate, gibsTileUrl, THEME } from "@orbital/shared";

function buildStyle(): StyleSpecification {
  const trueColor = GIBS_LAYERS.TRUE_COLOR;
  const date = gibsDefaultDate();
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": THEME.background,
      "horizon-color": "#143A57",
      "fog-color": THEME.background,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.1],
    },
    sources: {
      "gibs-truecolor": {
        type: "raster",
        tiles: [gibsTileUrl(trueColor, date)],
        tileSize: 256,
        maxzoom: trueColor.maxLevel,
        attribution: "Imagery © NASA EOSDIS GIBS / MODIS Terra",
      },
    },
    layers: [
      // Fundo "espaço": visível fora do disco do globo e onde tiles falharem
      { id: "space", type: "background", paint: { "background-color": "#02050A" } },
      {
        id: "base-truecolor",
        type: "raster",
        source: "gibs-truecolor",
        paint: { "raster-fade-duration": 300 },
      },
    ],
  };
}

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: [-50, -15],
      zoom: 1.8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    // Rotação idle suave; qualquer interação do usuário a interrompe
    let rotating = true;
    let frame = 0;
    const rotate = () => {
      if (rotating && map.getZoom() < 4) {
        const center = map.getCenter();
        center.lng -= 0.015;
        map.setCenter(center);
      }
      frame = requestAnimationFrame(rotate);
    };
    map.on("load", () => {
      frame = requestAnimationFrame(rotate);
    });
    const stopRotation = () => {
      rotating = false;
    };
    map.on("pointerdown", stopRotation);
    map.on("wheel", stopRotation);
    map.on("touchstart", stopRotation);

    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" data-testid="globe-canvas" />;
}
