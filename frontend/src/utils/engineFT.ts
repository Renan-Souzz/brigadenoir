/**
 * Motor de Cálculo Centralizado - Ficha Técnica (Engenharia & Nutrição)
 * Brigade Noir SaaS
 */

export interface Factores {
  fc: number;  // Fator de Correção/Cocção
  ir: number;  // Índice de Reidratação
  ia: number;  // Índice de Absorção
  icd: number; // Índice de Conservação de Descongelamento
}

export interface IngredienteFicha extends Factores {
  pb: number;
  precoUnitario: number;
  insumo_nome?: string;
  // Campos Nutricionais (proporcionais a 100g/ml do insumo)
  acucares_adicionados_g: number;
  sodio_mg: number;
  gordura_saturada_g: number;
}

/**
 * Calcula o PL final baseado na sequência obrigatória:
 * PB -> FC -> IR -> IA -> ICD
 */
export function calcularPLFinal(pb: number, factores: Factores): number {
  const { fc, ir, ia, icd } = factores;
  // PL = PB × FC × IR × IA × ICD (Todos agindo como multiplicadores)
  return pb * fc * ir * ia * icd;
}

/**
 * Calcula o custo do ingrediente baseando-se no Peso Bruto (PB)
 */
export function calcularCustoIngrediente(pb: number, precoUnitario: number): number {
  return pb * precoUnitario;
}

/**
 * Lógica ANVISA RDC 429/2020 & IN 75/2020
 * Detecta se o produto final excede os limites por 100g ou 100ml
 */
export function verificarAlertasAnvisa(nutricaoTotal: { acucar: number, sodio: number, gordura: number, pesoTotal: number }, isLiquid: boolean) {
  const defaults = { 
    altoAcucar: false, 
    altoSodio: false, 
    altoGordura: false,
    valoresPor100: { acucarPor100: 0, sodioPor100: 0, gorduraPor100: 0 }
  };

  if (nutricaoTotal.pesoTotal <= 0) return defaults;

  // Normalizar para 100g ou 100ml
  const fator = 100 / nutricaoTotal.pesoTotal;
  const acucarPor100 = nutricaoTotal.acucar * fator;
  const sodioPor100 = nutricaoTotal.sodio * fator;
  const gorduraPor100 = nutricaoTotal.gordura * fator;

  return {
    altoAcucar: isLiquid ? acucarPor100 >= 7.5 : acucarPor100 >= 15,
    altoSodio: isLiquid ? sodioPor100 >= 300 : sodioPor100 >= 600,
    altoGordura: isLiquid ? gorduraPor100 >= 3 : gorduraPor100 >= 6,
    valoresPor100: { acucarPor100, sodioPor100, gorduraPor100 }
  };
}

/**
 * Detecta alérgenos principais baseando-se no nome dos insumos
 * Conforme RDC 26/2015 ANVISA
 */
export function detectarAlergenos(ingredientes: { insumo_nome?: string }[]): string[] {
  const alergenosDetectados = new Set<string>();

  const alergiasKeywords = {
    'Glúten': ['farinha de trigo', 'trigo', 'centeio', 'cevada', 'aveia', 'malte', 'pão', 'macarrão', 'massa'],
    'Lactose/Leite': ['leite', 'queijo', 'manteiga', 'creme de leite', 'iogurte', 'requeijão', 'soro', 'lactose'],
    'Ovos': ['ovo', 'ovos', 'clara', 'gema', 'maionese'],
    'Peixes': ['peixe', 'salmão', 'atum', 'tilápia', 'bacalhau'],
    'Crustáceos': ['camarão', 'lagosta', 'caranguejo', 'siri', 'ostra', 'mexilhão'],
    'Amendoim': ['amendoim', 'paçoca'],
    'Soja': ['soja', 'shoyu', 'tofu'],
    'Castanhas/Nozes': ['castanha', 'noz', 'nozes', 'amêndoa', 'avelã', 'macadâmia', 'pistache']
  };

  ingredientes.forEach(ing => {
    const nome = (ing.insumo_nome || '').toLowerCase();
    Object.entries(alergiasKeywords).forEach(([alergeno, keywords]) => {
      if (keywords.some(k => nome.includes(k.toLowerCase()))) {
        alergenosDetectados.add(alergeno);
      }
    });
  });

  return Array.from(alergenosDetectados);
}

/**
 * Realiza o cálculo completo da Ficha Técnica
 */
export function calcularResumoFicha(ingredientes: IngredienteFicha[], rendimento: number = 1, precoVenda: number = 0) {
  let custoTotal = 0;
  let pesoTotalPL = 0;

  const nutricao = ingredientes.reduce((acc, ing) => {
    // Lógica Automática sugerida pelo usuário:
    // Se o nome contiver "Açúcar", o peso PB conta integralmente como açúcar.
    // Se o nome contiver "Sal", o peso PB conta como sódio (1g sal = 400mg sódio).
    
    let acucarIng = ing.acucares_adicionados_g;
    let sodioIng = ing.sodio_mg;

    const nomeLower = (ing.insumo_nome || '').toLowerCase();
    
    if (nomeLower.includes('açúcar') || nomeLower.includes('acucar')) {
      acucarIng = 100; // 100g de açúcar por 100g de produto
    } else if (nomeLower.includes('sal')) {
      sodioIng = 40000; // 40.000mg de sódio por 100g de sal (400mg por 1g)
    }

    const custoIng = ing.pb * ing.precoUnitario;
    custoTotal += custoIng;

    const pl = calcularPLFinal(ing.pb, { fc: ing.fc, ir: ing.ir, ia: ing.ia, icd: ing.icd });
    pesoTotalPL += pl;

    return {
      acucar: acc.acucar + (acucarIng * (ing.pb / 100)),
      sodio: acc.sodio + (sodioIng * (ing.pb / 100)),
      gordura: acc.gordura + (ing.gordura_saturada_g * (ing.pb / 100))
    };
  }, { acucar: 0, sodio: 0, gordura: 0 });

  const custoPorPorcao = rendimento > 0 ? custoTotal / rendimento : 0;
  const cmv = (custoTotal > 0 && precoVenda > 0) ? (custoTotal / precoVenda) * 100 : 0;

  return {
    custoTotal,
    custoPorPorcao,
    cmv,
    pesoTotalPL,
    nutricao,
    precoSugerido: (margem: number) => (margem > 0 ? custoTotal / (margem / 100) : 0)
  };
}

export function converterParaBase(valor: number, unidade: string): number {
  const u = unidade.toLowerCase();
  if (u === 'kg' || u === 'l') return valor * 1000;
  return valor;
}
