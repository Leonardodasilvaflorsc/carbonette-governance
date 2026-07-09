import { GIBS_LAYERS, type DiscoveredLayer } from "@orbital/shared";
import { parseCapabilities, parseColormap } from "@/lib/gibs-discovery";

const CAPABILITIES_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml";
const REVALIDATE_SECONDS = 21600; // 6 h — datas novas aparecem ao longo do dia

// dinâmica (não pré-renderizada no build, que pode estar sem rede) com
// memoização em memória para não reparsear ~6 MB de XML a cada requisição
export const dynamic = "force-dynamic";

interface LayersPayload {
  source: "capabilities" | "fallback";
  layers: DiscoveredLayer[];
}

let cached: { payload: LayersPayload; at: number } | null = null;

function fallbackLayers(): DiscoveredLayer[] {
  return Object.entries(GIBS_LAYERS).map(([key, def]) => ({
    ...def,
    key,
    available: true,
    source: "fallback",
  }));
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Descoberta de camadas GIBS: valida os IDs estáticos contra o
 * WMTSCapabilities real, extrai intervalo de datas e legenda (colormap
 * oficial). Sem rede, degrada para os defaults estáticos — a UI continua
 * funcional e marca a origem como "fallback".
 */
export async function GET() {
  // falhas não são cacheadas: próxima requisição tenta a descoberta de novo
  if (cached && cached.payload.source === "capabilities" && Date.now() - cached.at < REVALIDATE_SECONDS * 1000) {
    return Response.json(cached.payload);
  }
  try {
    const xml = await fetchText(CAPABILITIES_URL);
    const caps = parseCapabilities(xml, Object.values(GIBS_LAYERS).map((l) => l.id));

    const layers: DiscoveredLayer[] = await Promise.all(
      Object.entries(GIBS_LAYERS).map(async ([key, def]) => {
        const entry = caps.get(def.id);
        if (!entry) return { ...def, key, available: false, source: "capabilities" as const };

        let legend;
        if (entry.colormapUrl) {
          try {
            legend = parseColormap(await fetchText(entry.colormapUrl)) ?? undefined;
          } catch {
            legend = undefined; // legenda é progressiva, não bloqueia a camada
          }
        }

        return {
          ...def,
          key,
          available: true,
          startDate: entry.startDate,
          endDate: entry.endDate,
          legend,
          source: "capabilities" as const,
        };
      })
    );

    const payload: LayersPayload = { source: "capabilities", layers };
    cached = { payload, at: Date.now() };
    return Response.json(payload);
  } catch {
    return Response.json({ source: "fallback", layers: fallbackLayers() } satisfies LayersPayload);
  }
}
