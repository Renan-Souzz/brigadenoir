import * as XLSX from 'xlsx';

export interface ExportData {
  ficha: {
    nome: string;
    categoria: string;
    rendimento: number;
    precoVenda: number;
    cmvIdeal: number;
  };
  ingredientes: any[];
  financeiro: {
    custoTotal: number;
    custoPorPorcao: number;
    cmvAtual: number;
    precoSugerido: number;
  };
  producao: {
    passos: string;
  };
  rotulagem: {
    alergenos: string[];
    gluten: string;
    lactose: string;
    validade: string;
    conservacao: string;
  };
}

export const exportToExcel = (data: ExportData & { financeiro: ExportData['financeiro'] & { cmv: number; nutricao?: { acucar: number; sodio: number; gordura: number } } }) => {
  const wb = XLSX.utils.book_new();

  // Aba 1: Ficha Técnica (Engenharia)
  const fichaWS = XLSX.utils.json_to_sheet(data.ingredientes.map((i: any) => ({
    'Insumo': i.insumo_nome || 'Não Selecionado',
    'Peso Bruto (g/ml)': i.pb_gramas,
    'Fator Correção (FC)': i.fc,
    'Índice Reidratação (IR)': i.ir,
    'Índice Absorção (IA)': i.ia,
    'Índice Descongelamento (ICD)': i.icd,
    'Peso Líquido Final': (i.pb_gramas / (i.fc || 1) * (i.ir || 1) * (i.ia || 1) * (i.icd || 1)).toFixed(2)
  })));
  XLSX.utils.book_append_sheet(wb, fichaWS, 'Engenharia de Produção');

  // Aba 2: Financeiro e CMV
  const financeiroWS = XLSX.utils.json_to_sheet([{
    'Nome da Receita': data.ficha.nome,
    'Categoria': data.ficha.categoria,
    'Rendimento Total': data.ficha.rendimento,
    'Custo da Receita': data.financeiro.custoTotal.toFixed(2),
    'Custo por Porção': data.financeiro.custoPorPorcao.toFixed(2),
    'Preço Praticado': data.ficha.precoVenda.toFixed(2),
    'CMV Atual (%)': data.financeiro.cmv.toFixed(2),
    'Meta de CMV (%)': data.ficha.cmvIdeal,
    'Preço Sugerido (p/ Meta)': data.financeiro.precoSugerido.toFixed(2)
  }]);
  XLSX.utils.book_append_sheet(wb, financeiroWS, 'Financeiro e CMV');

  // Aba 3: Modo de Preparo
  const producaoWS = XLSX.utils.json_to_sheet([{
    'Instruções de Produção': data.producao.passos
  }]);
  XLSX.utils.book_append_sheet(wb, producaoWS, 'Modo de Preparo');

  // Aba 4: Anvisa RDC 429
  const rotulagemWS = XLSX.utils.json_to_sheet([{
    'Açúcares Adicionados (g/100)': data.financeiro.nutricao?.acucar.toFixed(2),
    'Sódio (mg/100)': data.financeiro.nutricao?.sodio.toFixed(2),
    'Gordura Saturada (g/100)': data.financeiro.nutricao?.gordura.toFixed(2),
    'Validade': data.rotulagem.validade,
    'Conservação': data.rotulagem.conservacao,
    'Glúten': data.rotulagem.gluten,
    'Lactose': data.rotulagem.lactose
  }]);
  XLSX.utils.book_append_sheet(wb, rotulagemWS, 'Rotulagem e Anvisa');

  // Exportar
  XLSX.writeFile(wb, `FT_BrigadeNoir_${data.ficha.nome.replace(/\s+/g, '_')}.xlsx`);
};
