/**
 * AHS TCO Fleet — cenário padrão.
 *
 * NENHUM valor numérico do motor de cálculo está codificado fora deste arquivo:
 * todo parâmetro é um input com default e fonte declarada. As fontes de cada
 * bloco estão indicadas nos comentários e replicadas nos tooltips (fields.ts).
 *
 * Data-base: 2026 — Brasil. Onde a fonte é uma estimativa de engenharia e não
 * um dado publicado, o comentário e o tooltip dizem isso explicitamente.
 */
import type {
  ArmazenamentoGas,
  BaseValores,
  CicloGas,
  McSpec,
  MetodoPrecoGas,
  ModoSuprimentoBio,
  CenarioCarbono,
  MetodoArla,
  ModalidadeEnergia,
  ModoPrecoVeiculo,
  ModoSuprimentoH2,
  QuimicaBateria,
  RegimeAquisicao,
  RegimeTributario,
  RotaH2,
  SistemaAmortizacao,
} from "./types";

export const DEFAULT_SCENARIO = {
  meta: {
    nome: "Cenário base — rodoviário 100.000 km/ano",
    autor: "",
    data: new Date().toISOString().slice(0, 10),
    notas: "",
    /** Caminhos marcados como variável de sensibilidade. */
    sensiveis: [] as string[],
    /** Distribuições declaradas para a simulação de Monte Carlo. */
    mc: {} as Record<string, McSpec>,
  },

  // ── 4.1 / 4.2 MISSÃO ──────────────────────────────────────────────────────
  // Perfil típico de cavalo mecânico rodoviário brasileiro (CNT/ANTT, perfis de
  // frota de transportadoras de carga geral).
  mission: {
    horizonteAnos: 10,
    kmAno: 100000,
    diasOperacionaisAno: 300,
    jornadasDia: 1,
    horasOperacaoDia: 10,
    velocidadeMediaKmH: 45, // velocidade operacional média porta-a-porta
    perfilUrbanoPct: 10,
    perfilRegionalPct: 30,
    perfilRodoviarioPct: 60,
    topoPlanoPct: 50,
    topoOnduladoPct: 35,
    topoMontanhosoPct: 15,
    fatorTopoPlano: 1.0,
    fatorTopoOndulado: 1.08,
    fatorTopoMontanhoso: 1.2,
    distanciaMediaViagemKm: 450,
    distanciaMaxEntrePontosKm: 300,
    cargaUtilMediaT: 25,
    fatorOcupacaoPct: 85,
    retornoVazioPct: 25,
    temperaturaMediaC: 24,
    ptoPotenciaKW: 0,
    ptoHorasDia: 0,
    // Energia requerida na roda — referência para o balanço energético (9.3).
    // Medida no peso bruto de referência, terreno plano e ciclo rodoviário;
    // o motor escala por topografia, perfil e peso bruto real de cada rota.
    energiaRodaKWhKm: 0.98,
    pesoBrutoReferenciaT: 40,
    fatorRodaUrbano: 1.35,
    fatorRodaRegional: 1.1,
    fatorRodaRodoviario: 1.0,
    aplicarPenalidadePayload: true,
  },

  // ── 4.2 ECONOMIA ──────────────────────────────────────────────────────────
  econ: {
    wacc: 12, // % a.a. real
    ipca: 4.0, // % a.a. — usado apenas na visão nominal
    escDiesel: 1.0, // escalonamento REAL, % a.a. acima do IPCA
    escArla: 0.5,
    escEnergia: 1.0,
    escGnv: 1.0,
    escBio: -1.0, // ganho de escala esperado na produção de biometano
    escH2: -3.0, // curva de aprendizado do H2 (queda real esperada)
    escMaoObra: 1.0,
    escPecas: 0.5,
    escCarbono: 5.0,
    usdBrl: 5.4,
    eurBrl: 5.9,
    baseValores: "real" as BaseValores,
    regime: "avista" as RegimeAquisicao,
  },

  // ── 4.3 FINANCIAMENTO ─────────────────────────────────────────────────────
  // Linhas BNDES Finame: Baixo Carbono para veículos de emissão zero.
  fin: {
    entradaPct: 20,
    prazoMeses: 60,
    carenciaMeses: 6,
    sistema: "PRICE" as SistemaAmortizacao,
    iofPct: 1.5,
    estruturacaoPct: 1.0,
    jurosDiesel: 14.5,
    jurosGas: 12.5, // Finame convencional; o gás não se enquadra em emissão zero
    jurosH2: 10.5,
    jurosBev: 10.5,
    aluguelMensalDiesel: 18000,
    aluguelMensalGas: 21000,
    aluguelMensalH2: 32000,
    aluguelMensalBev: 28000,
  },

  // ── 4.4 TRIBUTOS E INCENTIVOS ─────────────────────────────────────────────
  trib: {
    regime: "lucroReal" as RegimeTributario,
    aliquotaIRCSLL: 34, // IRPJ 25% + CSLL 9%
    deduzirDespesasOperacionais: true,
    pisCofinsRecupera: true,
    pisCofinsCombustivelPct: 9.25,
    pisCofinsEnergiaPct: 9.25,
    icmsEnergiaPct: 18,
    icmsGasPct: 18,
    icmsH2Pct: 18,
    depAnosDiesel: 5, // Depreciação fiscal — IN RFB 1.700/2017, veículos de carga
    depAnosGas: 5,
    depAnosH2: 5,
    depAnosBev: 5,
    ipvaPctDiesel: 0, // caminhões são isentos de IPVA na maioria dos estados
    ipvaPctGas: 0,
    ipvaPctH2: 0,
    ipvaPctBev: 0,
    // PHBC (Lei 14.948/2024), REHIDRO, MOVER, Rota 2030, isenções estaduais
    incentivoCapexPctDiesel: 0,
    incentivoCapexPctGas: 0,
    incentivoCapexPctH2: 0,
    incentivoCapexPctBev: 0,
    incentivoAnualDiesel: 0,
    incentivoAnualGas: 0,
    incentivoAnualH2: 0,
    incentivoAnualBev: 0,
  },

  // ── 4.5 CARBONO E AMBIENTE ────────────────────────────────────────────────
  carbono: {
    // Default do usuário: 3,17 kgCO2e/L. Valor TTW puro do diesel B0 fica em
    // 2,60–2,68 kgCO2/L; 3,17 já embute margem de upstream/refino, por isso o
    // upstream adicional entra zerado para não haver dupla contagem.
    fatorDieselKgL: 3.17,
    fatorDieselUpstreamKgL: 0.0,
    fatorEletricidadeKgKWh: 0.12, // SIN brasileiro — média histórica MCTI
    energiaRenovavelIREC: false,
    rotaH2: "eletroliseRenovavel" as RotaH2,
    fatorH2GridKgKg: 6.5, // 52 kWh/kg x 0,125 kgCO2/kWh
    fatorH2RenovavelKgKg: 0.9, // pegada de fabricação de equipamentos
    fatorH2BiomassaKgKg: -8.0, // BECCS com captura do CO2 biogênico
    fatorH2SmrKgKg: 10.5,
    cenarioCarbono: "zero" as CenarioCarbono,
    precoCarbonoZero: 0,
    precoCarbonoVoluntario: 40, // R$/tCO2e — mercado voluntário
    precoCarbonoSbce: 120, // SBCE, Lei 15.042/2024 — estimativa de partida
    precoCarbonoCbam: 450, // referência EU ETS convertida
    // Potencial de aquecimento global do metano em 100 anos. AR5 = 28,
    // AR6 = 27,9 para metano não fóssil e 29,8 para fóssil.
    gwpMetano: 28,
    // Combustão do metano: 2,74 kgCO2/kg. O upstream do gás natural cobre
    // produção, processamento e distribuição.
    fatorGnvCombustaoKgKg: 2.74,
    fatorGnvUpstreamKgKg: 0.55,
    // O CO2 da queima do biometano é biogênico e não entra no inventário.
    fatorBioCombustaoKgKg: 0,
    fatorBioUpstreamKgKg: 0.4, // digestão, upgrading e compressão
    // Crédito por metano que deixaria de escapar de lagoa, aterro ou
    // vinhaça. Informe negativo para capturar a emissão evitada.
    fatorBioEvitadoKgKg: 0,
    cbioElegivel: false,
    cbioPreco: 95, // R$/CBIO
    cbioPorAnoBio: 0,
    cbioPorAnoH2: 0,
    noxGnvGkm: 0.12, // motor a gás estequiométrico com catalisador de três vias
    mpGnvGkm: 0.002,
    noxDieselGkm: 0.45, // Proconve P8
    mpDieselGkm: 0.01,
    noxH2Gkm: 0,
    mpH2Gkm: 0,
    noxBevGkm: 0,
    mpBevGkm: 0,
  },

  // ── 4.6 CUSTOS OPERACIONAIS COMUNS ────────────────────────────────────────
  comuns: {
    salarioMotoristaMes: 3800,
    encargosPct: 80,
    beneficiosMes: 900,
    motoristasPorVeiculo: 1.1,
    treinamentoDiesel: 0,
    treinamentoGas: 1800, // por motorista, uma vez — manuseio de gás pressurizado
    treinamentoH2: 4500, // por motorista, uma vez — manuseio de H2
    treinamentoBev: 2500,
    seguroPctDiesel: 3.0,
    seguroPctGas: 3.4,
    seguroPctH2: 5.0, // prêmio maior — ativo mais caro e menos difundido
    seguroPctBev: 4.5,
    telemetriaMes: 180,
    licenciamentoAno: 1200, // licenciamento, RNTRC e taxas
    pedagioPorKm: 0.14,
    adminGaragemMes: 900,
    custoDiaParado: 1800, // margem de contribuição perdida por dia parado
    // Pneus e freios são comuns, com fatores de vida por rota (peso e torque).
    pneusQtd: 22,
    pneuPreco: 3200,
    pneuVidaKm: 120000,
    recapagens: 2,
    recapagemCusto: 950,
    freiosCusto: 4800,
    freiosVidaKm: 120000,
  },

  // ── 5. DIESEL ─────────────────────────────────────────────────────────────
  diesel: {
    precoAquisicao: 620000, // cavalo mecânico 6x2 460 cv Proconve P8
    precoSemImpostos: 500000,
    configuracao: "6x2",
    pbtcT: 45,
    taraBaseT: 13.5, // conjunto sem sistema de energia (cavalo + semirreboque)
    potenciaCv: 460,
    norma: "P8",
    vidaUtilAnos: 10,
    // Curva de valor residual, % do preço de aquisição, ano 0..10 (FIPE pesados)
    residual: [100, 78, 68, 60, 53, 47, 41, 36, 32, 28, 25] as number[],
    precoDieselL: 6.2, // S10 na bomba
    precoDieselSemImpostosL: 4.6,
    descontoBasePropriaPct: 3,
    usarBasePropria: false,
    consumoUrbanoKmL: 2.1,
    consumoRegionalKmL: 2.8,
    consumoRodoviarioKmL: 3.3,
    cargaReferenciaT: 25,
    ajusteConsumoPorTonPct: 2.2, // % de aumento de consumo por t acima da referência
    pctMarchaLenta: 12,
    consumoMarchaLentaLh: 2.5,
    perdasEvaporacaoPct: 0.5,
    capacidadeTanqueL: 600,
    massaTanqueVazioKg: 90,
    posTratamentoMassaKg: 180,
    tempoAbastecimentoMin: 20,
    eficienciaMotor: 0.4, // usado no PTO e no balanço energético
    // ARLA 32
    arlaMetodo: "pctDiesel" as MetodoArla,
    arlaPctDiesel: 5, // 3% a 8%; P8 tende ao topo da faixa
    arlaL100km: 2.2,
    arlaPrecoL: 3.6,
    arlaEventosAno: 0.3, // contaminação/cristalização
    arlaCustoEvento: 3500,
    arlaTanqueL: 60,
    // Lubrificantes
    oleoVolumeL: 38,
    oleoPrecoL: 28,
    oleoIntervaloKm: 60000,
    outrosFluidosPctOleo: 25,
    // Manutenção
    preventivaPorKm: 0.22,
    filtrosCusto: 900,
    filtrosIntervaloKm: 30000,
    scrCusto: 22000,
    scrVidaKm: 800000,
    dpfCusto: 3500,
    dpfIntervaloKm: 200000,
    sensorNoxCusto: 4200,
    sensorNoxVidaKm: 300000,
    deratingProbAno: 0.15,
    deratingCusto: 9000,
    corretivaAno1: 4000,
    corretivaCrescimentoPctAA: 18,
    fatorVidaPneu: 1.0,
    fatorVidaFreio: 1.0,
    altoValorCusto: 26000, // embreagem, retarder, arrefecimento
    altoValorVidaKm: 700000,
    horasParadoManutAno: 120,
    falhaProbAno: 0.8, // eventos de pane/ano
    falhaHorasEvento: 14,
    // Risco e obsolescência
    zonaRestritaPctRotas: 0,
    zonaRestritaCustoPct: 0, // % de acréscimo de custo nas rotas afetadas
    choqueResidualPct: 0, // desvalorização adicional no ano N
    descontoReceitaPct: 0,
    receitaAnual: 900000, // base para o desconto exigido por clientes
  },

  // ── 6. GÁS NATURAL E BIOMETANO ────────────────────────────────────────────
  // Um único veículo atende às duas rotas: o motor, os cilindros e a estação
  // são os mesmos. Mudam o preço da molécula, a pegada de carbono e o modo de
  // suprimento. Os campos com prefixo `gnv` e `bio` são o que as diferencia.
  gas: {
    modoPreco: "direto" as ModoPrecoVeiculo,
    precoAquisicao: 790000, // cavalo mecânico a gás, ciclo Otto — estimativa
    precoSemImpostos: 640000,
    impFobUsd: 120000,
    impFreteSeguroPct: 8,
    impIiPct: 0,
    impIpiPct: 0,
    impIcmsPct: 18,
    impDespachoPct: 3,
    configuracao: "6x2",
    pbtcT: 45,
    taraBaseT: 13.5,
    potenciaCv: 410,
    ciclo: "otto" as CicloGas,
    pilotoDieselPct: 0, // fração da energia vinda do diesel piloto, no HPDI
    armazenamento: "GNC" as ArmazenamentoGas,
    capacidadeKg: 160, // GNC a 200 bar; um conjunto GNL embarca bem mais
    // Massa total por quilo armazenado, JÁ INCLUINDO o próprio gás: cilindros
    // tipo III/IV a 200 bar somam cerca de 3 kg de casco por kg de metano.
    // Um sistema GNL fica perto de 2,6 kg/kg.
    massaSistemaKgPorKg: 4.0,
    massaExtraSistemaKg: 120, // redutor, linhas, catalisador de três vias
    pciKWhKg: 13.3, // gás natural típico; metano puro chega a 13,9
    densidadeKgM3: 0.74, // a 20 °C e 1 atm, base em que o m³ é vendido
    vidaUtilAnos: 10,
    residual: [100, 74, 64, 56, 49, 43, 37, 32, 28, 24, 21] as number[],
    // Consumo — motor a gás consome cerca de 15% mais energia que o Diesel
    consumoUrbanoKg100km: 38,
    consumoRegionalKg100km: 31,
    consumoRodoviarioKg100km: 27,
    cargaReferenciaT: 25,
    ajusteConsumoPorTonKg100km: 0.75,
    // Metano que escapa sem queimar. É o parâmetro que decide se a rota a gás
    // fóssil tem ou não vantagem climática sobre o diesel.
    slipMetanoPct: 1.0,
    pctMarchaLenta: 12,
    consumoMarchaLentaKgH: 1.8,
    perdasBoilOffPctDia: 0, // relevante apenas no GNL
    tempoAbastecimentoMin: 15,
    eficienciaMotor: 0.34,
    // Manutenção
    preventivaPorKm: 0.2,
    velasCusto: 1400,
    velasIntervaloKm: 60000,
    catalisadorCusto: 14000,
    catalisadorVidaKm: 600000,
    oleoVolumeL: 38,
    oleoPrecoL: 34, // óleo de baixa cinza, exigido em motor a gás
    oleoIntervaloKm: 30000,
    outrosFluidosPctOleo: 25,
    filtrosCusto: 800,
    filtrosIntervaloKm: 30000,
    inspecaoCilindrosAnos: 5,
    inspecaoCilindrosCusto: 4500,
    vidaNormativaCilindrosAnos: 20,
    altoValorCusto: 26000,
    altoValorVidaKm: 700000,
    corretivaAno1: 4500,
    corretivaCrescimentoPctAA: 18,
    fatorVidaPneu: 0.98,
    fatorVidaFreio: 1.0,
    horasParadoManutAno: 130,
    falhaProbAno: 0.9,
    falhaHorasEvento: 16,
    // Estação de abastecimento, compartilhada pelas duas rotas
    usarEstacaoPropria: true,
    estacaoCapex: 3500000, // compressor, estocagem e dispensers
    estacaoVidaAnos: 15,
    estacaoOpexPctCapexAno: 4,
    estacaoConsumoKWhKg: 0.35, // compressão até 250 bar
    estacaoPrecoEnergiaRSKWh: 0.65,
    estacaoCapacidadeKgDia: 1500,
    estacaoUtilizacaoPct: 60,
    adequacaoGaragemCapex: 180000, // ventilação e detecção de gás
    adequacaoGaragemOpexAno: 12000,
    treinamentoRecorrenteAno: 2000,
    zonaRestritaPctRotas: 0,
    choqueResidualPct: 0,
    // ── Combustível: gás natural fóssil ─────────────────────────────────
    gnvMetodoPreco: "m3" as MetodoPrecoGas,
    gnvPrecoM3: 4.3, // preço de posto; contratos de frota ficam abaixo
    gnvPrecoKg: 5.81,
    gnvPrecoMMBtu: 60,
    gnvPrecoIncluiIcms: true,
    gnvCustoLogisticoKg: 0, // GNC comprimido entregue, quando não há rede
    gnvPerdasTransferenciaPct: 0.5,
    // ── Combustível: biometano ──────────────────────────────────────────
    bioModoSuprimento: "A" as ModoSuprimentoBio,
    bioMetodoPreco: "m3" as MetodoPrecoGas,
    bioPrecoM3: 3.9, // costuma sair abaixo do GNV quando há RenovaBio
    bioPrecoKg: 5.27,
    bioPrecoMMBtu: 55,
    bioPrecoIncluiIcms: true,
    bioCustoLogisticoKg: 0,
    bioPerdasTransferenciaPct: 0.5,
    bioPciKWhKg: 13.9, // biometano purificado é praticamente metano puro
    bioDensidadeKgM3: 0.716,
    // Modo B — produção própria a partir de biogás
    bSubstratoTDia: 200, // dejetos, vinhaça ou resíduos sólidos
    bCustoSubstratoRSt: 0, // resíduo próprio; informe o custo se for comprado
    bRendimentoM3BiogasPorT: 55,
    bTeorMetanoPct: 58,
    bPerdaUpgradingPct: 3,
    bCapexPlanta: 22000000, // biodigestor, upgrading e compressão
    bOpexFixoPctAno: 6,
    bOpexVariavelRSKg: 0.9,
    bVidaPlantaAnos: 20,
    bCreditoDigestatoRSt: 25, // biofertilizante vendido por tonelada tratada
  },

  // ── 7. HIDROGÊNIO (FCEV) ──────────────────────────────────────────────────
  h2: {
    modoPreco: "direto" as ModoPrecoVeiculo,
    precoAquisicao: 2400000, // FCEV pesado importado, 2026 — estimativa
    precoSemImpostos: 2000000,
    impFobUsd: 380000,
    impFreteSeguroPct: 8,
    impIiPct: 0, // ex-tarifário concedido
    impIpiPct: 0,
    impIcmsPct: 18,
    impDespachoPct: 3,
    potenciaPilhaKW: 200,
    bateriaTampaoKWh: 70,
    bateriaTampaoKW: 200,
    massaPilhaKgPorKW: 1.6,
    // Massa total por quilo armazenado, já incluindo o próprio hidrogênio.
    massaCilindroKgPorKgH2: 18, // tanques tipo IV, 350 bar, com suportes
    massaBateriaKgPorKWh: 6,
    capacidadeH2Kg: 60,
    pressaoBar: 350,
    autonomiaNominalKm: 700,
    taraBaseT: 13.0, // conjunto sem sistema de energia
    pbtcT: 45,
    toleranciaRegulatoriaT: 0, // tolerância para emissão zero (0 a 2 t)
    vidaUtilAnos: 10,
    residual: [100, 70, 60, 52, 45, 39, 34, 29, 25, 22, 19] as number[],
    consumoUrbanoKg100km: 9.5,
    consumoRegionalKg100km: 8.6,
    consumoRodoviarioKg100km: 7.8,
    cargaReferenciaT: 25,
    ajusteConsumoPorTonKg100km: 0.25,
    degradacaoPilhaPct1000h: 0.8, // queda de eficiência por 1.000 h
    perdasAbastecimentoPct: 1.5,
    tempoAbastecimentoMin: 15,
    eficienciaPilha: 0.52,
    // Suprimento
    modoSuprimento: "A" as ModoSuprimentoH2,
    // Modo A — comprado e entregue
    aPrecoKg: 45,
    aPrecoIncluiIcms: true,
    aDistanciaFonteKm: 150,
    aCustoLogisticoKg: 6,
    aPerdasTransferenciaPct: 2,
    aTakeOrPayKgAno: 0,
    aPenalidadeKg: 0,
    // Modo B — eletrólise própria
    bCapexEletrolisadorRSKW: 6500,
    bPotenciaKW: 1000,
    bConsumoKWhKg: 54, // sistema completo (stack + BoP)
    bDegradacaoStackPctAno: 1.5,
    bCustoStackRSKW: 2200,
    bVidaStackHoras: 70000,
    bAguaLKg: 12,
    bCustoAguaRSm3: 18,
    bCompressaoKWhKg: 3.0,
    bCapexArmazenamentoRSKg: 3500,
    bEstoqueKg: 300,
    bPreResfriamentoKWhKg: 0.5,
    bFatorCapacidadePct: 85,
    bOpexFixoPctCapexAno: 3,
    bPrecoEnergiaRSKWh: 0.32, // PPA renovável
    bVidaPlantaAnos: 20,
    // Modo C — biomassa / looping químico
    cCustoBiomassaRSt: 180,
    cUmidadePct: 20,
    cRendimentoKgPorT: 55,
    cCapexPlanta: 45000000,
    cCapacidadeKgDia: 1000,
    cOpexFixoPctAno: 4,
    cOpexVariavelRSKg: 1.2,
    cCoprodutoTPorTBiomassa: 0.25,
    cCreditoCoprodutoRSt: 400,
    cVidaPlantaAnos: 20,
    // Estação de abastecimento
    usarHrsPropria: true,
    hrsCapex: 9000000,
    hrsVidaAnos: 15,
    hrsOpexPctCapexAno: 4,
    hrsConsumoKWhKg: 2.5, // compressão + pré-resfriamento a -40 °C
    hrsPrecoEnergiaRSKWh: 0.65,
    hrsCapacidadeKgDia: 1000,
    hrsUtilizacaoPct: 60,
    hrsMovelRSKg: 0, // alternativa sem CAPEX fixo
    // Manutenção específica
    vidaPilhaHoras: 30000,
    custoPilhaRSKW: 1800,
    bateriaTampaoVidaAnos: 8,
    custoBateriaTampaoRSKWh: 900,
    consumiveisCusto: 3800, // filtro catalítico, resina DI, umidificação
    consumiveisIntervaloKm: 100000,
    inspecaoCilindrosAnos: 5,
    inspecaoCilindrosCusto: 12000,
    vidaNormativaCilindrosAnos: 20,
    preventivaPorKm: 0.14,
    corretivaAno1: 5000,
    corretivaCrescimentoPctAA: 15,
    fatorVidaPneu: 0.92,
    fatorVidaFreio: 1.4, // frenagem regenerativa
    horasParadoManutAno: 140,
    falhaProbAno: 1.2,
    falhaHorasEvento: 24,
    // Segurança e garagem
    adequacaoGaragemCapex: 350000, // detecção, ventilação, classificação de área
    adequacaoGaragemOpexAno: 24000,
    treinamentoRecorrenteAno: 6000,
    zonaRestritaPctRotas: 0,
    choqueResidualPct: 0,
  },

  // ── 8. ELÉTRICO (BEV) ─────────────────────────────────────────────────────
  bev: {
    modoPreco: "direto" as ModoPrecoVeiculo,
    precoAquisicao: 1650000, // BEV pesado, 2026 — estimativa
    precoSemImpostos: 1400000,
    impFobUsd: 260000,
    impFreteSeguroPct: 8,
    impIiPct: 0,
    impIpiPct: 0,
    impIcmsPct: 18,
    impDespachoPct: 3,
    capacidadeKWh: 540,
    socMinPct: 10,
    socMaxPct: 90,
    massaPackKgPorKWh: 5.5,
    massaExtraSistemaKg: 400, // motores, inversor, refrigeração do pack
    potenciaRecargaCcKW: 350,
    potenciaRecargaCaKW: 22,
    quimica: "LFP" as QuimicaBateria,
    taraBaseT: 12.8,
    pbtcT: 45,
    toleranciaRegulatoriaT: 0,
    vidaUtilAnos: 10,
    residual: [100, 68, 58, 50, 43, 37, 32, 28, 24, 21, 18] as number[],
    consumoUrbanoKWhKm: 1.40,
    consumoRegionalKWhKm: 1.30,
    consumoRodoviarioKWhKm: 1.20,
    cargaReferenciaT: 25,
    ajusteConsumoPorTonKWhKm: 0.03,
    regenUrbanoPct: 12,
    regenRegionalPct: 7,
    regenRodoviarioPct: 3,
    climatizacaoBaseKWhDia: 8,
    climatizacaoPorGrauKWhDia: 0.35, // por °C de desvio de 20 °C
    eficienciaCarregamentoPct: 90,
    autodescargaPctDia: 0.1,
    // Bateria — bloco explícito (7.3)
    degradacaoCalendariaPctAno: 2.0,
    ciclosAte80Soh: 3000, // LFP; NMC ~2.500, semi-sólida ~4.000
    dodMedioPct: 70,
    pctRecargaAltaPotencia: 40,
    fatorAltaPotencia: 1.15,
    fatorTemperaturaPorGrau: 0.015, // multiplicador por °C acima de 25 °C
    fatorSocAlto: 1.05,
    sohMinimoPct: 80,
    custoPackRSKWh: 620,
    curvaAprendizadoPackPctAA: -6,
    garantiaAnos: 8,
    garantiaKm: 800000,
    garantiaSohPct: 70,
    valorSecondLifeRSKWh: 180,
    custoReciclagemRSKWh: 0,
    // Infraestrutura de recarga
    numCarregadores: 4,
    potenciaCarregadorKW: 150,
    capexPorCarregador: 380000,
    obraCivil: 450000,
    subestacao: 900000,
    conexaoReforcoRede: 600000,
    infraVidaAnos: 10,
    infraOemPctAno: 3,
    infraSoftwareMes: 400,
    infraVeiculosRateio: 8,
    // Energia elétrica
    modalidade: "cativoVerde" as ModalidadeEnergia,
    teForaPontaRSMWh: 320,
    tePontaRSMWh: 520,
    tusdForaPontaRSMWh: 180,
    tusdPontaRSMWh: 1450,
    demandaContratadaKW: 450,
    tarifaDemandaRSKWMes: 32,
    multaUltrapassagemFator: 2,
    fatorSimultaneidade: 0.7,
    bandeiraRSMWh: 45,
    icmsEnergiaPct: 18,
    pctPonta: 5,
    pctForaPonta: 45,
    pctMadrugada: 50,
    descontoMadrugadaPct: 0, // desconto tarifário eventual na madrugada
    solarUsar: false,
    solarCapexRSkWp: 3800,
    solarKWp: 500,
    solarFatorCapacidadePct: 22,
    solarVidaAnos: 25,
    armazenamentoKWh: 0,
    armazenamentoRSKWh: 1800,
    pctRecargaPublica: 10,
    precoRecargaPublicaRSKWh: 2.2,
    pctRecargaForaJanela: 70, // recarga fora da janela operacional não gera parada
    taperFator: 0.8, // potência média efetiva / potência nominal
    filaFator: 0.9, // disponibilidade de ponto livre
    // Manutenção
    preventivaPorKm: 0.1,
    fatorVidaPneu: 0.85,
    fatorVidaFreio: 1.6,
    fluidosCusto: 1500,
    fluidosIntervaloKm: 100000,
    falhaPackProbAnoPct: 1.5,
    falhaPackCusto: 120000,
    corretivaAno1: 3000,
    corretivaCrescimentoPctAA: 15,
    horasParadoManutAno: 90,
    falhaProbAno: 0.9,
    falhaHorasEvento: 20,
    zonaRestritaPctRotas: 0,
    choqueResidualPct: 0,
  },
};

export type Scenario = typeof DEFAULT_SCENARIO;

export const cloneScenario = (s: Scenario): Scenario =>
  JSON.parse(JSON.stringify(s)) as Scenario;

export const novoCenario = (): Scenario => cloneScenario(DEFAULT_SCENARIO);
