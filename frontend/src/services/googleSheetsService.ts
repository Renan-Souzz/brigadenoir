import { supabase } from '../lib/supabase';

/**
 * Sincronização com Google Sheets via Supabase Edge Function.
 * Este serviço chama uma função segura no servidor que cria uma NOVA planilha.
 */

export const syncToGoogleSheets = async (data: any) => {
  try {
    const { data: response, error } = await supabase.functions.invoke('export-sheets', {
      body: { data }
    });

    if (error) throw error;
    if (response.error) throw new Error(response.error);

    // Abrir a planilha em uma nova aba
    if (response.url) {
      window.open(response.url, '_blank');
    }

    return true;
  } catch (error: any) {
    console.error('Erro ao exportar para Google Sheets:', error);
    throw new Error(`Falha na exportação: ${error.message}`);
  }
};


