import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type EmissionFormData = {
  scope: "1" | "2" | "3";
  category_id: string;
  activity_data: number;
  emission_factor: number;
  period: string;
  notes?: string;
};

export const InventoryStatus = () => {
  const [selectedScope, setSelectedScope] = useState<"1" | "2" | "3">("1");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmissionFormData>();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch emission categories when scope changes
  const fetchCategories = async (scope: number) => {
    try {
      const { data, error } = await supabase
        .from('emission_categories')
        .select('*')
        .eq('scope', scope);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias de emissão",
        variant: "destructive"
      });
    }
  };

  // Handle scope change
  const handleScopeChange = (value: "1" | "2" | "3") => {
    setSelectedScope(value);
    fetchCategories(parseInt(value));
  };

  // Handle form submission
  const onSubmit = async (data: EmissionFormData) => {
    setIsLoading(true);
    try {
      // Get the user's company first
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .single();

      if (companyError) throw companyError;

      const emissions = parseFloat(data.activity_data.toString()) * parseFloat(data.emission_factor.toString());

      const { error } = await supabase
        .from('emission_records')
        .insert({
          company_id: companyData.id,
          category_id: data.category_id,
          period: data.period,
          emission_factor: data.emission_factor,
          activity_data: data.activity_data,
          emissions: emissions,
          notes: data.notes
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro de emissão salvo com sucesso!"
      });

      reset();
    } catch (error) {
      console.error('Error saving emission record:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro de emissão",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-80 border rounded-lg p-4 bg-white">
      <h2 className="text-lg md:text-xl font-semibold mb-4">Registro de Emissões</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Escopo</Label>
          <RadioGroup
            defaultValue="1"
            onValueChange={handleScopeChange}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="scope1" />
              <Label htmlFor="scope1">Escopo 1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="scope2" />
              <Label htmlFor="scope2">Escopo 2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="scope3" />
              <Label htmlFor="scope3">Escopo 3</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <select
            {...register("category_id", { required: true })}
            className="w-full p-2 border rounded"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Período</Label>
          <Input
            type="date"
            {...register("period", { required: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Dados de Atividade</Label>
          <Input
            type="number"
            step="0.01"
            {...register("activity_data", { required: true, min: 0 })}
            placeholder="Ex: 100"
          />
        </div>

        <div className="space-y-2">
          <Label>Fator de Emissão</Label>
          <Input
            type="number"
            step="0.000001"
            {...register("emission_factor", { required: true, min: 0 })}
            placeholder="Ex: 0.5"
          />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            {...register("notes")}
            placeholder="Adicione notas ou observações relevantes"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Salvando..." : "Salvar Registro"}
        </Button>
      </form>
    </div>
  );
};