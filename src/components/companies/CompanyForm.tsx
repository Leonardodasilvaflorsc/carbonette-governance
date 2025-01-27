import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CompanyForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("companies")
        .insert([{ name }]);

      if (error) throw error;

      toast({
        title: "Empresa cadastrada",
        description: "A empresa foi cadastrada com sucesso!",
      });

      setName("");
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao cadastrar empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar a empresa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          placeholder="Nome da empresa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Cadastrando..." : "Cadastrar Empresa"}
      </Button>
    </form>
  );
};