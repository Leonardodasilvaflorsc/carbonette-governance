export const InventoryStatus = () => {
  return (
    <div className="w-full md:w-80 border rounded-lg p-4 bg-white">
      <h2 className="font-semibold mb-4">Status do Inventário</h2>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">Completude</div>
          <div className="text-lg font-medium">75%</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Dados Inseridos</div>
          <div className="text-lg font-medium">42</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Última Atualização</div>
          <div className="text-lg font-medium">Há 2 horas</div>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Escopos Cadastrados</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Escopo 1</span>
              <span className="font-medium">15 registros</span>
            </div>
            <div className="flex justify-between">
              <span>Escopo 2</span>
              <span className="font-medium">12 registros</span>
            </div>
            <div className="flex justify-between">
              <span>Escopo 3</span>
              <span className="font-medium">15 registros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};