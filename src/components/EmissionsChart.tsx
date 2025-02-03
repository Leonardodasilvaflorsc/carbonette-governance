import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmissionData {
  name: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

export const EmissionsChart = () => {
  const [data, setData] = useState<EmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmissionData = async () => {
      try {
        console.log('Fetching emission records...');
        const { data: records, error } = await supabase
          .from('emission_records')
          .select(`
            *,
            emission_categories(scope)
          `)
          .order('period');

        if (error) throw error;

        console.log('Emission records:', records);

        // Processar os dados para o formato necessário para o gráfico
        const processedData = records.reduce((acc: { [key: string]: EmissionData }, record: any) => {
          const month = new Date(record.period).toLocaleString('default', { month: 'short' });
          
          if (!acc[month]) {
            acc[month] = {
              name: month,
              scope1: 0,
              scope2: 0,
              scope3: 0
            };
          }

          const scope = record.emission_categories.scope;
          switch (scope) {
            case 1:
              acc[month].scope1 += Number(record.emissions);
              break;
            case 2:
              acc[month].scope2 += Number(record.emissions);
              break;
            case 3:
              acc[month].scope3 += Number(record.emissions);
              break;
          }

          return acc;
        }, {});

        const chartData = Object.values(processedData);
        console.log('Processed chart data:', chartData);
        setData(chartData);
      } catch (error) {
        console.error('Error fetching emission data:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados de emissões.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmissionData();
  }, [toast]);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex items-center justify-center">
        <div className="text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Emissões por Escopo</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="scope1" name="Escopo 1" fill="#2D5A27" />
          <Bar dataKey="scope2" name="Escopo 2" fill="#1B4965" />
          <Bar dataKey="scope3" name="Escopo 3" fill="#81C784" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};