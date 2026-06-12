"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGlobeStore } from "@/state/globeStore";
import { zoomForPlaceType } from "@/lib/map";
import type { GeocodeResult } from "@/app/api/geocode/route";

interface GeocodeResponse {
  source: "nominatim" | "offline-fallback" | "none";
  results: GeocodeResult[];
}

export default function SearchBox() {
  const flyTo = useGlobeStore((s) => s.flyTo);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // debounce de 400 ms para respeitar a política de uso do geocoder
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 400);
    return () => clearTimeout(id);
  }, [input]);

  const { data, isFetching } = useQuery<GeocodeResponse>({
    queryKey: ["geocode", query],
    queryFn: async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("geocode failed");
      return res.json();
    },
    enabled: query.length >= 3,
    staleTime: 5 * 60 * 1000,
  });

  const select = (r: GeocodeResult) => {
    flyTo([r.lon, r.lat], zoomForPlaceType(r.type));
    setOpen(false);
    setInput(r.name.split(",")[0]);
  };

  return (
    <div className="relative w-80">
      <input
        type="search"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cidade, região, instalação…"
        aria-label="Buscar localidade"
        className="glass-panel w-full rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent-teal focus:outline-none"
      />
      {open && query.length >= 3 && data && (
        <div className="glass-panel absolute mt-1 w-full overflow-hidden rounded-md">
          {data.results.length === 0 && !isFetching && (
            <p className="px-3 py-2 text-xs text-text-secondary">Nenhum resultado</p>
          )}
          {data.results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => select(r)}
              className="block w-full px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              {r.name}
            </button>
          ))}
          {data.source === "offline-fallback" && (
            <p className="border-t border-white/10 px-3 py-1.5 text-[10px] text-alert-amber">
              Geocoder externo indisponível — resultados de catálogo local
            </p>
          )}
        </div>
      )}
    </div>
  );
}
