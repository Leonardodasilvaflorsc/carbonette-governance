import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const data = [
  {
    id: 1,
    period: "Jan 2024",
    category: "Combustão estacionária",
    scope: "Escopo 1",
    emissionFactor: "2.7",
    emissions: "123.45",
  },
  {
    id: 2,
    period: "Jan 2024",
    category: "Energia comprada",
    scope: "Escopo 2",
    emissionFactor: "0.5",
    emissions: "234.56",
  },
  {
    id: 3,
    period: "Jan 2024",
    category: "Transporte",
    scope: "Escopo 3",
    emissionFactor: "1.8",
    emissions: "345.67",
  },
];

export const EmissionsTable = () => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Escopo</TableHead>
            <TableHead>Fator de Emissão</TableHead>
            <TableHead className="text-right">Emissões (t CO₂e)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell>{row.scope}</TableCell>
              <TableCell>{row.emissionFactor}</TableCell>
              <TableCell className="text-right">{row.emissions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};