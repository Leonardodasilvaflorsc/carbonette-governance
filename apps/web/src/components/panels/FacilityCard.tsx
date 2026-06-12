"use client";

import { formatTons, sectorLabel } from "@/lib/api";
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
export default function FacilityCard() {
  const facility = useGlobeStore((s) => s.selectedFacility);
  const selectFacility = useGlobeStore((s) => s.selectFacility);

  if (!facility) return null;

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

      <p className="text-[10px] leading-snug text-text-secondary">
        Emissões de inventário ({facility.data_source}). Sem dados orbitais associados —
        plumas e fluxo entram na FASE 4. Estimativas de screening; não substituem
        inventário GHG Protocol/ISO 14064 verificado.
      </p>

      {facility.data_source === "dev-fixture" && (
        <p className="mt-1.5 text-[11px] text-alert-amber">
          Valor de demonstração — não representa medição real desta instalação.
        </p>
      )}
    </div>
  );
}
