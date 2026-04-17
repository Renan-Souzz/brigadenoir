import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ChevronRight, 
  Info,
  Beaker,
  AlertCircle,
  Hash,
  DollarSign,
  Scale
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import StatCard from '../shared/StatCard';
import { useFTInsumos, FTInsumo } from '../../hooks/useFTInsumos';
import Modal from '../shared/Modal';
import { useModal } from '../../contexts/ModalContext';

export default function InsumosTecnicos() {
  const { insumos, isLoading, createInsumo, deleteInsumo } = useFTInsumos();
  const { showConfirm, showAlert } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [nome, setNome] = useState('');
  const [unidadeBase, setUnidadeBase] = useState<'g' | 'ml' | 'un'>('g');
  const [precoCompra, setPrecoCompra] = useState('');
  const [qtyCompra, setQtyCompra] = useState('');
  const [unidadeCompra, setUnidadeCompra] = useState('kg');
  const [selectedAlergenos, setSelectedAlergenos] = useState<string[]>([]);
  const [isLiquid, setIsLiquid] = useState(false);

  const filteredInsumos = insumos.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => ({
    total: insumos.length,
    expensive: insumos.filter(i => i.preco_unitario_base > 1).length,
    unidades: insumos.filter(i => i.unidade_base === 'un').length
  }), [insumos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInsumo({
        nome: nome.toUpperCase(),
        unidade_base: unidadeBase,
        preco_compra: parseFloat(precoCompra),
        quantidade_compra: parseFloat(qtyCompra),
        unidade_compra: unidadeCompra,
        acucares_adicionados_g: 0,
        sodio_mg: 0,
        gordura_saturada_g: 0,
        is_liquid: isLiquid,
        alergenicos: selectedAlergenos
      });
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      showAlert('Erro', err.message);
    }
  };

  const resetForm = () => {
    setNome('');
    setPrecoCompra('');
    setQtyCompra('');
    setIsLiquid(false);
    setSelectedAlergenos([]);
  };

  const handleDelete = async (id: string, nome: string) => {
    const confirmed = await showConfirm('Excluir Insumo', `Deseja remover "${nome}"? Isso pode afetar fichas existentes.`);
    if (confirmed) {
      await deleteInsumo(id);
    }
  };

  return (
    <PageLayout>
      <PageHeader 
        showSearch 
        onSearchChange={setSearchTerm} 
        searchPlaceholder="BUSCAR INSUMO TÉCNICO..." 
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 mt-8">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase flex items-center gap-2">
            <Beaker size={14} /> Módulo Ficha Técnica
          </span>
          <h3 className="text-4xl font-black text-on-surface mt-2 tracking-tighter uppercase">Insumos Técnicos</h3>
          <p className="mt-2 text-on-surface-variant text-sm">Base de custos e conversão para fichas técnicas.</p>
        </div>
        <div className="flex gap-3">
          <StatCard label="Total Itens" value={stats.total} color="border-primary" />
          <StatCard label="Alto Valor" value={stats.expensive} color="border-secondary" />
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsFormOpen(true)}>Cadastrar</Button>
        </div>
      </div>

      <div className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/10">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">Insumo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">Compra (Base)</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">Custo Unitário Base</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">Atualização</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {filteredInsumos.map(i => (
              <tr key={i.id} className="hover:bg-surface-container-highest/30 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-on-surface">{i.nome}</span>
                    <div className="flex gap-1 mt-1">
                      {i.alergenicos?.map(a => (
                        <span key={a} className="text-[8px] bg-error/10 text-error px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">contém {a}</span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">R$ {(i.preco_compra || 0).toFixed(2)} por {i.quantidade_compra}{i.unidade_compra}</span>
                    <span className="text-[10px] text-outline-variant uppercase">Base: {i.unidade_base}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-black text-primary">R$ {(i.preco_unitario_base || 0).toFixed(4)} / {i.unidade_base}</span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-[10px] font-bold text-outline-variant uppercase">{new Date(i.data_atualizacao).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button 
                    onClick={() => handleDelete(i.id, i.nome)}
                    className="p-2 text-outline-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cadastro Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-surface-container-high w-full max-w-xl rounded-3xl border border-outline-variant/20 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <h4 className="text-2xl font-black text-on-surface uppercase tracking-tight mb-8 flex items-center gap-3">
                <Plus className="text-primary" /> Novo Insumo Técnico
              </h4>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Nome Completo</label>
                  <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    placeholder="EX: FILÉ MIGNON LIMPO" 
                    className="w-full bg-surface-container border border-outline-variant/10 rounded-xl p-4 text-sm font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Unidade Base (Ficha)</label>
                    <div className="flex gap-2">
                       {(['g', 'ml', 'un'] as const).map(u => (
                         <button 
                            key={u}
                            type="button"
                            onClick={() => setUnidadeBase(u)}
                            className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${unidadeBase === u ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/10 text-outline-variant hover:border-primary/50'}`}
                         >
                           {u}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Unidade de Compra</label>
                     <select 
                        value={unidadeCompra} 
                        onChange={e => setUnidadeCompra(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl p-3.5 text-sm font-bold text-on-surface outline-none"
                      >
                       <option value="kg">Quilograma (kg)</option>
                       <option value="l">Litro (L)</option>
                       <option value="un">Unidade (un)</option>
                       <option value="g">Grama (g)</option>
                       <option value="ml">Mililitro (ml)</option>
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block flex items-center gap-1.5">
                      <DollarSign size={10} /> Preço de Compra
                    </label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={precoCompra} 
                      onChange={e => setPrecoCompra(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-xl p-4 text-sm font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block flex items-center gap-1.5">
                      <Scale size={10} /> Qtd. Compra
                    </label>
                    <input 
                      required 
                      type="number" 
                      step="0.001" 
                      value={qtyCompra} 
                      onChange={e => setQtyCompra(e.target.value)} 
                      placeholder="1.000" 
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-xl p-4 text-sm font-bold text-on-surface"
                    />
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Custo Base Calculado</span>
                    <p className="text-[8px] text-primary/50 uppercase font-bold mt-0.5">Automático via Engenharia</p>
                  </div>
                  <span className="text-sm font-black text-primary tracking-tight">
                    R$ {(parseFloat(precoCompra) > 0 && parseFloat(qtyCompra) > 0) ? (unidadeCompra === 'kg' || unidadeCompra === 'l' 
                        ? parseFloat(precoCompra) / (parseFloat(qtyCompra) * 1000) 
                        : parseFloat(precoCompra) / parseFloat(qtyCompra)).toFixed(5) : '0.00000'} / {unidadeBase}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-4 px-1">
                  <button 
                    type="button"
                    onClick={() => setIsLiquid(!isLiquid)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isLiquid ? 'bg-primary' : 'bg-outline-variant/30'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isLiquid ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className="text-[10px] font-black uppercase text-on-surface-variant">Insumo Líquido (Referência 100ml)</span>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button variant="primary" type="submit" className="flex-1">Confirmar Cadastro</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
