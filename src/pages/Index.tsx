import { DashboardLayout } from "@/components/DashboardLayout";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { CompanyList } from "@/components/companies/CompanyList";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciamento de Empresas
          </h1>
          <p className="text-gray-500 mt-2">
            Cadastre e gerencie suas empresas para criar inventários de emissões
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