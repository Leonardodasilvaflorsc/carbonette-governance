"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { DiscoveredLayer } from "@orbital/shared";
import { useGlobeStore, type LayersMeta } from "@/state/globeStore";

/** Carrega o catálogo de camadas descoberto e injeta no store. */
function LayersMetaLoader() {
  const setLayersMeta = useGlobeStore((s) => s.setLayersMeta);
  const { data } = useQuery<{ source: "capabilities" | "fallback"; layers: DiscoveredLayer[] }>({
    queryKey: ["gibs-layers"],
    queryFn: async () => {
      const res = await fetch("/api/gibs/layers");
      if (!res.ok) throw new Error("gibs layers failed");
      return res.json();
    },
    staleTime: 6 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    const meta: LayersMeta = {};
    for (const layer of data.layers) meta[layer.key] = layer;
    setLayersMeta(meta, data.source);
  }, [data, setLayersMeta]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <LayersMetaLoader />
      {children}
    </QueryClientProvider>
  );
}
