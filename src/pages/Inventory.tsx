import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/inventory/ChatMessage";
import { ChatInput } from "@/components/inventory/ChatInput";
import { QuickActions } from "@/components/inventory/QuickActions";
import { InventoryStatus } from "@/components/inventory/InventoryStatus";
import type { Message } from "@/types/chat";

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
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 rounded-lg p-4 text-gray-900">
                      <div className="animate-pulse">Digitando...</div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4">
              <QuickActions actions={quickActions} />
              <ChatInput
                input={input}
                setInput={setInput}
                handleSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>

          <InventoryStatus />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;