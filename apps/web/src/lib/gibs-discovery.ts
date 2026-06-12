import { XMLParser } from "fast-xml-parser";
import type { LayerLegend, LegendStop } from "@orbital/shared";

/** Resultado da descoberta de uma camada no WMTSCapabilities.xml. */
export interface CapabilitiesEntry {
  id: string;
  startDate?: string;
  endDate?: string;
  colormapUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // força arrays onde a cardinalidade varia entre camadas
  isArray: (name) =>
    ["Layer", "Dimension", "ows:Metadata", "Value", "ColorMap", "ColorMapEntry"].includes(name),
});

function asArray<T>(v: unknown): T[] {
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : [v]) as T[];
}

/**
 * Extrai, do WMTSCapabilities.xml do GIBS, o intervalo temporal e a URL do
 * colormap das camadas candidatas. IDs ausentes simplesmente não aparecem
 * no resultado (camada renomeada/descontinuada → consumidor usa fallback).
 */
export function parseCapabilities(xml: string, candidateIds: string[]): Map<string, CapabilitiesEntry> {
  const wanted = new Set(candidateIds);
  const result = new Map<string, CapabilitiesEntry>();

  const doc = parser.parse(xml);
  const layers = asArray<Record<string, unknown>>(doc?.Capabilities?.Contents?.Layer);

  for (const layer of layers) {
    const id = String(layer["ows:Identifier"] ?? "");
    if (!wanted.has(id)) continue;

    const entry: CapabilitiesEntry = { id };

    const timeDim = asArray<Record<string, unknown>>(layer.Dimension).find(
      (d) => String(d["ows:Identifier"] ?? "") === "Time"
    );
    if (timeDim) {
      // Valores como "2002-08-31/2026-06-10/P1D" (um ou vários intervalos)
      const values = asArray<unknown>(timeDim.Value).map(String);
      const ranges = values
        .map((v) => v.split("/"))
        .filter((parts) => parts.length >= 2);
      if (ranges.length > 0) {
        entry.startDate = ranges[0][0];
        entry.endDate = ranges[ranges.length - 1][1];
      }
    }

    const metadata = asArray<Record<string, unknown>>(layer["ows:Metadata"]);
    const colormap =
      metadata.find((m) => String(m["@_xlink:href"] ?? "").includes("colormaps/v1.3")) ??
      metadata.find((m) => String(m["@_xlink:href"] ?? "").includes("colormaps"));
    if (colormap) entry.colormapUrl = String(colormap["@_xlink:href"]);

    result.set(id, entry);
  }

  return result;
}

interface RawColorMapEntry {
  "@_rgb"?: string;
  "@_transparent"?: string;
  "@_value"?: string;
}

function parseEntryValue(value: string | undefined): [number, number] | null {
  if (!value) return null;
  const nums = value
    .replace(/[[\]()]/g, "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return [nums[0], nums[nums.length - 1]];
}

/**
 * Converte o colormap XML oficial do GIBS (v1.3) em legenda com escala
 * física real. Quando há múltiplos blocos ColorMap (ex.: "No Data" +
 * dados), usa o que tem mais entradas opacas com valor numérico.
 */
export function parseColormap(xml: string, maxStops = 12): LayerLegend | null {
  const doc = parser.parse(xml);
  const maps = asArray<Record<string, unknown>>(doc?.ColorMaps?.ColorMap);
  if (maps.length === 0) return null;

  let best: { units: string; entries: { color: string; range: [number, number] }[] } | null = null;

  for (const cm of maps) {
    const entriesNode = cm.Entries as Record<string, unknown> | undefined;
    const raw = asArray<RawColorMapEntry>(entriesNode?.ColorMapEntry as RawColorMapEntry[]);
    const entries: { color: string; range: [number, number] }[] = [];
    for (const e of raw) {
      if (e["@_transparent"] === "true") continue;
      const range = parseEntryValue(e["@_value"]);
      const rgb = e["@_rgb"];
      if (!range || !rgb) continue;
      entries.push({ color: `rgb(${rgb})`, range });
    }
    if (entries.length > (best?.entries.length ?? 0)) {
      best = { units: String(cm["@_units"] ?? ""), entries };
    }
  }

  if (!best || best.entries.length === 0) return null;

  const { units, entries } = best;
  const min = entries[0].range[0];
  const max = entries[entries.length - 1].range[1];

  // reamostra para no máximo maxStops paradas, preservando extremos
  const stops: LegendStop[] = [];
  const n = Math.min(maxStops, entries.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (entries.length - 1)) / Math.max(n - 1, 1));
    stops.push({ color: entries[idx].color, value: entries[idx].range[0] });
  }

  return { units, min, max, stops };
}
