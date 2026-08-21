# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a6463ad6-b330-47ff-9a9a-4ab3225b72e2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a6463ad6-b330-47ff-9a9a-4ab3225b72e2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a6463ad6-b330-47ff-9a9a-4ab3225b72e2) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

---

# AHS TCO Fleet — simulador de TCO comparativo de caminhões

Aplicação de página única, em português do Brasil, que compara o **Custo Total
de Propriedade** de cinco configurações de caminhão executando a **mesma missão
de transporte**: diesel Proconve P8 com SCR, gás natural veicular, biometano,
célula a combustível a hidrogênio (FCEV) e bateria elétrica (BEV).

Rota da aplicação: **`/tco`** (`npm run dev` e abrir `http://localhost:8080/tco`).

## O que o simulador responde

1. Qual rota tem o menor custo por quilômetro e por tonelada-quilômetro no horizonte analisado.
2. Em que condições as curvas se cruzam — preço do H₂, do diesel, da energia, quilometragem anual, CAPEX e preço do carbono.
3. Quanto custa a tonelada de CO₂ evitada em cada rota alternativa (custo marginal de abatimento).

## Organização do código

| Caminho | Conteúdo |
|---|---|
| `src/tco/defaults.ts` | Cenário padrão. **Todo** parâmetro numérico do modelo mora aqui, com a fonte do default comentada. |
| `src/tco/fields.ts` | Rótulo, unidade, faixa plausível, casas decimais e tooltip com a fonte de cada input. |
| `src/tco/engine/constantes.ts` | Constantes físicas (poder calorífico, densidades) e faixas de verificação. |
| `src/tco/engine/index.ts` | Motor de cálculo: massa → carga útil → payload → consumo → disponibilidade → frota equivalente → fluxo de caixa → VPL. |
| `src/tco/engine/finance.ts` | Financiamento (SAC/Price), depreciação fiscal, anualização de CAPEX. |
| `src/tco/engine/analysis.ts` | Solvers de equilíbrio por bisseção, varredura 1D, mapa de calor, tornado e Monte Carlo. |
| `src/tco/presets.ts` | Quatro cenários pré-carregados (longa distância, regional, urbano, mineração). |
| `src/tco/components/` | Abas de entrada, resultados, ponto de equilíbrio, relatório e painel de auditoria. |
| `src/tco/exportar.ts` | Exportação em XLSX (SheetJS), JSON do cenário e PDF por impressão. |

## Decisões de modelagem que valem registro

- **Comparação por missão, não por veículo.** A carga útil de cada rota é
  `PBTC + tolerância − tara base − massa do sistema de energia`. Quando ela é
  menor, o modelo aumenta a quilometragem na mesma proporção (fator de viagens)
  e recalcula a frota equivalente necessária para atender à mesma demanda anual
  em tonelada-quilômetro.
- **Moeda real.** Os escalonamentos de preço são declarados como variação
  **acima do IPCA** e o WACC é real. A visão nominal apenas reapresenta o fluxo:
  o VPL é invariante. As prestações de financiamento, contratadas em valores
  nominais, são deflacionadas mês a mês.
- **Substituição do pack não é digitada.** O modelo testa a cada ano o SOH
  mínimo e a autonomia exigida pelo trecho mais longo, e adota o critério que
  ocorrer primeiro. O custo é projetado pela curva de aprendizado e abatido
  quando coberto pela garantia.
- **Gás natural e biometano são o mesmo caminhão.** Motor, cilindros, estação e
  manutenção são compartilhados; o que separa as duas rotas é o preço da
  molécula, o poder calorífico, a pegada de carbono e o modo de suprimento. O
  consumo é declarado na base do gás natural e corrigido automaticamente para o
  poder calorífico maior do biometano. O ciclo HPDI traz de volta o piloto de
  diesel, o consumo de ARLA e o pós-tratamento SCR.
- **Metano não queimado.** O slip entra nas emissões multiplicado pelo GWP, e
  só a parcela efetivamente queimada gera CO₂. É esse parâmetro que decide se o
  gás natural fóssil tem ou não vantagem climática sobre o diesel: com 1% de
  slip e GWP de 28, a vantagem cai para menos de 4%.
- **Hidrogênio.** Os modos B (eletrólise) e C (biomassa) produzem um custo
  nivelado em R$/kg, que entra como preço na porta do veículo; o CAPEX dessas
  plantas não é lançado no fluxo do caminhão. A estação de abastecimento, essa
  sim dedicada à frota, tem o CAPEX imputado na proporção do volume que o
  veículo retira do total despachado.
- **Balanço energético.** A energia requerida na roda é escalada por
  topografia, perfil de rota e peso bruto, e comparada com a energia do tanque
  ou do pack. Eficiências implícitas fora da faixa esperada geram alerta.

## Logotipo

Coloque o arquivo `ahs-logo.png` em `public/`. Enquanto ele não existir, o
cabeçalho e o rodapé dos relatórios exibem uma marca textual de mesma altura.

## Gerar uma versão distribuível em arquivo único

```sh
npm run build:tco
```

Gera `dist-tco/ahs-tco-fleet.html` — página única com CSS e JS embutidos, sem
nenhuma dependência externa. Abre direto do disco, vai por e-mail ou sobe em
qualquer host estático. Usa a entrada `src/tco/standalone.tsx`, que monta só o
simulador, sem roteador, autenticação ou Supabase.

## Exportações

- **PDF**: usa a impressão do navegador, preservando os gráficos em vetor. A aba Relatório traz o layout de impressão.
- **XLSX**: premissas, resumo, decomposição, fluxo de caixa por rota, operação, auditoria e, quando calculados, equilíbrio, sensibilidade e Monte Carlo.
- **JSON**: cenário completo, para versionamento e comparação. Ao importar, campos ausentes assumem o default vigente.

Quando a página roda dentro de um visualizador que não permite que ela própria
inicie downloads, as exportações passam pela API de salvamento do host, com
confirmação do usuário; a aba Relatório avisa quais formatos estão disponíveis.
