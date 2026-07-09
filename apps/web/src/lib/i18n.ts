"use client";

import { create } from "zustand";

export type Locale = "pt-BR" | "en";

/**
 * i18n leve da FASE 6: PT-BR primeiro (default e fallback), EN para o
 * chrome da interface. Textos científicos longos (disclaimers) permanecem
 * PT-BR até a passada completa de tradução.
 */
const DICT: Record<string, { "pt-BR": string; en: string }> = {
  "header.subtitle": {
    "pt-BR": "Inteligência orbital de emissões — visão de satélite",
    en: "Orbital emissions intelligence — satellite view",
  },
  "search.placeholder": {
    "pt-BR": "Buscar cidade, região, instalação…",
    en: "Search city, region, facility…",
  },
  "panel.gas": { "pt-BR": "Camada de gás", en: "Gas layer" },
  "panel.base": { "pt-BR": "Base", en: "Base" },
  "panel.date.daily": { "pt-BR": "Data (produto diário)", en: "Date (daily product)" },
  "panel.date.monthly": { "pt-BR": "Data (produto mensal)", en: "Date (monthly product)" },
  "panel.timeline": { "pt-BR": "Timeline", en: "Timeline" },
  "panel.animate": { "pt-BR": "Animar", en: "Play" },
  "panel.pause": { "pt-BR": "Pausar", en: "Pause" },
  "panel.opacity": { "pt-BR": "Opacidade da camada", en: "Layer opacity" },
  "panel.compare": { "pt-BR": "Comparação A/B", en: "A/B compare" },
  "panel.dateA": { "pt-BR": "Data A (referência)", en: "Date A (reference)" },
  "panel.presets": { "pt-BR": "Clusters de emissão", en: "Emission clusters" },
  "atlas.title": { "pt-BR": "Atlas de emissores", en: "Emitters atlas" },
  "atlas.allSectors": { "pt-BR": "Todos os setores", en: "All sectors" },
  "atlas.ranking": {
    "pt-BR": "Top emissores na viewport (t CO₂e/ano)",
    en: "Top emitters in viewport (t CO₂e/yr)",
  },
  "atlas.empty": {
    "pt-BR": "Nenhuma instalação na viewport com os filtros atuais",
    en: "No facilities in viewport with current filters",
  },
  "analysis.title": { "pt-BR": "Análise quantitativa (AOI)", en: "Quantitative analysis (AOI)" },
  "analysis.draw": { "pt-BR": "Desenhar AOI no mapa", en: "Draw AOI on map" },
  "analysis.save": { "pt-BR": "Salvar", en: "Save" },
  "analysis.run": { "pt-BR": "Analisar últimos 12 meses", en: "Analyze last 12 months" },
  "analysis.aoiName": { "pt-BR": "Nome da AOI", en: "AOI name" },
  "analysis.select": { "pt-BR": "Selecionar AOI…", en: "Select AOI…" },
  "facility.dossier": { "pt-BR": "Gerar Dossiê (PDF)", en: "Generate Dossier (PDF)" },
  "facility.generating": { "pt-BR": "Gerando dossiê…", en: "Generating dossier…" },
  "facility.plumes": { "pt-BR": "Plumas detectadas", en: "Detected plumes" },
  "auth.login": { "pt-BR": "Entrar", en: "Sign in" },
  "auth.logout": { "pt-BR": "Sair", en: "Sign out" },
  "share.readOnly": {
    "pt-BR": "Visualização compartilhada · somente leitura",
    en: "Shared view · read-only",
  },
};

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale:
    typeof window !== "undefined" && window.localStorage.getItem("orbital_locale") === "en"
      ? "en"
      : "pt-BR",
  setLocale: (locale) => {
    if (typeof window !== "undefined") window.localStorage.setItem("orbital_locale", locale);
    set({ locale });
  },
}));

export function useT(): (key: string) => string {
  const locale = useLocaleStore((s) => s.locale);
  return (key) => DICT[key]?.[locale] ?? DICT[key]?.["pt-BR"] ?? key;
}
