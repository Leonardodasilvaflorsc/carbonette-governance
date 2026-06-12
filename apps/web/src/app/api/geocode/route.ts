import { NextRequest } from "next/server";

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
}

/**
 * Gazetteer mínimo para desenvolvimento offline e degradação graciosa
 * quando o Nominatim está indisponível.
 */
const OFFLINE_GAZETTEER: GeocodeResult[] = [
  { name: "Joinville, Santa Catarina, Brasil", lat: -26.3045, lon: -48.8487, type: "city" },
  { name: "São Paulo, Brasil", lat: -23.5505, lon: -46.6333, type: "city" },
  { name: "Rio de Janeiro, Brasil", lat: -22.9068, lon: -43.1729, type: "city" },
  { name: "Florianópolis, Santa Catarina, Brasil", lat: -27.5954, lon: -48.548, type: "city" },
  { name: "Houston, Texas, EUA", lat: 29.7604, lon: -95.3698, type: "city" },
  { name: "Rotterdam, Países Baixos", lat: 51.9244, lon: 4.4777, type: "city" },
  { name: "Brasil", lat: -14.235, lon: -51.9253, type: "country" },
  { name: "Santa Catarina, Brasil", lat: -27.2423, lon: -50.2189, type: "state" },
];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  addresstype?: string;
  type?: string;
}

/**
 * Proxy de geocodificação: centraliza o User-Agent exigido pela política de
 * uso do Nominatim, cacheia respostas e cai para o gazetteer offline em
 * caso de falha de rede.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ source: "none", results: [] });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "6");
    url.searchParams.set("accept-language", "pt-BR");

    const res = await fetch(url, {
      headers: { "User-Agent": "orbital-ghg/0.1 (plataforma de inteligencia de emissoes)" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const items = (await res.json()) as NominatimItem[];
    const results: GeocodeResult[] = items.map((i) => ({
      name: i.display_name,
      lat: Number(i.lat),
      lon: Number(i.lon),
      type: i.addresstype ?? i.type ?? "place",
    }));
    return Response.json({ source: "nominatim", results });
  } catch {
    const nq = normalize(q);
    const results = OFFLINE_GAZETTEER.filter((p) => normalize(p.name).includes(nq));
    return Response.json({ source: "offline-fallback", results });
  }
}
