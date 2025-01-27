import { HelpCircle, Bell, User } from "lucide-react";
import { Button } from "./ui/button";

export const EmissionsHeader = () => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Emissões</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
            <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
            <Bell className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
            <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <p className="text-sm md:text-base text-muted-foreground">
        Acompanhe aqui as emissões de CO₂ por escopo, visualize tendências e gerencie o inventário atualizado.
      </p>
    </div>
  );
};