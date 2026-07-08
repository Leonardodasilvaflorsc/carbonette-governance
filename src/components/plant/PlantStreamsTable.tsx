import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GitBranch } from "lucide-react";
import { PlantResults } from "@/lib/plant/simulation";

const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const pct = (v: number) => (v * 100).toFixed(1) + "%";

/** Tabela de correntes do balanço de massa (formato de simulador de processo). */
export const PlantStreamsTable = ({ results }: { results: PlantResults }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-sm">
        <GitBranch className="h-4 w-4" />
        Balanço de Massa — Correntes Principais
      </CardTitle>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Corrente</TableHead>
            <TableHead className="text-right">kmol/h</TableHead>
            <TableHead className="text-right">t/h</TableHead>
            <TableHead className="text-right">Nm³/h</TableHead>
            <TableHead className="text-right">P [bar]</TableHead>
            <TableHead className="text-right">T [°C]</TableHead>
            <TableHead className="text-right">N₂</TableHead>
            <TableHead className="text-right">H₂</TableHead>
            <TableHead className="text-right">NH₃</TableHead>
            <TableHead className="text-right">Inertes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.streams.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.id}</TableCell>
              <TableCell className="text-sm">{s.name}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(s.kmolH)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(s.kgH / 1000, 1)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(s.nm3H)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(s.pressureBar)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(s.tempC)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{pct(s.composition.yN2)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{pct(s.composition.yH2)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{pct(s.composition.yNH3)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{pct(s.composition.yInert)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Composições em fração molar. Conversão global de N₂/H₂ em NH₃:{" "}
        <b>{(results.overallConversion * 100).toFixed(1)}%</b> (perdas pela purga, com
        recuperação de H₂ por membrana/PSA não creditada).
      </p>
    </CardContent>
  </Card>
);
