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

// --- token de autenticação (FASE 6) ---
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) window.localStorage.setItem("orbital_token", token);
    else window.localStorage.removeItem("orbital_token");
  }
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: authHeaders() });
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

// --- Análise Quantitativa (FASE 3) ---

export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Aoi {
  id: string;
  name: string;
  geometry: GeoPolygon;
}

export interface AnalyzedPoint {
  date: string;
  value: number | null;
  unit: string;
  qa_fraction: number | null;
  n_obs: number | null;
  background: number | null;
  climatology: number | null;
  zscore: number | null;
  anomaly: boolean;
}

export interface AnalysisJob {
  id: string;
  aoi_id: string;
  params: { gas: string; start: string; end: string };
  status: "pending" | "running" | "done" | "error";
  product: string | null;
  error: string | null;
  result: AnalyzedPoint[];
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(new URL(path, API_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// --- auth e compartilhamento (FASE 6) ---

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
}

export function loginRequest(email: string, password: string) {
  return postJson<{ access_token: string; user: AuthUser }>("/auth/login", { email, password });
}

export function registerRequest(email: string, password: string) {
  return postJson<AuthUser>("/auth/register", { email, password });
}

export interface SharedFacilityView {
  target_type: string;
  facility: Facility;
  plumes: Plume[];
}

export function fetchSharedView(token: string) {
  return getJson<SharedFacilityView>(`/share/${token}`, {});
}

export function createShareLink(facilityId: string, expiresDays = 30) {
  return postJson<{ token: string; path: string }>("/share", {
    target_type: "facility",
    target_id: facilityId,
    expires_days: expiresDays,
  });
}

export function createAoi(name: string, geometry: GeoPolygon) {
  return postJson<Aoi>("/aois", { name, geometry });
}

export function fetchAois() {
  return getJson<Aoi[]>("/aois", {});
}

export function submitAnalysis(aoiId: string, gas: string, start: string, end: string) {
  return postJson<{ job: AnalysisJob; runner: string }>(`/aois/${aoiId}/analyses`, {
    gas,
    start,
    end,
  });
}

export function fetchAnalysis(jobId: string) {
  return getJson<AnalysisJob>(`/analyses/${jobId}`, {});
}

export function analysisExportUrl(jobId: string, format: "csv" | "geojson"): string {
  return new URL(`/analyses/${jobId}/export.${format}`, API_URL).toString();
}

// --- Plumas e fluxo (FASE 4) ---

export interface Plume {
  id: string;
  source: string;
  gas: string;
  lon: number;
  lat: number;
  geometry: GeoPolygon | null;
  /** Fluxo de EMISSÃO — sempre exibir com ± e método. */
  flux_kg_h: number | null;
  flux_uncertainty_kg_h: number | null;
  method: string;
  observed_at: string;
  instrument: string | null;
  facility_id: string | null;
  quicklook_url: string | null;
}

export interface PlumeListResponse {
  source: string;
  count: number;
  plumes: Plume[];
}

export function fetchPlumes(opts: { bbox?: string; gas?: string }) {
  return getJson<PlumeListResponse>("/plumes", opts);
}

export function fetchFacilityPlumes(facilityId: string) {
  return getJson<PlumeListResponse>(`/facilities/${facilityId}/plumes`, {});
}

// --- Dossiê do Emissor (FASE 5) ---

export interface ReportCreated {
  report_id: string;
  trace_hash: string;
  url: string;
}

export async function generateReport(facilityId: string): Promise<ReportCreated> {
  const created = await postJson<ReportCreated>(`/facilities/${facilityId}/report`, {});
  return { ...created, url: new URL(created.url, API_URL).toString() };
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
