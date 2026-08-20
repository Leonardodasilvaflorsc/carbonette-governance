/** Exportação de cenário e resultados: JSON, XLSX e PDF (via impressão). */
import * as XLSX from "xlsx";
import type { Scenario } from "./defaults";
import { FIELDS } from "./fields";
import type { ResultadoCenario, RouteKey } from "./types";
import { GRUPO_LABEL, GRUPO_ORDEM, ROUTE_KEYS, ROUTE_LABEL } from "./types";
import type { BarraTornado, Equilibrio, ResultadoMC } from "./engine/analysis";

export const AVISO_LEGAL =
  "Simulação baseada em premissas fornecidas pelo usuário. Os resultados não constituem garantia de desempenho, recomendação de investimento ou proposta comercial. Valide os parâmetros com fornecedores e com a legislação vigente antes de qualquer decisão.";

/** Resultado de uma tentativa de exportação, para exibição na interface. */
export interface ResultadoExportacao {
  ok: boolean;
  motivo?: string;
}

/**
 * Superfície de salvamento do visualizador de artefatos da claude.ai. Quando a
 * página roda ali, o navegador não permite que ela própria inicie um download:
 * o arquivo precisa ser entregue por esta API, com confirmação do usuário.
 */
interface JanelaComClaude {
  claude?: {
    use?: (nome: string) => Promise<{
      save(r: { filename: string; data: string | Blob | ArrayBuffer }): Promise<unknown>;
    } | null>;
  };
}

async function superficieDeSalvamento() {
  const janela = window as unknown as JanelaComClaude;
  if (!janela.claude?.use) return null;
  try {
    return await janela.claude.use("downloads");
  } catch {
    return null;
  }
}

/** Detecta uma vez se a página está sendo servida pelo visualizador. */
export const rodandoNoVisualizador = async (): Promise<boolean> =>
  (await superficieDeSalvamento()) !== null;

const MOTIVOS: Record<string, string> = {
  declined: "Exportação cancelada.",
  rate_limited: "Já há um download aguardando confirmação. Tente de novo em instantes.",
  too_large: "O arquivo passou do limite de 16 MB desta visualização.",
  rejected_extension:
    "Esta visualização não entrega arquivos deste formato. Exporte o JSON do cenário e gere a planilha na versão local do simulador.",
  extension_not_enabled:
    "Esta visualização não entrega arquivos deste formato. Exporte o JSON do cenário e gere a planilha na versão local do simulador.",
};

async function baixar(conteudo: BlobPart, nome: string, tipo: string): Promise<ResultadoExportacao> {
  const superficie = await superficieDeSalvamento();
  if (superficie) {
    try {
      const dados =
        typeof conteudo === "string" || conteudo instanceof ArrayBuffer
          ? conteudo
          : new Blob([conteudo], { type: tipo });
      await superficie.save({ filename: nome, data: dados });
      return { ok: true };
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? "";
      return { ok: false, motivo: MOTIVOS[codigo] ?? "Não foi possível salvar o arquivo nesta visualização." };
    }
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true };
}

const nomeArquivo = (s: Scenario, ext: string) =>
  `AHS-TCO_${(s.meta.nome || "cenario").replace(/[^\w-]+/g, "-").slice(0, 60)}_${s.meta.data}.${ext}`;

export function exportarJson(s: Scenario): Promise<ResultadoExportacao> {
  return baixar(JSON.stringify(s, null, 2), nomeArquivo(s, "json"), "application/json");
}

export function importarJson(arquivo: File): Promise<Scenario> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        resolve(JSON.parse(String(fr.result)));
      } catch (e) {
        reject(new Error("Arquivo JSON inválido."));
      }
    };
    fr.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    fr.readAsText(arquivo);
  });
}

/** Lista plana de todos os inputs, com rótulo, unidade e valor. */
export function linhasPremissas(s: Scenario): (string | number)[][] {
  const linhas: (string | number)[][] = [["Caminho", "Parâmetro", "Unidade", "Valor", "Fonte / definição"]];
  const percorrer = (obj: Record<string, unknown>, prefixo = "") => {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const p = prefixo ? `${prefixo}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        percorrer(v as Record<string, unknown>, p);
        continue;
      }
      const meta = FIELDS[p];
      linhas.push([
        p,
        meta?.label ?? p,
        meta?.unit ?? "",
        Array.isArray(v) ? v.join(" | ") : typeof v === "boolean" ? (v ? "Sim" : "Não") : (v as string | number),
        meta?.tip ?? "",
      ]);
    }
  };
  percorrer(s as unknown as Record<string, unknown>);
  return linhas;
}

export function exportarXlsx(
  s: Scenario,
  r: ResultadoCenario,
  extras?: { equilibrios?: Equilibrio[]; tornado?: BarraTornado[]; mc?: ResultadoMC | null },
): Promise<ResultadoExportacao> {
  const wb = XLSX.utils.book_new();

  // Resumo executivo
  const resumo: (string | number)[][] = [
    ["AHS TCO Fleet — comparativo de custo total de propriedade"],
    ["Cenário", s.meta.nome],
    ["Autor", s.meta.autor],
    ["Data-base", s.meta.data],
    ["Horizonte (anos)", s.mission.horizonteAnos],
    ["Quilometragem anual (km)", s.mission.kmAno],
    ["Demanda anual (t·km)", Math.round(r.demandaTKmAno)],
    [],
    ["Indicador", ...ROUTE_KEYS.map((k) => ROUTE_LABEL[k])],
    ["TCO por veículo (VPL, R$)", ...ROUTE_KEYS.map((k) => r.rotas[k].tco)],
    ["TCO da frota equivalente (R$)", ...ROUTE_KEYS.map((k) => r.rotas[k].tcoFrota)],
    ["R$/km", ...ROUTE_KEYS.map((k) => r.rotas[k].tcoPorKm)],
    ["R$/t·km", ...ROUTE_KEYS.map((k) => r.rotas[k].tcoPorTKm)],
    ["Custo mensal equivalente (R$)", ...ROUTE_KEYS.map((k) => r.rotas[k].custoMensalEquivalente)],
    ["Frota equivalente (veículos)", ...ROUTE_KEYS.map((k) => r.rotas[k].nVeiculos)],
    ["Carga útil (t)", ...ROUTE_KEYS.map((k) => r.rotas[k].cargaUtilT)],
    ["Disponibilidade (%)", ...ROUTE_KEYS.map((k) => r.rotas[k].disponibilidade * 100)],
    ["Emissões acumuladas (tCO₂e)", ...ROUTE_KEYS.map((k) => r.rotas[k].emissoesTotaisT)],
    ["Emissão específica (gCO₂e/km)", ...ROUTE_KEYS.map((k) => r.rotas[k].emissaoPorKmG)],
    ["MAC vs diesel (R$/tCO₂e)", "—", r.mac.h2 ?? "n/d", r.mac.bev ?? "n/d"],
    ["Payback vs diesel (ano)", "—", r.payback.h2 ?? "não ocorre", r.payback.bev ?? "não ocorre"],
    [],
    ["Rota de menor custo por t·km", ROUTE_LABEL[r.vencedor]],
    [],
    [AVISO_LEGAL],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  // Decomposição por grupo
  const decomp: (string | number)[][] = [["Componente (VPL, R$)", ...ROUTE_KEYS.map((k) => ROUTE_LABEL[k])]];
  for (const g of GRUPO_ORDEM) decomp.push([GRUPO_LABEL[g], ...ROUTE_KEYS.map((k) => r.rotas[k].porGrupo[g])]);
  decomp.push(["TCO total", ...ROUTE_KEYS.map((k) => r.rotas[k].tco)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(decomp), "Decomposicao");

  // Fluxo de caixa por rota
  for (const k of ROUTE_KEYS) {
    const rota = r.rotas[k];
    const aoa: (string | number)[][] = [["Linha", "Grupo", ...r.anos.map((t) => `Ano ${t}`)]];
    for (const l of rota.linhas) aoa.push([l.rotulo, GRUPO_LABEL[l.grupo], ...l.valores]);
    aoa.push(["Fluxo de caixa líquido", "", ...rota.fluxoAnual]);
    aoa.push([]);
    aoa.push(["Quilometragem ajustada", "", ...rota.kmAjustado]);
    aoa.push(["Emissões (tCO₂e)", "", ...rota.emissoesAnuaisT]);
    aoa.push(["Consumo específico", rota.unidadeConsumo, ...rota.consumoEspecifico]);
    aoa.push(["Autonomia (km)", "", ...rota.autonomiaAno]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), `Fluxo ${ROUTE_LABEL[k]}`.slice(0, 31));
  }

  // Carga, disponibilidade e frota
  const operacao: (string | number)[][] = [
    ["Indicador", ...ROUTE_KEYS.map((k) => ROUTE_LABEL[k])],
    ["Massa do sistema de energia (t)", ...ROUTE_KEYS.map((k) => r.rotas[k].massaSistemaEnergiaT)],
    ["Tara total (t)", ...ROUTE_KEYS.map((k) => r.rotas[k].taraTotalT)],
    ["Carga útil (t)", ...ROUTE_KEYS.map((k) => r.rotas[k].cargaUtilT)],
    ["Carga transportada (t)", ...ROUTE_KEYS.map((k) => r.rotas[k].cargaTransportadaT)],
    ["Fator de viagens", ...ROUTE_KEYS.map((k) => r.rotas[k].fatorViagens)],
    ["Horas de abastecimento/recarga por ano", ...ROUTE_KEYS.map((k) => r.rotas[k].horasAbastecimentoAno)],
    ["Horas de manutenção por ano", ...ROUTE_KEYS.map((k) => r.rotas[k].horasManutencaoAno)],
    ["Horas de falha por ano", ...ROUTE_KEYS.map((k) => r.rotas[k].horasFalhaAno)],
    ["Disponibilidade (%)", ...ROUTE_KEYS.map((k) => r.rotas[k].disponibilidade * 100)],
    ["Frota equivalente", ...ROUTE_KEYS.map((k) => r.rotas[k].nVeiculos)],
    ["Eficiência implícita (%)", ...ROUTE_KEYS.map((k) => r.rotas[k].eficienciaImplicita * 100)],
    ["Ano de substituição de bateria/pilha", ...ROUTE_KEYS.map((k) => r.rotas[k].anoSubstituicao || "não ocorre")],
    ["NOx (kg/ano)", ...ROUTE_KEYS.map((k) => r.rotas[k].noxAnualKg)],
    ["Material particulado (kg/ano)", ...ROUTE_KEYS.map((k) => r.rotas[k].mpAnualKg)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(operacao), "Operacao");

  // Auditoria
  const aud: (string | number)[][] = [["Rota", "Grandeza", "Fórmula", "Valores substituídos", "Resultado", "Unidade"]];
  for (const k of ROUTE_KEYS)
    for (const a of r.rotas[k].auditoria)
      aud.push([ROUTE_LABEL[k], a.rotulo, a.formula, a.substituicao, a.resultado, a.unidade]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aud), "Auditoria");

  // Premissas
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhasPremissas(s)), "Premissas");

  if (extras?.equilibrios?.length) {
    const eq: (string | number)[][] = [
      ["Variável", "Unidade", "Par comparado", "Valor atual", "Valor de equilíbrio", "Distância (%)", "Vencedor atual"],
    ];
    for (const e of extras.equilibrios)
      eq.push([
        e.variavel.label,
        e.variavel.unit,
        `${ROUTE_LABEL[e.par[0]]} x ${ROUTE_LABEL[e.par[1]]}`,
        e.atual,
        e.equilibrio ?? "não existe",
        e.distanciaPct ?? "—",
        ROUTE_LABEL[e.vencedorAtual],
      ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eq), "Equilibrio");
  }

  if (extras?.tornado?.length) {
    const tor: (string | number)[][] = [["Variável", "Unidade", "Valor base", "Δ TCO com redução", "Δ TCO com aumento", "Amplitude"]];
    for (const b of extras.tornado) tor.push([b.label, b.unidade, b.valorBase, b.baixo, b.alto, b.amplitude]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tor), "Sensibilidade");
  }

  if (extras?.mc) {
    const m = extras.mc;
    const aoa: (string | number)[][] = [
      ["Iterações", m.iteracoes],
      [],
      ["Rota", "Probabilidade de ser a mais barata (%)", "Probabilidade de superar o diesel (%)", "P10", "P50", "P90", "Média"],
      ...ROUTE_KEYS.map((k) => [
        ROUTE_LABEL[k],
        m.probVitoria[k],
        m.probMelhorQueDiesel[k],
        m.p10[k],
        m.p50[k],
        m.p90[k],
        m.media[k],
      ]),
      [],
      ["Correlação input × resultado", "Rota", "Pearson"],
      ...m.correlacoes.slice(0, 40).map((c) => [c.label, ROUTE_LABEL[c.rota], c.r]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "MonteCarlo");
  }

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return baixar(
    buffer,
    nomeArquivo(s, "xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

/** O PDF é gerado pela impressão do navegador, que preserva os gráficos vetoriais. */
export function exportarPdf() {
  window.print();
}
