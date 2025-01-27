import { Lightbulb } from "lucide-react";

export const EmissionsInsights = () => {
  return (
    <div className="bg-accent rounded-lg p-3 md:p-4 flex gap-2 md:gap-3">
      <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-1" />
      <div className="space-y-1">
        <h3 className="font-medium text-sm md:text-base text-foreground">Insights da IA</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          Você atingiu 70% das metas do mês passado para o Escopo 1. Considere investir em projetos de eficiência energética para melhorar seus resultados.
        </p>
      </div>
    </div>
  );
};