"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analysisExportUrl,
  createAoi,
  fetchAnalysis,
  fetchAois,
  submitAnalysis,
  type GeoPolygon,
} from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useGlobeStore } from "@/state/globeStore";
import TimeseriesChart from "./TimeseriesChart";

const ANALYSIS_GASES = ["CH4", "NO2", "SO2", "CO"] as const;

function lastTwelveMonths(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Análise quantitativa (E3): AOIs, séries temporais e exportações. */
export default function AnalysisPanel() {
  const t = useT();
  const queryClient = useQueryClient();
  const drawingAoi = useGlobeStore((s) => s.drawingAoi);
  const draftVertices = useGlobeStore((s) => s.draftVertices);
  const startDrawingAoi = useGlobeStore((s) => s.startDrawingAoi);
  const clearDraftAoi = useGlobeStore((s) => s.clearDraftAoi);
  const selectedAoiId = useGlobeStore((s) => s.selectedAoiId);
  const selectAoi = useGlobeStore((s) => s.selectAoi);
  const analysisJobId = useGlobeStore((s) => s.analysisJobId);
  const setAnalysisJobId = useGlobeStore((s) => s.setAnalysisJobId);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const [aoiName, setAoiName] = useState("");
  const [gas, setGas] = useState<(typeof ANALYSIS_GASES)[number]>("CH4");

  const { data: aois } = useQuery({ queryKey: ["aois"], queryFn: fetchAois, staleTime: 30_000 });

  const saveAoi = useMutation({
    mutationFn: () => {
      const ring = [...draftVertices, draftVertices[0]];
      const geometry: GeoPolygon = { type: "Polygon", coordinates: [ring] };
      return createAoi(aoiName || "AOI sem nome", geometry);
    },
    onSuccess: (aoi) => {
      queryClient.invalidateQueries({ queryKey: ["aois"] });
      clearDraftAoi();
      setAoiName("");
      selectAoi(aoi.id);
    },
  });

  const runAnalysis = useMutation({
    mutationFn: () => {
      const { start, end } = lastTwelveMonths();
      return submitAnalysis(selectedAoiId!, gas, start, end);
    },
    onSuccess: (resp) => setAnalysisJobId(resp.job.id),
  });

  const { data: job } = useQuery({
    queryKey: ["analysis", analysisJobId],
    queryFn: () => fetchAnalysis(analysisJobId!),
    enabled: analysisJobId !== null,
    refetchInterval: (q) =>
      q.state.data && ["done", "error"].includes(q.state.data.status) ? false : 1200,
  });

  const draftPending = !drawingAoi && draftVertices.length >= 3;

  return (
    <div className="glass-panel w-72 rounded-md p-3 text-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        {t("analysis.title")}
      </p>

      {!drawingAoi && !draftPending && (
        <button
          onClick={startDrawingAoi}
          className="mb-2 w-full rounded border border-white/10 px-2 py-1 text-xs text-text-secondary hover:border-accent-teal hover:text-accent-teal"
        >
          {t("analysis.draw")}
        </button>
      )}
      {drawingAoi && (
        <p className="mb-2 text-[11px] text-accent-teal">
          Clique para adicionar vértices ({draftVertices.length}) · duplo clique ou Enter
          fecha · Esc cancela
        </p>
      )}
      {draftPending && (
        <div className="mb-2 flex gap-1">
          <input
            value={aoiName}
            onChange={(e) => setAoiName(e.target.value)}
            placeholder={t("analysis.aoiName")}
            className="min-w-0 flex-1 rounded border border-white/10 bg-transparent px-2 py-1 text-xs text-text-primary"
          />
          <button
            onClick={() => saveAoi.mutate()}
            disabled={saveAoi.isPending}
            className="rounded border border-accent-teal px-2 py-1 text-xs text-accent-teal hover:bg-accent-teal/10"
          >
            {t("analysis.save")}
          </button>
          <button
            onClick={clearDraftAoi}
            className="rounded border border-white/10 px-2 py-1 text-xs text-text-secondary"
          >
            ×
          </button>
        </div>
      )}

      {(aois ?? []).length > 0 && (
        <select
          value={selectedAoiId ?? ""}
          onChange={(e) => {
            const id = e.target.value || null;
            selectAoi(id);
            const aoi = aois?.find((a) => a.id === id);
            if (aoi) {
              const ring = aoi.geometry.coordinates[0];
              const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
              const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
              flyTo([lon, lat], 10.5);
            }
          }}
          aria-label="AOI selecionada"
          className="mb-2 w-full rounded border border-white/10 bg-[#101620] px-2 py-1 text-xs text-text-primary"
        >
          <option value="">{t("analysis.select")}</option>
          {(aois ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {selectedAoiId && (
        <div className="mb-2 flex gap-1">
          <select
            value={gas}
            onChange={(e) => setGas(e.target.value as typeof gas)}
            aria-label="Gás da análise"
            className="rounded border border-white/10 bg-[#101620] px-2 py-1 font-mono text-xs text-text-primary"
          >
            {ANALYSIS_GASES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            onClick={() => runAnalysis.mutate()}
            disabled={runAnalysis.isPending}
            className="flex-1 rounded border border-accent-blue px-2 py-1 text-xs text-accent-blue hover:bg-accent-blue/10"
          >
            {t("analysis.run")}
          </button>
        </div>
      )}

      {job && job.status !== "done" && job.status !== "error" && (
        <p className="text-[11px] text-text-secondary">
          Job {job.status === "running" ? "em execução" : "na fila"}…
        </p>
      )}
      {job?.status === "error" && (
        <p className="text-[11px] text-alert-red">Falha na análise: {job.error}</p>
      )}

      {job?.status === "done" && (
        <>
          <p className="mb-1 text-[11px] text-text-secondary">
            Concentração média da AOI — não representa fluxo de emissão
          </p>
          <TimeseriesChart points={job.result} unit={job.result[0]?.unit ?? ""} />
          <p className="mt-1 font-mono text-[9px] leading-snug text-text-secondary">
            {job.product}
          </p>
          {job.product?.includes("synthetic-dev") && (
            <p className="mt-1 text-[11px] text-alert-amber">
              Série sintética de desenvolvimento — configure GEE/CDSE para dados orbitais reais.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <a
              href={analysisExportUrl(job.id, "csv")}
              className="rounded border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:border-white/30 hover:text-text-primary"
            >
              Exportar CSV
            </a>
            <a
              href={analysisExportUrl(job.id, "geojson")}
              className="rounded border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:border-white/30 hover:text-text-primary"
            >
              Exportar GeoJSON
            </a>
          </div>
        </>
      )}
    </div>
  );
}
