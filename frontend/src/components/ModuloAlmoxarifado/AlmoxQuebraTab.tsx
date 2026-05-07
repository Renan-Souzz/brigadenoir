import React, { useState, useMemo } from 'react';
import {
  Scissors, Save, X, Loader2, Weight, Hash, ArrowRight, Flame, Calculator, Plus, Trash2 as TrashIcon, Info
} from 'lucide-react';
import { useAlmoxMovimentacoes, LoteSaldo } from '../../hooks/useAlmoxMovimentacoes';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import Button from '../shared/Button';

interface YieldComponent {
  id: string;
  name: string;
  weight: string;
  portions: string;
}

const PROTEIN_PRESETS: Record<string, string[]> = {
  'FILÉ MIGNON': ['TORNEDOR', 'CABEÇA', 'APARAS', 'CORDÃO'],
  'SALMÃO': ['FILÉ CENTRAL', 'RABO', 'VENTRECHA', 'APARAS'],
  'ALCATRA': ['PICANHA', 'MAMINHA', 'BABY BEEF', 'APARAS'],
  'FRANGO': ['PEITO', 'SOBRECOXA', 'ASA', 'CARCAÇA'],
  'PICANHA': ['PICANHA LIMPA', 'GORDURA', 'APARAS'],
};

export default function AlmoxQuebraTab() {
  const { createMovimentacao, getLotesNaCozinha, isUpdating } = useAlmoxMovimentacoes();
  const { isManagement } = useAuth();
  const { showAlert } = useModal();

  const lotesNaCozinha = getLotesNaCozinha();

  const [activeLote, setActiveLote] = useState<string | null>(null);
  const [pesoBruto, setPesoBruto] = useState('');
  const [components, setComponents] = useState<YieldComponent[]>([
    { id: '1', name: '', weight: '', portions: '' }
  ]);

  const pb = parseFloat(pesoBruto) || 0;
  const totalLiquido = useMemo(() => components.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0), [components]);
  const totalPorcoes = useMemo(() => components.reduce((acc, c) => acc + (parseFloat(c.portions) || 0), 0), [components]);
  
  const perda = Math.max(0, pb - totalLiquido);
  const aproveitamento = pb > 0 ? (totalLiquido / pb) * 100 : 0;

  const addComponent = (name = '') => {
    setComponents([...components, { id: Math.random().toString(36).substr(2, 9), name, weight: '', portions: '' }]);
  };

  const removeComponent = (id: string) => {
    if (components.length > 1) {
      setComponents(components.filter(c => c.id !== id));
    }
  };

  const updateComponent = (id: string, field: keyof YieldComponent, value: string) => {
    setComponents(components.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const applyPreset = (productName: string) => {
    const cleanName = productName.toUpperCase().trim();
    const preset = Object.entries(PROTEIN_PRESETS).find(([k]) => cleanName.includes(k));
    if (preset) {
      const newComps = preset[1].map((name, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: `${cleanName} (${name})`,
        weight: '',
        portions: ''
      }));
      setComponents(newComps);
    }
  };

  const handleSubmit = async (lote: LoteSaldo) => {
    if (!pesoBruto || components.some(c => !c.name || !c.weight || !c.portions)) {
      showAlert('Campos Obrigatórios', 'Preencha todos os dados dos componentes da quebra.');
      return;
    }

    if (totalLiquido > pb) {
      showAlert('Erro Lógico', 'O peso líquido total não pode ser maior que o peso bruto.');
      return;
    }

    try {
      // 1. Registrar o Teste de Quebra no Lote Original (para fechar o ciclo do bruto)
      await createMovimentacao({
        produto_nome: lote.produto_nome,
        categoria: lote.categoria,
        lote_id: lote.lote_id,
        tipo: 'teste_quebra',
        peso_bruto_kg: pb,
        peso_liquido_kg: totalLiquido,
        peso_perda_kg: perda,
        num_porcoes: totalPorcoes,
        percentual_aproveitamento: aproveitamento,
        data_movimentacao: new Date().toISOString(),
        observacoes: `Desdobramento em ${components.length} sub-produtos.`
      });

      // 2. Para cada componente, criar um novo lote no Almoxarifado
      for (const comp of components) {
        const pesoComp = parseFloat(comp.weight);
        const porcoesComp = parseFloat(comp.portions);
        const pesoPorPorcao = pesoComp / porcoesComp;

        // Criamos uma nova "Chegada" para o sub-produto para gerar um novo Lote ID
        const novaChegada = await createMovimentacao({
          produto_nome: comp.name.toUpperCase().trim(),
          categoria: 'porcoes', // Sub-produtos limpos entram como porções
          tipo: 'chegada',
          peso_bruto_kg: pesoComp,
          validade: lote.movimentacoes.find(m => m.tipo === 'chegada')?.validade || new Date().toISOString(),
          data_movimentacao: new Date().toISOString(),
          observacoes: `Originado de: ${lote.produto_nome} (Lote: ${lote.lote_id})`
        });

        // Imediatamente marcamos como testado e retornado ao estoque
        await createMovimentacao({
            produto_nome: comp.name.toUpperCase().trim(),
            categoria: 'porcoes',
            lote_id: novaChegada.lote_id,
            tipo: 'teste_quebra',
            peso_bruto_kg: pesoComp,
            peso_liquido_kg: pesoComp,
            num_porcoes: porcoesComp,
            peso_por_porcao: pesoPorPorcao,
            percentual_aproveitamento: 100,
            data_movimentacao: new Date().toISOString(),
        });

        await createMovimentacao({
          produto_nome: comp.name.toUpperCase().trim(),
          categoria: 'porcoes',
          lote_id: novaChegada.lote_id,
          tipo: 'retorno_almox',
          porcoes_retornadas: porcoesComp,
          data_movimentacao: new Date().toISOString(),
        });
      }

      setActiveLote(null);
      setPesoBruto('');
      setComponents([{ id: '1', name: '', weight: '', portions: '' }]);
      showAlert('✅ Processamento Concluído', `O produto ${lote.produto_nome} foi desdobrado e os sub-produtos foram adicionados ao estoque.`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao registrar processamento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <Scissors size={16} className="text-red-400" /> Desdobramento e Rendimento
        </h3>
      </div>

      {lotesNaCozinha.length === 0 ? (
        <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/10">
          <Scissors size={40} className="mx-auto text-outline-variant/30 mb-4" />
          <p className="text-outline-variant text-xs font-black uppercase tracking-widest">
            Nenhum produto aguardando desdobramento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lotesNaCozinha.map(lote => {
            const chegada = lote.movimentacoes.find(m => m.tipo === 'chegada');
            const isActive = activeLote === lote.lote_id;

            return (
              <div key={lote.lote_id} className="bg-surface-container rounded-[2rem] border border-outline-variant/10 overflow-hidden transition-all">
                <div className="p-6 flex items-center justify-between bg-surface-container-low">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                      <Flame size={22} />
                    </div>
                    <div>
                      <h5 className="text-lg font-black text-on-surface uppercase tracking-tighter">{lote.produto_nome}</h5>
                      <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest">Peso Original: {chegada?.peso_bruto_kg?.toFixed(2)}Kg</span>
                    </div>
                  </div>
                  {isManagement && !isActive && (
                    <button
                      onClick={() => {
                        setActiveLote(lote.lote_id);
                        setPesoBruto(String(chegada?.peso_bruto_kg || ''));
                        applyPreset(lote.produto_nome);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      <Calculator size={14} /> Iniciar Desdobramento
                    </button>
                  )}
                </div>

                {isActive && (
                  <div className="p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                       <div className="md:col-span-1">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 ml-1">Peso Bruto (Kg)</label>
                          <input
                            type="number" step="0.001" value={pesoBruto}
                            onChange={e => setPesoBruto(e.target.value)}
                            className="w-full bg-surface-container-highest p-4 rounded-2xl border border-outline-variant/20 text-sm font-bold text-on-surface focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all"
                          />
                       </div>
                       <div className="md:col-span-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => addComponent()} className="border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-highest uppercase text-[10px] font-black">
                             <Plus size={14} /> Add Componente
                          </Button>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant ml-1">Composição do Rendimento</p>
                       {components.map((comp, idx) => (
                         <div key={comp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                            <div className="md:col-span-5">
                               <input
                                 placeholder="Sub-produto (ex: Tornedor)"
                                 value={comp.name}
                                 onChange={e => updateComponent(comp.id, 'name', e.target.value)}
                                 className="w-full bg-transparent border-none text-sm font-black uppercase placeholder:text-outline-variant/30 focus:ring-0"
                               />
                            </div>
                            <div className="md:col-span-3">
                               <div className="flex items-center bg-surface-container-highest rounded-xl px-3 border border-outline-variant/10 focus-within:border-red-400/50 transition-colors">
                                  <Weight size={14} className="text-outline-variant" />
                                  <input
                                    type="number" step="0.001" placeholder="Peso Kg"
                                    value={comp.weight}
                                    onChange={e => updateComponent(comp.id, 'weight', e.target.value)}
                                    className="w-full bg-transparent border-none text-xs font-bold p-3 focus:ring-0"
                                  />
                               </div>
                            </div>
                            <div className="md:col-span-3">
                               <div className="flex items-center bg-surface-container-highest rounded-xl px-3 border border-outline-variant/10 focus-within:border-red-400/50 transition-colors">
                                  <Hash size={14} className="text-outline-variant" />
                                  <input
                                    type="number" placeholder="Porções"
                                    value={comp.portions}
                                    onChange={e => updateComponent(comp.id, 'portions', e.target.value)}
                                    className="w-full bg-transparent border-none text-xs font-bold p-3 focus:ring-0"
                                  />
                               </div>
                            </div>
                            <div className="md:col-span-1 flex justify-center">
                               <button onClick={() => removeComponent(comp.id)} className="text-outline-variant hover:text-error transition-colors p-2">
                                  <TrashIcon size={16} />
                                </button>
                            </div>
                         </div>
                       ))}
                    </div>

                    {/* Footer Summary */}
                    <div className="bg-surface-container-highest rounded-[2rem] p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                           <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest block mb-1">Perda Total</span>
                           <span className="text-2xl font-black text-error tabular-nums">{perda.toFixed(3)} Kg</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest block mb-1">Aproveitamento</span>
                           <span className={`text-2xl font-black tabular-nums ${aproveitamento > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{aproveitamento.toFixed(1)}%</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest block mb-1">Total Líquido</span>
                           <span className="text-2xl font-black text-on-surface tabular-nums">{totalLiquido.toFixed(3)} Kg</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest block mb-1">Total Porções</span>
                           <span className="text-2xl font-black text-primary tabular-nums">{totalPorcoes} un</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                      <div className="flex items-center gap-2 text-outline-variant">
                         <Info size={14} />
                         <span className="text-[9px] font-bold uppercase tracking-tighter">Sub-produtos serão adicionados como novos lotes independentes.</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setActiveLote(null)} className="px-6 py-3 text-xs font-black uppercase text-outline-variant hover:text-on-surface transition-colors">Cancelar</button>
                        <Button
                          variant="error-solid"
                          size="lg"
                          onClick={() => handleSubmit(lote)}
                          loading={isUpdating}
                          className="shadow-xl shadow-red-500/20"
                        >
                          {!isUpdating && <Save size={16} />}
                          Finalizar Processamento
                        </Button>
                      </div>
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
