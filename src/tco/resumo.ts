/** Geração das frases do sumário executivo a partir dos próprios resultados. */
import type { Scenario } from "./defaults";
import { nf, moeda, pct } from "./format";
import type { ResultadoCenario, RouteKey } from "./types";
import { GRUPO_LABEL, GRUPO_ORDEM, ROUTE_KEYS, ROUTE_LABEL } from "./types";

/** Uma frase objetiva dizendo qual rota vence e por quê. */
export function fraseVencedor(r: ResultadoCenario): string {
  const v = r.vencedor;
  const outras = ROUTE_KEYS.filter((k) => k !== v).sort((a, b) => r.rotas[a].tcoPorTKm - r.rotas[b].tcoPorTKm);
  const segunda = outras[0];
  const margem =
    ((r.rotas[segunda].tcoPorTKm - r.rotas[v].tcoPorTKm) / r.rotas[segunda].tcoPorTKm) * 100;

  // Componente que mais separa a vencedora da segunda colocada.
  let maiorGrupo = GRUPO_ORDEM[0];
  let maiorDelta = 0;
  for (const g of GRUPO_ORDEM) {
    const d = r.rotas[segunda].porGrupo[g] - r.rotas[v].porGrupo[g];
    if (d > maiorDelta) {
      maiorDelta = d;
      maiorGrupo = g;
    }
  }
  return `${ROUTE_LABEL[v]} tem o menor custo por tonelada-quilômetro (${nf(r.rotas[v].tcoPorTKm, 4)} R$/t·km), ${nf(margem, 1)}% abaixo de ${ROUTE_LABEL[segunda]}, e a maior diferença vem de ${GRUPO_LABEL[maiorGrupo].toLowerCase()} (${moeda(maiorDelta)} de vantagem em VPL).`;
}

export function sumarioExecutivo(s: Scenario, r: ResultadoCenario): string[] {
  const p: string[] = [];
  const v = r.vencedor;
  p.push(
    `Missão analisada: ${nf(s.mission.kmAno, 0)} km por ano, ${nf(r.cargaAlvoT, 1)} t de carga-alvo por viagem e ${nf(r.demandaTKmAno, 0)} t·km produtivas por ano, ao longo de ${s.mission.horizonteAnos} anos, com taxa de desconto real de ${nf(s.econ.wacc, 2)}% a.a.`,
  );
  p.push(fraseVencedor(r));

  const alt = ROUTE_KEYS.filter((k) => k !== "diesel") as RouteKey[];
  for (const k of alt) {
    const delta = r.rotas[k].tco - r.rotas.diesel.tco;
    const evitadas = r.rotas.diesel.emissoesTotaisT - r.rotas[k].emissoesTotaisT;
    const mac = r.mac[k];
    if (mac === null) {
      p.push(`${ROUTE_LABEL[k]}: diferença de ${moeda(delta)} em VPL contra o diesel, sem diferença de emissões que permita calcular o custo de abatimento.`);
    } else if (mac < 0) {
      p.push(
        `${ROUTE_LABEL[k]}: abatimento com ganho econômico. Evita ${nf(evitadas, 1)} tCO₂e no horizonte e ainda reduz o TCO em ${moeda(-delta)}, o que corresponde a ${nf(mac, 0)} R$/tCO₂e.`,
      );
    } else {
      p.push(
        `${ROUTE_LABEL[k]}: evita ${nf(evitadas, 1)} tCO₂e no horizonte a um custo adicional de ${moeda(delta)} em VPL, ou ${nf(mac, 0)} R$/tCO₂e de custo marginal de abatimento.`,
      );
    }
  }

  // Carga útil e frota equivalente costumam decidir a comparação.
  const perdas = alt
    .map((k) => ({ k, perda: r.rotas.diesel.cargaUtilT - r.rotas[k].cargaUtilT }))
    .filter((x) => x.perda > 0.05);
  if (perdas.length) {
    p.push(
      `Penalidade de payload: ${perdas
        .map((x) => `${ROUTE_LABEL[x.k]} perde ${nf(x.perda, 2)} t de carga útil`)
        .join(" e ")} em relação ao diesel, o que exige mais viagens para mover a mesma tonelagem.`,
    );
  }
  const frotas = ROUTE_KEYS.map((k) => r.rotas[k].nVeiculos);
  if (Math.max(...frotas) > Math.min(...frotas)) {
    p.push(
      `Frota equivalente: ${ROUTE_KEYS.map((k) => `${ROUTE_LABEL[k]} ${r.rotas[k].nVeiculos}`).join(", ")} veículos para atender à mesma demanda, considerando as disponibilidades calculadas.`,
    );
  }

  const sub = alt.filter((k) => r.rotas[k].anoSubstituicao > 0);
  for (const k of sub) p.push(`${ROUTE_LABEL[k]}: ${r.rotas[k].detalheSubstituicao}`);

  if (s.carbono.cenarioCarbono === "zero") {
    p.push(
      "O cenário atual não precifica carbono. A aba de ponto de equilíbrio informa o preço por tonelada necessário para inverter a decisão.",
    );
  }
  return p;
}
