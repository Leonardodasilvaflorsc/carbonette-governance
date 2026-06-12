"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFacilityPlumes, formatTons, sectorLabel } from "@/lib/api";
import { useGlobeStore } from "@/state/globeStore";

const GAS_DISPLAY: Record<string, string> = {
  co2: "CO₂",
  ch4: "CH₄",
  n2o: "N₂O",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
};

/** Ficha da instalação (E2): emissões anuais por gás, fonte e contexto. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function FacilityCard() {
  const facility = useGlobeStore((s) => s.selectedFacility);
  const selectFacility = useGlobeStore((s) => s.selectFacility);

  const { data: plumesData } = useQuery({
    queryKey: ["facility-plumes", facility?.id],
    queryFn: () => fetchFacilityPlumes(facility!.id),
    enabled: facility !== null,
    staleTime: 120_000,
  });

  if (!facility) return null;
  const plumes = plumesData?.plumes ?? [];

  return (
    <div className="glass-panel w-80 rounded-md p-3 text-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="text-sm text-text-primary">{facility.name}</h2>
        <button
          onClick={() => selectFacility(null)}
          aria-label="Fechar ficha"
          className="shrink-0 rounded border border-white/10 px-1.5 text-xs text-text-secondary hover:border-white/30 hover:text-text-primary"
        >
          ×
        </button>
      </div>
      <p className="mb-2 text-xs text-text-secondary">
        {sectorLabel(facility.sector)} · {facility.country} · ref. {facility.ref_year}
      </p>

      <table className="mb-2 w-full text-xs">
        <tbody>
          {Object.entries(facility.emissions).map(([gas, tons]) => (
            <tr key={gas} className="border-t border-white/5">
              <td className="py-1 text-text-secondary">{GAS_DISPLAY[gas] ?? gas.toUpperCase()}</td>
              <td className="py-1 text-right font-mono tabular-nums text-text-primary">
                {formatTons(tons)}/ano
              </td>
            </tr>
          ))}
          <tr className="border-t border-white/10">
            <td className="py-1 text-text-secondary">Total CO₂e (GWP100)</td>
            <td className="py-1 text-right font-mono tabular-nums text-accent-teal">
              {formatTons(facility.co2e_t)}/ano
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        Plumas detectadas
      </p>
      {plumes.length === 0 ? (
        <p className="mb-2 text-[11px] text-text-secondary">
          Sem dados orbitais associados — inventário apenas.
        </p>
      ) : (
        <ul className="mb-2 max-h-36 overflow-y-auto">
          {plumes.map((p) => (
            <li key={p.id} className="border-t border-white/5 py-1 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono tabular-nums text-alert-amber">
                  {p.flux_kg_h !== null
                    ? `${p.flux_kg_h.toLocaleString("pt-BR")} ± ${(p.flux_uncertainty_kg_h ?? 0).toLocaleString("pt-BR")} kg/h`
                    : "fluxo não quantificado"}
                </span>
                <span className="shrink-0 text-[10px] text-text-secondary">
                  {formatDate(p.observed_at)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[10px] text-text-secondary">
                <span>
                  {p.gas} · {p.method} · {p.instrument ?? "—"} · {p.source}
                </span>
                {p.quicklook_url && (
                  <a
                    href={p.quicklook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-accent-blue hover:underline"
                  >
                    quicklook
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] leading-snug text-text-secondary">
        Emissões de inventário ({facility.data_source}); fluxos de pluma são estimativas
        de sensoriamento remoto com incerteza 1σ. Screening — não substitui inventário
        GHG Protocol/ISO 14064 verificado.
      </p>

      {facility.data_source === "dev-fixture" && (
        <p className="mt-1.5 text-[11px] text-alert-amber">
          Valor de demonstração — não representa medição real desta instalação.
        </p>
      )}
    </div>
  );
}
