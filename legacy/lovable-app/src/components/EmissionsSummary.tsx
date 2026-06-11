import { useEffect, useState } from 'react';
import { StatsCard } from "./StatsCard";
import { Factory, Zap, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmissionSummary {
  scope1: number;
  scope2: number;
  scope3: number;
}

export const EmissionsSummary = () => {
  const [summary, setSummary] = useState<EmissionSummary>({
    scope1: 0,
    scope2: 0,
    scope3: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmissionSummary = async () => {
      try {
        console.log('Fetching emission summary...');
        const { data: records, error } = await supabase
          .from('emission_records')
          .select(`
            emissions,
            emission_categories(scope)
          `);

        if (error) throw error;

        console.log('Emission records for summary:', records);

        const totals = records.reduce((acc: EmissionSummary, record: any) => {
          const scope = record.emission_categories.scope;
          const emissions = Number(record.emissions);

          switch (scope) {
            case 1:
              acc.scope1 += emissions;
              break;
            case 2:
              acc.scope2 += emissions;
              break;
            case 3:
              acc.scope3 += emissions;
              break;
          }

          return acc;
        }, { scope1: 0, scope2: 0, scope3: 0 });

        console.log('Calculated totals:', totals);
        setSummary(totals);
      } catch (error) {
        console.error('Error fetching emission summary:', error);
        toast({
          title: "Erro ao carregar resumo",
          description: "Não foi possível carregar o resumo das emissões.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmissionSummary();
  }, [toast]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatsCard
        title="Escopo 1"
        value={loading ? "..." : `${summary.scope1.toFixed(2)}`}
        description="Toneladas de CO₂e"
        icon={<Factory className="h-4 w-4 text-primary" />}
      />
      <StatsCard
        title="Escopo 2"
        value={loading ? "..." : `${summary.scope2.toFixed(2)}`}
        description="Toneladas de CO₂e"
        icon={<Zap className="h-4 w-4 text-primary" />}
      />
      <StatsCard
        title="Escopo 3"
        value={loading ? "..." : `${summary.scope3.toFixed(2)}`}
        description="Toneladas de CO₂e"
        icon={<Truck className="h-4 w-4 text-primary" />}
      />
    </div>
  );
};