import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileText, Save, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Inventory = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Eu sou seu assistente para ajudar a criar seu inventário de emissões. Como posso ajudar você hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-inventory', {
        body: { message: input }
      });

      if (error) throw error;

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Inserir Dados de Emissões", action: () => setInput("Quero inserir dados de emissões") },
    { label: "Revisar Escopo 2", action: () => setInput("Quero revisar o Escopo 2") },
    { label: "Gerar Inventário", action: () => setInput("Gerar inventário completo agora") },
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventário de Emissões</h1>
            <p className="text-gray-500">Converse com a IA para criar seu inventário</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "Inventário salvo", description: "Seus dados foram salvos com sucesso!" })}>
              <Save className="mr-2" />
              Salvar Inventário
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Relatório gerado", description: "Seu relatório foi gerado com sucesso!" })}>
              <FileText className="mr-2" />
              Gerar Relatório
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Novo projeto", description: "Iniciando criação de projeto..." })}>
              <Plus className="mr-2" />
              Criar Projeto
            </Button>
          </div>
        </div>

        <div className="flex flex-1 gap-4">
          <div className="flex-1 border rounded-lg p-4 bg-white">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-accent text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.role === 'user' ? 'Você' : 'Inctus IA'}
                      </div>
                      {message.content}
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-accent rounded-lg p-3 text-gray-900">
                      Digitando...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4">
              <div className="flex gap-2 mb-4">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    onClick={action.action}
                    className="text-sm"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="w-80 border rounded-lg p-4 bg-white">
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;