import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para limpar a formatação markdown básica
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove **bold**
    .replace(/\*/g, '')   // Remove *italic*
    .replace(/##/g, '')   // Remove ## headers
    .replace(/\n\n/g, '\n') // Reduz espaços duplos para único
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em ajudar empresas a criar inventários de emissões de carbono. Você deve guiar os usuários através do processo de coleta de dados, cálculo de emissões e geração de relatórios. Seja preciso, profissional e forneça orientações práticas. Evite usar markdown na sua resposta.'
          },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    console.log('OpenAI response:', data);

    const cleanedResponse = cleanMarkdown(data.choices[0].message.content);

    return new Response(JSON.stringify({ 
      response: cleanedResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-inventory function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});