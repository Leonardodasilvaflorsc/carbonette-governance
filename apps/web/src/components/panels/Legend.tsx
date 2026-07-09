"use client";

import { GIBS_LAYERS } from "@orbital/shared";
import { useGlobeStore } from "@/state/globeStore";

function formatPhysical(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e4 || abs < 1e-2) return v.toExponential(1).replace("e+", "×10^");
  return String(v);
}

/**
 * Legenda com escala física real, derivada do colormap oficial do GIBS,
 * mais linha de rastreabilidade (produto · data · fonte) — regra 6 do
 * rigor científico.
 */
export default function Legend() {
  const gasKey = useGlobeStore((s) => s.gasKey);
  const date = useGlobeStore((s) => s.date);
  const layersMeta = useGlobeStore((s) => s.layersMeta);
  const metaSource = useGlobeStore((s) => s.metaSource);

  if (!gasKey) return null;
  const def = GIBS_LAYERS[gasKey];
  const meta = layersMeta?.[gasKey];
  const legend = meta?.legend;
  // distinto de "legenda ainda não carregada" (cosmético): a descoberta
  // real confirmou que este ID não existe no catálogo GIBS vigente —
  // não há imagem nenhuma para exibir, não só falta a legenda
  const layerMissing = metaSource === "capabilities" && meta?.available === false;

  return (
    <div className="glass-panel w-72 rounded-md p-3">
      <p className="mb-1 text-xs text-text-primary">{def.label}</p>
      <p className="mb-2 text-[10px] text-text-secondary">
        Concentração de coluna — não representa fluxo de emissão
      </p>

      {legend ? (
        <>
          <div
            className="h-2.5 w-full rounded-sm"
            style={{
              background: `linear-gradient(to right, ${legend.stops.map((s) => s.color).join(", ")})`,
            }}
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-text-secondary">
            <span>{formatPhysical(legend.min)}</span>
            <span>{legend.units}</span>
            <span>{formatPhysical(legend.max)}</span>
          </div>
        </>
      ) : layerMissing ? (
        <p className="text-[11px] text-alert-red">
          Camada indisponível no catálogo GIBS atual (ID não encontrado) — sem imagem para
          exibir. Escolha outro gás ou aguarde a próxima sincronização.
        </p>
      ) : (
        <p className="text-[11px] text-alert-amber">
          Legenda física ainda não carregada (colormap GIBS) — a imagem pode aparecer
          normalmente mesmo assim.
        </p>
      )}

      <p className="mt-2 border-t border-white/10 pt-1.5 font-mono text-[9px] text-text-secondary">
        {def.id} · {date} · NASA GIBS
      </p>
    </div>
  );
}
