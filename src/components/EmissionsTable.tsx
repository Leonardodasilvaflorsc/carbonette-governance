import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Período</TableHead>
            {!isMobile && <TableHead className="whitespace-nowrap">Categoria</TableHead>}
            <TableHead className="whitespace-nowrap">Escopo</TableHead>
            {!isMobile && <TableHead className="whitespace-nowrap">Fator de Emissão</TableHead>}
            <TableHead className="text-right whitespace-nowrap">Emissões (t CO₂e)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">{row.period}</TableCell>
              {!isMobile && <TableCell>{row.category}</TableCell>}
              <TableCell className="whitespace-nowrap">{row.scope}</TableCell>
              {!isMobile && <TableCell>{row.emissionFactor}</TableCell>}
              <TableCell className="text-right whitespace-nowrap">{row.emissions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};