"use client";

import dynamic from "next/dynamic";
import Providers from "@/components/Providers";
import AnalysisPanel from "@/components/panels/AnalysisPanel";
import AtlasPanel from "@/components/panels/AtlasPanel";
import ControlPanel from "@/components/panels/ControlPanel";
import FacilityCard from "@/components/panels/FacilityCard";
import Legend from "@/components/panels/Legend";
import SearchBox from "@/components/panels/SearchBox";
import { useGlobeStore } from "@/state/globeStore";

const Globe = dynamic(() => import("@/components/globe/Globe"), { ssr: false });
const CompareGlobes = dynamic(() => import("@/components/globe/CompareGlobes"), { ssr: false });

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBITAL-GHG";

function Workspace() {
  const compare = useGlobeStore((s) => s.compare);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {compare ? <CompareGlobes /> : <Globe />}

      <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between gap-4 p-4">
        <div className="glass-panel pointer-events-auto rounded-md px-4 py-2">
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-text-primary">
            {appName}
          </h1>
          <p className="text-xs text-text-secondary">
            Inteligência orbital de emissões — visão de satélite
          </p>
        </div>
        <div className="pointer-events-auto">
          <SearchBox />
        </div>
      </header>

      <aside className="absolute bottom-32 left-4 top-24 z-10 flex w-72 flex-col gap-3 overflow-y-auto pr-1">
        <ControlPanel />
        {!compare && <AnalysisPanel />}
      </aside>

      <aside className="absolute bottom-10 left-4 z-10">
        <Legend />
      </aside>

      {!compare && (
        <aside className="absolute right-4 top-24 z-10 flex w-80 flex-col gap-3">
          <FacilityCard />
          <AtlasPanel />
        </aside>
      )}
    </main>
  );
}

export default function HomePage() {
  return (
    <Providers>
      <Workspace />
    </Providers>
  );
}
