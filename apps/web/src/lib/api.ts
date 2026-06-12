/** Cliente da API FastAPI (Trilho B). */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Facility {
  id: string;
  name: string;
  sector: string;
  country: string;
  lon: number;
  lat: number;
  ref_year: number;
  /** t/ano por gás — inventário, NUNCA concentração. */
  emissions: Record<string, number>;
  co2e_t: number | null;
  data_source: string;
}

export interface FacilityListResponse {
  source: "db" | "mock";
  count: number;
  facilities: Facility[];
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export function fetchFacilities(opts: { bbox?: string; sector?: string; limit?: number }) {
  return getJson<FacilityListResponse>("/facilities", { ...opts, limit: opts.limit ?? 2000 });
}

export function fetchRanking(opts: { bbox?: string; sector?: string; limit?: number }) {
  return getJson<FacilityListResponse>("/facilities/ranking", { ...opts, limit: opts.limit ?? 20 });
}

export function fetchSectors() {
  return getJson<{ sectors: string[] }>("/facilities/sectors", {});
}

/** Rótulos PT-BR para os setores do Climate TRACE usados na UI. */
export const SECTOR_LABELS: Record<string, string> = {
  steel: "Siderurgia e fundição",
  cement: "Cimento",
  power: "Geração de energia",
  "solid-waste-disposal": "Aterros e resíduos",
  "oil-and-gas-production": "O&G — produção",
  "oil-and-gas-transport": "O&G — transporte",
  "oil-and-gas-refining": "O&G — refino",
  manufacturing: "Manufatura",
  "food-beverage-tobacco": "Agroindústria e alimentos",
  aluminum: "Alumínio",
  chemicals: "Química",
};

export function sectorLabel(sector: string): string {
  return SECTOR_LABELS[sector] ?? sector;
}

/** Formata t CO₂e/ano de forma compacta (pt-BR). */
export function formatTons(t: number | null): string {
  if (t === null) return "—";
  if (t >= 1_000_000) return `${(t / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Mt`;
  if (t >= 1_000) return `${(t / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kt`;
  return `${t.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} t`;
}
