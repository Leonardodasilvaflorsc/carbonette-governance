/**
 * Logotipo AHS. O arquivo `ahs-logo.png` deve ser colocado em `public/`.
 * Enquanto ele não existir, é exibida uma marca textual com a mesma altura,
 * para que o cabeçalho e o rodapé dos relatórios não quebrem.
 */
import React, { useState } from "react";

export function LogoAhs({ altura = 32 }: { altura?: number }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return (
      <span
        className="inline-flex select-none items-center justify-center border-2 border-[#8DC63F] bg-[#0D2B55] px-2 font-bold tracking-[0.18em] text-white"
        style={{ height: altura, fontSize: altura * 0.42 }}
        aria-label="AHS"
      >
        AHS
      </span>
    );
  }
  return (
    <img
      src="/ahs-logo.png"
      alt="AHS"
      style={{ height: altura }}
      className="w-auto object-contain"
      onError={() => setFalhou(true)}
    />
  );
}
