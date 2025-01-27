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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
    { label: "Inserir Dados", action: () => setInput("Quero inserir dados de emissões") },
    { label: "Revisar Escopo 2", action: () => setInput("Quero revisar o Escopo 2") },
    { label: "Gerar Inventário", action: () => setInput("Gerar inventário completo agora") },
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventário de Emissões</h1>
            <p className="text-sm md:text-base text-gray-500">Converse com a IA para criar seu inventário</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none text-sm"
              onClick={() => toast({ title: "Inventário salvo", description: "Seus dados foram salvos com sucesso!" })}
            >
              <Save className="w-4 h-4 mr-2" />
              {!isMobile && "Salvar Inventário"}
            </Button>
            <Button 
              variant="outline"
              className="flex-1 md:flex-none text-sm"
              onClick={() => toast({ title: "Relatório gerado", description: "Seu relatório foi gerado com sucesso!" })}
            >
              <FileText className="w-4 h-4 mr-2" />
              {!isMobile && "Gerar Relatório"}
            </Button>
            <Button 
              variant="outline"
              className="flex-1 md:flex-none text-sm"
              onClick={() => toast({ title: "Novo projeto", description: "Iniciando criação de projeto..." })}
            >
              <Plus className="w-4 h-4 mr-2" />
              {!isMobile && "Criar Projeto"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 gap-4">
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

          {!isMobile && <InventoryStatus />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;