import { Button } from "./ui/button";
import { Plus, FileText } from "lucide-react";

export const EmissionsActions = () => {
  return (
    <div className="flex justify-end space-x-4">
      <Button variant="outline" className="gap-2">
        <FileText className="h-4 w-4" />
        Gerar Relatório
      </Button>
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        Adicionar Novo Dado
      </Button>
    </div>
  );
};