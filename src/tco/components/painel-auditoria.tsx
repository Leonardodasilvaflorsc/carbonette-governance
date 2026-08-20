/** Painel lateral de auditoria: fórmula aplicada e valores substituídos. */
import React from "react";
import { nf } from "../format";
import { useTco } from "../store";
import { GRUPO_LABEL, ROUTE_COLOR, ROUTE_LABEL } from "../types";

export function PainelAuditoria() {
  const { auditoria, fecharAuditoria, resultado } = useTco();
  if (!auditoria) return null;
  const rota = resultado.rotas[auditoria.rota];
  const entradas = auditoria.filtro
    ? rota.auditoria.filter((a) => a.rotulo.toLowerCase().includes(auditoria.filtro!.toLowerCase()))
    : rota.auditoria;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 print:hidden" onClick={fecharAuditoria}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E2E2] bg-[#0D2B55] px-4 py-3 text-white">
          <div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">Auditoria do cálculo</div>
            <div className="text-[15px] font-semibold">{ROUTE_LABEL[auditoria.rota]}</div>
          </div>
          <button onClick={fecharAuditoria} className="border border-white/50 px-3 py-1 text-[12px] hover:bg-white/10">
            Fechar
          </button>
        </header>

        <div className="p-4">
          <p className="mb-4 text-[11px] leading-snug text-[#666666]">
            Cada linha mostra a fórmula aplicada, os valores efetivamente substituídos e o resultado. Os números
            correspondem ao primeiro ano operacional, exceto quando a grandeza é anualizada ou de horizonte inteiro.
          </p>

          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {entradas.map((a, i) => (
                <tr key={i} className="border-b border-[#EEEEEE] align-top">
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-[#0D2B55]">{a.rotulo}</div>
                    <div className="mt-0.5 font-mono text-[10px] leading-snug text-[#666666]">{a.formula}</div>
                    <div className="mt-0.5 font-mono text-[10px] leading-snug text-[#1A1A1A]">= {a.substituicao}</div>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <div className="font-mono text-[13px] font-semibold tabular-nums">
                      {nf(a.resultado, Math.abs(a.resultado) < 10 ? 3 : 0)}
                    </div>
                    <div className="text-[10px] text-[#666666]">{a.unidade}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-[#0D2B55]">
            Linhas do fluxo de caixa
          </h4>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#F4F4F4] text-[#0D2B55]">
                <th className="p-1.5 text-left font-medium">Linha</th>
                <th className="p-1.5 text-left font-medium">Componente</th>
                <th className="p-1.5 text-right font-medium">Ano 1</th>
                <th className="p-1.5 text-right font-medium">Total do horizonte</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-[#EEEEEE] [&_td]:p-1.5">
              {rota.linhas.map((l) => (
                <tr key={l.chave}>
                  <td>{l.rotulo}</td>
                  <td className="text-[#666666]">{GRUPO_LABEL[l.grupo]}</td>
                  <td className="text-right font-mono tabular-nums">{nf(l.valores[1] || 0, 0)}</td>
                  <td className="text-right font-mono tabular-nums">
                    {nf(l.valores.reduce((a, b) => a + b, 0), 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rota.alertas.length > 0 && (
            <>
              <h4 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-[#0D2B55]">
                Verificações de consistência
              </h4>
              <ul className="space-y-1 text-[11px] leading-snug">
                {rota.alertas.map((a, i) => (
                  <li key={i} className="border-l-2 pl-2" style={{ borderColor: ROUTE_COLOR[auditoria.rota] }}>
                    {a.texto}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
