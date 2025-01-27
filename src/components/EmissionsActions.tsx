import { Button } from "./ui/button";
import { Plus, FileText } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

export const EmissionsActions = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
      <Button variant="outline" className="gap-2 w-full sm:w-auto">
        <FileText className="h-4 w-4" />
        {isMobile ? "Relatório" : "Gerar Relatório"}
      </Button>
      <Button className="gap-2 w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        {isMobile ? "Novo" : "Adicionar Novo Dado"}
      </Button>
    </div>
  );
};