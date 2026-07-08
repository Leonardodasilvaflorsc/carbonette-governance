import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Cog, Zap, Building2, Gauge, Landmark } from "lucide-react";
import { PlantResults, EquipmentItem } from "@/lib/plant/simulation";

const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const DISCIPLINE_META: Record<
  EquipmentItem["discipline"],
  { label: string; icon: typeof Cog; badge: string }
> = {
  mecânica: { label: "Engenharia Mecânica", icon: Cog, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  elétrica: { label: "Engenharia Elétrica", icon: Zap, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  civil: { label: "Engenharia Civil", icon: Building2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  instrumentação: { label: "Instrumentação e Automação", icon: Gauge, badge: "bg-violet-50 text-violet-700 border-violet-200" },
};

export const PlantEngineeringPanel = ({ results }: { results: PlantResults }) => {
  const r = results;
  const disciplines = ["mecânica", "elétrica", "civil", "instrumentação"] as const;

  return (
    <div className="space-y-4">
      {/* Resumo do reator — datasheet */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cog className="h-4 w-4" />
              Folha de Dados — Reator R-401 (ASME VIII Div. 2 / NR-13 Cat. I)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {(
              [
                ["Pressão de projeto", `${fmt(r.reactorDesign.designPressureBar)} bar g`],
                ["Diâmetro interno", `${fmt(r.reactorDesign.innerDiameterM, 2)} m`],
                ["Comprimento T/T", `${fmt(r.reactorDesign.lengthM, 1)} m`],
                ["Espessura de parede", `${fmt(r.reactorDesign.wallThicknessMm)} mm`],
                ["Massa do casco", `${fmt(r.reactorDesign.shellMassT)} t`],
                ["Leitos catalíticos", `${r.reactorDesign.beds} (radiais)`],
                ["Volume de catalisador", `${fmt(r.reactorDesign.catalystVolumeM3, 1)} m³`],
                ["Temperatura de projeto", `${fmt(r.inputs.reactorTempC + 50)} °C`],
                ["Corrosão admitida", "3 mm"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <p className="text-[11px] text-muted-foreground">{k}</p>
                <p className="font-semibold tabular-nums">{v}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[11px] text-muted-foreground">Material</p>
              <p className="text-xs font-medium">{r.reactorDesign.material}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Landmark className="h-4 w-4" />
              Investimento (Classe 5 — AACE ±40%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold tabular-nums">
              {fmt(r.capexMUSD)}{" "}
              <span className="text-sm font-normal text-muted-foreground">MUSD</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {fmt((r.capexMUSD * 1e6) / (r.inputs.capacityTpd * 365))} USD por t/ano de
              capacidade — inclui EPC, comissionamento e capital de giro inicial.
            </p>
            <p className="text-xs text-muted-foreground">
              Produção anual: <b>{fmt(r.nh3TPerYear / 1000, 1)} kt NH₃</b> (disponibilidade 92%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de equipamentos por disciplina */}
      {disciplines.map((d) => {
        const meta = DISCIPLINE_META[d];
        const items = r.equipment.filter((e) => e.discipline === d);
        if (!items.length) return null;
        return (
          <Card key={d}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <meta.icon className="h-4 w-4" />
                {meta.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">TAG</TableHead>
                    <TableHead>Equipamento / Sistema</TableHead>
                    <TableHead>Especificação</TableHead>
                    <TableHead className="text-right">Dimensionamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((e) => (
                    <TableRow key={e.tag}>
                      <TableCell>
                        <Badge variant="outline" className={meta.badge}>
                          {e.tag}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{e.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.spec}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{e.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Normas aplicáveis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Normas e códigos de projeto aplicáveis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          <p>• ASME VIII Div. 2 — vasos de pressão do loop de síntese</p>
          <p>• API 941 (curvas de Nelson) — ataque por hidrogênio a quente</p>
          <p>• API 620 Anexo R — tanque refrigerado de NH₃</p>
          <p>• NR-13 — caldeiras e vasos de pressão (Brasil)</p>
          <p>• NR-20 — líquidos combustíveis e inflamáveis</p>
          <p>• IEC 61511 / ISA 84 — sistemas instrumentados de segurança (SIL-3)</p>
          <p>• IEC 60079 / ABNT NBR — classificação de áreas (zona 2, IIC T1)</p>
          <p>• ABNT NBR 5419 — proteção contra descargas atmosféricas</p>
          <p>• ABNT NBR 6118 / 6122 — estruturas de concreto e fundações</p>
          <p>• AISC 360 / NBR 8800 — estruturas metálicas (pipe-racks)</p>
          <p>• ANSI/CGA G-2.1 — segurança em amônia anidra</p>
          <p>• ISO 8573 / NBR 12313 — utilidades (ar de instrumento, GN)</p>
        </CardContent>
      </Card>
    </div>
  );
};
