import React, { useState } from 'react';
import { useInsumoRendimentos } from '../../hooks/useInsumoRendimentos';
import { useInsumos } from '../../hooks/useInsumos';
import { formatLocalDate } from '../../lib/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { 
  Scale, 
  Trash2, 
  Plus, 
  Loader2, 
  Flame, 
  ArrowRight,
  Calculator,
  Save,
  X
} from 'lucide-react';

export default function RendimentosList() {
  const { data: rendimentos = [], isLoading, deleteRendimento, upsertRendimento, isUpdating } = useInsumoRendimentos();
  const { createInsumo } = useInsumos('almoxarifado');

  const [isCreating, setIsCreating] = useState(false);
  const [nomeProduto, setNomeProduto] = useState('');
  const [categoria, setCategoria] = useState('proteinas');
  const [dataProc, setDataProc] = useState(formatLocalDate());
  const [validade, setValidade] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [porcoes, setPorcoes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeProduto || !pesoBruto || !pesoLiquido || !porcoes || !validade) {
      showAlert('Campos Obrigatórios', 'Preencha todos os campos do teste de rendimento.');
      return;
    }
    
    const pb = parseFloat(pesoBruto);
    const pl = parseFloat(pesoLiquido);
    const pp = parseFloat(porcoes);
    
    if (pb <= 0 || pl <= 0 || pp <= 0) {
      showAlert('Valores Inválidos', 'Os pesos e rendimentos devem ser maiores que zero.');
      return;
    }
    if (pl > pb) {
      showAlert('Erro Lógico', 'O peso líquido (após limpeza) não pode ser maior que o peso bruto.');
      return;
    }

    try {
      // 1. Cria o insumo já processado/limpo no Almoxarifado
      const novoInsumo = await createInsumo({
        name: nomeProduto.toUpperCase(),
        categoria: categoria,
        quantity: pl,
        unit: 'Kg',
        expiry_date: validade,
        station: 'almoxarifado'
      });

      // 2. Registra o teste de quebra associado ao insumo criado
      await upsertRendimento({
        insumo_id: novoInsumo.id,
        data_processamento: dataProc,
        peso_bruto: pb,
        peso_liquido: pl,
        peso_perda: pb - pl,
        rendimento_porcoes: pp
      });
      
      setIsCreating(false);
      setNomeProduto('');
      setCategoria('proteinas');
      setValidade('');
      setPesoBruto('');
      setPesoLiquido('');
      setPorcoes('');
      showAlert('Sucesso', 'Teste de quebra registrado e produto adicionado ao estoque!');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao salvar teste de quebra.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('Excluir Teste', 'Tem certeza que deseja excluir este teste de rendimento?')) {
      await deleteRendimento(id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <Scale size={16} className="text-primary" /> Testes de Quebra e Rendimento
        </h3>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase hover:bg-primary/20 transition-all"
          >
            <Plus size={14} /> Novo Teste
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-surface-container-highest p-6 rounded-2xl border border-primary/20 relative animate-in fade-in zoom-in-95">
          <button type="button" onClick={() => setIsCreating(false)} className="absolute top-4 right-4 p-2 text-outline-variant hover:text-red-400"><X size={16} /></button>
          
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Calculator size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">Registrar Processamento e Enviar para Estoque</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Produto Final (Ex: Mignon Limpo)</label>
              <input type="text" required value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} placeholder="Nome do Insumo Limpo" className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary uppercase font-bold text-on-surface" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Categoria</label>
              <select required value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary">
                <option value="proteinas">Proteínas</option>
                <option value="molhos">Molhos</option>
                <option value="porcoes">Porções Fracionadas</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Data Processamento</label>
              <input type="date" required value={dataProc} onChange={e => setDataProc(e.target.value)} className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Peso Bruto (Kg)</label>
              <input type="number" step="0.001" required value={pesoBruto} onChange={e => setPesoBruto(e.target.value)} placeholder="Ex: 10.5" className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Peso Líquido (Kg)</label>
              <input type="number" step="0.001" required value={pesoLiquido} onChange={e => setPesoLiquido(e.target.value)} placeholder="Ex: 8.2" className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Rendimento (Porções)</label>
              <input type="number" step="0.1" required value={porcoes} onChange={e => setPorcoes(e.target.value)} placeholder="Ex: 40" className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Validade</label>
              <input type="date" required value={validade} onChange={e => setValidade(e.target.value)} className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-primary" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-outline-variant/10">
            <button type="submit" disabled={isUpdating} className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-black uppercase text-xs hover:bg-primary/90 disabled:opacity-50">
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Teste & Adicionar Estoque
            </button>
          </div>
        </form>
      )}

      {rendimentos.length === 0 && !isCreating ? (
        <div className="p-8 text-center bg-surface-container rounded-2xl border border-outline-variant/10 text-outline-variant text-xs font-black uppercase tracking-widest">
          Nenhum teste de rendimento registrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rendimentos.map(r => {
            const percAproveitamento = (r.peso_liquido / r.peso_bruto) * 100;
            const percPerda = (r.peso_perda / r.peso_bruto) * 100;

            return (
              <div key={r.id} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 relative group">
                {isManagement && (
                  <button onClick={() => handleDelete(r.id)} className="absolute top-4 right-4 p-2 text-outline-variant/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Flame size={14} /></div>
                  <div>
                    <h5 className="text-sm font-black text-on-surface uppercase">{r.insumo?.name || 'Insumo Deletado'}</h5>
                    <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">{new Date(r.data_processamento).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                    <span className="block text-[8px] font-bold text-outline-variant uppercase mb-1">Bruto</span>
                    <span className="text-xs font-black text-on-surface">{r.peso_bruto.toFixed(2)}kg</span>
                  </div>
                  <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                    <span className="block text-[8px] font-bold text-outline-variant uppercase mb-1">Líquido</span>
                    <span className="text-xs font-black text-green-400">{r.peso_liquido.toFixed(2)}kg</span>
                  </div>
                  <div className="bg-surface-container-highest p-2 rounded-lg text-center">
                    <span className="block text-[8px] font-bold text-outline-variant uppercase mb-1">Perda</span>
                    <span className="text-xs font-black text-red-400">{r.peso_perda.toFixed(2)}kg</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-outline-variant">Aproveitamento</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${percAproveitamento < 60 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {percAproveitamento.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary bg-primary/5 px-2.5 py-1 rounded-md">
                    <ArrowRight size={12} />
                    <span className="text-xs font-black uppercase">{r.rendimento_porcoes} Porções</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
