import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmissionRecord {
  id: string;
  period: string;
  category: string;
  scope: number;
  emission_factor: number;
  emissions: number;
}

export const EmissionsTable = () => {
  const [records, setRecords] = useState<EmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmissionRecords = async () => {
      try {
        console.log('Fetching emission records for table...');
        const { data, error } = await supabase
          .from('emission_records')
          .select(`
            id,
            period,
            emission_factor,
            emissions,
            emission_categories(name, scope)
          `)
          .order('period', { ascending: false });

        if (error) throw error;

        console.log('Emission records for table:', data);

        const formattedRecords = data.map((record: any) => ({
          id: record.id,
          period: new Date(record.period).toLocaleDateString(),
          category: record.emission_categories.name,
          scope: record.emission_categories.scope,
          emission_factor: record.emission_factor,
          emissions: record.emissions,
        }));

        setRecords(formattedRecords);
      } catch (error) {
        console.error('Error fetching emission records:', error);
        toast({
          title: "Erro ao carregar registros",
          description: "Não foi possível carregar os registros de emissões.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmissionRecords();
  }, [toast]);

  if (loading) {
    return (
      <div className="rounded-md border p-4 flex items-center justify-center">
        <div className="text-gray-500">Carregando registros...</div>
      </div>
    );
  }

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
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.period}</TableCell>
              <TableCell>{record.category}</TableCell>
              <TableCell>{record.scope}</TableCell>
              <TableCell>{record.emission_factor}</TableCell>
              <TableCell className="text-right">{record.emissions.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};