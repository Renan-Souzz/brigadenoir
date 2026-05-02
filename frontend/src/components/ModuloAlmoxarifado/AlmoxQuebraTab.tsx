import React, { useState } from 'react';
import {
  Scissors, Save, X, Loader2, Weight, Hash, ArrowRight, Flame, Calculator
} from 'lucide-react';
import { useAlmoxMovimentacoes, LoteSaldo } from '../../hooks/useAlmoxMovimentacoes';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';

export default function AlmoxQuebraTab() {
  const { createMovimentacao, getLotesNaCozinha, isUpdating } = useAlmoxMovimentacoes();
  const { isManagement } = useAuth();
  const { showAlert } = useModal();

  const lotesNaCozinha = getLotesNaCozinha();

  const [activeLote, setActiveLote] = useState<string | null>(null);
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [numPorcoes, setNumPorcoes] = useState('');

  const pb = parseFloat(pesoBruto) || 0;
  const pl = parseFloat(pesoLiquido) || 0;
  const perda = Math.max(0, pb - pl);
  const aproveitamento = pb > 0 ? (pl / pb) * 100 : 0;
  const pesoPorPorcao = (parseFloat(numPorcoes) || 0) > 0 ? pl / parseFloat(numPorcoes) : 0;

  const handleSubmit = async (lote: LoteSaldo) => {
    const np = parseFloat(numPorcoes);
    if (!pesoBruto || !pesoLiquido || !numPorcoes) {
      showAlert('Campos Obrigatórios', 'Preencha peso bruto, peso líquido e número de porções.');
      return;
    }
    if (pb <= 0 || pl <= 0 || np <= 0) {
      showAlert('Valores Inválidos', 'Todos os valores devem ser maiores que zero.');
      return;
    }
    if (pl > pb) {
      showAlert('Erro Lógico', 'O peso líquido não pode ser maior que o peso bruto.');
      return;
    }

    try {
      // 1. Teste de Quebra
      await createMovimentacao({
        produto_nome: lote.produto_nome,
        categoria: lote.categoria,
        lote_id: lote.lote_id,
        tipo: 'teste_quebra',
        peso_bruto_kg: pb,
        peso_liquido_kg: pl,
        peso_perda_kg: perda,
        num_porcoes: np,
        peso_por_porcao: pesoPorPorcao,
        percentual_aproveitamento: aproveitamento,
        data_movimentacao: new Date().toISOString(),
      });

      // 2. Retorno ao Almoxarifado (porções limpas)
      await createMovimentacao({
        produto_nome: lote.produto_nome,
        categoria: lote.categoria,
        lote_id: lote.lote_id,
        tipo: 'retorno_almox',
        porcoes_retornadas: np,
        data_movimentacao: new Date().toISOString(),
      });

      setActiveLote(null);
      setPesoBruto('');
      setPesoLiquido('');
      setNumPorcoes('');
      showAlert('✅ Teste Registrado', `${lote.produto_nome}: ${np} porções retornaram ao almoxarifado! (${aproveitamento.toFixed(1)}% aproveitamento)`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao registrar teste de quebra.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <Scissors size={16} className="text-red-400" /> Teste de Quebra e Rendimento
        </h3>
      </div>

      {lotesNaCozinha.length === 0 ? (
        <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/10">
          <Scissors size={40} className="mx-auto text-outline-variant/30 mb-4" />
          <p className="text-outline-variant text-xs font-black uppercase tracking-widest">
            Nenhum produto aguardando teste de quebra.
          </p>
          <p className="text-outline-variant/50 text-[10px] mt-2 uppercase tracking-wider">
            Envie um produto para a cozinha na aba "Chegadas" primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lotesNaCozinha.map(lote => {
            const chegada = lote.movimentacoes.find(m => m.tipo === 'chegada');
            const isActive = activeLote === lote.lote_id;

            return (
              <div key={lote.lote_id} className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden transition-all">
                {/* Card Header */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                      <Flame size={18} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-on-surface uppercase">{lote.produto_nome}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">
                          Bruto: {chegada?.peso_bruto_kg?.toFixed(1)}Kg
                        </span>
                        <span className="text-[8px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">
                          Na Cozinha
                        </span>
                      </div>
                    </div>
                  </div>
                  {isManagement && !isActive && (
                    <button
                      onClick={() => {
                        setActiveLote(lote.lote_id);
                        setPesoBruto(String(chegada?.peso_bruto_kg || ''));
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase hover:bg-red-500/20 transition-all"
                    >
                      <Calculator size={12} /> Registrar Quebra
                    </button>
                  )}
                </div>

                {/* Inline Form */}
                {isActive && (
                  <div className="px-5 pb-5 border-t border-outline-variant/10 pt-5 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                          <Weight size={10} className="inline mr-1" />Peso Bruto (Kg)
                        </label>
                        <input
                          type="number" step="0.001" required value={pesoBruto}
                          onChange={e => setPesoBruto(e.target.value)}
                          className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-red-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                          <Weight size={10} className="inline mr-1" />Peso Líquido (Kg)
                        </label>
                        <input
                          type="number" step="0.001" required value={pesoLiquido}
                          onChange={e => setPesoLiquido(e.target.value)}
                          placeholder="Após limpeza"
                          className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-red-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                          <Hash size={10} className="inline mr-1" />Nº de Porções
                        </label>
                        <input
                          type="number" step="1" required value={numPorcoes}
                          onChange={e => setNumPorcoes(e.target.value)}
                          placeholder="Qtd porções"
                          className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-red-400"
                        />
                      </div>
                    </div>

                    {/* Live Preview */}
                    {pb > 0 && pl > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                          <span className="block text-[7px] font-bold text-outline-variant uppercase">Perda</span>
                          <span className="text-xs font-black text-red-400">{perda.toFixed(2)}Kg</span>
                        </div>
                        <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                          <span className="block text-[7px] font-bold text-outline-variant uppercase">Aproveit.</span>
                          <span className={`text-xs font-black ${aproveitamento >= 70 ? 'text-green-400' : aproveitamento >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {aproveitamento.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                          <span className="block text-[7px] font-bold text-outline-variant uppercase">Porção</span>
                          <span className="text-xs font-black text-primary">{pesoPorPorcao > 0 ? `${(pesoPorPorcao * 1000).toFixed(0)}g` : '—'}</span>
                        </div>
                        <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                          <span className="block text-[7px] font-bold text-outline-variant uppercase">Porções</span>
                          <span className="text-xs font-black text-primary">{numPorcoes || '—'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/10">
                      <button
                        type="button"
                        onClick={() => { setActiveLote(null); setPesoBruto(''); setPesoLiquido(''); setNumPorcoes(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 text-outline-variant hover:text-red-400 rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        <X size={12} /> Cancelar
                      </button>
                      <button
                        onClick={() => handleSubmit(lote)}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-black uppercase text-xs hover:bg-red-600 disabled:opacity-50 transition-all"
                      >
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Quebra <ArrowRight size={12} /> Retornar ao Almox
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
