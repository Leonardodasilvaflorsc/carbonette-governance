"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchRanking, fetchSectors, formatTons, sectorLabel } from "@/lib/api";
import { useGlobeStore } from "@/state/globeStore";

/**
 * Atlas de Emissores: visibilidade da camada, filtro por setor e ranking
 * Top-20 (t CO₂e/ano) das instalações na viewport atual.
 */
export default function AtlasPanel() {
  const showFacilities = useGlobeStore((s) => s.showFacilities);
  const setShowFacilities = useGlobeStore((s) => s.setShowFacilities);
  const sector = useGlobeStore((s) => s.sector);
  const setSector = useGlobeStore((s) => s.setSector);
  const viewportBbox = useGlobeStore((s) => s.viewportBbox);
  const atlasSource = useGlobeStore((s) => s.atlasSource);
  const selectFacility = useGlobeStore((s) => s.selectFacility);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const { data: sectorsData } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 60 * 60 * 1000,
  });

  const { data: rankingData } = useQuery({
    queryKey: ["ranking", viewportBbox, sector],
    queryFn: () => fetchRanking({ bbox: viewportBbox ?? undefined, sector: sector ?? undefined }),
    enabled: showFacilities && viewportBbox !== null,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="glass-panel w-80 rounded-md p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
          Atlas de emissores
        </p>
        <input
          type="checkbox"
          checked={showFacilities}
          onChange={(e) => setShowFacilities(e.target.checked)}
          aria-label="Exibir instalações"
          className="accent-[#1FB6A6]"
        />
      </div>

      <select
        value={sector ?? ""}
        onChange={(e) => setSector(e.target.value || null)}
        aria-label="Filtrar por setor"
        className="mb-3 w-full rounded border border-white/10 bg-[#101620] px-2 py-1 text-xs text-text-primary"
      >
        <option value="">Todos os setores</option>
        {(sectorsData?.sectors ?? []).map((s) => (
          <option key={s} value={s}>
            {sectorLabel(s)}
          </option>
        ))}
      </select>

      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        Top emissores na viewport (t CO₂e/ano)
      </p>
      <ol className="max-h-72 overflow-y-auto">
        {(rankingData?.facilities ?? []).map((f, i) => (
          <li key={f.id}>
            <button
              onClick={() => {
                selectFacility(f);
                flyTo([f.lon, f.lat], 10.5);
              }}
              className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-white/5"
            >
              <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-text-secondary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">{f.name}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-accent-teal">
                {formatTons(f.co2e_t)}
              </span>
            </button>
          </li>
        ))}
        {rankingData && rankingData.facilities.length === 0 && (
          <li className="px-1.5 py-1 text-xs text-text-secondary">
            Nenhuma instalação na viewport com os filtros atuais
          </li>
        )}
      </ol>

      {atlasSource === "mock" && (
        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-alert-amber">
          Dados de demonstração (dev-fixture) — banco indisponível. Não usar comercialmente;
          sincronize o Climate TRACE para dados reais.
        </p>
      )}
    </div>
  );
}
