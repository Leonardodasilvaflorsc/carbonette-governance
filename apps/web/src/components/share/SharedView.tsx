"use client";

import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { fetchSharedView, formatTons, sectorLabel } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useGibsMap } from "@/components/globe/useGibsMap";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBITAL-GHG";

function MiniMap({ lon, lat }: { lon: number; lat: number }) {
  const { containerRef, mapRef, ready } = useGibsMap({
    gasKey: "NO2",
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    opacity: 0.55,
    center: [lon, lat],
    zoom: 9.5,
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    new maplibregl.Marker({ color: "#1FB6A6" }).setLngLat([lon, lat]).addTo(map);
  }, [mapRef, ready, lon, lat]);

  return <div ref={containerRef} className="h-full w-full" />;
}

/** Visualização pública somente leitura de uma instalação (link assinado). */
export default function SharedView({ token }: { token: string }) {
  const t = useT();
  const { data, error, isLoading } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchSharedView(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-text-secondary">Carregando visualização…</p>
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="flex h-screen items-center justify-center bg-background">
        <div className="glass-panel rounded-md p-6 text-center">
          <p className="text-sm text-text-primary">Link inválido ou expirado</p>
          <p className="mt-1 text-xs text-text-secondary">
            Solicite um novo link de visualização ao seu contato.
          </p>
        </div>
      </main>
    );
  }

  const { facility, plumes } = data;
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <MiniMap lon={facility.lon} lat={facility.lat} />

      <header className="pointer-events-none absolute left-0 top-0 z-10 w-full p-4">
        <div className="glass-panel inline-block rounded-md px-4 py-2">
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-text-primary">
            {appName}
          </h1>
          <p className="text-xs text-accent-teal">{t("share.readOnly")}</p>
        </div>
      </header>

      <aside className="absolute right-4 top-4 z-10 w-96">
        <div className="glass-panel rounded-md p-4">
          <h2 className="text-sm text-text-primary">{facility.name}</h2>
          <p className="mb-3 text-xs text-text-secondary">
            {sectorLabel(facility.sector)} · {facility.country} · ref. {facility.ref_year}
          </p>

          <table className="mb-3 w-full text-xs">
            <tbody>
              {Object.entries(facility.emissions).map(([gas, tons]) => (
                <tr key={gas} className="border-t border-white/5">
                  <td className="py-1 text-text-secondary">{gas.toUpperCase()}</td>
                  <td className="py-1 text-right font-mono tabular-nums text-text-primary">
                    {formatTons(tons)}/ano
                  </td>
                </tr>
              ))}
              <tr className="border-t border-white/10">
                <td className="py-1 text-text-secondary">Total CO₂e</td>
                <td className="py-1 text-right font-mono tabular-nums text-accent-teal">
                  {formatTons(facility.co2e_t)}/ano
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            {t("facility.plumes")}
          </p>
          {plumes.length === 0 ? (
            <p className="text-[11px] text-text-secondary">Nenhuma no período.</p>
          ) : (
            <ul className="max-h-44 overflow-y-auto">
              {plumes.map((p) => (
                <li key={p.id} className="border-t border-white/5 py-1 text-xs">
                  <span className="font-mono tabular-nums text-alert-amber">
                    {p.flux_kg_h !== null
                      ? `${p.flux_kg_h.toLocaleString("pt-BR")} ± ${(p.flux_uncertainty_kg_h ?? 0).toLocaleString("pt-BR")} kg/h`
                      : "não quantificado"}
                  </span>
                  <span className="ml-2 text-[10px] text-text-secondary">
                    {p.gas} · {new Date(p.observed_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-snug text-text-secondary">
            Estimativas de sensoriamento remoto e inventário ({facility.data_source}) com
            incerteza 1σ — screening; não substitui inventário verificado. Visualização
            restrita a esta instalação.
          </p>
        </div>
      </aside>
    </main>
  );
}
