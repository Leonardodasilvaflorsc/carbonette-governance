import { useState } from "react";
import { Button } from "./ui/button";
import { Plus, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const EmissionsActions = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleClearEmissions = async () => {
    try {
      console.log('Iniciando limpeza dos registros de emissões...');
      setIsDeleting(true);

      // Delete all emission records for the current user's company
      // RLS policies will ensure only records belonging to the user's company are deleted
      const { error } = await supabase
        .from('emission_records')
        .delete()
        .is('id', 'is not null'); // This will match all records while maintaining proper UUID type checking

      if (error) throw error;

      console.log('Registros deletados com sucesso');
      toast({
        title: "Registros Limpos",
        description: "Todos os registros de emissões foram removidos com sucesso.",
      });

      // Força um refresh da página para atualizar os gráficos e tabelas
      window.location.reload();
    } catch (error) {
      console.error('Erro ao limpar registros:', error);
      toast({
        title: "Erro ao Limpar Registros",
        description: "Não foi possível limpar os registros de emissões.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar Registros
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Registros de Emissões</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente todos os registros de emissões.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearEmissions}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Limpando..." : "Sim, limpar registros"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};