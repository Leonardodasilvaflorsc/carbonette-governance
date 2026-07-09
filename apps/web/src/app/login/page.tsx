"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerRequest } from "@/lib/api";
import { useAuthStore } from "@/state/authStore";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBITAL-GHG";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (bootstrap: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (bootstrap) await registerRequest(email, password);
      await login(email, password);
      router.push("/");
    } catch {
      setError(
        bootstrap
          ? "Falha ao criar conta (já existe um admin? peça acesso a ele)."
          : "Credenciais inválidas."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="glass-panel w-96 rounded-md p-6">
        <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-text-primary">
          {appName}
        </h1>
        <p className="mb-5 text-xs text-text-secondary">Acesso à plataforma</p>

        <label className="mb-1 block text-xs text-text-secondary" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-white/10 bg-transparent px-3 py-2 text-sm text-text-primary focus:border-accent-teal focus:outline-none"
        />
        <label className="mb-1 block text-xs text-text-secondary" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-white/10 bg-transparent px-3 py-2 text-sm text-text-primary focus:border-accent-teal focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-alert-red">{error}</p>}

        <button
          onClick={() => submit(false)}
          disabled={busy || !email || password.length < 8}
          className="mb-2 w-full rounded border border-accent-teal px-3 py-2 text-sm font-medium text-accent-teal hover:bg-accent-teal/10 disabled:opacity-40"
        >
          Entrar
        </button>
        <button
          onClick={() => submit(true)}
          disabled={busy || !email || password.length < 8}
          className="w-full rounded border border-white/10 px-3 py-2 text-xs text-text-secondary hover:border-white/30 hover:text-text-primary disabled:opacity-40"
        >
          Primeiro acesso — criar conta admin
        </button>
        <p className="mt-3 text-[10px] text-text-secondary">
          Senha mínima de 8 caracteres. O primeiro usuário do sistema torna-se administrador;
          os demais são criados pelo admin com papel analista ou cliente (somente leitura).
        </p>
      </div>
    </main>
  );
}
