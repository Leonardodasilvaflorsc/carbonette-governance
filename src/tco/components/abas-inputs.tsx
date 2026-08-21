/** Abas de entrada: Missão, Diesel, Hidrogênio e Elétrico. */
import React from "react";
import { useTco } from "../store";
import { Campo, CurvaResidual, Aviso, Secao } from "./ui";

export function TabMissao() {
  const { scenario } = useTco();
  const somaPerfil =
    scenario.mission.perfilUrbanoPct + scenario.mission.perfilRegionalPct + scenario.mission.perfilRodoviarioPct;
  const somaTopo =
    scenario.mission.topoPlanoPct + scenario.mission.topoOnduladoPct + scenario.mission.topoMontanhosoPct;
  return (
    <>
      <Secao titulo="Identificação do cenário" colunas={2}>
        <Campo path="meta.nome" />
        <Campo path="meta.autor" />
        <Campo path="meta.data" />
        <Campo path="meta.notas" />
      </Secao>

      <Secao
        titulo="Perfil operacional"
        descricao="A missão de transporte é a mesma para as três rotas. É ela que define a demanda anual em tonelada-quilômetro que cada configuração precisa atender."
      >
        <Campo path="mission.horizonteAnos" />
        <Campo path="mission.kmAno" />
        <Campo path="mission.diasOperacionaisAno" />
        <Campo path="mission.jornadasDia" />
        <Campo path="mission.horasOperacaoDia" />
        <Campo path="mission.velocidadeMediaKmH" />
        <Campo path="mission.distanciaMediaViagemKm" />
        <Campo path="mission.distanciaMaxEntrePontosKm" />
        <Campo path="mission.cargaUtilMediaT" />
        <Campo path="mission.fatorOcupacaoPct" />
        <Campo path="mission.retornoVazioPct" />
        <Campo path="mission.temperaturaMediaC" />
        <Campo path="mission.ptoPotenciaKW" />
        <Campo path="mission.ptoHorasDia" />
        <Campo path="mission.aplicarPenalidadePayload" />
      </Secao>

      <Secao titulo="Perfil de rota e topografia" descricao="Cada conjunto de percentuais deve somar 100%. Valores diferentes são normalizados automaticamente, com aviso.">
        <Campo path="mission.perfilUrbanoPct" />
        <Campo path="mission.perfilRegionalPct" />
        <Campo path="mission.perfilRodoviarioPct" />
        <Campo path="mission.topoPlanoPct" />
        <Campo path="mission.topoOnduladoPct" />
        <Campo path="mission.topoMontanhosoPct" />
        <Campo path="mission.fatorTopoPlano" />
        <Campo path="mission.fatorTopoOndulado" />
        <Campo path="mission.fatorTopoMontanhoso" />
        {Math.abs(somaPerfil - 100) > 0.5 && (
          <div className="md:col-span-2 xl:col-span-3">
            <Aviso nivel="aviso">Os percentuais de perfil somam {somaPerfil.toFixed(1)}% e serão normalizados para 100%.</Aviso>
          </div>
        )}
        {Math.abs(somaTopo - 100) > 0.5 && (
          <div className="md:col-span-2 xl:col-span-3">
            <Aviso nivel="aviso">Os percentuais de topografia somam {somaTopo.toFixed(1)}% e serão normalizados para 100%.</Aviso>
          </div>
        )}
      </Secao>

      <Secao
        titulo="Verificação de consistência energética"
        descricao="A energia requerida na roda é a referência do balanço energético do item 9.3: o motor a compara com a energia do tanque ou do pack de cada rota e alerta quando a eficiência implícita sai da faixa esperada."
      >
        <Campo path="mission.energiaRodaKWhKm" />
        <Campo path="mission.pesoBrutoReferenciaT" />
        <Campo path="mission.fatorRodaUrbano" />
        <Campo path="mission.fatorRodaRegional" />
        <Campo path="mission.fatorRodaRodoviario" />
      </Secao>

      <Secao titulo="Parâmetros econômicos">
        <Campo path="econ.wacc" />
        <Campo path="econ.ipca" />
        <Campo path="econ.baseValores" />
        <Campo path="econ.regime" />
        <Campo path="econ.usdBrl" />
        <Campo path="econ.eurBrl" />
        <Campo path="econ.escDiesel" />
        <Campo path="econ.escArla" />
        <Campo path="econ.escGnv" />
        <Campo path="econ.escBio" />
        <Campo path="econ.escEnergia" />
        <Campo path="econ.escH2" />
        <Campo path="econ.escMaoObra" />
        <Campo path="econ.escPecas" />
        <Campo path="econ.escCarbono" />
      </Secao>

      <Secao titulo="Financiamento" descricao="Aplicável quando o regime de aquisição é financiamento ou leasing. O leasing é tratado como financiamento com titularidade ao final.">
        <Campo path="fin.entradaPct" />
        <Campo path="fin.prazoMeses" />
        <Campo path="fin.carenciaMeses" />
        <Campo path="fin.sistema" />
        <Campo path="fin.iofPct" />
        <Campo path="fin.estruturacaoPct" />
        <Campo path="fin.jurosDiesel" />
        <Campo path="fin.jurosGas" />
        <Campo path="fin.jurosH2" />
        <Campo path="fin.jurosBev" />
        <Campo path="fin.aluguelMensalDiesel" />
        <Campo path="fin.aluguelMensalGas" />
        <Campo path="fin.aluguelMensalH2" />
        <Campo path="fin.aluguelMensalBev" />
      </Secao>

      <Secao titulo="Tributos e incentivos">
        <Campo path="trib.regime" />
        <Campo path="trib.aliquotaIRCSLL" />
        <Campo path="trib.deduzirDespesasOperacionais" />
        <Campo path="trib.pisCofinsRecupera" />
        <Campo path="trib.pisCofinsCombustivelPct" />
        <Campo path="trib.pisCofinsEnergiaPct" />
        <Campo path="trib.icmsEnergiaPct" />
        <Campo path="trib.icmsGasPct" />
        <Campo path="trib.icmsH2Pct" />
        <Campo path="trib.depAnosDiesel" />
        <Campo path="trib.depAnosGas" />
        <Campo path="trib.depAnosH2" />
        <Campo path="trib.depAnosBev" />
        <Campo path="trib.ipvaPctDiesel" />
        <Campo path="trib.ipvaPctGas" />
        <Campo path="trib.ipvaPctH2" />
        <Campo path="trib.ipvaPctBev" />
        <Campo path="trib.incentivoCapexPctDiesel" />
        <Campo path="trib.incentivoCapexPctGas" />
        <Campo path="trib.incentivoCapexPctH2" />
        <Campo path="trib.incentivoCapexPctBev" />
        <Campo path="trib.incentivoAnualDiesel" />
        <Campo path="trib.incentivoAnualGas" />
        <Campo path="trib.incentivoAnualH2" />
        <Campo path="trib.incentivoAnualBev" />
      </Secao>

      <Secao titulo="Carbono e ambiente">
        <Campo path="carbono.fatorDieselKgL" />
        <Campo path="carbono.fatorDieselUpstreamKgL" />
        <Campo path="carbono.fatorEletricidadeKgKWh" />
        <Campo path="carbono.energiaRenovavelIREC" />
        <Campo path="carbono.rotaH2" />
        <Campo path="carbono.fatorH2GridKgKg" />
        <Campo path="carbono.fatorH2RenovavelKgKg" />
        <Campo path="carbono.fatorH2BiomassaKgKg" />
        <Campo path="carbono.fatorH2SmrKgKg" />
        <Campo path="carbono.cenarioCarbono" />
        <Campo path="carbono.precoCarbonoVoluntario" />
        <Campo path="carbono.precoCarbonoSbce" />
        <Campo path="carbono.precoCarbonoCbam" />
        <Campo path="carbono.gwpMetano" />
        <Campo path="carbono.fatorGnvCombustaoKgKg" />
        <Campo path="carbono.fatorGnvUpstreamKgKg" />
        <Campo path="carbono.fatorBioCombustaoKgKg" />
        <Campo path="carbono.fatorBioUpstreamKgKg" />
        <Campo path="carbono.fatorBioEvitadoKgKg" />
        <Campo path="carbono.cbioElegivel" />
        <Campo path="carbono.cbioPreco" />
        <Campo path="carbono.cbioPorAnoBio" />
        <Campo path="carbono.cbioPorAnoH2" />
        <Campo path="carbono.noxDieselGkm" />
        <Campo path="carbono.mpDieselGkm" />
        <Campo path="carbono.noxH2Gkm" />
        <Campo path="carbono.mpH2Gkm" />
        <Campo path="carbono.noxGnvGkm" />
        <Campo path="carbono.mpGnvGkm" />
        <Campo path="carbono.noxBevGkm" />
        <Campo path="carbono.mpBevGkm" />
      </Secao>

      <Secao titulo="Custos operacionais comuns" descricao="Aplicados às três rotas, com diferenciação explícita onde ela existe (seguro, treinamento e fatores de vida de pneus e freios).">
        <Campo path="comuns.salarioMotoristaMes" />
        <Campo path="comuns.encargosPct" />
        <Campo path="comuns.beneficiosMes" />
        <Campo path="comuns.motoristasPorVeiculo" />
        <Campo path="comuns.treinamentoDiesel" />
        <Campo path="comuns.treinamentoGas" />
        <Campo path="comuns.treinamentoH2" />
        <Campo path="comuns.treinamentoBev" />
        <Campo path="comuns.seguroPctDiesel" />
        <Campo path="comuns.seguroPctGas" />
        <Campo path="comuns.seguroPctH2" />
        <Campo path="comuns.seguroPctBev" />
        <Campo path="comuns.telemetriaMes" />
        <Campo path="comuns.licenciamentoAno" />
        <Campo path="comuns.pedagioPorKm" />
        <Campo path="comuns.adminGaragemMes" />
        <Campo path="comuns.custoDiaParado" />
        <Campo path="comuns.pneusQtd" />
        <Campo path="comuns.pneuPreco" />
        <Campo path="comuns.pneuVidaKm" />
        <Campo path="comuns.recapagens" />
        <Campo path="comuns.recapagemCusto" />
        <Campo path="comuns.freiosCusto" />
        <Campo path="comuns.freiosVidaKm" />
      </Secao>
    </>
  );
}

export function TabDiesel() {
  return (
    <>
      <Secao titulo="Veículo">
        <Campo path="diesel.precoAquisicao" />
        <Campo path="diesel.precoSemImpostos" />
        <Campo path="diesel.configuracao" />
        <Campo path="diesel.pbtcT" />
        <Campo path="diesel.taraBaseT" />
        <Campo path="diesel.potenciaCv" />
        <Campo path="diesel.norma" />
        <Campo path="diesel.vidaUtilAnos" />
        <CurvaResidual path="diesel.residual" />
      </Secao>

      <Secao titulo="Combustível" descricao="O consumo declarado refere-se à carga de referência; o motor ajusta por perfil de rota, topografia e carga efetivamente transportada.">
        <Campo path="diesel.precoDieselL" />
        <Campo path="diesel.precoDieselSemImpostosL" />
        <Campo path="diesel.usarBasePropria" />
        <Campo path="diesel.descontoBasePropriaPct" />
        <Campo path="diesel.consumoUrbanoKmL" />
        <Campo path="diesel.consumoRegionalKmL" />
        <Campo path="diesel.consumoRodoviarioKmL" />
        <Campo path="diesel.cargaReferenciaT" />
        <Campo path="diesel.ajusteConsumoPorTonPct" />
        <Campo path="diesel.pctMarchaLenta" />
        <Campo path="diesel.consumoMarchaLentaLh" />
        <Campo path="diesel.perdasEvaporacaoPct" />
        <Campo path="diesel.capacidadeTanqueL" />
        <Campo path="diesel.massaTanqueVazioKg" />
        <Campo path="diesel.posTratamentoMassaKg" />
        <Campo path="diesel.tempoAbastecimentoMin" />
        <Campo path="diesel.eficienciaMotor" />
      </Secao>

      <Secao titulo="ARLA 32" descricao="Bloco tratado separadamente no fluxo de caixa e no gráfico de decomposição, incluindo o custo de contaminação e cristalização.">
        <Campo path="diesel.arlaMetodo" />
        <Campo path="diesel.arlaPctDiesel" />
        <Campo path="diesel.arlaL100km" />
        <Campo path="diesel.arlaPrecoL" />
        <Campo path="diesel.arlaEventosAno" />
        <Campo path="diesel.arlaCustoEvento" />
        <Campo path="diesel.arlaTanqueL" />
      </Secao>

      <Secao titulo="Lubrificantes">
        <Campo path="diesel.oleoVolumeL" />
        <Campo path="diesel.oleoPrecoL" />
        <Campo path="diesel.oleoIntervaloKm" />
        <Campo path="diesel.outrosFluidosPctOleo" />
      </Secao>

      <Secao titulo="Manutenção e pós-tratamento">
        <Campo path="diesel.preventivaPorKm" />
        <Campo path="diesel.filtrosCusto" />
        <Campo path="diesel.filtrosIntervaloKm" />
        <Campo path="diesel.scrCusto" />
        <Campo path="diesel.scrVidaKm" />
        <Campo path="diesel.dpfCusto" />
        <Campo path="diesel.dpfIntervaloKm" />
        <Campo path="diesel.sensorNoxCusto" />
        <Campo path="diesel.sensorNoxVidaKm" />
        <Campo path="diesel.deratingProbAno" />
        <Campo path="diesel.deratingCusto" />
        <Campo path="diesel.corretivaAno1" />
        <Campo path="diesel.corretivaCrescimentoPctAA" />
        <Campo path="diesel.altoValorCusto" />
        <Campo path="diesel.altoValorVidaKm" />
        <Campo path="diesel.fatorVidaPneu" />
        <Campo path="diesel.fatorVidaFreio" />
        <Campo path="diesel.horasParadoManutAno" />
        <Campo path="diesel.falhaProbAno" />
        <Campo path="diesel.falhaHorasEvento" />
      </Secao>

      <Secao titulo="Risco e obsolescência" descricao="Converte risco regulatório e exigência de clientes em custo, para que a comparação não ignore o que hoje é incerteza e amanhã é despesa.">
        <Campo path="diesel.zonaRestritaPctRotas" />
        <Campo path="diesel.zonaRestritaCustoPct" />
        <Campo path="diesel.choqueResidualPct" />
        <Campo path="diesel.descontoReceitaPct" />
        <Campo path="diesel.receitaAnual" />
      </Secao>
    </>
  );
}

export function TabGas() {
  const { scenario } = useTco();
  const g = scenario.gas;
  return (
    <>
      <div className="mb-4">
        <Aviso nivel="info">
          Gás natural e biometano rodam no <strong>mesmo caminhão</strong>: mesmo motor, mesmos cilindros, mesma
          estação, mesma manutenção. Por isso os blocos de veículo, manutenção e infraestrutura abaixo valem para as
          duas rotas, e só os blocos de combustível as diferenciam. Para comparar dois veículos distintos — um GNL de
          longo curso contra um GNC urbano, por exemplo — use dois cenários salvos.
        </Aviso>
      </div>

      <Secao titulo="Veículo">
        <Campo path="gas.modoPreco" />
        <Campo path="gas.precoAquisicao" />
        <Campo path="gas.precoSemImpostos" />
        <Campo path="gas.impFobUsd" />
        <Campo path="gas.impFreteSeguroPct" />
        <Campo path="gas.impIiPct" />
        <Campo path="gas.impIpiPct" />
        <Campo path="gas.impIcmsPct" />
        <Campo path="gas.impDespachoPct" />
        <Campo path="gas.configuracao" />
        <Campo path="gas.potenciaCv" />
        <Campo path="gas.ciclo" />
        <Campo path="gas.pilotoDieselPct" />
        <Campo path="gas.pbtcT" />
        <Campo path="gas.taraBaseT" />
        <Campo path="gas.vidaUtilAnos" />
        <CurvaResidual path="gas.residual" />
      </Secao>

      <Secao
        titulo="Armazenamento a bordo"
        descricao="A escolha entre GNC e GNL decide autonomia, massa e evaporação. Declare a forma adotada e ajuste os três parâmetros seguintes de forma coerente."
      >
        <Campo path="gas.armazenamento" />
        <Campo path="gas.capacidadeKg" />
        <Campo path="gas.massaSistemaKgPorKg" />
        <Campo path="gas.massaExtraSistemaKg" />
        <Campo path="gas.perdasBoilOffPctDia" />
        <Campo path="gas.tempoAbastecimentoMin" />
      </Secao>

      <Secao
        titulo="Consumo e propriedades do combustível"
        descricao="Declare o consumo sempre na base do gás natural. O motor de cálculo corrige automaticamente para o poder calorífico maior do biometano."
      >
        <Campo path="gas.consumoUrbanoKg100km" />
        <Campo path="gas.consumoRegionalKg100km" />
        <Campo path="gas.consumoRodoviarioKg100km" />
        <Campo path="gas.cargaReferenciaT" />
        <Campo path="gas.ajusteConsumoPorTonKg100km" />
        <Campo path="gas.pctMarchaLenta" />
        <Campo path="gas.consumoMarchaLentaKgH" />
        <Campo path="gas.eficienciaMotor" />
        <Campo path="gas.pciKWhKg" />
        <Campo path="gas.densidadeKgM3" />
        <Campo path="gas.bioPciKWhKg" />
        <Campo path="gas.bioDensidadeKgM3" />
        <Campo path="gas.slipMetanoPct" />
        <div className="md:col-span-2 xl:col-span-3">
          <Aviso nivel="aviso">
            O metano não queimado é o parâmetro que decide se o gás natural tem ou não vantagem climática sobre o
            diesel. Com GWP de 28, cada ponto percentual de slip acrescenta cerca de 0,28 kgCO₂e por quilo de gás
            consumido. Confira o peso dele no painel de auditoria da rota.
          </Aviso>
        </div>
      </Secao>

      <Secao titulo="Combustível — gás natural fóssil">
        <Campo path="gas.gnvMetodoPreco" />
        {g.gnvMetodoPreco === "m3" && <Campo path="gas.gnvPrecoM3" />}
        {g.gnvMetodoPreco === "kg" && <Campo path="gas.gnvPrecoKg" />}
        {g.gnvMetodoPreco === "mmbtu" && <Campo path="gas.gnvPrecoMMBtu" />}
        <Campo path="gas.gnvPrecoIncluiIcms" />
        <Campo path="gas.gnvCustoLogisticoKg" />
        <Campo path="gas.gnvPerdasTransferenciaPct" />
        <Campo path="econ.escGnv" />
      </Secao>

      <Secao titulo="Combustível — biometano">
        <Campo path="gas.bioModoSuprimento" />
        {g.bioModoSuprimento === "A" && (
          <>
            <Campo path="gas.bioMetodoPreco" />
            {g.bioMetodoPreco === "m3" && <Campo path="gas.bioPrecoM3" />}
            {g.bioMetodoPreco === "kg" && <Campo path="gas.bioPrecoKg" />}
            {g.bioMetodoPreco === "mmbtu" && <Campo path="gas.bioPrecoMMBtu" />}
            <Campo path="gas.bioPrecoIncluiIcms" />
          </>
        )}
        <Campo path="gas.bioCustoLogisticoKg" />
        <Campo path="gas.bioPerdasTransferenciaPct" />
        <Campo path="econ.escBio" />
      </Secao>

      {g.bioModoSuprimento === "B" && (
        <Secao
          titulo="Biometano — produção própria a partir de biogás"
          descricao="O custo do biometano passa a ser o custo nivelado da planta: CAPEX anualizado, OPEX, substrato e crédito do digestato, divididos pela produção."
        >
          <Campo path="gas.bSubstratoTDia" />
          <Campo path="gas.bCustoSubstratoRSt" />
          <Campo path="gas.bRendimentoM3BiogasPorT" />
          <Campo path="gas.bTeorMetanoPct" />
          <Campo path="gas.bPerdaUpgradingPct" />
          <Campo path="gas.bCapexPlanta" />
          <Campo path="gas.bOpexFixoPctAno" />
          <Campo path="gas.bOpexVariavelRSKg" />
          <Campo path="gas.bVidaPlantaAnos" />
          <Campo path="gas.bCreditoDigestatoRSt" />
        </Secao>
      )}

      <Secao titulo="Estação de abastecimento" descricao="O CAPEX da estação é imputado ao veículo na proporção do volume que ele retira do total despachado.">
        <Campo path="gas.usarEstacaoPropria" />
        <Campo path="gas.estacaoCapex" />
        <Campo path="gas.estacaoVidaAnos" />
        <Campo path="gas.estacaoOpexPctCapexAno" />
        <Campo path="gas.estacaoConsumoKWhKg" />
        <Campo path="gas.estacaoPrecoEnergiaRSKWh" />
        <Campo path="gas.estacaoCapacidadeKgDia" />
        <Campo path="gas.estacaoUtilizacaoPct" />
      </Secao>

      <Secao titulo="Manutenção">
        <Campo path="gas.preventivaPorKm" />
        <Campo path="gas.velasCusto" />
        <Campo path="gas.velasIntervaloKm" />
        <Campo path="gas.catalisadorCusto" />
        <Campo path="gas.catalisadorVidaKm" />
        <Campo path="gas.oleoVolumeL" />
        <Campo path="gas.oleoPrecoL" />
        <Campo path="gas.oleoIntervaloKm" />
        <Campo path="gas.outrosFluidosPctOleo" />
        <Campo path="gas.filtrosCusto" />
        <Campo path="gas.filtrosIntervaloKm" />
        <Campo path="gas.inspecaoCilindrosAnos" />
        <Campo path="gas.inspecaoCilindrosCusto" />
        <Campo path="gas.vidaNormativaCilindrosAnos" />
        <Campo path="gas.altoValorCusto" />
        <Campo path="gas.altoValorVidaKm" />
        <Campo path="gas.corretivaAno1" />
        <Campo path="gas.corretivaCrescimentoPctAA" />
        <Campo path="gas.fatorVidaPneu" />
        <Campo path="gas.fatorVidaFreio" />
        <Campo path="gas.horasParadoManutAno" />
        <Campo path="gas.falhaProbAno" />
        <Campo path="gas.falhaHorasEvento" />
      </Secao>

      <Secao titulo="Segurança, garagem e risco">
        <Campo path="gas.adequacaoGaragemCapex" />
        <Campo path="gas.adequacaoGaragemOpexAno" />
        <Campo path="gas.treinamentoRecorrenteAno" />
        <Campo path="gas.zonaRestritaPctRotas" />
        <Campo path="gas.choqueResidualPct" />
      </Secao>

      <Secao titulo="Emissões e tributos específicos" descricao="Os fatores de emissão e o GWP do metano também aparecem na aba Missão; estão repetidos aqui por serem decisivos nesta rota.">
        <Campo path="carbono.gwpMetano" />
        <Campo path="carbono.fatorGnvCombustaoKgKg" />
        <Campo path="carbono.fatorGnvUpstreamKgKg" />
        <Campo path="carbono.fatorBioCombustaoKgKg" />
        <Campo path="carbono.fatorBioUpstreamKgKg" />
        <Campo path="carbono.fatorBioEvitadoKgKg" />
        <Campo path="carbono.noxGnvGkm" />
        <Campo path="carbono.mpGnvGkm" />
        <Campo path="carbono.cbioPorAnoBio" />
        <Campo path="trib.icmsGasPct" />
        <Campo path="comuns.seguroPctGas" />
        <Campo path="comuns.treinamentoGas" />
        <Campo path="trib.depAnosGas" />
        <Campo path="trib.ipvaPctGas" />
        <Campo path="trib.incentivoCapexPctGas" />
        <Campo path="trib.incentivoAnualGas" />
        <Campo path="fin.jurosGas" />
        <Campo path="fin.aluguelMensalGas" />
      </Secao>
    </>
  );
}

export function TabH2() {
  const { scenario } = useTco();
  const modo = scenario.h2.modoSuprimento;
  return (
    <>
      <Secao titulo="Veículo">
        <Campo path="h2.modoPreco" />
        <Campo path="h2.precoAquisicao" />
        <Campo path="h2.precoSemImpostos" />
        <Campo path="h2.impFobUsd" />
        <Campo path="h2.impFreteSeguroPct" />
        <Campo path="h2.impIiPct" />
        <Campo path="h2.impIpiPct" />
        <Campo path="h2.impIcmsPct" />
        <Campo path="h2.impDespachoPct" />
        <Campo path="h2.potenciaPilhaKW" />
        <Campo path="h2.bateriaTampaoKWh" />
        <Campo path="h2.bateriaTampaoKW" />
        <Campo path="h2.capacidadeH2Kg" />
        <Campo path="h2.pressaoBar" />
        <Campo path="h2.autonomiaNominalKm" />
        <Campo path="h2.pbtcT" />
        <Campo path="h2.taraBaseT" />
        <Campo path="h2.toleranciaRegulatoriaT" />
        <Campo path="h2.massaPilhaKgPorKW" />
        <Campo path="h2.massaCilindroKgPorKgH2" />
        <Campo path="h2.massaBateriaKgPorKWh" />
        <Campo path="h2.vidaUtilAnos" />
        <CurvaResidual path="h2.residual" />
      </Secao>

      <Secao titulo="Consumo e desempenho">
        <Campo path="h2.consumoUrbanoKg100km" />
        <Campo path="h2.consumoRegionalKg100km" />
        <Campo path="h2.consumoRodoviarioKg100km" />
        <Campo path="h2.cargaReferenciaT" />
        <Campo path="h2.ajusteConsumoPorTonKg100km" />
        <Campo path="h2.degradacaoPilhaPct1000h" />
        <Campo path="h2.perdasAbastecimentoPct" />
        <Campo path="h2.tempoAbastecimentoMin" />
        <Campo path="h2.eficienciaPilha" />
      </Secao>

      <Secao
        titulo="Suprimento de hidrogênio"
        descricao="Os três modos produzem um custo comparável em R$/kg na porta do veículo. Somente o modo selecionado entra no cálculo."
      >
        <Campo path="h2.modoSuprimento" />
      </Secao>

      {modo === "A" && (
        <Secao titulo="Modo A — hidrogênio comprado e entregue">
          <Campo path="h2.aPrecoKg" />
          <Campo path="h2.aPrecoIncluiIcms" />
          <Campo path="h2.aDistanciaFonteKm" />
          <Campo path="h2.aCustoLogisticoKg" />
          <Campo path="h2.aPerdasTransferenciaPct" />
          <Campo path="h2.aTakeOrPayKgAno" />
          <Campo path="h2.aPenalidadeKg" />
        </Secao>
      )}

      {modo === "B" && (
        <Secao titulo="Modo B — produção própria por eletrólise">
          <Campo path="h2.bCapexEletrolisadorRSKW" />
          <Campo path="h2.bPotenciaKW" />
          <Campo path="h2.bConsumoKWhKg" />
          <Campo path="h2.bDegradacaoStackPctAno" />
          <Campo path="h2.bCustoStackRSKW" />
          <Campo path="h2.bVidaStackHoras" />
          <Campo path="h2.bAguaLKg" />
          <Campo path="h2.bCustoAguaRSm3" />
          <Campo path="h2.bCompressaoKWhKg" />
          <Campo path="h2.bPreResfriamentoKWhKg" />
          <Campo path="h2.bCapexArmazenamentoRSKg" />
          <Campo path="h2.bEstoqueKg" />
          <Campo path="h2.bFatorCapacidadePct" />
          <Campo path="h2.bOpexFixoPctCapexAno" />
          <Campo path="h2.bPrecoEnergiaRSKWh" />
          <Campo path="h2.bVidaPlantaAnos" />
        </Secao>
      )}

      {modo === "C" && (
        <Secao titulo="Modo C — biomassa / looping químico">
          <Campo path="h2.cCustoBiomassaRSt" />
          <Campo path="h2.cUmidadePct" />
          <Campo path="h2.cRendimentoKgPorT" />
          <Campo path="h2.cCapexPlanta" />
          <Campo path="h2.cCapacidadeKgDia" />
          <Campo path="h2.cOpexFixoPctAno" />
          <Campo path="h2.cOpexVariavelRSKg" />
          <Campo path="h2.cCoprodutoTPorTBiomassa" />
          <Campo path="h2.cCreditoCoprodutoRSt" />
          <Campo path="h2.cVidaPlantaAnos" />
        </Secao>
      )}

      <Secao titulo="Estação de abastecimento (HRS)" descricao="O CAPEX da estação é imputado ao veículo na proporção do volume que ele retira do total despachado.">
        <Campo path="h2.usarHrsPropria" />
        <Campo path="h2.hrsCapex" />
        <Campo path="h2.hrsVidaAnos" />
        <Campo path="h2.hrsOpexPctCapexAno" />
        <Campo path="h2.hrsConsumoKWhKg" />
        <Campo path="h2.hrsPrecoEnergiaRSKWh" />
        <Campo path="h2.hrsCapacidadeKgDia" />
        <Campo path="h2.hrsUtilizacaoPct" />
        <Campo path="h2.hrsMovelRSKg" />
      </Secao>

      <Secao titulo="Manutenção específica">
        <Campo path="h2.vidaPilhaHoras" />
        <Campo path="h2.custoPilhaRSKW" />
        <Campo path="h2.bateriaTampaoVidaAnos" />
        <Campo path="h2.custoBateriaTampaoRSKWh" />
        <Campo path="h2.consumiveisCusto" />
        <Campo path="h2.consumiveisIntervaloKm" />
        <Campo path="h2.inspecaoCilindrosAnos" />
        <Campo path="h2.inspecaoCilindrosCusto" />
        <Campo path="h2.vidaNormativaCilindrosAnos" />
        <Campo path="h2.preventivaPorKm" />
        <Campo path="h2.corretivaAno1" />
        <Campo path="h2.corretivaCrescimentoPctAA" />
        <Campo path="h2.fatorVidaPneu" />
        <Campo path="h2.fatorVidaFreio" />
        <Campo path="h2.horasParadoManutAno" />
        <Campo path="h2.falhaProbAno" />
        <Campo path="h2.falhaHorasEvento" />
      </Secao>

      <Secao titulo="Segurança, garagem e risco">
        <Campo path="h2.adequacaoGaragemCapex" />
        <Campo path="h2.adequacaoGaragemOpexAno" />
        <Campo path="h2.treinamentoRecorrenteAno" />
        <Campo path="h2.zonaRestritaPctRotas" />
        <Campo path="h2.choqueResidualPct" />
      </Secao>
    </>
  );
}

export function TabBev() {
  return (
    <>
      <Secao titulo="Veículo">
        <Campo path="bev.modoPreco" />
        <Campo path="bev.precoAquisicao" />
        <Campo path="bev.precoSemImpostos" />
        <Campo path="bev.impFobUsd" />
        <Campo path="bev.impFreteSeguroPct" />
        <Campo path="bev.impIiPct" />
        <Campo path="bev.impIpiPct" />
        <Campo path="bev.impIcmsPct" />
        <Campo path="bev.impDespachoPct" />
        <Campo path="bev.capacidadeKWh" />
        <Campo path="bev.socMinPct" />
        <Campo path="bev.socMaxPct" />
        <Campo path="bev.quimica" />
        <Campo path="bev.massaPackKgPorKWh" />
        <Campo path="bev.massaExtraSistemaKg" />
        <Campo path="bev.potenciaRecargaCcKW" />
        <Campo path="bev.potenciaRecargaCaKW" />
        <Campo path="bev.pbtcT" />
        <Campo path="bev.taraBaseT" />
        <Campo path="bev.toleranciaRegulatoriaT" />
        <Campo path="bev.vidaUtilAnos" />
        <CurvaResidual path="bev.residual" />
      </Secao>

      <Secao titulo="Consumo">
        <Campo path="bev.consumoUrbanoKWhKm" />
        <Campo path="bev.consumoRegionalKWhKm" />
        <Campo path="bev.consumoRodoviarioKWhKm" />
        <Campo path="bev.cargaReferenciaT" />
        <Campo path="bev.ajusteConsumoPorTonKWhKm" />
        <Campo path="bev.regenUrbanoPct" />
        <Campo path="bev.regenRegionalPct" />
        <Campo path="bev.regenRodoviarioPct" />
        <Campo path="bev.climatizacaoBaseKWhDia" />
        <Campo path="bev.climatizacaoPorGrauKWhDia" />
        <Campo path="bev.eficienciaCarregamentoPct" />
        <Campo path="bev.autodescargaPctDia" />
      </Secao>

      <Secao
        titulo="Vida útil da bateria"
        descricao="O ano de substituição não é digitado: o modelo testa o SOH mínimo e a autonomia exigida pela rota mais longa, e adota o critério que ocorrer primeiro."
      >
        <Campo path="bev.degradacaoCalendariaPctAno" />
        <Campo path="bev.ciclosAte80Soh" />
        <Campo path="bev.dodMedioPct" />
        <Campo path="bev.pctRecargaAltaPotencia" />
        <Campo path="bev.fatorAltaPotencia" />
        <Campo path="bev.fatorTemperaturaPorGrau" />
        <Campo path="bev.fatorSocAlto" />
        <Campo path="bev.sohMinimoPct" />
        <Campo path="bev.custoPackRSKWh" />
        <Campo path="bev.curvaAprendizadoPackPctAA" />
        <Campo path="bev.garantiaAnos" />
        <Campo path="bev.garantiaKm" />
        <Campo path="bev.garantiaSohPct" />
        <Campo path="bev.valorSecondLifeRSKWh" />
        <Campo path="bev.custoReciclagemRSKWh" />
      </Secao>

      <Secao titulo="Infraestrutura de recarga">
        <Campo path="bev.numCarregadores" />
        <Campo path="bev.potenciaCarregadorKW" />
        <Campo path="bev.capexPorCarregador" />
        <Campo path="bev.obraCivil" />
        <Campo path="bev.subestacao" />
        <Campo path="bev.conexaoReforcoRede" />
        <Campo path="bev.infraVidaAnos" />
        <Campo path="bev.infraOemPctAno" />
        <Campo path="bev.infraSoftwareMes" />
        <Campo path="bev.infraVeiculosRateio" />
        <Campo path="bev.taperFator" />
        <Campo path="bev.filaFator" />
        <Campo path="bev.pctRecargaForaJanela" />
      </Secao>

      <Secao titulo="Energia elétrica">
        <Campo path="bev.modalidade" />
        <Campo path="bev.teForaPontaRSMWh" />
        <Campo path="bev.tePontaRSMWh" />
        <Campo path="bev.tusdForaPontaRSMWh" />
        <Campo path="bev.tusdPontaRSMWh" />
        <Campo path="bev.demandaContratadaKW" />
        <Campo path="bev.tarifaDemandaRSKWMes" />
        <Campo path="bev.multaUltrapassagemFator" />
        <Campo path="bev.fatorSimultaneidade" />
        <Campo path="bev.bandeiraRSMWh" />
        <Campo path="bev.icmsEnergiaPct" />
        <Campo path="bev.pctPonta" />
        <Campo path="bev.pctForaPonta" />
        <Campo path="bev.pctMadrugada" />
        <Campo path="bev.descontoMadrugadaPct" />
        <Campo path="bev.pctRecargaPublica" />
        <Campo path="bev.precoRecargaPublicaRSKWh" />
        <Campo path="bev.solarUsar" />
        <Campo path="bev.solarCapexRSkWp" />
        <Campo path="bev.solarKWp" />
        <Campo path="bev.solarFatorCapacidadePct" />
        <Campo path="bev.solarVidaAnos" />
        <Campo path="bev.armazenamentoKWh" />
        <Campo path="bev.armazenamentoRSKWh" />
      </Secao>

      <Secao titulo="Manutenção">
        <Campo path="bev.preventivaPorKm" />
        <Campo path="bev.fatorVidaPneu" />
        <Campo path="bev.fatorVidaFreio" />
        <Campo path="bev.fluidosCusto" />
        <Campo path="bev.fluidosIntervaloKm" />
        <Campo path="bev.falhaPackProbAnoPct" />
        <Campo path="bev.falhaPackCusto" />
        <Campo path="bev.corretivaAno1" />
        <Campo path="bev.corretivaCrescimentoPctAA" />
        <Campo path="bev.horasParadoManutAno" />
        <Campo path="bev.falhaProbAno" />
        <Campo path="bev.falhaHorasEvento" />
        <Campo path="bev.zonaRestritaPctRotas" />
        <Campo path="bev.choqueResidualPct" />
      </Secao>
    </>
  );
}
