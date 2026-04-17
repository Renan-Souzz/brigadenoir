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
  ChevronDown
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import { useFTFichas, FTFicha } from '../../hooks/useFTFichas';
import FichaEditor from './FichaEditor';

const CATEGORIAS = ['Entrada', 'Prato Principal', 'Sobremesa', 'Bebida', 'Base / Molho'];

export default function FichaTecnicaList() {
  const { fichas, isLoading } = useFTFichas();
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

      <div className="flex flex-col lg:flex-row gap-8 pb-32 mt-8">
        {/* Sidebar de Categorias */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-outline-variant flex items-center gap-2">
              <Filter size={14} className="text-primary" /> Categorias
            </h3>
          </div>

          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {CATEGORIAS.map(cat => {
              const isActive = activeCategory === cat;
              const count = fichas.filter(f => f.categoria === cat).length;
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                  className={`flex items-center justify-between gap-4 p-4 rounded-2xl text-left transition-all min-w-[160px] lg:min-w-0 border ${
                    isActive 
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5' 
                      : 'bg-surface-container border-outline-variant/10 text-on-surface-variant hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-surface-container-highest text-outline-variant'}`}>
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-tight block leading-none">{cat}</span>
                      <span className="text-[9px] font-bold text-outline-variant uppercase">{count} Itens</span>
                    </div>
                  </div>
                  {isActive && <ChevronRight size={14} className="hidden lg:block" />}
                </button>
              );
            })}
          </div>

          <Button 
            variant="primary" 
            fullWidth 
            icon={<Plus size={18} />} 
            onClick={() => setIsCreating(true)}
            className="mt-6 shadow-xl shadow-primary/20"
          >
            Nova Ficha Técnica
          </Button>
        </div>

        {/* Listagem Principal */}
        <div className="flex-1 space-y-8">
          {/* Header de Contexto */}
          <div className="bg-surface-container rounded-3xl p-6 lg:p-8 border border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Target size={120} className="text-primary" />
            </div>
            
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl lg:text-5xl font-black text-on-surface tracking-tighter uppercase leading-none">
                {activeCategory || 'Visão Geral'}
              </h2>
              <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em] mt-2">
                Análise Financeira e Gestão de CMV
              </p>
            </div>

            <div className="flex gap-4 relative z-10 w-full md:w-auto">
              <div className="flex-1 md:flex-none bg-surface-container-highest/50 rounded-2xl p-4 border border-outline-variant/10 text-center md:text-left min-w-[120px]">
                <span className="text-[9px] font-black uppercase tracking-widest text-outline-variant block mb-1">Total de Fichas</span>
                <span className="text-2xl font-black text-on-surface leading-none">{categoryStats.total}</span>
              </div>
              <div className="flex-1 md:flex-none bg-primary/10 rounded-2xl p-4 border border-primary/20 text-center md:text-left min-w-[120px]">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1">CMV Médio</span>
                <span className="text-2xl font-black text-primary leading-none">{categoryStats.avgCmv.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface-container rounded-3xl border border-outline-variant/10 animate-pulse" />
              ))
            ) : filteredFichas.length === 0 ? (
              <div className="col-span-full py-20 bg-surface-container rounded-3xl border border-dashed border-outline-variant/20 text-center text-outline-variant uppercase font-black tracking-widest text-xs opacity-50 flex flex-col items-center gap-4">
                <Search size={32} />
                Nenhuma engenharia encontrada nesta categoria
              </div>
            ) : (
              filteredFichas.map(f => {
                const finance = calculateFichaFinance(f);
                const isCritical = finance.cmv > (f.cmv_ideal || 30);
                const isWarning = finance.cmv > (f.cmv_ideal || 30) * 0.9 && finance.cmv <= (f.cmv_ideal || 30);

                return (
                  <button 
                    key={f.id} 
                    onClick={() => setEditingId(f.id)}
                    className={`group bg-surface-container rounded-3xl p-6 border transition-all hover:shadow-2xl hover:-translate-y-1 text-left relative flex flex-col min-h-[190px] ${
                      isCritical ? 'border-error/20 hover:border-error/40' : 'border-outline-variant/10 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                        isCritical ? 'bg-error/10 text-error' : isWarning ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                      }`}>
                        {f.categoria}
                      </span>
                      {isCritical && <AlertTriangle size={16} className="text-error animate-pulse" />}
                    </div>

                    <h4 className="text-lg font-black text-on-surface uppercase tracking-tight mb-auto leading-tight group-hover:text-primary transition-colors">
                      {f.nome}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/5">
                      <div>
                         <span className="text-[8px] font-black uppercase text-outline-variant block mb-0.5">Venda</span>
                         <span className="text-xs font-black text-on-surface">R$ {f.preco_venda?.toFixed(2) || '0,00'}</span>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] font-black uppercase text-outline-variant block mb-0.5">CMV Real</span>
                         <span className={`text-sm font-black ${
                           isCritical ? 'text-error' : isWarning ? 'text-warning' : 'text-primary'
                         }`}>
                           {finance.cmv.toFixed(1)}%
                         </span>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-surface-container-highest rounded-full mt-4 overflow-hidden">
                       <div className={`h-full transition-all duration-1000 ${
                         isCritical ? 'bg-error' : isWarning ? 'bg-warning' : 'bg-primary'
                       }`} style={{ width: `${Math.min(finance.cmv, 100)}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
