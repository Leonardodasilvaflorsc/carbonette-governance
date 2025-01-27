import { HelpCircle, Bell, User } from "lucide-react";
import { Button } from "./ui/button";

export const EmissionsHeader = () => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Emissões</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        Acompanhe aqui as emissões de CO₂ por escopo, visualize tendências e gerencie o inventário atualizado.
      </p>
    </div>
  );
};