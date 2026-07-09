"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BASEMAPS,
  GIBS_LAYERS,
  GLOBE_PRESETS,
  type BasemapKey,
  type GasLayerKey,
  gibsDefaultDateFor,
  timelineDates,
} from "@orbital/shared";
import { useT } from "@/lib/i18n";
import { useGlobeStore } from "@/state/globeStore";

const GAS_ORDER: (GasLayerKey | null)[] = [null, "NO2", "SO2", "CH4", "CO", "AEROSOL", "NIGHT_LIGHTS"];

const GAS_SHORT: Record<string, string> = {
  NO2: "NO₂",
  SO2: "SO₂",
  CH4: "CH₄",
  CO: "CO",
  AEROSOL: "Aerossol",
  NIGHT_LIGHTS: "Luzes",
};

function toInputValue(date: string, cadence: "daily" | "monthly"): string {
  return cadence === "monthly" ? date.slice(0, 7) : date;
}

function fromInputValue(value: string, cadence: "daily" | "monthly"): string {
  return cadence === "monthly" ? `${value}-01` : value;
}

export default function ControlPanel() {
  const t = useT();
  const {
    gasKey,
    date,
    dateB,
    compare,
    opacity,
    basemap,
    layersMeta,
    metaSource,
    setGas,
    setDate,
    setDateB,
    setCompare,
    setOpacity,
    setBasemap,
    applyPreset,
  } = useGlobeStore();

  const def = gasKey ? GIBS_LAYERS[gasKey] : null;
  const meta = gasKey ? layersMeta?.[gasKey] : null;

  const timeline = useMemo(() => {
    if (!def || !gasKey) return [];
    const end = meta?.endDate ?? gibsDefaultDateFor(def);
    return timelineDates(def, end, def.cadence === "daily" ? 30 : 24);
  }, [def, gasKey, meta?.endDate]);

  const timelineIndex = Math.max(0, timeline.indexOf(date));

  // animação temporal: avança um passo da timeline até o fim
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || timeline.length === 0) return;
    const id = setInterval(() => {
      const current = useGlobeStore.getState().date;
      const idx = timeline.indexOf(current);
      if (idx < 0 || idx >= timeline.length - 1) {
        setPlaying(false);
        return;
      }
      setDate(timeline[idx + 1]);
    }, 900);
    return () => clearInterval(id);
  }, [playing, timeline, setDate]);

  return (
    <div className="glass-panel w-72 rounded-md p-3 text-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        {t("panel.gas")}
      </p>
      <div className="mb-3 grid grid-cols-4 gap-1">
        {GAS_ORDER.map((key) => {
          // só é confiável quando a descoberta real (não fallback) confirmou
          // o ID contra o catálogo GIBS vigente — evita escolher uma camada
          // sem imagem e ver o mapa em branco sem explicação
          const unavailable =
            key !== null && metaSource === "capabilities" && layersMeta?.[key]?.available === false;
          return (
            <button
              key={key ?? "base"}
              onClick={() => !unavailable && setGas(key)}
              disabled={unavailable}
              className={`relative rounded border px-1.5 py-1 font-mono text-xs transition-colors ${
                gasKey === key
                  ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                  : unavailable
                    ? "cursor-not-allowed border-white/5 text-text-secondary/40"
                    : "border-white/10 text-text-secondary hover:border-white/25 hover:text-text-primary"
              }`}
              title={
                unavailable
                  ? "Indisponível: ID não encontrado no catálogo GIBS atual"
                  : key
                    ? GIBS_LAYERS[key].label
                    : "Somente visão de satélite"
              }
            >
              {key ? GAS_SHORT[key] : t("panel.base")}
              {unavailable && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-alert-red" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        Base do mapa
      </p>
      <div className="mb-3 grid grid-cols-2 gap-1">
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setBasemap(key)}
            className={`rounded border px-1.5 py-1 text-[10.5px] transition-colors ${
              basemap === key
                ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                : "border-white/10 text-text-secondary hover:border-white/25 hover:text-text-primary"
            }`}
            title={BASEMAPS[key].attribution}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>

      {def && gasKey && (
        <>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            {def.cadence === "monthly" ? t("panel.date.monthly") : t("panel.date.daily")}
          </p>
          <input
            type={def.cadence === "monthly" ? "month" : "date"}
            value={toInputValue(date, def.cadence)}
            min={meta?.startDate ? toInputValue(meta.startDate, def.cadence) : undefined}
            max={meta?.endDate ? toInputValue(meta.endDate, def.cadence) : undefined}
            onChange={(e) => e.target.value && setDate(fromInputValue(e.target.value, def.cadence))}
            className="mb-3 w-full rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-xs text-text-primary [color-scheme:dark]"
          />

          <div className="mb-1 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
              {t("panel.timeline")}
            </p>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-text-secondary hover:border-accent-teal hover:text-accent-teal"
            >
              {playing ? t("panel.pause") : t("panel.animate")}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(timeline.length - 1, 0)}
            value={timelineIndex}
            onChange={(e) => setDate(timeline[Number(e.target.value)])}
            className="mb-3 w-full accent-[#1FB6A6]"
            aria-label="Linha do tempo"
          />

          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            {t("panel.opacity")}
          </p>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="mb-3 w-full accent-[#1FB6A6]"
            aria-label="Opacidade"
          />

          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="compare-toggle" className="text-xs text-text-secondary">
              {t("panel.compare")}
            </label>
            <input
              id="compare-toggle"
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="accent-[#1FB6A6]"
            />
          </div>
          {compare && (
            <>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                {t("panel.dateA")}
              </p>
              <input
                type={def.cadence === "monthly" ? "month" : "date"}
                value={toInputValue(dateB, def.cadence)}
                min={meta?.startDate ? toInputValue(meta.startDate, def.cadence) : undefined}
                max={meta?.endDate ? toInputValue(meta.endDate, def.cadence) : undefined}
                onChange={(e) =>
                  e.target.value && setDateB(fromInputValue(e.target.value, def.cadence))
                }
                className="mb-3 w-full rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-xs text-text-primary [color-scheme:dark]"
              />
            </>
          )}
        </>
      )}

      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        {t("panel.presets")}
      </p>
      <div className="flex flex-col gap-1">
        {GLOBE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className="rounded border border-white/10 px-2 py-1 text-left text-xs text-text-secondary transition-colors hover:border-accent-blue hover:text-text-primary"
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {metaSource === "fallback" && (
        <p className="mt-3 border-t border-white/10 pt-2 text-[11px] text-alert-amber">
          Catálogo GIBS indisponível — usando definições locais. Datas podem ter latência.
        </p>
      )}
    </div>
  );
}
