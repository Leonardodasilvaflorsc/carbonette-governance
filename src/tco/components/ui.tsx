/** Primitivas de interface do simulador: seções, campos e ajuda contextual. */
import React, { useEffect, useState } from "react";
import { getPath } from "../engine/util";
import { getField } from "../fields";
import { nf } from "../format";
import { useTco } from "../store";
import { AHS } from "../types";

export function Dica({ texto }: { texto: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <span
        className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[#666666] text-[9px] font-bold leading-none text-[#666666]"
        aria-label="Ajuda"
      >
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-72 -translate-x-1/2 rounded border border-[#0D2B55] bg-white p-2 text-[11px] font-normal leading-snug text-[#1A1A1A] shadow-lg group-hover:block">
        {texto}
      </span>
    </span>
  );
}

export function Secao({
  titulo,
  descricao,
  children,
  colunas = 3,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  colunas?: 1 | 2 | 3 | 4;
}) {
  const cls =
    colunas === 1
      ? "grid-cols-1"
      : colunas === 2
        ? "grid-cols-1 md:grid-cols-2"
        : colunas === 4
          ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  return (
    <section className="mb-6 border border-[#E2E2E2] bg-white">
      <header className="border-b border-[#E2E2E2] bg-[#F4F4F4] px-3 py-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#0D2B55]">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-[11px] leading-snug text-[#666666]">{descricao}</p>}
      </header>
      <div className={`grid gap-x-4 gap-y-3 p-3 ${cls}`}>{children}</div>
    </section>
  );
}

const paraNumero = (txt: string): number | null => {
  const limpo = txt.replace(/\./g, "").replace(",", ".").replace(/[^\d.\-eE]/g, "");
  if (limpo === "" || limpo === "-") return null;
  const v = Number(limpo);
  return isFinite(v) ? v : null;
};

/** Campo ligado a um caminho do cenário. Rótulo, unidade, faixa e fonte vêm do registro. */
export function Campo({ path, largura }: { path: string; largura?: "cheia" }) {
  const { scenario, set, sensiveis, alternarSensivel } = useTco();
  const meta = getField(path);
  const valor = getPath<number | string | boolean>(scenario, path);
  const [texto, setTexto] = useState<string>("");
  const [focado, setFocado] = useState(false);

  useEffect(() => {
    if (!focado && typeof valor === "number") setTexto(nf(valor, meta.dec ?? 2));
  }, [valor, focado, meta.dec]);

  const numerico = meta.kind === "num" || meta.kind === "pct" || meta.kind === "money";
  const foraFaixa =
    numerico &&
    typeof valor === "number" &&
    ((meta.min !== undefined && valor < meta.min) || (meta.max !== undefined && valor > meta.max));

  const marcado = sensiveis.includes(path);

  return (
    <div className={largura === "cheia" ? "md:col-span-2 xl:col-span-3" : ""}>
      <label className="mb-1 flex items-start justify-between gap-2 text-[11px] font-medium leading-tight text-[#1A1A1A]">
        <span>
          {meta.label}
          {meta.unit && <span className="ml-1 font-normal text-[#666666]">({meta.unit})</span>}
          <Dica texto={meta.tip} />
        </span>
        {numerico && (
          <button
            type="button"
            title={marcado ? "Remover das variáveis de sensibilidade" : "Marcar como variável de sensibilidade"}
            onClick={() => alternarSensivel(path)}
            className={`shrink-0 text-[13px] leading-none ${marcado ? "text-[#8DC63F]" : "text-[#CCCCCC] hover:text-[#666666]"}`}
          >
            ★
          </button>
        )}
      </label>

      {meta.kind === "bool" ? (
        <button
          type="button"
          onClick={() => set(path, !valor)}
          className={`flex h-8 w-full items-center gap-2 border px-2 text-[12px] ${
            valor ? "border-[#8DC63F] bg-[#F2F9E8] text-[#1A1A1A]" : "border-[#D8D8D8] bg-white text-[#666666]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 border ${valor ? "border-[#8DC63F] bg-[#8DC63F]" : "border-[#AAAAAA] bg-white"}`}
          />
          {valor ? "Sim" : "Não"}
        </button>
      ) : meta.kind === "select" ? (
        <select
          value={String(valor)}
          onChange={(e) => set(path, e.target.value)}
          className="h-8 w-full border border-[#D8D8D8] bg-white px-2 text-[12px] text-[#1A1A1A] focus:border-[#0D2B55] focus:outline-none"
        >
          {meta.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : meta.kind === "text" ? (
        <input
          type="text"
          value={String(valor ?? "")}
          onChange={(e) => set(path, e.target.value)}
          className="h-8 w-full border border-[#D8D8D8] bg-white px-2 text-[12px] text-[#1A1A1A] focus:border-[#0D2B55] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={texto}
          onFocus={(e) => {
            setFocado(true);
            setTexto(typeof valor === "number" ? String(valor).replace(".", ",") : "");
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={() => setFocado(false)}
          onChange={(e) => {
            setTexto(e.target.value);
            const v = paraNumero(e.target.value);
            if (v !== null) set(path, v);
          }}
          className={`h-8 w-full border bg-white px-2 text-right font-mono text-[12px] tabular-nums focus:outline-none ${
            foraFaixa ? "border-[#C0392B] bg-[#FDF3F2]" : "border-[#D8D8D8] focus:border-[#0D2B55]"
          }`}
        />
      )}

      {foraFaixa && (
        <p className="mt-0.5 text-[10px] leading-tight text-[#C0392B]">
          Fora da faixa plausível ({nf(meta.min ?? 0, meta.dec ?? 2)} a {nf(meta.max ?? 0, meta.dec ?? 2)}
          {meta.unit ? ` ${meta.unit}` : ""}). O cálculo prossegue com o valor informado.
        </p>
      )}
    </div>
  );
}

/** Curva editável ponto a ponto (valor residual por ano). */
export function CurvaResidual({ path }: { path: string }) {
  const { scenario, set } = useTco();
  const meta = getField(path);
  const curva = getPath<number[]>(scenario, path);
  const horizonte = scenario.mission.horizonteAnos;
  return (
    <div className="md:col-span-2 xl:col-span-3">
      <label className="mb-1 block text-[11px] font-medium text-[#1A1A1A]">
        {meta.label} (% do preço de aquisição)
        <Dica texto={meta.tip} />
      </label>
      <div className="flex flex-wrap gap-1">
        {curva.map((v, i) => (
          <div key={i} className={`w-16 ${i > horizonte ? "opacity-40" : ""}`}>
            <div className="text-center text-[10px] text-[#666666]">Ano {i}</div>
            <input
              type="text"
              inputMode="decimal"
              value={nf(v, 1)}
              onChange={(e) => {
                const n = paraNumero(e.target.value);
                if (n === null) return;
                const nova = [...curva];
                nova[i] = n;
                set(path, nova);
              }}
              className="h-7 w-full border border-[#D8D8D8] px-1 text-right font-mono text-[11px] tabular-nums focus:border-[#0D2B55] focus:outline-none"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => set(path, [...curva, Math.max(0, curva[curva.length - 1] - 3)])}
          className="mt-4 h-7 border border-[#0D2B55] px-2 text-[11px] text-[#0D2B55]"
        >
          + ano
        </button>
      </div>
    </div>
  );
}

export function Aviso({ nivel, children }: { nivel: "erro" | "aviso" | "info"; children: React.ReactNode }) {
  const cor =
    nivel === "erro"
      ? "border-[#C0392B] bg-[#FDF3F2] text-[#8E2A20]"
      : nivel === "aviso"
        ? "border-[#D9A21B] bg-[#FDF8EC] text-[#7A5A0B]"
        : "border-[#0D2B55] bg-[#EEF2F8] text-[#0D2B55]";
  return <div className={`border-l-4 px-3 py-2 text-[11px] leading-snug ${cor}`}>{children}</div>;
}

export function Cartao({
  titulo,
  valor,
  sub,
  cor,
  destaque,
  onClick,
}: {
  titulo: string;
  valor: string;
  sub?: string;
  cor?: string;
  destaque?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`border bg-white p-3 ${onClick ? "cursor-pointer hover:border-[#0D2B55]" : ""} ${
        destaque ? "border-[#8DC63F] shadow-[inset_0_0_0_1px_#8DC63F]" : "border-[#E2E2E2]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[#666666]">{titulo}</div>
      <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums" style={{ color: cor || AHS.preto }}>
        {valor}
      </div>
      {sub && <div className="mt-0.5 text-[10px] leading-tight text-[#666666]">{sub}</div>}
    </div>
  );
}
