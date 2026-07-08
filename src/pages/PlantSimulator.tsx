import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Factory, FlaskConical, RefreshCcw, Percent } from "lucide-react";
import {
  DEFAULT_INPUTS,
  PlantInputs,
  simulatePlant,
  H2_SOURCE_INFO,
  FINAL_PRODUCT_INFO,
} from "@/lib/plant/simulation";
import { PlantEconomicsPanel } from "@/components/plant/PlantEconomicsPanel";
import { PlantReport } from "@/components/plant/PlantReport";
import { PlantVirtualTour } from "@/components/plant/PlantVirtualTour";
import { PlantControlPanel } from "@/components/plant/PlantControlPanel";
import { PlantFlowsheet } from "@/components/plant/PlantFlowsheet";
import { Plant3DView } from "@/components/plant/Plant3DView";
import { PlantEnergyPanel } from "@/components/plant/PlantEnergyPanel";
import { PlantEngineeringPanel } from "@/components/plant/PlantEngineeringPanel";
import { PlantChartsPanel } from "@/components/plant/PlantChartsPanel";
import { PlantStreamsTable } from "@/components/plant/PlantStreamsTable";

const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const Kpi = ({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Factory;
  label: string;
  value: string;
  unit: string;
}) => (
  <Card>
    <CardContent className="flex items-center gap-3 py-3">
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">
          {value}{" "}
          <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </CardContent>
  </Card>
);

const PlantSimulator = () => {
  const [inputs, setInputs] = useState<PlantInputs>(DEFAULT_INPUTS);
  const results = useMemo(() => simulatePlant(inputs), [inputs]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">
              Simulador — Planta de Fertilizante Nitrogenado (NH₃)
            </h1>
            <p className="text-sm text-muted-foreground">
              {FINAL_PRODUCT_INFO[inputs.finalProduct].label} · Síntese Haber-Bosch ·{" "}
              {H2_SOURCE_INFO[inputs.h2Source].label} · loop a {inputs.loopPressureBar} bar /{" "}
              {inputs.reactorTempC} °C
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              results.converged
                ? "border-emerald-500 text-emerald-600"
                : "border-red-500 text-red-600"
            }
          >
            {results.converged ? "Balanço convergido" : "Não convergiu — revise parâmetros"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={Factory}
            label={
              inputs.finalProduct === "urea" ? "Produção de ureia" : "Produção de NH₃"
            }
            value={fmt(results.productTPerDay, 0)}
            unit="t/dia"
          />
          <Kpi
            icon={FlaskConical}
            label="Consumo de H₂ / N₂"
            value={`${fmt(results.h2KgH / 1000, 2)} / ${fmt(results.n2KgH / 1000, 1)}`}
            unit="t/h"
          />
          <Kpi
            icon={Percent}
            label="Conversão por passe"
            value={fmt(results.perPassConversion * 100)}
            unit="%"
          />
          <Kpi
            icon={RefreshCcw}
            label="Razão de reciclo"
            value={fmt(results.recycleRatio, 2)}
            unit="mol/mol"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <PlantControlPanel inputs={inputs} onChange={setInputs} />

          <Tabs defaultValue="flowsheet" className="min-w-0">
            <TabsList className="flex w-full flex-wrap justify-start h-auto">
              <TabsTrigger value="flowsheet">Fluxograma</TabsTrigger>
              <TabsTrigger value="3d">Planta 3D</TabsTrigger>
              <TabsTrigger value="tour">Tour Virtual</TabsTrigger>
              <TabsTrigger value="energy">Balanço Energético</TabsTrigger>
              <TabsTrigger value="charts">Curvas de Processo</TabsTrigger>
              <TabsTrigger value="streams">Correntes</TabsTrigger>
              <TabsTrigger value="engineering">Engenharia</TabsTrigger>
              <TabsTrigger value="economics">Economia</TabsTrigger>
              <TabsTrigger value="report">Relatório</TabsTrigger>
            </TabsList>
            <TabsContent value="flowsheet" className="mt-3">
              <PlantFlowsheet results={results} />
            </TabsContent>
            <TabsContent value="3d" className="mt-3">
              <Plant3DView results={results} />
            </TabsContent>
            <TabsContent value="tour" className="mt-3">
              <PlantVirtualTour results={results} />
            </TabsContent>
            <TabsContent value="energy" className="mt-3">
              <PlantEnergyPanel results={results} />
            </TabsContent>
            <TabsContent value="charts" className="mt-3">
              <PlantChartsPanel results={results} />
            </TabsContent>
            <TabsContent value="streams" className="mt-3">
              <PlantStreamsTable results={results} />
            </TabsContent>
            <TabsContent value="engineering" className="mt-3">
              <PlantEngineeringPanel results={results} />
            </TabsContent>
            <TabsContent value="economics" className="mt-3">
              <PlantEconomicsPanel results={results} />
            </TabsContent>
            <TabsContent value="report" className="mt-3">
              <PlantReport results={results} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlantSimulator;
