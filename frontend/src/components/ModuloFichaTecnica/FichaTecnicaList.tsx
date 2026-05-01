import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  ChevronRight, 
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Download,
  Share2,
  Filter,
  ArrowLeft,
  X,
  Target,
  ChevronDown,
  Trash2,
  Edit2
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import { useModal } from '../../contexts/ModalContext';
import { useFTFichas, FTFicha } from '../../hooks/useFTFichas';
import FichaEditor from './FichaEditor';

const CATEGORIAS = ['Entrada', 'Prato Principal', 'Sobremesa', 'Bebida', 'Base / Molho'];

export default function FichaTecnicaList() {
  const { fichas, isLoading, deleteFicha } = useFTFichas();
  const { showConfirm, showAlert } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 1. Helpers for CMV Calculation in List
  const calculateFichaFinance = (ficha: FTFicha) => {
    const custoTotal = ficha.ingredientes?.reduce((acc, ing) => {
      return acc + (ing.pb_gramas * (ing.preco_unitario_base || 0));
    }, 0) || 0;
    const custoPorcao = custoTotal / (ficha.rendimento_total || 1);
    const cmv = ficha.preco_venda > 0 ? (custoPorcao / ficha.preco_venda) * 100 : 0;
    return { custoPorcao, cmv };
  };

  // 2. Computed Stats & Filtering
  const filteredFichas = useMemo(() => {
    return fichas.filter(f => {
      const matchesSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory ? f.categoria === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [fichas, searchTerm, activeCategory]);

  const categoryStats = useMemo(() => {
    if (!activeCategory) {
      const allFinances = fichas.map(f => calculateFichaFinance(f));
      const avgCmv = allFinances.length > 0 ? allFinances.reduce((acc, f) => acc + f.cmv, 0) / allFinances.length : 0;
      return { total: fichas.length, avgCmv };
    }
    const categoryFichas = fichas.filter(f => f.categoria === activeCategory);
    const categoryFinances = categoryFichas.map(f => calculateFichaFinance(f));
    const avgCmv = categoryFinances.length > 0 ? categoryFinances.reduce((acc, f) => acc + f.cmv, 0) / categoryFinances.length : 0;
    return { total: categoryFichas.length, avgCmv };
  }, [fichas, activeCategory]);

  const handleDeleteFicha = async (e: React.MouseEvent, id: string, nome: string) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      'Excluir Ficha Técnica',
      `Tem certeza que deseja excluir "${nome}"? Esta ação removerá permanentemente os dados desta ficha.`
    );
    if (confirmed) {
      try {
        await deleteFicha(id);
      } catch (err: any) {
        showAlert('Erro ao Excluir', err.message);
      }
    }
  };

  if (editingId || isCreating) {
    return <FichaEditor fichaId={editingId || undefined} onClose={() => { setEditingId(null); setIsCreating(false); }} />;
  }

  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        showSearch 
        onSearchChange={setSearchTerm} 
        searchPlaceholder="BUSCAR ENGENHARIA TÉCNICA..." 
      />

      <div className="flex flex-col lg:flex-row gap-10 pb-32 mt-10">
        {/* Sidebar de Categorias */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-outline-variant flex items-center gap-2.5">
              <Filter size={14} className="text-primary" /> Filtragem
            </h3>
          </div>

          <div className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 hide-scrollbar">
            {CATEGORIAS.map(cat => {
              const isActive = activeCategory === cat;
              const count = fichas.filter(f => f.categoria === cat).length;
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                  className={`group flex items-center justify-between gap-4 p-5 rounded-2xl text-left transition-all min-w-[180px] lg:min-w-0 border-2 ${
                    isActive 
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_10px_30px_-10px_rgba(var(--primary),0.3)]' 
                      : 'bg-surface-container/40 border-outline-variant/10 text-on-surface-variant hover:border-primary/20 hover:bg-surface-container/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-outline-variant group-hover:text-primary'}`}>
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-tight block leading-none mb-1">{cat}</span>
                      <span className="text-[9px] font-bold text-outline-variant/60 uppercase">{count} Engenharia{count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {isActive && <ChevronRight size={16} className="hidden lg:block animate-pulse" />}
                </button>
              );
            })}
          </div>

          <Button 
            variant="primary" 
            fullWidth 
            size="lg"
            icon={<Plus size={20} />} 
            onClick={() => setIsCreating(true)}
            className="mt-8 shadow-2xl shadow-primary/30"
          >
            Nova Engenharia Técnica
          </Button>
        </div>

        {/* Listagem Principal */}
        <div className="flex-1 space-y-10">
          {/* Header de Contexto */}
          <div className="bg-surface-container/40 backdrop-blur-md rounded-[40px] p-8 lg:p-12 border border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
              <Target size={280} className="text-primary rotate-12" />
            </div>
            
            <div className="relative z-10 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <span className="w-12 h-[2px] bg-primary/30 rounded-full" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Dashboard Operacional</span>
              </div>
              <h2 className="text-4xl lg:text-7xl font-black text-on-surface tracking-tighter uppercase leading-[0.9] max-w-md">
                {activeCategory || 'Biblioteca Técnica'}
              </h2>
              <p className="text-xs font-medium text-outline-variant mt-6 max-w-sm leading-relaxed">
                Gerenciamento avançado de CMV, proporções técnicas e análise de custo real por porção.
              </p>
            </div>

            <div className="flex gap-6 relative z-10 w-full md:w-auto">
              <div className="flex-1 md:flex-none bg-surface-container-highest/30 backdrop-blur-xl rounded-[32px] p-8 border border-outline-variant/10 text-center md:text-left min-w-[160px] hover:border-primary/20 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-outline-variant block mb-3">Volume Ativo</span>
                <span className="text-4xl font-black text-on-surface leading-none tracking-tighter">{categoryStats.total}</span>
              </div>
              <div className="flex-1 md:flex-none bg-primary/5 backdrop-blur-xl rounded-[32px] p-8 border border-primary/20 text-center md:text-left min-w-[160px] hover:bg-primary/10 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-3">CMV Global</span>
                <span className="text-4xl font-black text-primary leading-none tracking-tighter">{categoryStats.avgCmv.toFixed(1)}<small className="text-xl">%</small></span>
              </div>
            </div>
          </div>

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-surface-container/40 rounded-[32px] border border-outline-variant/10 animate-pulse" />
              ))
            ) : filteredFichas.length === 0 ? (
              <div className="col-span-full py-32 bg-surface-container/20 rounded-[40px] border-2 border-dashed border-outline-variant/10 text-center text-outline-variant uppercase font-black tracking-widest text-xs opacity-50 flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
                  <Search size={40} />
                </div>
                Nenhuma engenharia técnica encontrada
              </div>
            ) : (
              filteredFichas.map(f => {
                const finance = calculateFichaFinance(f);
                const isCritical = finance.cmv > (f.cmv_ideal || 30);
                const isWarning = finance.cmv > (f.cmv_ideal || 30) * 0.9 && finance.cmv <= (f.cmv_ideal || 30);

                return (
                  <div
                    key={f.id} 
                    onClick={() => setEditingId(f.id)}
                    className={`group cursor-pointer bg-surface-container/40 backdrop-blur-md rounded-[32px] p-8 border-2 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 text-left relative flex flex-col min-h-[240px] ${
                      isCritical 
                        ? 'border-error/10 hover:border-error/40' 
                        : 'border-outline-variant/10 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        isCritical ? 'bg-error/10 text-error' : isWarning ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                      }`}>
                        {f.categoria}
                      </div>
                      {isCritical && <AlertTriangle size={20} className="text-error animate-pulse-subtle" />}
                    </div>

                    <h4 className="text-xl font-black text-on-surface uppercase tracking-tight mb-auto leading-tight group-hover:text-primary transition-colors duration-300">
                      {f.nome}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-6 pt-6 mt-6 border-t border-outline-variant/10">
                      <div>
                         <span className="text-[9px] font-black uppercase text-outline-variant/60 block mb-1">Preço Venda</span>
                         <span className="text-sm font-black text-on-surface">R$ {f.preco_venda?.toFixed(2) || '0,00'}</span>
                      </div>
                      <div className="text-right">
                         <span className="text-[9px] font-black uppercase text-outline-variant/60 block mb-1">CMV Real</span>
                         <span className={`text-base font-black ${
                           isCritical ? 'text-error' : isWarning ? 'text-warning' : 'text-primary'
                         }`}>
                           {finance.cmv.toFixed(1)}%
                         </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-surface-container-highest/50 rounded-full mt-6 overflow-hidden">
                       <div className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)] ${
                         isCritical ? 'bg-error shadow-error/40' : isWarning ? 'bg-warning shadow-warning/40' : 'bg-primary shadow-primary/40'
                       }`} style={{ width: `${Math.min(finance.cmv, 100)}%` }} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-outline-variant/10 w-full relative z-10">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingId(f.id); }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-outline-variant hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Editar Ficha"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteFicha(e, f.id, f.nome)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-outline-variant hover:text-error hover:bg-error/10 transition-colors"
                        title="Excluir Ficha"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
