# Planta de Fertilizante Nitrogenado (Amônia) — Documento de Bases de Projeto

**Módulo:** Simulador de Processo e Virtualização — Carbonette
**Rota:** `/plant-simulator`
**Revisão:** 0 — Estudo conceitual (FEL-1)

---

## 1. Objetivo e escopo

Planta de produção de amônia anidra (NH₃) — matéria-prima base dos fertilizantes
nitrogenados (ureia, nitrato de amônio, MAP/DAP) — com capacidade configurável de
**50 a 1.500 t/dia**, contemplando:

- **Área 100 — Geração de H₂**: eletrólise (PEM, alcalina ou SOEC — amônia verde) ou
  reforma a vapor de gás natural (SMR — amônia cinza);
- **Área 200 — Geração de N₂**: unidade de separação de ar (ASU) criogênica;
- **Área 300 — Compressão** do gás de make-up;
- **Área 400 — Loop de síntese Haber-Bosch**: reator multi-leito, caldeira de
  recuperação, condensação por refrigeração, separação e reciclo com purga;
- **Área 500 — Tancagem e expedição**: tanque refrigerado a -33 °C;
- **Utilidades e off-sites**: subestação, torre de resfriamento, água desmi,
  flare, sala de controle.

## 2. Química e termodinâmica do processo

### 2.1 Reação de síntese

```
N2 + 3 H2  ⇌  2 NH3        ΔH°298 = -91,8 kJ/mol N2 (exotérmica)
```

Reação com redução do número de mols — favorecida por **alta pressão** e
**baixa temperatura** (Le Chatelier). Como o catalisador de ferro só tem
atividade prática acima de ~350–400 °C, o projeto opera no compromisso
cinética × equilíbrio: **400–500 °C e 100–300 bar**.

### 2.2 Modelos implementados no simulador (`src/lib/plant/thermo.ts`)

| Fenômeno | Modelo | Referência |
|---|---|---|
| Constante de equilíbrio Ka(T) | Correlação de Gillespie & Beattie (meia-reação, elevada ao quadrado) | Gillespie & Beattie, *Phys. Rev.* 36 (1930) |
| Não-idealidade do gás | Coeficientes de fugacidade φ(T,P) por espécie | Dyson & Simon, *I&EC Fund.* 7 (1968) |
| Conversão por passe | Aproximação ao equilíbrio (60–95%, ajustável) sobre a conversão de equilíbrio resolvida por bissecção | prática industrial (ΔT de approach) |
| Pressão de vapor NH₃ | Equação de Antoine | NIST WebBook |
| Compressão | Adiabática multiestágio com intercooling, razão máx. 2,6/estágio, η politrópico 0,78 | GPSA Engineering Data Book |
| Refrigeração | Ciclo de NH₃, COP 1,9 | prática industrial |

### 2.3 Loop de síntese (`src/lib/plant/simulation.ts`)

O balanço do loop é resolvido por **iteração de ponto fixo com amortecimento**:

1. conversão por passe a partir do equilíbrio na composição corrente;
2. condensação de NH₃ no separador — o NH₃ residual no gás segue o equilíbrio
   líquido-vapor (`p_sat(T_sep)/P_loop`);
3. purga (0,5–12%) controla o acúmulo de inertes (Ar da ASU, CH₄ do SMR);
4. make-up de H₂ repõe consumo + perdas; o make-up de N₂ é **controlado para
   manter H₂:N₂ = 3:1** na entrada do reator (sem essa âncora a razão do loop
   tem estabilidade neutra — exatamente como na planta real, onde há malha de
   controle dedicada).

Resultados típicos (300 t/d, PEM, 200 bar, 450 °C, separador a -10 °C, purga 3%):

| Grandeza | Valor | Faixa típica de literatura |
|---|---|---|
| Conversão por passe | ~34% | 25–35% |
| NH₃ na saída do reator | ~20% | 15–20% |
| Razão de reciclo | ~2,0 | 1,5–3 |
| Inertes no loop | ~5,6% | 4–12% |
| Consumo específico (verde, PEM) | ~11,0 MWh/t | 9,5–11 MWh/t |
| Consumo SMR (gás natural) | 26,5 GJ/t | 26–33 GJ/t |

## 3. Balanço de massa (base 300 t/d)

- **H₂:** ~2,35 t/h (estequiométrico 2,21 + perdas na purga)
- **N₂:** ~10,9 t/h — ASU criogênica, pureza 99,999%
- **Água desmineralizada (eletrólise):** ~24 m³/h (10 L/kg H₂)
- **Produto:** 12,5 t/h NH₃ líquida a -33 °C

## 4. Balanço de energia

| Sistema | Ordem de grandeza (300 t/d, PEM) |
|---|---|
| Eletrolisadores | ~125 MW (93% do total) |
| ASU | ~1,2 MW |
| Compressor de make-up | ~4–5 MW |
| Compressor de reciclo | ~0,5 MW |
| Refrigeração NH₃ | ~4–5 MW |
| Utilidades/BOP | ~3,5% do processo |
| **Total** | **~137 MW** |
| Calor de reação recuperado | ~9,4 MW (vapor HP na E-403, crédito de 55%) |

## 5. Engenharia mecânica

- **Reator R-401**: vaso ASME VIII Div. 2, aço 2¼Cr-1Mo (SA-542) conforme curvas
  de Nelson (API 941 — ataque por H₂ a quente). Espessura pela fórmula de casca
  cilíndrica `t = P·R/(S·E − 0,6P) + CA`. Leitos radiais com resfriamento
  inter-leitos (quench ou trocadores internos).
- **Catalisador**: magnetita promovida (Fe₃O₄/K₂O/Al₂O₃/CaO), SV ≈ 12.000 Nm³/(m³·h).
- **Compressores**: centrífugos multiestágio (BB), acionamento elétrico com VFD
  (rota verde) ou turbina a vapor (rota SMR, usando o vapor da WHB).
- **Tanque TQ-501**: API 620 Anexo R, parede dupla, refrigerado a -33 °C,
  autonomia de 15 dias.

## 6. Engenharia elétrica

- Entrada em **230 kV / 138 kV / 34,5 kV** conforme porte; transformadores N+1.
- Distribuição em 13,8 kV → 4,16 kV (motores grandes) → 480 V (CCMs).
- Retificadores/transformadores dedicados aos eletrolisadores.
- Gerador diesel de emergência para cargas essenciais e parada segura.
- Estudos requeridos: curto-circuito, seletividade, partida de motores,
  qualidade de energia (harmônicos dos retificadores), aterramento e SPDA.

## 7. Engenharia civil

- Fundações profundas (estacas) sob reator, compressores e tanque;
- Bacias de contenção da tancagem (NBR 17505 / NR-20);
- Pipe-racks metálicos (NBR 8800), prédios de eletrólise, subestação e COI;
- Quantitativos paramétricos (expoente de escala 0,6) expostos no simulador.

## 8. Instrumentação, automação e segurança

- SDCD + **SIS SIL-3** (IEC 61511) com ESD do loop e do estoque de NH₃;
- Analisadores em linha (H₂:N₂, NH₃, O₂ na eletrólise);
- Detecção de NH₃ (toxicidade) e H₂ (inflamabilidade) — IEC 60079;
- Flare para despressurização de emergência;
- Estudos HAZOP/LOPA por nó de processo nas fases seguintes.

## 9. Estimativa de investimento

CAPEX **classe 5 (AACE, ±40%)** com curva de escala: ~1.350 USD/(t·ano) para rota
verde e ~950 USD/(t·ano) para SMR, na base 300 t/d.

## 10. Roadmap de desenvolvimento do projeto

| Fase | Entregável | Status |
|---|---|---|
| FEL-1 | Simulador de processo, bases de projeto (este documento) | ✅ implementado |
| FEL-2 | Simulação rigorosa (Aspen/HYSYS), PFDs revisados, plot plan | próximo |
| FEL-3 | P&IDs, folhas de dados de compra, HAZOP, CAPEX classe 3 | — |
| EPC | Detalhamento, construção, comissionamento | — |

## 11. Estrutura do código

```
src/lib/plant/
  thermo.ts        # equilíbrio, fugacidade, Antoine, compressão
  simulation.ts    # balanço de massa/energia, dimensionamentos, CAPEX
src/components/plant/
  PlantControlPanel.tsx     # parâmetros de processo (sliders/seleções)
  PlantFlowsheet.tsx        # PFD animado (SVG) com valores ao vivo
  Plant3DView.tsx           # plot plan isométrico 3D (SVG)
  PlantEnergyPanel.tsx      # KPIs + cargas elétricas + balanço térmico
  PlantChartsPanel.tsx      # curvas de equilíbrio e sensibilidade
  PlantStreamsTable.tsx     # tabela de correntes
  PlantEngineeringPanel.tsx # folhas de dados, disciplinas, normas
src/pages/PlantSimulator.tsx
```
