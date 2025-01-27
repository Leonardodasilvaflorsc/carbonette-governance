import { Lightbulb } from "lucide-react";

export const EmissionsInsights = () => {
  return (
    <div className="bg-accent rounded-lg p-4 flex gap-3">
      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">Insights da IA</h3>
        <p className="text-sm text-muted-foreground">
          Você atingiu 70% das metas do mês passado para o Escopo 1. Considere investir em projetos de eficiência energética para melhorar seus resultados.
        </p>
      </div>
    </div>
  );
};