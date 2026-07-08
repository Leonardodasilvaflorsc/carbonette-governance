import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import {
  PlantInputs,
  H2Source,
  H2_SOURCE_INFO,
} from "@/lib/plant/simulation";

interface Props {
  inputs: PlantInputs;
  onChange: (inputs: PlantInputs) => void;
}

interface SliderRowProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}

const SliderRow = ({
  label,
  unit,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: SliderRowProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs font-semibold tabular-nums">
        {display ? display(value) : value.toLocaleString("pt-BR")} {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
    />
  </div>
);

export const PlantControlPanel = ({ inputs, onChange }: Props) => {
  const set = <K extends keyof PlantInputs>(key: K, value: PlantInputs[K]) =>
    onChange({ ...inputs, [key]: value });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <SlidersHorizontal className="h-4 w-4" />
          Parâmetros de Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Tecnologia de geração de H₂
          </Label>
          <Select
            value={inputs.h2Source}
            onValueChange={(v) => set("h2Source", v as H2Source)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(H2_SOURCE_INFO) as H2Source[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {H2_SOURCE_INFO[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {H2_SOURCE_INFO[inputs.h2Source].note}
          </p>
          {inputs.h2Source !== "smr" ? (
            <Badge variant="outline" className="border-green-500 text-green-600">
              Amônia verde — zero carbono
            </Badge>
          ) : (
            <Badge variant="outline" className="border-gray-400 text-gray-500">
              Amônia cinza — ~1,9 t CO₂/t NH₃
            </Badge>
          )}
        </div>

        <SliderRow
          label="Capacidade de produção"
          unit="t NH₃/dia"
          value={inputs.capacityTpd}
          min={50}
          max={1500}
          step={10}
          onChange={(v) => set("capacityTpd", v)}
        />
        <SliderRow
          label="Pressão do loop de síntese"
          unit="bar"
          value={inputs.loopPressureBar}
          min={80}
          max={350}
          step={5}
          onChange={(v) => set("loopPressureBar", v)}
        />
        <SliderRow
          label="Temperatura do reator"
          unit="°C"
          value={inputs.reactorTempC}
          min={350}
          max={550}
          step={5}
          onChange={(v) => set("reactorTempC", v)}
        />
        <SliderRow
          label="Temperatura do separador"
          unit="°C"
          value={inputs.separatorTempC}
          min={-33}
          max={20}
          step={1}
          onChange={(v) => set("separatorTempC", v)}
        />
        <SliderRow
          label="Purga do reciclo"
          unit="%"
          value={inputs.purgeFraction}
          min={0.005}
          max={0.12}
          step={0.005}
          display={(v) => (v * 100).toFixed(1)}
          onChange={(v) => set("purgeFraction", v)}
        />
        <SliderRow
          label="Aproximação ao equilíbrio"
          unit="%"
          value={inputs.equilibriumApproach}
          min={0.6}
          max={0.95}
          step={0.01}
          display={(v) => (v * 100).toFixed(0)}
          onChange={(v) => set("equilibriumApproach", v)}
        />
        <SliderRow
          label="Tarifa de energia elétrica"
          unit="USD/MWh"
          value={inputs.electricityUSDPerMWh}
          min={15}
          max={150}
          step={1}
          onChange={(v) => set("electricityUSDPerMWh", v)}
        />
      </CardContent>
    </Card>
  );
};
