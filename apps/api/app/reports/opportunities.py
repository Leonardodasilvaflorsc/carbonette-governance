"""Templates de "Oportunidades de redução" por setor (parametrizáveis).

Conteúdo comercial-técnico do dossiê (E5) — texto de partida editável por
instância white-label. Sem promessas quantitativas: faixas típicas da
literatura, sempre condicionadas a diagnóstico.
"""

DEFAULT_OPPORTUNITIES: dict[str, list[dict[str, str]]] = {
    "steel": [
        {"title": "Eficiência energética em fornos e laminação",
         "body": "Recuperação de calor residual, controle avançado de combustão e motores de alta eficiência — reduções típicas de 5–15% no consumo térmico."},
        {"title": "Substituição de combustível e injeção de H₂",
         "body": "Gás natural ou hidrogênio verde em substituição parcial ao carvão/coque, com rota DRI-H₂ como horizonte de descarbonização profunda."},
        {"title": "Aproveitamento de gases de processo",
         "body": "Captura e uso energético de gases de aciaria/alto-forno hoje queimados em flare."},
    ],
    "cement": [
        {"title": "Combustíveis alternativos (coprocessamento)",
         "body": "Substituição de coque de petróleo por biomassa e resíduos qualificados no forno de clínquer."},
        {"title": "Redução do fator clínquer",
         "body": "Adições (escória, cinza volante, argila calcinada LC3) reduzindo CO₂ de processo por tonelada de cimento."},
        {"title": "Captura de CO₂ (CCUS)",
         "body": "Pré-viabilidade de captura no forno — o CO₂ de calcinação só é abatível por CCUS."},
    ],
    "power": [
        {"title": "Repotenciação e despacho híbrido",
         "body": "Integração solar/eólica + armazenamento para reduzir fator de capacidade fóssil."},
        {"title": "Eficiência do ciclo térmico",
         "body": "Modernização de turbinas/caldeiras e redução de perdas auxiliares."},
    ],
    "solid-waste-disposal": [
        {"title": "Captura e aproveitamento de biogás",
         "body": "Poços de captação, queima controlada e geração de energia/biometano — reduções de 50–90% do CH₄ fugitivo, com receita associada."},
        {"title": "Cobertura e gestão de células",
         "body": "Cobertura diária otimizada e oxidação em camadas de topo para abater emissões difusas."},
    ],
    "oil-and-gas-production": [
        {"title": "LDAR orientado por satélite",
         "body": "Programa de detecção e reparo de vazamentos priorizado pelas plumas detectadas neste dossiê."},
        {"title": "Eliminação de venting e flaring",
         "body": "Recuperação de gás para venda/reinjeção; substituição de dispositivos pneumáticos a gás."},
    ],
    "oil-and-gas-refining": [
        {"title": "Eficiência térmica e integração energética",
         "body": "Otimização de fornos e trocadores (pinch); redução de queima em flare."},
        {"title": "Hidrogênio de baixo carbono",
         "body": "Substituição gradual do H₂ cinza de reforma por eletrolítico nas unidades de hidrotratamento."},
    ],
    "food-beverage-tobacco": [
        {"title": "Biodigestão de efluentes e resíduos",
         "body": "Conversão de lagoas anaeróbias abertas em biodigestores com aproveitamento do biogás."},
        {"title": "Eletrificação de utilidades térmicas",
         "body": "Bombas de calor industriais e caldeiras elétricas em processos de baixa temperatura."},
    ],
}

GENERIC_OPPORTUNITIES = [
    {"title": "Diagnóstico energético e MRV contínuo",
     "body": "Baseline orbital contínua (esta plataforma) + medições locais para priorizar intervenções e comprovar reduções."},
    {"title": "Eficiência energética transversal",
     "body": "Motores, ar comprimido, vapor e iluminação — tipicamente 5–12% de redução com payback curto."},
    {"title": "Energia renovável dedicada",
     "body": "PPA ou geração própria solar/eólica para abater emissões de escopo 2."},
]


def opportunities_for(sector: str) -> list[dict[str, str]]:
    return DEFAULT_OPPORTUNITIES.get(sector, []) + GENERIC_OPPORTUNITIES
