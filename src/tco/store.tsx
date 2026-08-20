/** Estado global do simulador: cenário, resultado, persistência e auditoria. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cloneScenario, DEFAULT_SCENARIO, type Scenario } from "./defaults";
import { computeScenario } from "./engine";
import { setPath } from "./engine/util";
import { aplicarPreset, PRESETS } from "./presets";
import type { McSpec, ResultadoCenario, RouteKey } from "./types";

const CHAVE_ATUAL = "ahs-tco-cenario-atual";
const CHAVE_LISTA = "ahs-tco-cenarios";

export interface CenarioSalvo {
  id: string;
  nome: string;
  autor: string;
  data: string;
  scenario: Scenario;
}

interface AuditoriaAberta {
  rota: RouteKey;
  filtro?: string;
}

interface Estado {
  scenario: Scenario;
  resultado: ResultadoCenario;
  set: (path: string, valor: unknown) => void;
  substituir: (s: Scenario) => void;
  resetar: () => void;
  usarPreset: (id: string) => void;
  presetAtivo: string | null;
  sensiveis: string[];
  alternarSensivel: (path: string) => void;
  mc: Record<string, McSpec>;
  definirMc: (path: string, spec: McSpec | null) => void;
  salvos: CenarioSalvo[];
  salvar: (nome: string) => void;
  carregar: (id: string) => void;
  excluir: (id: string) => void;
  auditoria: AuditoriaAberta | null;
  abrirAuditoria: (rota: RouteKey, filtro?: string) => void;
  fecharAuditoria: () => void;
}

const Ctx = createContext<Estado | null>(null);

function lerAtual(): Scenario {
  try {
    const bruto = localStorage.getItem(CHAVE_ATUAL);
    if (bruto) {
      // Mescla com o default para tolerar cenários salvos antes de novos campos.
      const salvo = JSON.parse(bruto);
      return mesclar(cloneScenario(DEFAULT_SCENARIO), salvo) as Scenario;
    }
  } catch {
    /* cenário corrompido: volta ao padrão */
  }
  return cloneScenario(DEFAULT_SCENARIO);
}

/**
 * Mescla um cenário salvo sobre o padrão vigente. Campos ausentes no arquivo
 * — porque foram criados depois — mantêm o default, e o cenário continua
 * carregável mesmo após a evolução do modelo.
 */
function mesclar(base: unknown, novo: unknown): unknown {
  if (novo === null || novo === undefined) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) return novo;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(novo as Record<string, unknown>)) {
    out[k] = mesclar((base as Record<string, unknown>)[k], (novo as Record<string, unknown>)[k]);
  }
  return out;
}

export function TcoProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(lerAtual);
  const [presetAtivo, setPresetAtivo] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<CenarioSalvo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_LISTA) || "[]");
    } catch {
      return [];
    }
  });
  const [auditoria, setAuditoria] = useState<AuditoriaAberta | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(CHAVE_ATUAL, JSON.stringify(scenario));
      } catch {
        /* armazenamento indisponível — o cenário continua em memória */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [scenario]);

  const resultado = useMemo(() => computeScenario(scenario), [scenario]);

  const set = useCallback((path: string, valor: unknown) => {
    setScenario((s) => setPath(s, path, valor));
    setPresetAtivo(null);
  }, []);

  const alternarSensivel = useCallback((path: string) => {
    setScenario((s) => {
      const atual = s.meta.sensiveis || [];
      const nova = atual.includes(path) ? atual.filter((p) => p !== path) : [...atual, path];
      return setPath(s, "meta.sensiveis", nova);
    });
  }, []);

  const definirMc = useCallback((path: string, spec: McSpec | null) => {
    setScenario((s) => {
      const atual = { ...(s.meta.mc || {}) };
      if (spec) atual[path] = spec;
      else delete atual[path];
      return setPath(s, "meta.mc", atual);
    });
  }, []);

  const persistirLista = (lista: CenarioSalvo[]) => {
    setSalvos(lista);
    try {
      localStorage.setItem(CHAVE_LISTA, JSON.stringify(lista));
    } catch {
      /* ignora limite de armazenamento */
    }
  };

  const valor: Estado = {
    scenario,
    resultado,
    set,
    substituir: (s) => {
      setScenario(mesclar(cloneScenario(DEFAULT_SCENARIO), s) as Scenario);
      setPresetAtivo(null);
    },
    resetar: () => {
      setScenario(cloneScenario(DEFAULT_SCENARIO));
      setPresetAtivo(null);
    },
    usarPreset: (id) => {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      setScenario(aplicarPreset(p));
      setPresetAtivo(id);
    },
    presetAtivo,
    sensiveis: scenario.meta.sensiveis || [],
    alternarSensivel,
    mc: scenario.meta.mc || {},
    definirMc,
    salvos,
    salvar: (nome) => {
      const item: CenarioSalvo = {
        id: `${Date.now()}`,
        nome: nome || scenario.meta.nome,
        autor: scenario.meta.autor,
        data: new Date().toISOString(),
        scenario,
      };
      persistirLista([item, ...salvos].slice(0, 30));
    },
    carregar: (id) => {
      const item = salvos.find((s) => s.id === id);
      if (item) {
        setScenario(mesclar(cloneScenario(DEFAULT_SCENARIO), item.scenario) as Scenario);
        setPresetAtivo(null);
      }
    },
    excluir: (id) => persistirLista(salvos.filter((s) => s.id !== id)),
    auditoria,
    abrirAuditoria: (rota, filtro) => setAuditoria({ rota, filtro }),
    fecharAuditoria: () => setAuditoria(null),
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useTco(): Estado {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTco precisa estar dentro de TcoProvider");
  return c;
}
