# Ciclo de eletrorredução de minério de ferro para armazenamento de energia de longa duração (LDES)

**Rota analisada:** PV → eletrorredução direta do óxido de ferro (elétron como redutor) → estoque de Fe metálico → oxidação com vapor (*steam-iron*) → H₂ puro → eletricidade/uso químico, com calor de processo fornecido por armazenamento térmico em areia carregado eletricamente pelo mesmo PV.

| | |
|---|---|
| **Versão** | 1.0 — julho/2026 |
| **Escopo** | Análise técnico-econômica de conceito (pré-viabilidade) |
| **Base geográfica** | Nordeste do Brasil (alta irradiância + curtailment estrutural) |
| **Nível de confiança** | Termodinâmica e balanços: alto. CAPEX/LCOS: ordem de grandeza (±40%). Status de tecnologias de terceiros: verificado em jul/2026 (ver §16). |

---

## Sumário executivo

O ciclo proposto fecha o laço **Fe ⇄ Fe₃O₄** usando elétrons solares como agente redutor na carga e vapor d'água como agente oxidante na descarga. Os números centrais, deduzidos de primeiros princípios em §3–§5:

| Indicador | Valor (caso base) | Faixa |
|---|---|---|
| Energia de carga (eletrólise + auxiliares) | **2,77 kWh_e/kg Fe** | 2,3 – 3,3 |
| Calor de processo na descarga | **0,35 kWh_th/kg Fe** | 0,20 – 0,60 |
| Entrada elétrica total | **3,26 kWh_e/kg Fe** | 2,5 – 4,1 |
| H₂ produzido | **48,1 g/kg Fe** (1,60 kWh PCI) | — |
| Eficiência eletricidade → H₂ (PCI) | **49%** | 40 – 64% |
| Consumo específico de H₂ | **67,8 kWh_e/kg H₂** | 52 – 85 |
| **RTE eletricidade → eletricidade** | **27%** | 18 – 40% |
| Densidade energética (elétrica, leito) | **3,1 MWh_e/m³** | 2,2 – 3,5 |
| Densidade volumétrica de H₂ | **168 kg H₂/m³** | 120 – 190 |
| Custo do meio de estoque | **US$ 0,50/kWh_e** | 0,45 – 0,62 |

**Três conclusões que decidem o projeto:**

1. **Como armazenamento eletricidade→eletricidade, o conceito não é competitivo.** RTE de ~27% e blocos de potência caros (SOFC + reator + eletrólise ≈ US$ 5.000/kW) resultam em LCOS de **US$ 350–440/MWh** a 20 ciclos/ano — pior que a bateria ferro-ar da Form Energy no custo-alvo dela (~US$ 190/MWh) e sem vantagem clara sobre alternativas maduras. Não persiga essa tese.

2. **Como armazenamento sazonal de hidrogênio, o conceito é forte e possivelmente o melhor disponível fora de cavernas de sal.** Estocar 1 t de H₂ como poder redutor em ferro custa **US$ 25–35/kg H₂ de capacidade**, contra US$ 400–700/kg H₂ em cilindros pressurizados — **15 a 25× mais barato**, em condição ambiente, sem permeação, sem *boil-off*, sem geologia específica. O preço disso é ~23% a mais de eletricidade por kg de H₂ (≈ US$ 0,35/kg H₂ a US$ 25/MWh). Esse é o *trade* que fecha.

3. **O diferencial estratégico é a opcionalidade de produto, não a eficiência.** O mesmo inventário pode sair como eletricidade firme, H₂ de baixo carbono (Lei 14.948/2024), calor industrial de alta temperatura ou **ferro verde vendável** (exposto ao CBAM a partir de 2026, com prêmio real). Um ativo que arbitra entre quatro mercados a partir de energia que hoje é cortada — 20,7% da geração eólica+solar em 2025 — tem uma tese econômica que o armazenamento puro não tem.

**Bloqueadores críticos** (§14): (i) incompatibilidade entre os estabilizantes que dão vida cíclica ao *carrier* de *chemical looping* e a etapa eletrolítica; (ii) descasamento de morfologia (eletrodeposição gera ferro denso, *steam-iron* exige porosidade); (iii) autodescarga por reoxidação do ferro esponjoso em estoque de meses — nunca medida para esta aplicação; (iv) piroforicidade do pó de ferro reduzido. Os itens (i) e (ii) têm uma solução elegante e específica desta arquitetura, discutida em §8.3: **a eletrólise reconstitui o material a cada ciclo**, algo que o *chemical looping* clássico não faz. Isso precisa ser provado experimentalmente antes de qualquer outra coisa.

---

## 1. Definição do conceito e fronteira de análise

### 1.1 As quatro etapas

```
        ┌──────────────── CARGA (dia / excedente solar) ─────────────────┐
        │                                                                │
   [PV DC]──┬──► Eletrólise do óxido de ferro    Fe₃O₄ → 3 Fe + 2 O₂     │
            │        (elétron = redutor)              ↓         ↓        │
            │                                    Fe metálico   O₂ (venda)│
            └──► Resistência ──► AREIA 600–900 °C ─────────────┐         │
                                  (TES sensível)               │         │
        ┌──────────────── DESCARGA (noite / estação seca) ──────┼────────┐
        │                                                       │        │
   Fe + H₂O(v) ──► Fe₃O₄ + H₂     ("steam-iron", 600–750 °C) ◄──┘ calor  │
                        │           │                                    │
                   volta ao silo    └──► H₂ 99,9% ──► SOFC / turbina / venda
                   de óxido                              │
                                                    H₂O recirculada ─────┘
```

### 1.2 O que "energia solar diretamente como redutor" significa aqui

O termo tem duas leituras e a análise adota a primeira, mencionando a segunda como alternativa descartada:

- **(A) Elétron fotovoltaico como redutor — adotada.** Não há carbono nem hidrogênio como intermediário redutor. A corrente elétrica reduz o cátion Fe²⁺/Fe³⁺ diretamente no cátodo. É a rota da eletrólise de óxido fundido (MOE) e da eletrólise alcalina de baixa temperatura (Volteron™/SIDERWIN).
- **(B) Fotons concentrados como fonte térmica de redução (termoquímica solar).** Ciclos redox de duas etapas a 1.400–1.800 °C acionados por heliostatos. Descartada em §6.4: eficiência solar-para-ferro demonstrada de 5–10% contra ~17% da rota PV+eletrólise, exige DNI alto e não é modular. No Brasil, com módulos PV abaixo de US$ 0,20/Wp, a rota (B) não fecha.

### 1.3 Fronteira

Incluído: da entrada DC do PV até a entrega de eletricidade AC (ou H₂ na cerca da planta), incluindo manuseio de sólidos, tratamento de água, inertização e o inventário circulante. Excluído: transmissão, mineração e beneficiamento do minério de reposição (tratado apenas no *make-up* e na pegada de carbono), e o uso final do H₂ fora da planta.

---

## 2. Base de cálculo, constantes e premissas

Todos os resultados numéricos deste documento são reproduzíveis a partir desta tabela. **Nada foi copiado de literatura sem recálculo.**

### 2.1 Constantes

| Grandeza | Valor |
|---|---|
| Constante de Faraday, F | 96.485 C/mol |
| M(Fe) / M(FeO) / M(Fe₃O₄) / M(Fe₂O₃) | 55,845 / 71,844 / 231,53 / 159,69 g/mol |
| M(H₂) / M(H₂O) / M(O₂) | 2,016 / 18,015 / 32,00 g/mol |
| PCI / PCS do H₂ | 120 / 142 MJ/kg (33,33 / 39,44 kWh/kg) |
| 1 kg de Fe | 17,907 mol |

### 2.2 Entalpias e energias livres padrão de formação (298 K, kJ/mol)

| Espécie | ΔH°f | ΔG°f |
|---|---|---|
| FeO (s) | −272,0 | −251,4 |
| Fe₃O₄ (s) | −1.118,4 | −1.015,4 |
| Fe₂O₃ (s) | −824,2 | −742,2 |
| H₂O (g) | −241,8 | −228,6 |
| H₂O (l) | −285,8 | −237,1 |

> Dados de tabela padrão. Para engenharia de detalhe, refazer com FactSage/HSC nas temperaturas reais de operação (a extrapolação de ΔS a partir de 298 K é grosseira acima de 600 °C — ver ressalva em §3.4).

### 2.3 Premissas de engenharia (caso base)

| Parâmetro | Base | Pessimista | Otimista | Fonte/justificativa |
|---|---|---|---|---|
| Tensão de célula (eletrólise alcalina) | 1,90 V | 2,20 V | 1,65 V | Piloto SIDERWIN: 2,7 MWh/t Fe a partir de hematita ⇒ 1,875 V efetivos |
| Eficiência faradaica | 95% | 90% | 97% | Analogia com eletroextração de Zn/Ni |
| Auxiliares da eletrólise (retificação, circulação, aquecimento) | 6% | 8% | 5% | Prática de *tankhouse* |
| Cominuição/atomização do Fe | 30 kWh/t | 60 | 15 | Moagem de metais dúcteis |
| Temperatura do reator *steam-iron* | 700 °C | 800 | 650 | §3.4 |
| Excesso de vapor λ (mol H₂O alim./estequiom.) | 2,0 | 3,0 | 1,6 | Limite de equilíbrio, §3.4 |
| Eficácia do recuperador de calor | 50% | 30% | 70% | Trocador gás-gás + condensador |
| Rendimento da TES de areia (estoque + trocador) | 90% | 80% | 95% | NREL ENDURING |
| Conversão resistiva PV→calor | 99% | 98% | 99,5% | Acoplamento DC direto |
| BOP de descarga (sopradores, bombas, condensador, N₂) | 0,10 kWh_e/kg Fe | 0,15 | 0,08 | Estimativa |
| Rendimento do conversor de H₂ (PCI) | 55% (SOFC) | 45% (motor) | 62% (SOFC+integr.) | Estado da arte |
| Perda de inventário por ciclo | 1,0% | 3,0% | 0,3% | Atrito, arraste, purga |
| CRF (8% a.a., 25 anos) | 0,09368 | | | |
| Custo do Fe metálico/DRI | US$ 500/t | 550 | 400 | Mercado 2025–26 |
| Custo da eletricidade PV | US$ 25/MWh | 35 | 5 (curtailment) | LCOE NE |

---

## 3. Termodinâmica do ciclo

### 3.1 A escolha do par redox é a primeira decisão de projeto

Há três pares possíveis, e eles **não** são intercambiáveis:

| Par | e⁻/Fe | Carga (Ah/kg Fe) | H₂/kg Fe | Energia PCI (kWh/kg Fe) | Alcançável com vapor? |
|---|---|---|---|---|---|
| Fe / FeO | 2,000 | 959,9 | 17,91 mol = 36,1 g | 1,203 | ✅ sim, com folga |
| **Fe / Fe₃O₄** | **2,667** | **1.279,9** | **23,88 mol = 48,1 g** | **1,604** | ✅ sim, no limite |
| Fe / Fe₂O₃ | 3,000 | 1.439,8 | (30,4 g equiv.) | 1,805 | ❌ **não** |

**Resultado crítico e frequentemente ignorado:** o vapor d'água **não consegue** oxidar ferro além da magnetita. A hematita só é acessível com O₂ (ar). Portanto, num laço fechado *steam-iron*, **a alimentação da eletrólise é Fe₃O₄, não Fe₂O₃**. Isso muda tudo o que se lê sobre eletrólise de minério (que é otimizada para hematita):

- a carga elétrica por kg de Fe cai 11% (1.280 vs 1.440 Ah/kg) — a favor;
- o minério brasileiro de referência muda: **itabiritos magnetíticos de Minas Gerais** em vez da hematita de Carajás, ao menos para a carga inicial do inventário;
- todo dado de consumo específico publicado a partir de hematita (ex.: 2,7 MWh/t) precisa ser reescalado para a base magnetita antes de ser usado.

**Tensões reversíveis** (E° = ΔG°/nF, 298 K):

| Reação de decomposição | ΔG° (kJ/mol Fe) | n | E° |
|---|---|---|---|
| FeO → Fe + ½O₂ | +251,4 | 2 | **1,303 V** |
| Fe₃O₄ → 3Fe + 2O₂ | +338,5 | 8/3 | **1,315 V** |
| Fe₂O₃ → 2Fe + 3/2 O₂ | +371,1 | 3 | **1,282 V** |

As três são praticamente idênticas (1,28–1,32 V) — a termodinâmica não distingue as rotas; a cinética e a engenharia distinguem.

### 3.2 Carga: eletrorredução

Reação global (par adotado):

```
Fe₃O₄  →  3 Fe  +  2 O₂        ΔH° = +1.118,4 kJ/mol Fe₃O₄  =  +372,8 kJ/mol Fe
                                ΔG° = +1.015,4 kJ/mol Fe₃O₄  =  +338,5 kJ/mol Fe
```

Por kg de Fe:
- **Mínimo termodinâmico (ΔG):** 338,5 × 17,907 = 6.062 kJ = **1,684 kWh/kg** (1,68 MWh/t)
- **Mínimo termoneutro (ΔH):** 372,8 × 17,907 = 6.676 kJ = **1,854 kWh/kg** (1,85 MWh/t)
- **Real a 1,90 V, FE 95%:** 1.279,9 Ah/kg × 1,90 V ÷ 0,95 = **2,560 kWh/kg** (2,56 MWh/t)

Eficiência de tensão = 1,315/1,90 = **69,2%**. Eficiência energética da etapa (base ΔH) = 1,854/2,560 = **72,4%**.

Subprodutos por kg de Fe: **382 g de O₂** (11,94 mol) — 436 t de O₂ por ciclo no caso de referência de §10, com valor comercial de US$ 13–26 mil/ciclo. Não é o negócio, mas paga parte do OPEX.

### 3.3 Descarga: processo *steam-iron*

Reação global (histórica: processo Messerschmitt, usado para gerar H₂ para dirigíveis):

```
3 Fe + 4 H₂O(g)  →  Fe₃O₄ + 4 H₂     ΔH° = −150,8 kJ  =  −50,3 kJ/mol Fe   (exotérmica)
```

Em duas etapas reais, com termodinâmicas muito diferentes:

```
(i)   Fe + H₂O(g) → FeO + H₂        ΔH° = +30,2 kJ/mol   [3 dos 4 H₂]  — favorável
(ii)  3 FeO + H₂O(g) → Fe₃O₄ + H₂   ΔH° = −60,2 kJ/mol   [1 dos 4 H₂]  — difícil
```

Por kg de Fe: **23,88 mol de H₂ = 48,13 g = 1,604 kWh (PCI)**, consumindo **430 g de H₂O** estequiométricos.

O calor da reação global é **liberado** (−900 kJ/kg Fe = −0,250 kWh_th/kg Fe). O reator *steam-iron* **não precisa de calor para reagir** — precisa de calor para (a) gerar e superaquecer o vapor, (b) aquecer o inventário sólido, (c) compensar perdas. Essa distinção define o dimensionamento da TES de areia (§7).

### 3.4 Limite de equilíbrio e utilização de vapor por passe

O quanto de vapor se converte em H₂ numa passagem é fixado pelo diagrama de Baur–Glaessner. Calculando a etapa (i) a partir dos dados de §2.2:

`FeO + H₂ ⇌ Fe + H₂O`, ΔH° = +30,2 kJ/mol, ΔS° ≈ +24,8 J/mol·K ⇒ ΔG(T) = 30.200 − 24,8·T

| T | ΔG (J/mol) | K = p_H₂O/p_H₂ | p_H₂/p_H₂O no equilíbrio | **Conversão máx. de vapor, etapa (i)** |
|---|---|---|---|---|
| 600 °C (873 K) | +8.550 | 0,308 | 3,25 | **76%** |
| 700 °C (973 K) | +6.070 | 0,472 | 2,12 | **68%** |
| 800 °C (1073 K) | +3.590 | 0,669 | 1,49 | **60%** |

Para a etapa (ii), a fronteira FeO/Fe₃O₄ fica em torno de **20–30% de H₂** na faixa de 600–800 °C (valor de literatura; o cálculo por extrapolação de ΔS de 298 K erra aqui por causa das transições de fase da wüstita — **verificar com FactSage antes de dimensionar**). Ou seja, a última molécula de H₂ é a mais cara: exige um gás quase todo vapor.

**Consequências de projeto:**

1. A oxidação com vapor é **favorecida por temperatura baixa** — o oposto da cinética. O ótimo prático fica em **650–750 °C**.
2. Levar o sólido até Fe₃O₄ completo custa recirculação e condensação pesadas. **Parar em FeO** entrega 75% do H₂ com utilização de vapor muito melhor e cinética mais rápida (sem a camada densa e passivante de magnetita).
3. Um projeto realista **estagia**: reator em contracorrente, com o sólido mais oxidado encontrando o gás mais rico em vapor.

**Comparação dos dois modos de operação:**

| | Fe → FeO (parcial) | Fe → Fe₃O₄ (completo) |
|---|---|---|
| H₂ por kg de Fe | 36,1 g | 48,1 g (+33%) |
| Energia de carga (1,90 V, FE 95%) | 1,92 kWh/kg | 2,56 kWh/kg |
| Utilização de vapor por passe | 60–76% | ~45–55% (média ponderada) |
| Carga térmica de vapor | menor | maior |
| Inventário necessário p/ mesma energia | +33% (barato) | referência |
| Cinética / risco de passivação | melhor | pior |
| **Recomendação** | **preferível na maioria dos casos** | só se o inventário for restritivo |

Como o meio de estoque custa US$ 0,50/kWh, **aumentar o inventário em 33% para ganhar eficiência de vapor e cinética é quase sempre o trade certo.** Adote Fe/FeO como caso de projeto e Fe/Fe₃O₄ como limite superior de capacidade. *(O caso base numérico deste documento usa Fe/Fe₃O₄ por ser o mais desafiador e o mais citado; a versão FeO melhora o RTE em ~1–2 pontos e a utilização de vapor substancialmente.)*

### 3.5 Pressurização: um ganho termodinamicamente gratuito

A reação `3Fe + 4H₂O → Fe₃O₄ + 4H₂` é **isomolar em fase gasosa** (4 mol → 4 mol). Pelo princípio de Le Chatelier, **a pressão não desloca o equilíbrio**. Portanto o reator pode operar a 20–30 bar sem penalidade termodinâmica, entregando H₂ já comprimido.

Economia: comprimir H₂ de 1 → 30 bar custa ~2,2 kWh/kg H₂ ⇒ **0,106 kWh_e/kg Fe evitados (3,3% da entrada total)**. Em vez disso, bombeia-se água líquida (≈0,001 kWh/kg Fe). Custo: vaso de pressão e válvulas de sólidos pressurizados (*lock hoppers*) — tecnologia madura em gaseificação. **Recomendação: adotar reator pressurizado desde o conceito.**

---

## 4. Balanço de massa e energia

### 4.1 Por kg de Fe circulante (caso base, ciclo Fe/Fe₃O₄, 700 °C, λ = 2,0)

**CARGA — entradas elétricas**

| Item | kWh_e/kg Fe | % |
|---|---|---|
| Eletrólise (1.279,9 Ah × 1,90 V ÷ 0,95) | 2,560 | 78,5% |
| Retificação + auxiliares (6%) | 0,154 | 4,7% |
| Cominuição/atomização (30 kWh/t) | 0,030 | 0,9% |
| Manuseio, secagem, inertização N₂ | 0,030 | 0,9% |
| **Subtotal carga** | **2,774** | **85,1%** |

**DESCARGA — balanço térmico** (por kg de Fe)

| Item | kWh_th/kg Fe |
|---|---|
| Vapor bruto: 860 g de H₂O, 25 °C(l) → 750 °C(v), ~4,0 MJ/kg | +0,956 |
| Recuperação (condensação do vapor não convertido + resfriamento do gás), 50% | −0,478 |
| Aquecimento do inventário sólido 25→700 °C (líquido de recuperação) | +0,043 |
| Perdas do reator e tubulações | +0,080 |
| **Exotermia da reação** | **−0,250** |
| **Calor líquido requerido** | **+0,351** |

**DESCARGA — entradas elétricas**

| Item | kWh_e/kg Fe | % |
|---|---|---|
| Calor via TES de areia: 0,351 ÷ (0,90 × 0,99) | 0,394 | 12,1% |
| BOP (sopradores, bomba, condensador, transporte, secagem H₂, N₂) | 0,100 | 3,1% |
| Compressão de H₂ | 0 (reator pressurizado) | — |
| **Subtotal descarga** | **0,494** | **14,9%** |

**TOTAL / SAÍDAS**

| | Valor |
|---|---|
| **Entrada elétrica total** | **3,268 kWh_e/kg Fe** |
| H₂ produzido | 48,13 g = **1,604 kWh (PCI)** |
| O₂ subproduto | 382 g |
| H₂O consumida (líquida, ciclo fechado) | ~0 (recuperada na SOFC) |
| **η eletricidade → H₂ (PCI)** | **49,1%** |
| **Consumo específico de H₂** | **67,9 kWh_e/kg H₂** |
| Eletricidade recuperada (SOFC 55%) | **0,882 kWh_e/kg Fe** |
| **RTE eletricidade → eletricidade** | **27,0%** |

### 4.2 Balanço hídrico — um resultado favorável e não óbvio

Consumo estequiométrico: **430 g de H₂O por kg de Fe**. Mas o hidrogênio retorna a água ao ser oxidado na SOFC/turbina. **Num ciclo fechado com recuperação do condensado da SOFC, o consumo líquido de água tende a zero**; só há reposição de purgas e perdas (assumir 10% ⇒ 43 g/kg Fe).

Para o caso de referência de §10: **~49 t de água de reposição por ciclo de 1.000 MWh** — desprezível. Isso é decisivo para o semiárido nordestino e contrasta fortemente com a eletrólise da água, que consome ~9–10 kg de H₂O desmineralizada por kg de H₂ de forma irreversível se o uso final for disperso.

**Ressalva:** a água precisa ser desmineralizada (sílica em ppb) para não depositar no reator e no leito. O custo é de tratamento, não de captação.

---

## 5. Eficiência round-trip: cenários e sensibilidade

| | Pessimista | **Base** | Otimista | Otimista + integração térmica SOFC |
|---|---|---|---|---|
| Tensão de célula | 2,20 V | 1,90 V | 1,65 V | 1,65 V |
| Eletrólise + aux. (kWh_e/kg Fe) | 3,32 | 2,77 | 2,31 | 2,31 |
| Calor (kWh_e/kg Fe) | 0,60 | 0,39 | 0,25 | 0,12 |
| BOP (kWh_e/kg Fe) | 0,15 | 0,10 | 0,08 | 0,08 |
| **Entrada total** | **4,07** | **3,27** | **2,64** | **2,51** |
| η conversor de H₂ | 45% | 55% | 62% | 62% |
| Saída elétrica (kWh_e/kg Fe) | 0,722 | 0,882 | 0,995 | 0,995 |
| **RTE** | **17,7%** | **27,0%** | **37,7%** | **39,6%** |
| η eletricidade → H₂ | 39,4% | 49,1% | 60,8% | 63,9% |

**Sensibilidade do RTE (variação de ±1 ponto percentual por variável, caso base):**

| Variável | Δ | Δ RTE |
|---|---|---|
| Tensão de célula | −0,10 V | **+1,4 pp** |
| Rendimento do conversor de H₂ | +5 pp | **+2,5 pp** |
| Eficácia do recuperador | +20 pp | **+1,3 pp** |
| Eficiência faradaica | +3 pp | +0,8 pp |
| Excesso de vapor λ | −0,5 | +0,9 pp |
| BOP | −0,05 kWh/kg | +0,4 pp |

**Leitura:** o RTE é governado por **duas alavancas** — a tensão de célula (custo do elétron) e o rendimento do conversor de H₂. Tudo o mais é ruído. Qualquer programa de P&D que não ataque essas duas está otimizando a coisa errada.

### 5.1 A cascata exergética correta para o calor

Usar eletricidade PV (exergia pura) para produzir calor a 700 °C via resistência destrói ~30% da exergia (fator de Carnot a 973 K = 1 − 298/973 = 0,694). A ordem racional de suprimento de calor é:

1. **Exotermia da própria reação** (−0,250 kWh_th/kg Fe) — grátis, cobre 71% da necessidade bruta líquida;
2. **Recuperação do gás de saída e da condensação** — grátis, o maior item isolado;
3. **Exaustão da SOFC a 750–850 °C** — casamento de temperatura quase perfeito com o reator; cobre 60–100% do restante quando a descarga elétrica é simultânea;
4. **TES de areia carregada resistivamente** — o complemento, para partida, transientes e descarga desacoplada da SOFC.

Isso reduz a TES de areia de "componente principal" a "componente de flexibilidade" — o que é bom, e discutido em §7.

---

## 6. Rotas de eletrorredução comparadas

### 6.1 Eletrólise alcalina de baixa temperatura (Volteron™ / SIDERWIN)

Suspensão de óxido de ferro em NaOH ~50%, **110 °C**, deposição de placa de ferro no cátodo. Piloto da ArcelorMittal em Maizières-lès-Metz, TRL 5–6, **2,7 MWh/t Fe medidos a partir de hematita** (⇒ 1,875 V efetivos). Industrialização anunciada com a John Cockerill.

| Prós para armazenamento | Contras |
|---|---|
| **Opera a 110 °C — tolera partida/parada diária**, ideal para acoplamento a PV intermitente | Densidade de corrente baixa (~1.000 A/m²) ⇒ grande área ⇒ CAPEX por kW mais alto |
| Sem materiais nobres, sem membrana, sem água ultrapura | **Produz placa densa de ferro** — péssima para *steam-iron*, exige cominuição |
| Inércia térmica pequena ⇒ resposta rápida | Colheita de placas é batelada e intensiva em mão de obra/automação |
| Eletrólito reciclável | Gangue silicosa dissolve no NaOH ⇒ purga contínua |

### 6.2 Eletrólise de óxido fundido (MOE — Boston Metal)

Escória de óxidos fundida a **~1.600 °C**, anodo inerte metálico, **ferro líquido** no fundo. Célula industrial multi-anodo comissionada em Woburn (MA) em 2025, ~1 t de aço por corrida; primeira planta de demonstração prevista para 2026. Eduardo Bartolomeo (ex-CEO da Vale) entrou no conselho em 2025.

| Prós para armazenamento | Contras |
|---|---|
| **Ferro líquido ⇒ atomização direta a pó esférico poroso** — o formato certo para o reator | **1.600 °C não tolera ciclagem diária**; risco de solidificação da escória |
| **Reseta completamente a morfologia a cada ciclo** (§8.3) | CAPEX e engenharia de materiais (anodo inerte) severos |
| Aceita gangue (vira escória) | Exige carga térmica de base contínua |
| Alta densidade de corrente ⇒ compacto | Perdas térmicas grandes em operação intermitente |

### 6.3 Recomendação

| Caso de uso | Rota |
|---|---|
| **Armazenamento acoplado a PV (esta análise)** | **Alcalina de baixa temperatura.** A tolerância à intermitência vale mais do que a morfologia; a cominuição é barata (30 kWh/t = 1% da entrada). |
| Siderurgia verde (produto = aço) | MOE, com carga elétrica firme |
| Híbrido (arbitragem ferro/energia) | MOE com TES de areia mantendo a célula quente durante a noite, ciclando apenas a corrente — arquitetura interessante e pouco explorada |

### 6.4 Por que não termoquímica solar concentrada

| | PV + eletrólise | CSP termoquímico |
|---|---|---|
| Eficiência solar → Fe | ~17% (22% PV × 76% eletrólise) | 5–10% demonstrado (teórico 20–25%) |
| Recurso exigido | irradiância global | **DNI alto** (limitante em boa parte do NE, com nebulosidade e aerossóis) |
| Modularidade | total | baixa (campo de heliostatos) |
| Custo de capital hoje | módulos < US$ 0,20/Wp | heliostatos + receptor a 1.600 °C |
| Maturidade | comercial | TRL 3–4 |

**Descartada.** A rota (B) de §1.2 não compete com PV no Brasil de 2026.

---

## 7. Armazenamento térmico em areia carregado por PV

### 7.1 Dimensionamento

Necessidade térmica no caso base: **0,351 kWh_th/kg Fe**. Para o caso de referência (11,5 t Fe/h em descarga), isso é **4,03 MW_th** contínuos.

Propriedades da mídia (areia de sílica): c_p ≈ 0,9 kJ/kg·K; densidade aparente ~1.600 kg/m³. Com ΔT = 600 °C (200 → 800 °C):

- **0,150 kWh_th/kg de areia**
- **240 kWh_th/m³**

Para 24 h de autonomia térmica (96,7 MWh_th): **645 t de areia, 403 m³**. A US$ 5/kWh_th (NREL ENDURING reporta US$ 2–4/kWh_th para partículas a ΔT de 900 °C; US$ 4–10/kWh_th para durações de centenas de horas), o custo é **US$ 0,48 M** — 1% do CAPEX total.

### 7.2 Por que areia e não sal fundido ou tijolo

| | Areia/partículas | Sal fundido | Tijolo refratário (Rondo) |
|---|---|---|---|
| T máx | 1.000–1.200 °C (alumina/olivina) | ~565 °C | ~1.500 °C |
| Adequação a 700 °C | ✅ | ❌ (abaixo da necessidade) | ✅ |
| Custo da mídia | US$ 30–50/t | US$ 800–1.200/t | intermediário |
| Bombeável/transportável | ✅ (leito móvel) | ✅ | ❌ (estoque estático) |
| Congelamento/corrosão | não aplicável | risco severo | não aplicável |
| Problemas | atrito, poeira, escoabilidade a quente, sinterização da sílica > 1.000 °C | — | trocador de calor difícil |

**Recomendação:** areia de sílica lavada até 850 °C; **alumina ou olivina** se o projeto migrar para > 950 °C. Trocador de calor de leito móvel gás-partícula (padrão ENDURING).

### 7.3 Acoplamento DC direto com o PV

Aquecimento resistivo aceita corrente contínua diretamente do arranjo PV, **dispensando inversor** (economia de 2–4% de perdas e de US$ 60–100/kW de CAPEX) e eliminando a necessidade de conformidade de rede para essa fração da carga. Como a resistência é puramente ôhmica, o casamento com o MPPT é feito por chaveamento de bancos de resistência ou por conversor DC-DC simples. **É a fração mais barata e mais robusta de toda a planta.**

### 7.4 Funções reais da TES neste sistema

A TES **não** é o coração energético (é 12% da entrada). Ela entrega quatro coisas de valor desproporcional ao custo:

1. **Desacopla a descarga do sol** — permite gerar H₂ à noite sem queimar parte do próprio H₂ para fazer vapor;
2. **Partida a frio e transientes** — o reator leva horas para atingir regime; sem TES, cada partida custa H₂;
3. **Absorve curtailment em resolução de minutos** — resistências ligam/desligam instantaneamente, algo que a célula eletrolítica não faz tão bem;
4. **(Arquitetura MOE)** mantém a escória fundida durante a noite, viabilizando eletrólise de alta temperatura com carga elétrica intermitente.

---

## 8. Reator *steam-iron*: cinética, degradação e o argumento central de viabilidade

### 8.1 Cinética e escolha de reator

A oxidação do sólido é limitada por difusão através da camada de óxido formada. Tempos de residência típicos de **20–60 min** para conversão > 90% em partículas de 100–500 µm a 700 °C.

| Tipo de reator | Prós | Contras | Veredito |
|---|---|---|---|
| Leito fluidizado | transferência de calor e massa excelentes | **defluidização por aglomeração do Fe metálico** — o problema que derrubou FINMET e Circored | Só com aditivo antiaglomerante (MgO) e margem de T |
| Leito móvel em contracorrente | estagiamento natural do gás (§3.4), utilização de vapor alta | escoamento de sólidos a quente, pontes | **Recomendado** |
| Leito fixo em batelada (bancos de vasos) | simples, pressurizável, sem transporte a quente | ciclagem térmica, muitos vasos | Boa opção para piloto e para plantas pequenas |
| Rotativo | robusto a aglomeração | selagem sob pressão, perdas térmicas | Alternativa |

**Recomendação para piloto:** bancos de leito fixo pressurizados, operando em rodízio (um oxidando, um em purga, um em carga). Migrar para leito móvel na escala de demonstração.

### 8.2 O problema clássico: sinterização

Na literatura de *chemical looping*, Fe₂O₃ puro **perde 50–70% do rendimento de H₂ em menos de 10 ciclos** por sinterização, que colapsa a área específica e impede a redução profunda. A solução padrão é diluir com um suporte inerte:

| Suporte | Efeito | Problema |
|---|---|---|
| ZrO₂ | estabiliza retardando a formação de Fe metálico; bons resultados a 25+ ciclos | caro |
| Al₂O₃ (até 40% p/p) | rendimento estável por 40 ciclos | **forma espinélio FeAl₂O₄, que inibe a redução de Fe²⁺ a Fe⁰** — justamente o passo que gera H₂ |
| MgAl₂O₄, CeO₂, Na-β-Al₂O₃ | estabilidade térmica e química | diluem a densidade energética |

### 8.3 Por que esta arquitetura pode não precisar de suporte — e por que isso é a hipótese a testar primeiro

**Este é o argumento central de viabilidade do conceito, e ele é específico desta arquitetura:**

No *chemical looping* clássico, a **mesma partícula** é ciclada indefinidamente entre estados de oxidação — e degrada. Aqui, a etapa de carga não é uma redução gás-sólido: é uma **dissolução eletroquímica seguida de eletrodeposição**. O ferro é literalmente **desmontado átomo a átomo e reconstruído** a cada ciclo. A morfologia é regenerada por construção.

Consequências:
- **A sinterização deixa de ser cumulativa.** A degradação que mata o *chemical looping* é reiniciada a cada carga.
- **Suportes inertes podem ser desnecessários** — o que é providencial, porque eles seriam **incompatíveis com a eletrólise de qualquer forma**: ZrO₂/MgAl₂O₄ não se reduzem no cátodo, acumulariam no eletrólito ou na escória e teriam de ser purgados.
- O custo dessa regeneração é a cominuição/atomização (30 kWh/t ≈ 1% da entrada) e a perda de inventário por atrito.

**Mas:** isso é uma dedução, não um dado. **Nenhum laço eletrólise ↔ *steam-iron* foi ciclado experimentalmente na literatura aberta.** É por isso que o experimento nº 1 do roadmap (§15) é exatamente esse, e é por isso que ele deve preceder qualquer engenharia.

Riscos residuais que o experimento precisa medir:
- morfologia real do ferro eletrodepositado e cominuído (área BET, distribuição de poros) vs. a exigida pela cinética;
- acúmulo de impurezas (gangue do *make-up*, contaminantes do eletrólito, carbono se houver carbonatos) ao longo de dezenas de ciclos;
- perda de massa por ciclo (atrito, arraste, finos);
- reatividade residual da magnetita formada a 700 °C na re-dissolução eletrolítica (magnetita sinterizada dissolve mais devagar em NaOH que magnetita fresca — risco de queda de densidade de corrente ao longo dos ciclos).

### 8.4 Pureza do H₂ — uma vantagem subestimada

Sem carbono no laço, o gás de saída é **apenas H₂ + H₂O**. Após condensação e um secador simples, obtém-se **H₂ com pureza > 99,9%, sem CO, sem CO₂, sem enxofre** — apto para PEM sem PSA. Um reformador exige PSA (perda de 10–15% do H₂ e CAPEX significativo). Isso vale dinheiro real e deve entrar na comparação econômica.

**Atenção:** se a rota eletrolítica escolhida usar eletrólito de carbonato fundido, essa vantagem é perdida (contaminação por CO/CO₂). **Especificar laço isento de carbono.**

---

## 9. Manuseio, segurança e autodescarga

### 9.1 Piroforicidade — restrição de projeto, não detalhe

Ferro finamente dividido e recém-reduzido é **pirofórico**: energia mínima de ignição muito baixa, risco de explosão de pó e de autoaquecimento em pilha. É um problema conhecido e resolvido industrialmente (DRI/HBI), mas impõe:

- **inertização com N₂** em silos, transportadores e transferências (planta de N₂ on-site: PSA, ~0,1 kWh/Nm³);
- classificação de área, alívio de explosão, supressão, aterramento;
- controle de umidade (ponto de orvalho < −20 °C no gás de blanketing);
- procedimentos de passivação para manutenção.

Custo estimado: **US$ 2–4 M no caso de referência** (incluído em §11).

### 9.2 Autodescarga — a incógnita mais perigosa da tese sazonal

Ferro esponjoso reoxida lentamente com O₂ e umidade residual, e o DRI é notório por autoaquecimento em estocagem e transporte. **Se a autodescarga for de 1%/mês, o caso sazonal (6 meses de estoque) perde 6% — aceitável. Se for 1%/semana, a tese sazonal morre.**

Não há dado publicado para pó de ferro poroso de alta área específica sob N₂ seco por meses. **Isso precisa ser medido — é o experimento nº 2 do roadmap.** Mitigações conhecidas:

| Mitigação | Efeito | Custo |
|---|---|---|
| Blanketing de N₂ seco | reduz drasticamente | operacional, baixo |
| Passivação superficial controlada (camada fina de óxido) | reduz reatividade | perde alguns % de capacidade |
| Briquetagem (tipo HBI) | reduz muito a área exposta | **prejudica a cinética do *steam-iron*** — trade direto |
| Estoque em silo estanque com monitoramento de O₂/T | detecção precoce | baixo |

**Trade explícito:** área específica alta é boa para a descarga e ruim para o estoque. O ponto ótimo depende da duração do estoque — o que sugere **duas granulometrias**: material fino para ciclos curtos, briquetado para o estoque sazonal profundo, com uma etapa de moagem antes da descarga.

### 9.3 Escala do manuseio de sólidos

Para 10 MW_e de descarga: **11,5 t de Fe/h** circulando, mais 15,9 t/h de magnetita retornando. Uma planta de 100 MW_e movimenta ~115 t/h — porte de uma planta de DRI média, **operando ciclicamente**. Isso não é trivial e é subestimado em quase toda a literatura conceitual sobre "baterias de ferro". Transporte pneumático em fase densa sob N₂, silos com fluidização de fundo, válvulas rotativas pressurizadas.

---

## 10. Densidades e caso de referência

### 10.1 Densidades energéticas

| Métrica | Valor (caso base) |
|---|---|
| Energia elétrica recuperável | **0,882 kWh_e/kg Fe** |
| Energia química (H₂, PCI) | **1,604 kWh/kg Fe** |
| Energia térmica por combustão direta (Fe → Fe₂O₃) | 7,38 MJ/kg = 2,05 kWh_th/kg Fe |
| Densidade mássica de H₂ equivalente | **4,81% em massa** |
| Densidade volumétrica (leito a 3.500 kg/m³) | **3,09 MWh_e/m³** · **5,6 MWh_H₂/m³** · **168 kg H₂/m³** |

**Comparação volumétrica de H₂** — resultado notável:

| Vetor | kg H₂/m³ |
|---|---|
| **Fe (leito, este ciclo)** | **168** |
| NH₃ líquida | 121 |
| MgH₂ | ~110 |
| H₂ líquido (−253 °C) | 71 |
| H₂ a 700 bar | 42 (≈24 no sistema completo) |
| MCH (LOHC) | ~47 |

**Ressalva conceitual importante e frequentemente mal comunicada:** o ferro **não armazena hidrogênio** — ele armazena **poder redutor**, e o hidrogênio vem da água consumida no local da descarga. Isso significa que (a) o ferro não é um vetor de transporte de H₂ no sentido da amônia (o importador precisa fornecer 430 g de H₂O por kg de Fe, o que é trivial), e (b) para fins de LCA e MRV o hidrogênio é *produzido* na descarga, não *liberado* — a contabilidade é diferente. Ver §12.

### 10.2 Caso de referência A — LDES multi-dia (10 MW_e / 100 h = 1.000 MWh_e)

| Grandeza | Valor |
|---|---|
| Inventário ativo de Fe | 1.134 t → **1.150 t** |
| Massa no estado descarregado (Fe₃O₄) | 1.589 t |
| Volume de silos (Fe 329 m³ + Fe₃O₄ 611 m³ + 30% folga) | **~1.200 m³** |
| Vazão de sólidos em descarga | 11,5 t Fe/h |
| Vazão de H₂ | 553 kg/h = 18,4 MW (PCI) |
| Vapor circulante (λ=2) | 9,9 t/h |
| Carga térmica | 4,03 MW_th |
| TES de areia (24 h) | 96,7 MWh_th · 645 t · 403 m³ |
| Energia elétrica de carga por ciclo | **3.756 MWh_e** |
| Potência de eletrólise (carga em ~300 h de sol) | 12,5 MW_e |
| O₂ subproduto por ciclo | 439 t |
| Água de reposição por ciclo | ~49 t |

**O silo inteiro de 1.200 m³ cabe num quadrado de 20 × 20 m.** Para comparação, armazenar 1.000 MWh_e por bombeamento hidráulico com 100 m de queda exige ~13 milhões de m³ de água.

### 10.3 Caso de referência B — sazonal (10 MW_e / 1.000 h = 10 GWh_e)

| Grandeza | Valor |
|---|---|
| Inventário de Fe | **11.340 t** (≈ 6 horas de produção de Carajás) |
| Volume total de silos | ~12.000 m³ |
| Custo do meio | US$ 5,7 M |
| Blocos de potência | inalterados em relação ao caso A |

**Este é o ponto em que a arquitetura ganha da concorrência:** energia e potência são **totalmente desacopladas** (como numa bateria de fluxo, mas com meio a US$ 0,50/kWh). Multiplicar a duração por 10 multiplica o CAPEX por apenas 1,3.

---

## 11. CAPEX, OPEX e LCOS

### 11.1 CAPEX — caso A (10 MW_e / 1.000 MWh_e)

| Bloco | Base de custo | US$ M |
|---|---|---|
| Eletrólise alcalina, 12,5 MW_e | US$ 900/kW | 11,3 |
| Reator *steam-iron* + manuseio de sólidos | US$ 700/kW_e-out | 7,0 |
| SOFC 10 MW_e | US$ 1.500/kW | 15,0 |
| TES de areia, 97 MWh_th | US$ 5/kWh_th | 0,5 |
| Silos, transporte pneumático, inertização, planta de N₂ | *lump sum* | 3,0 |
| Inventário de Fe (1.150 t + 10%) | US$ 500/t | 0,63 |
| Tratamento de água, condensadores, utilidades | *lump sum* | 2,5 |
| **Subtotal** | | **39,9** |
| EPC + contingência (25%) | | 10,0 |
| **TOTAL** | | **≈ US$ 50 M** |

⇒ **US$ 4.990/kW_e** · **US$ 50/kWh_e** · *dos quais o meio de estoque é US$ 0,55/kWh (1,1%)*

### 11.2 LCOS

| Componente (US$ M/ano) | 20 ciclos/ano, PV a US$25 | 20 ciclos, curtailment US$5 | 40 ciclos, curtailment US$5 |
|---|---|---|---|
| Anuidade de capital (CRF 0,09368) | 4,68 | 4,68 | 4,68 |
| O&M (3,5% do CAPEX) | 1,75 | 1,75 | 1,75 |
| Reposição de Fe (1%/ciclo) | 0,12 | 0,12 | 0,23 |
| Eletricidade | 1,88 | 0,38 | 0,75 |
| **Total** | **8,43** | **6,93** | **7,41** |
| Energia entregue (MWh/ano) | 20.000 | 20.000 | 40.000 |
| **LCOS** | **US$ 421/MWh** | **US$ 346/MWh** | **US$ 185/MWh** |

### 11.3 Comparação com alternativas (10 MW / 100 h, 20 ciclos/ano)

| Tecnologia | RTE | CAPEX energia | LCOS estimado | Observação |
|---|---|---|---|---|
| **Este ciclo** | 27% | US$ 50/kWh | **US$ 346–421/MWh** | Blocos de potência dominam |
| Li-ion (LFP) | 86% | US$ 100/kWh | ~US$ 724/MWh | Inviável em 100 h e poucos ciclos |
| Ferro-ar (Form Energy), preço hoje | 40–50% | ~US$ 77/kWh (implícito) | ~US$ 500/MWh | Primeiros sistemas GWh em 2026 |
| Ferro-ar, custo-alvo | 40–50% | US$ 20/kWh | **~US$ 192/MWh** | **Concorrente direto e melhor** em e→e |
| H₂ + caverna de sal + SOFC | 35–40% | US$ 1–10/kg H₂ | US$ 150–250/MWh | **Só onde há geologia salina** |
| H₂ + cilindros pressurizados + SOFC | 35–40% | US$ 400–700/kg H₂ | > US$ 600/MWh | Inviável em longa duração |
| PSH (100 m de queda) | 78% | — | US$ 80–150/MWh | Exige topografia e água |

**Conclusão dura e necessária:** para **eletricidade entra / eletricidade sai**, a bateria ferro-ar (mesma química, ambas as etapas eletroquímicas, sem H₂ no meio) é estruturalmente superior — RTE ~45% contra 27%, um bloco de potência em vez de três. **Não construa este sistema para fazer arbitragem elétrica.**

### 11.4 A comparação que realmente importa: custo de estocar H₂

| Rota de estoque de H₂ | US$/kg H₂ de capacidade | Restrição |
|---|---|---|
| **Poder redutor em Fe (este ciclo)** | **25–35** | nenhuma (qualquer lugar) |
| Caverna de sal | 1–10 | geologia — no Brasil, só Sergipe/Alagoas |
| Caverna rochosa revestida | 30–60 | geologia |
| Tanque de H₂ líquido | 50–100 | *boil-off* 0,3–1%/dia — inviável sazonal |
| Cilindros 200–500 bar | 400–700 | — |
| Amônia (como intermediário) | 5–15 | + custo de síntese e cracking, toxicidade |

E o custo energético dessa vantagem:

| | Eletrólise da água (alcalina/PEM) | **Este ciclo** |
|---|---|---|
| kWh_e/kg H₂ | 52–55 | **68** |
| Penalidade | — | **+23 a 30%** |
| Custo extra a US$ 25/MWh | — | **+US$ 0,35/kg H₂** |
| Custo de estocar 30 dias de produção | US$ 400–700/kg | **US$ 25–35/kg** |

**Este é o cerne da tese.** Paga-se US$ 0,35/kg H₂ a mais na produção para economizar **uma ordem de grandeza** na estocagem. Para qualquer offtaker de H₂ que precise de firmeza sazonal e não tenha caverna de sal debaixo dos pés, a conta fecha. Para produção *just-in-time* acoplada a demanda contínua, não fecha — use eletrólise da água.

---

## 12. Pegada de carbono, MRV e governança

### 12.1 Contabilização no GHG Protocol

| Fluxo | Tratamento |
|---|---|
| Eletricidade PV de carga | **Escopo 2**. Usar abordagem *market-based* com certificação da própria usina (I-REC/CBIO), evitando dupla contagem com a venda de atributos. |
| Inventário de Fe em estoque | **Não é emissão nem remoção.** É um estoque de energia. Reportar como ativo físico em nota, nunca no inventário de GEE. |
| *Make-up* de minério/ferro (1%/ciclo) | **Escopo 3, categoria 1** (bens comprados), com fator do fornecedor. |
| O₂ e H₂ vendidos | Alocação por energia ou por valor econômico — **declarar o método**, pois muda a intensidade reportada em até 15%. |
| Emissões diretas | ~zero (sem carbono no laço). Verificar N₂O/NOx se houver combustão de H₂ em turbina. |

### 12.2 Elegibilidade como hidrogênio de baixo carbono

Intensidade estimada: 67,9 kWh_e/kg H₂ × ~40 gCO₂e/kWh (LCA de PV, incluindo módulos) = **≈ 2,7 kgCO₂e/kg H₂**, mais a amortização do inventário de ferro (desprezível após dezenas de ciclos).

Isso está confortavelmente abaixo do limiar de **7 kgCO₂e/kg H₂** da Lei 14.948/2024 (Marco Legal do Hidrogênio de Baixo Carbono) — *verificar a redação vigente do limiar e a metodologia de certificação (SBCH₂) antes de assumir elegibilidade em modelagem financeira*. Também abaixo dos limiares típicos de RFNBO europeus, sujeito a adicionalidade e correlação temporal/geográfica.

### 12.3 CBAM e o ferro como produto

Se parte do inventário for vendida como ferro metálico:

| Rota | tCO₂/t de aço bruto |
|---|---|
| BF-BOF (alto-forno) | 1,8–2,2 |
| DRI-EAF com gás natural | 1,0–1,4 |
| **Eletrólise com PV (este ciclo)** | **0,1–0,3** |

Com o regime definitivo do CBAM em vigor desde 2026, a diferença de intensidade se converte diretamente em prêmio de preço no mercado europeu. Isso cria a **opcionalidade** que sustenta a tese econômica: quando o preço da energia estiver baixo e o do ferro verde alto, vende-se ferro; quando o inverso, descarrega-se energia. **Um armazenamento cujo meio é um commodity vendável tem um piso de valor que nenhuma bateria tem.**

### 12.4 Requisitos de MRV específicos

Um sistema desta natureza exige rastreio que os inventários convencionais não preveem:

1. **Balanço de inventário de ferro** (entrada, saída, perdas, estado de oxidação médio) — é simultaneamente o "estado de carga" e um ativo material;
2. **Medição do estado de carga**, que não é trivial: proposta é balanço cumulativo de Coulombs na carga + medição de H₂ na descarga + amostragem periódica por análise química/magnética do leito;
3. **Correlação temporal** entre geração PV e consumo de eletrólise (requisito de RFNBO e de certificação de H₂);
4. **Segregação de atributos** entre o H₂, o O₂, o calor e o ferro vendidos.

> **Nota sobre este repositório:** os itens 1–4 são exatamente o tipo de fluxo que a plataforma `carbonette-governance` trata (empresas, inventários, registros de emissão, séries temporais). Um projeto desses seria modelado como uma entidade com um inventário de escopo 2 dominante, um estoque físico rastreado fora do inventário de GEE e múltiplas alocações de atributo por produto. Se houver interesse, isso vira um caso de uso concreto de produto.

---

## 13. Contexto brasileiro

### 13.1 Curtailment: o argumento mais forte a favor do projeto

Dados verificados em julho de 2026:

- Em 2025, o *constrained-off* de fontes renováveis atingiu **20,7% da geração eólica e solar**, com perda estimada de **R$ 6,5 bilhões**.
- Entre janeiro e abril de 2026, os cortes médios foram de **1.806 MW médios (eólica)** e **1.037 MW médios (solar)**.
- O Nordeste concentra **2.233 MW médios** de corte no mesmo período.
- Em **28 de junho de 2026**, o ONS registrou restrição máxima de **14.278 MW** de geração renovável no Nordeste — o equivalente à capacidade instalada de Itaipu.

Essa energia tem **custo marginal próximo de zero e não tem para onde ir**. Um consumidor de 12,5 MW co-localizado que absorva excedente de forma modulável, com produto estocável indefinidamente e vendável em quatro mercados, é exatamente o que falta. É também o argumento que transforma a linha "US$ 5/MWh" de §11.2 de otimismo em premissa realista.

### 13.2 Recurso e localização

Irradiância no oeste da Bahia / sul do Piauí: 5,5–6,2 kWh/m²/dia; fator de capacidade PV de 28–32%; LCOE de R$ 120–180/MWh. Critérios de sítio, em ordem: (1) nó com curtailment estrutural; (2) disponibilidade de água desmineralizável (pouca, mas confiável); (3) logística de sólidos (ferrovia/rodovia para o *make-up* e para a venda de ferro); (4) proximidade de demanda industrial de H₂ ou calor.

### 13.3 Cadeia de suprimento e institucional

- **Minério:** para o laço Fe/Fe₃O₄, itabiritos magnetíticos de Minas Gerais são a base natural; a hematita de Carajás (65–67% Fe, gangue baixa) é ideal para a carga inicial e para *make-up*, com conversão no primeiro ciclo.
- **Vale + Boston Metal:** a aproximação institucional (ex-CEO da Vale no conselho da Boston Metal desde 2025) sinaliza que a eletrólise de minério tem um caminho industrial brasileiro. Isso importa mais para a rota MOE do que para a alcalina.
- **Marco regulatório de H₂:** Lei 14.948/2024 e programa de incentivos correlato criam crédito fiscal e certificação. **Verificar prazos e regulamentação da ANP/MME vigentes.**
- **Mercado de capacidade:** os leilões de reserva de capacidade abriram espaço para armazenamento; um ativo de 100 h de duração tem um perfil de confiabilidade que baterias de 4 h não têm. **Verificar as regras do certame vigente antes de modelar receita.**

---

## 14. Maturidade e gargalos críticos

### 14.1 TRL por componente

| Componente | TRL | Evidência |
|---|---|---|
| Eletrólise alcalina de minério (Volteron™) | **5–6** | Piloto Maizières; industrialização com John Cockerill |
| MOE (Boston Metal) | **6–7** | Célula industrial multi-anodo comissionada 2025; demo em 2026 |
| *Steam-iron* / *chemical looping* H₂ | **5–6** | Extensa literatura, pilotos universitários |
| TES de areia/partículas | **7–8** | Polar Night Energy e Rondo comerciais; NREL ENDURING demonstrado |
| SOFC de MW | **7–8** | Comercial |
| Manuseio de Fe reduzido em escala | **9** | DRI/HBI, indústria madura |
| **Laço integrado eletrólise ⇄ *steam-iron*** | **2–3** | **Nenhuma demonstração integrada publicada** |

**A lacuna é a integração, não os componentes.** Todos os blocos existem em TRL ≥ 5. Nenhum foi conectado.

### 14.2 Gargalos críticos, em ordem de risco

| # | Gargalo | Severidade | Como resolver |
|---|---|---|---|
| 1 | **Estabilidade cíclica do inventário sem suporte inerte** (§8.3). Se a regeneração eletroquímica não resetar a sinterização, o conceito não fecha, porque os suportes que resolvem são incompatíveis com a eletrólise. | **Fatal se falhar** | Experimento nº 1: 100 ciclos acoplados em bancada |
| 2 | **Autodescarga em estoque de meses** (§9.2). Nunca medida. Define se a tese sazonal existe. | **Fatal para o caso sazonal** | Experimento nº 2: células de estoque instrumentadas, 12 meses |
| 3 | **Descasamento de morfologia** entre placa eletrodepositada e pó poroso reativo | Alta | Eletrodeposição dendrítica em alta sobretensão; ou rota MOE + atomização; ou aceitar o custo da cominuição |
| 4 | **Aglomeração/defluidização** do Fe metálico no reator | Alta | Leito móvel ou fixo em vez de fluidizado; aditivo MgO; teto de temperatura |
| 5 | **Utilização de vapor** e carga de condensação (§3.4) | Média | Contracorrente estagiada; operar Fe/FeO; recuperador de alta eficácia |
| 6 | **RTE de 27%** torna o caso e→e não competitivo | Média (redefine o produto, não mata) | Reposicionar como ativo de H₂ + ferro verde |
| 7 | **CAPEX de US$ 5.000/kW** dos três blocos de potência | Média | Sobrepor funções: usar o mesmo bloco para venda de H₂ e de ferro, elevando o fator de utilização |
| 8 | **Piroforicidade e explosão de pó** em escala de 100 t/h | Média | Prática consolidada de DRI/HBI; custo, não incerteza |
| 9 | Acúmulo de gangue e impurezas no laço | Média | Sistema de purga e refino do eletrólito |
| 10 | Reciclagem incompleta do NaOH / degradação do eletrólito | Baixa-média | Prática de eletroextração |

---

## 15. Roadmap com portões de decisão

| Fase | Duração | Investimento | Escopo | **Portão de decisão** |
|---|---|---|---|---|
| **0 — Fundamentos** | 6–12 meses | R$ 1–3 M | Termodinâmica rigorosa (FactSage/HSC) em T real; modelo de processo (Aspen Plus) com o balanço de §4; TGA e leito fixo de 1–10 g; escolha definitiva do par redox e da T; validação dos limites de equilíbrio de §3.4 | Rendimento de H₂ > 85% do teórico **e** utilização de vapor > 50% por passe |
| **1 — Prova do laço** *(a fase que decide tudo)* | 12–24 meses | R$ 10–25 M | Célula alcalina de 100–500 cm² acoplada a reator de leito fixo de 1–5 kg. **100 ciclos completos.** Medir: rendimento de H₂ por ciclo, energia específica, área BET, perda de massa, acúmulo de impurezas, velocidade de dissolução da magnetita ciclada. **Em paralelo: ensaio de autodescarga de 12 meses** (gargalo nº 2) | Degradação de capacidade < 20% em 100 ciclos **e** perda de inventário < 1%/ciclo **e** autodescarga < 1%/mês. **Se falhar aqui, encerrar o programa.** |
| **2 — Piloto integrado** | 24–42 meses | R$ 80–200 M | 250 kW_e / 25 MWh acoplado a PV real + TES de areia + SOFC. Operação por 12 meses com perfil solar real, incluindo um ciclo sazonal completo. Reator pressurizado. Sistema de N₂ e segurança de pó | RTE medido > 25%; disponibilidade > 85%; segurança sem incidentes; CAPEX extrapolado < US$ 4.000/kW |
| **3 — Demonstração comercial** | 42–72 meses | R$ 600 M – 1,5 B | 10 MW / 1 GWh em usina solar do NE com curtailment estrutural. Contratos de offtake de H₂ **e** de ferro verde. Certificação SBCH₂ e CBAM | Decisão final de investimento |

**Recomendação de sequenciamento:** as Fases 0 e 1 custam menos de R$ 30 M e respondem à pergunta que determina se as Fases 2 e 3 fazem sentido. **Não financie a Fase 2 antes do portão da Fase 1.** O risco de gastar R$ 150 M num piloto cujo inventário degrada em 30 ciclos é real e evitável por R$ 25 M.

---

## 16. Registro de riscos

| Risco | Prob. | Impacto | Mitigação | Dono |
|---|---|---|---|---|
| Inventário degrada apesar da regeneração eletroquímica | Média | Fatal | Portão da Fase 1; plano B com suporte parcialmente reciclável | P&D |
| Autodescarga inviabiliza o caso sazonal | Média | Alto (redefine para multi-dia) | Ensaio de 12 meses; briquetagem para estoque profundo | P&D |
| Ferro-ar (Form Energy) atinge US$ 20/kWh e domina LDES | **Alta** | Alto no caso e→e, **nulo no caso H₂** | Posicionar o produto em H₂ + ferro verde, não em arbitragem elétrica | Estratégia |
| Curtailment é resolvido por transmissão antes da FID | Média | Alto (remove energia barata) | Modelar com PV dedicado a US$ 25/MWh como caso base, curtailment como *upside* | Estratégia |
| Prêmio de ferro verde/CBAM não se materializa | Média | Médio | Não depender dele no caso base | Comercial |
| Incidente com pó pirofórico | Baixa | Alto | Padrões de DRI/HBI, inertização, projeto ATEX | HSE |
| Eletrólise alcalina não escala com ciclagem intensa (fadiga de eletrodo) | Média | Médio | Ensaio de ciclagem acelerada na Fase 1 | P&D |
| Custo da SOFC não cai | Média | Médio | Alternativa: motor a H₂ (−RTE, −CAPEX); ou vender H₂ e não gerar eletricidade | Engenharia |
| Regulação de H₂ de baixo carbono muda limiar/metodologia | Média | Médio | Margem de 2,7 vs 7 kgCO₂e/kg é confortável | Regulatório |

---

## 17. Conclusão e recomendação

O ciclo é **termodinamicamente coerente e engenharilmente construível**. Todos os blocos estão em TRL ≥ 5 e nenhuma lei física é violada. A física fecha nos seguintes números: 3,27 kWh_e por kg de Fe na entrada, 48,1 g de H₂ na saída, 27% de RTE elétrico, 49% de eficiência para H₂, 168 kg de H₂ por m³ de leito, US$ 0,50 por kWh de meio de estoque.

**O que fazer com isso depende inteiramente de como o produto é definido:**

❌ **Como bateria de rede (eletricidade → eletricidade): não persiga.** 27% de RTE e três blocos de potência caros perdem para a bateria ferro-ar, que faz a mesma química sem o desvio pelo hidrogênio. O LCOS de US$ 346–421/MWh não é competitivo e não há caminho plausível de melhoria que feche essa lacuna.

✅ **Como estoque sazonal de hidrogênio de baixo carbono: é uma das melhores opções disponíveis fora de cavernas de sal.** Uma ordem de grandeza mais barato que qualquer estocagem pressurizada, em condição ambiente, sem *boil-off*, sem permeação, sem geologia, com H₂ de pureza direta de PEM, com consumo líquido de água próximo de zero e ao custo de +23% de eletricidade por kg de H₂. Para um produtor de H₂ que precise atravessar a estação seca ou entregar firmeza contratual, essa é a proposta de valor.

✅ **Como ativo de opcionalidade sobre energia cortada no Nordeste: é a tese mais forte.** Um ativo que converte 20,7% de geração renovável hoje desperdiçada em um estoque que pode virar eletricidade firme, H₂ certificado, calor industrial ou ferro verde exposto ao CBAM tem um perfil de risco fundamentalmente melhor que um armazenamento de produto único. O meio de estoque é um commodity com mercado próprio — o ativo tem piso de valor.

**Recomendação operacional imediata, em ordem:**

1. **Reposicione a narrativa** de "armazenamento de longa duração" para "**estoque sólido sazonal de hidrogênio e ferro verde a partir de energia cortada**". Isso não é marketing: muda os KPIs, o dimensionamento e quem é o offtaker.
2. **Adote o par Fe/FeO** como caso de projeto (§3.4) e **reator pressurizado** (§3.5). São duas decisões gratuitas que melhoram utilização de vapor, cinética e eliminam a compressão.
3. **Adote a rota alcalina de baixa temperatura**, não MOE, pela tolerância à intermitência (§6.3).
4. **Dimensione a TES de areia como componente de flexibilidade** (12% da entrada energética, ~1% do CAPEX), com a cascata exergética de §5.1: exotermia → recuperação → calor da SOFC → resistência elétrica.
5. **Execute as Fases 0 e 1 antes de qualquer outra coisa.** Menos de R$ 30 M respondem às duas perguntas (estabilidade cíclica e autodescarga) que determinam se o resto existe. Nenhuma delas tem resposta na literatura publicada.

---

## Anexo A — Fórmulas de reprodução

```
Carga elétrica por kg de Fe:      Q [Ah/kg] = (1000/55,845) · n_e · 96485 / 3600
Energia de eletrólise:            E [kWh/kg] = Q · V_célula / η_faradaica / 1000
Tensão reversível:                E° [V] = ΔG° [J/mol Fe] / (n_e · 96485)
H₂ por kg de Fe:                  m_H2 [g/kg] = (1000/55,845) · (n_e/2) · 2,016
Energia do H₂ (PCI):              E_H2 [kWh/kg Fe] = m_H2/1000 · 33,33
Vapor estequiométrico:            m_H2O [g/kg Fe] = (1000/55,845) · (n_e/2) · 18,015
O₂ na carga:                      m_O2 [g/kg Fe] = (1000/55,845) · (n_e/4) · 32,00
RTE:                              η = E_H2 · η_conversor / E_entrada,total
Conversão máx. de vapor:          X = 1/(1+K), K = exp(−ΔG(T)/RT), ΔG(T)=ΔH°−T·ΔS°
Densidade volumétrica:            ρ_E [kWh/m³] = ρ_bulk [kg/m³] · e [kWh/kg]
LCOS:                             (CRF·CAPEX + O&M + reposição + energia) / MWh entregues
```

Com n_e = 2 (Fe/FeO), 8/3 (Fe/Fe₃O₄) ou 3 (Fe/Fe₂O₃) elétrons por átomo de Fe.

## Anexo B — Itens a verificar antes de engenharia básica

1. Fronteira FeO/Fe₃O₄ do diagrama de Baur–Glaessner em 600–800 °C via FactSage/HSC (§3.4) — o cálculo por extrapolação de ΔS de 298 K não é confiável para esta fronteira.
2. Consumo específico do Volteron™/SIDERWIN **em base magnetita**, não hematita (§3.1).
3. Limiar vigente de intensidade de carbono e metodologia de certificação de hidrogênio de baixo carbono no Brasil (§12.2).
4. Regras do certame de reserva de capacidade vigente quanto a duração mínima e remuneração de armazenamento (§13.3).
5. Curvas de preço de SOFC de MW e de células de eletroextração de ferro em base cotada, não estimada (§11.1).
6. Dados de reoxidação de pó de ferro poroso sob N₂ seco em escala de meses — provavelmente inexistentes; ver §9.2.

## Anexo C — Fontes consultadas

- [Boston Metal comissiona célula industrial de MOE](https://www.bostonmetal.com/news/boston-metal-celebrates-historic-commissioning-run-of-moe-green-steel-cell/) · [nota à imprensa](https://www.globenewswire.com/news-release/2025/03/12/3041404/0/en/boston-metal-commissions-industrial-scale-cell-in-crucial-green-steel-milestone.html) · [MIT Technology Review, mai/2026](https://www.technologyreview.com/2026/05/20/1137523/boston-metal-funding-critical-metals/)
- [SIDERWIN — ArcelorMittal](https://corporate.arcelormittal.com/corporate-library/reporting-hub/siderwin-reducing-iron-ore-via-electrolysis) · [documento técnico](https://storagearcelormittalprod.blob.core.windows.net/media/qjllndv5/siderwin-content-final.pdf) · [Volteron™ / John Cockerill](https://corporate.arcelormittal.com/media/press-releases/arcelormittal-and-john-cockerill-announce-plans-to-develop-world-s-first-industrial-scale-low-temperature-iron-electrolysis-plant) · [ficha técnica UE](https://innovation-centre-for-industrial-transformation.ec.europa.eu/innovative-techniques/low-temperature-electrolysis-iron-ore-aqueous-alkaline-solution-volterontm)
- [Estabilidade cíclica do steam-iron: Al₂O₃, MgO, CeO₂](https://www.sciencedirect.com/science/article/abs/pii/S0360319921036624) · [Fe₂O₃ suportado em ZrO₂ (MIT)](https://ecm.mit.edu/pubs/articles/10.1021_acs.jpcc.6b05276.pdf) · [Na-β-Al₂O₃ estabilizando Fe₂O₃](https://pmc.ncbi.nlm.nih.gov/articles/PMC9113212/)
- [NREL ENDURING — TES em partículas a US$2–4/kWh_th](https://www.nrel.gov/grid/news/program/2021/nrel-options-a-modular-cost-effective-build-anywhere-particle-thermal-energy-storage-technology) · [SolarPACES sobre armazenamento em areia](https://www.solarpaces.org/nrel-results-support-cheap-long-duration-energy-storage-in-hot-sand/) · [custos de US$4–10/kWh](https://energypost.eu/batteries-made-of-super-hot-sand-for-long-duration-grid-storage-at-4-to-10-per-kwh/)
- [Form Energy — tecnologia ferro-ar](https://formenergy.com/technology/battery-technology/) · [acordo com Google e trade-off de eficiência](https://www.energy-storage.news/google-bets-big-on-30gwh-of-form-energys-iron-air-battery-storage-despite-efficiency-trade-offs/)
- [ONS — diagnóstico e perspectiva dos cortes de geração](https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/RT%20DGL-ONS%200189-2025%20-%20GT%20Curtailment%20rev1.pdf) · [curtailment supera 20% em 2025](https://www.alemdaenergia.engie.com.br/curtailment-supera-20-da-geracao-eolica-e-solar-em-2025/) · [cortes em 2026](https://canalsolar.com.br/brasil-cortou-tres-gw-medios-energia-solar-eolica/) · [pico de 14,3 GW no NE](https://www.poder360.com.br/poder-energia/curtailment-no-nordeste-atinge-o-equivalente-a-uma-itaipu/) · [dados abertos ONS](https://dados.ons.org.br/dataset/restricao_coff_eolica_usi)
