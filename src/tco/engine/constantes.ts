/**
 * Constantes físicas e normativas. Não são premissas comerciais: são
 * propriedades dos combustíveis e conversões de unidade. Ficam isoladas aqui
 * para que nenhum número sem origem apareça no meio do motor de cálculo.
 */
export const CONST = {
  /** Poder calorífico inferior do diesel: 35,8 MJ/L = 9,94 kWh/L. */
  PCI_DIESEL_KWH_L: 9.94,
  /** Densidade do diesel S10 a 20 °C. */
  DENSIDADE_DIESEL_KG_L: 0.84,
  /** Poder calorífico inferior do hidrogênio: 120 MJ/kg = 33,33 kWh/kg. */
  PCI_H2_KWH_KG: 33.33,
  /** Densidade do ARLA 32 (solução de ureia a 32,5%). */
  DENSIDADE_ARLA_KG_L: 1.09,
  /** Horas em um ano civil. */
  HORAS_ANO: 8760,
  /** 1 MMBtu = 293,07 kWh. Usado na conversão de contratos de gás. */
  MMBTU_KWH: 293.07,
  /**
   * Combustão completa do metano: CH4 + 2 O2 → CO2 + 2 H2O.
   * 16,04 g de CH4 produzem 44,01 g de CO2 → 2,74 kgCO2 por kg de metano.
   */
  CO2_POR_KG_METANO: 2.74,
  /** Reserva operacional: fração do tanque efetivamente usada entre paradas. */
  USO_TANQUE_DIESEL: 0.9,
  USO_TANQUE_H2: 0.95,
  USO_TANQUE_GAS: 0.9,
  /**
   * Faixas de eficiência do trem de força aceitas na verificação de
   * consistência (item 9.3 da especificação). São faixas de ciclo completo,
   * do tanque/pack à roda, e por isso mais largas que a eficiência de pico do
   * motor ou da pilha: incluem transmissão, auxiliares e operação em carga
   * parcial. A referência do BEV vai a 100% porque o consumo declarado já é
   * líquido da regeneração.
   */
  EFIC_DIESEL: [0.25, 0.45] as [number, number],
  EFIC_FCEV: [0.35, 0.55] as [number, number],
  EFIC_BEV: [0.7, 1.0] as [number, number],
  /** Ciclo Otto a gás: eficiência menor que a do ciclo Diesel equivalente. */
  EFIC_GAS: [0.2, 0.4] as [number, number],
  /** Perda de capacidade que define o fim de vida convencional da bateria. */
  QUEDA_SOH_FIM_VIDA_PCT: 20,
};
