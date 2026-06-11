import dynamic from "next/dynamic";

const Globe = dynamic(() => import("@/components/globe/Globe"), { ssr: false });

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBITAL-GHG";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Globe />
      <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-center justify-between p-4">
        <div className="glass-panel pointer-events-auto rounded-md px-4 py-2">
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-text-primary">
            {appName}
          </h1>
          <p className="text-xs text-text-secondary">
            Inteligência orbital de emissões — visão de satélite
          </p>
        </div>
      </header>
    </main>
  );
}
