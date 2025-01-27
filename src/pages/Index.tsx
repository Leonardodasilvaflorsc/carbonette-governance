import { DashboardLayout } from "@/components/DashboardLayout";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { CompanyList } from "@/components/companies/CompanyList";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: companies } = await supabase
          .from("companies")
          .select("name")
          .eq("user_id", user.id)
          .single();
        
        if (companies) {
          setCompanyName(companies.name);
        }
      }
    };

    fetchCompany();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciamento de Empresas
          </h1>
          <p className="text-gray-500 mt-2">
            {companyName 
              ? `Bem-vindo à ${companyName}`
              : "Cadastre e gerencie suas empresas para criar inventários de emissões"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Empresa</h2>
            <CompanyForm />
          </div>

          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Empresas Cadastradas</h2>
            <CompanyList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;