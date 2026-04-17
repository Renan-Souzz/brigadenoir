import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  ChevronRight, 
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Download,
  Share2
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import StatCard from '../shared/StatCard';
import { useFTFichas } from '../../hooks/useFTFichas';
import FichaEditor from './FichaEditor';

export default function FichaTecnicaList() {
  const { fichas, isLoading, deleteFicha } = useFTFichas();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredFichas = fichas.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    return {
      total: fichas.length,
      highCmv: 0, // Mock for now
      avgCmv: 25.5
    };
  }, [fichas]);

  if (editingId || isCreating) {
    return <FichaEditor fichaId={editingId || undefined} onClose={() => { setEditingId(null); setIsCreating(false); }} />;
  }

  return (
    <PageLayout>
      <PageHeader 
        showSearch 
        onSearchChange={setSearchTerm} 
        searchPlaceholder="BUSCAR FICHA TÉCNICA..." 
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 mt-8">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase flex items-center gap-2">
            <BookOpen size={14} /> Módulo Ficha Técnica
          </span>
          <h3 className="text-4xl font-black text-on-surface mt-2 tracking-tighter uppercase">Fichas Técnicas</h3>
          <p className="mt-2 text-on-surface-variant text-sm">Gestão de custos, CMV e engenharia de cardápio.</p>
        </div>
        <div className="flex gap-3">
          <StatCard label="Ativas" value={stats.total} color="border-primary" />
          <StatCard label="CMV Médio" value={`${stats.avgCmv}%`} color="border-secondary" />
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreating(true)}>Nova Ficha</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-surface-container rounded-3xl border border-outline-variant/10 animate-pulse" />
          ))
        ) : filteredFichas.length === 0 ? (
          <div className="col-span-full py-20 text-center text-outline-variant uppercase font-black tracking-widest text-sm opacity-50">Nenhuma ficha encontrada</div>
        ) : (
          filteredFichas.map(f => (
            <button 
              key={f.id} 
              onClick={() => setEditingId(f.id)}
              className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-all group group text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all">
                <ChevronRight className="text-primary" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-outline-variant mb-4 block">{f.categoria}</span>
              <h4 className="text-xl font-black text-on-surface uppercase tracking-tight mb-4 leading-none group-hover:text-primary transition-colors">{f.nome}</h4>
              
              <div className="flex items-end justify-between mt-auto pt-4 border-t border-outline-variant/5">
                <div>
                   <span className="text-[8px] font-black uppercase text-outline-variant block mb-1">Preço Venda</span>
                   <span className="text-sm font-black text-on-surface">R$ {f.preco_venda?.toFixed(2) || '0,00'}</span>
                </div>
                <div className="text-right">
                   <span className="text-[8px] font-black uppercase text-outline-variant block mb-1">CMV</span>
                   <span className="text-sm font-black text-primary">--%</span>
                </div>
              </div>
            </button>
          ))
        )
        }
      </div>
    </PageLayout>
  );
}

// Simple useMemo polyfill for this snippet context (since I can't export multiple blocks easily without imports)
function useMemo<T>(factory: () => T, deps: any[]): T {
  return React.useMemo(factory, deps);
}
