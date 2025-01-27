import { StatsCard } from "./StatsCard";
import { Factory, Zap, Truck } from "lucide-react";

export const EmissionsSummary = () => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <StatsCard
        title="Escopo 1"
        value="1,234"
        description="Toneladas de CO₂e"
        icon={<Factory className="h-4 w-4 text-primary" />}
      />
      <StatsCard
        title="Escopo 2"
        value="2,345"
        description="Toneladas de CO₂e"
        icon={<Zap className="h-4 w-4 text-primary" />}
      />
      <StatsCard
        title="Escopo 3"
        value="3,456"
        description="Toneladas de CO₂e"
        icon={<Truck className="h-4 w-4 text-primary" />}
      />
    </div>
  );
};