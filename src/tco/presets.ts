/**
 * Cenários pré-carregados. Cada preset é um conjunto de sobreposições sobre o
 * cenário padrão — assim qualquer melhoria nos defaults se propaga a todos.
 */
import { cloneScenario, DEFAULT_SCENARIO, type Scenario } from "./defaults";
import { setPathMut } from "./engine/util";

export interface Preset {
  id: string;
  nome: string;
  descricao: string;
  overrides: Record<string, number | string | boolean>;
}

export const PRESETS: Preset[] = [
  {
    id: "longa",
    nome: "Longa distância",
    descricao:
      "Cavalo mecânico rodoviário, 130.000 km/ano, 40 t de PBTC, trechos longos entre bases e alta exigência de autonomia.",
    overrides: {
      "meta.nome": "Longa distância — 130.000 km/ano",
      "mission.kmAno": 130000,
      "mission.perfilUrbanoPct": 5,
      "mission.perfilRegionalPct": 15,
      "mission.perfilRodoviarioPct": 80,
      "mission.distanciaMediaViagemKm": 900,
      "mission.distanciaMaxEntrePontosKm": 500,
      "mission.velocidadeMediaKmH": 55,
      "mission.horasOperacaoDia": 12,
      "mission.cargaUtilMediaT": 26,
      "mission.retornoVazioPct": 20,
      "diesel.configuracao": "4x2",
      "diesel.pbtcT": 40,
      "h2.pbtcT": 40,
      "bev.pbtcT": 40,
      "diesel.taraBaseT": 12.5,
      "h2.taraBaseT": 12.0,
      "bev.taraBaseT": 11.8,
      "bev.pctRecargaPublica": 30,
      "bev.pctRecargaForaJanela": 40,
      "h2.capacidadeH2Kg": 70,
    },
  },
  {
    id: "regional",
    nome: "Regional / distribuição pesada",
    descricao:
      "70.000 km/ano com retorno diário à base, rota mista e janela noturna livre para recarga ou abastecimento.",
    overrides: {
      "meta.nome": "Regional / distribuição pesada — 70.000 km/ano",
      "mission.kmAno": 70000,
      "mission.perfilUrbanoPct": 20,
      "mission.perfilRegionalPct": 60,
      "mission.perfilRodoviarioPct": 20,
      "mission.distanciaMediaViagemKm": 220,
      "mission.distanciaMaxEntrePontosKm": 220,
      "mission.velocidadeMediaKmH": 40,
      "mission.horasOperacaoDia": 10,
      "mission.cargaUtilMediaT": 20,
      "mission.retornoVazioPct": 35,
      "bev.pctRecargaPublica": 5,
      "bev.pctRecargaForaJanela": 90,
      "bev.capacidadeKWh": 450,
      "h2.capacidadeH2Kg": 50,
    },
  },
  {
    id: "urbano",
    nome: "Urbano / última milha pesada",
    descricao:
      "40.000 km/ano com muitas paradas, elevado ganho regenerativo e operação em zona urbana de baixa emissão.",
    overrides: {
      "meta.nome": "Urbano / última milha pesada — 40.000 km/ano",
      "mission.kmAno": 40000,
      "mission.perfilUrbanoPct": 80,
      "mission.perfilRegionalPct": 20,
      "mission.perfilRodoviarioPct": 0,
      "mission.distanciaMediaViagemKm": 90,
      "mission.distanciaMaxEntrePontosKm": 120,
      "mission.velocidadeMediaKmH": 22,
      "mission.horasOperacaoDia": 9,
      "mission.cargaUtilMediaT": 12,
      "mission.retornoVazioPct": 45,
      "diesel.pctMarchaLenta": 25,
      "bev.regenUrbanoPct": 22,
      "bev.regenRegionalPct": 12,
      "bev.capacidadeKWh": 350,
      "bev.pctRecargaForaJanela": 95,
      "bev.pctRecargaPublica": 0,
      "h2.capacidadeH2Kg": 35,
      "diesel.zonaRestritaPctRotas": 40,
      "diesel.zonaRestritaCustoPct": 8,
      "carbono.cenarioCarbono": "sbce",
    },
  },
  {
    id: "mineracao",
    nome: "Mineração / fora de estrada",
    descricao:
      "Alta carga, baixa velocidade, topografia severa e abastecimento em base própria, sem dependência de rede pública.",
    overrides: {
      "meta.nome": "Mineração / fora de estrada",
      "mission.kmAno": 60000,
      "mission.perfilUrbanoPct": 0,
      "mission.perfilRegionalPct": 100,
      "mission.perfilRodoviarioPct": 0,
      "mission.topoPlanoPct": 10,
      "mission.topoOnduladoPct": 30,
      "mission.topoMontanhosoPct": 60,
      "mission.distanciaMediaViagemKm": 60,
      "mission.distanciaMaxEntrePontosKm": 80,
      "mission.velocidadeMediaKmH": 25,
      "mission.horasOperacaoDia": 20,
      "mission.jornadasDia": 1,
      "mission.diasOperacionaisAno": 340,
      "mission.cargaUtilMediaT": 32,
      "mission.fatorOcupacaoPct": 95,
      "mission.retornoVazioPct": 50,
      "diesel.pbtcT": 57,
      "h2.pbtcT": 57,
      "bev.pbtcT": 57,
      "diesel.usarBasePropria": true,
      "diesel.pctMarchaLenta": 20,
      "bev.pctRecargaPublica": 0,
      "bev.pctRecargaForaJanela": 30,
      "bev.capacidadeKWh": 600,
      "h2.modoSuprimento": "B",
      "h2.capacidadeH2Kg": 70,
      "comuns.custoDiaParado": 6000,
    },
  },
];

export function aplicarPreset(preset: Preset): Scenario {
  const s = cloneScenario(DEFAULT_SCENARIO);
  for (const [path, value] of Object.entries(preset.overrides)) setPathMut(s, path, value);
  return s;
}
