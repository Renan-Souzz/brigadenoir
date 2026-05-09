import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Clock, 
  Utensils, 
  Printer, 
  Share2, 
  PlayCircle,
  Lightbulb,
  Loader2,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFTFichas, FTFicha } from '../hooks/useFTFichas';
import { useInsumos } from '../hooks/useInsumos';
import { useNavigation } from '../contexts/NavigationContext';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecipeCard({ ficha, active, onClick, capacity }: { ficha: FTFicha, active: boolean, onClick: () => void, capacity: number, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className={`group cursor-pointer bg-surface-container hover:bg-surface-container-high transition-all duration-300 rounded-xl p-5 border-l-4 ${active ? 'border-primary shadow-lg' : 'border-transparent'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-lg font-bold text-on-surface leading-tight">
          {ficha.nome} <br />
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{ficha.categoria}</span>
        </h4>
        <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${capacity > 10 ? 'bg-success/20 text-success' : capacity > 0 ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
          {capacity} DISP.
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1 text-on-surface-variant">
          <Clock size={14} />
          <span className="text-[10px] font-bold tracking-tighter uppercase">Padronizado</span>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant">
          <Utensils size={14} />
          <span className="text-[10px] font-bold tracking-tighter uppercase">{ficha.rendimento_total} UNID.</span>
        </div>
      </div>
    </div>
  );
}

function IngredientItem({ name, qty, available, unit }: { name: string, qty: string, available: number, unit: string, key?: any }) {
  const isOk = available >= parseFloat(qty);
  return (
    <li className="flex flex-col border-b border-outline-variant/10 pb-2">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-semibold text-on-surface">{name}</span>
        <span className="text-[10px] font-black text-primary">{qty} / prato</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-success' : 'bg-error animate-pulse'}`}></div>
        <span className="text-[9px] font-bold text-outline uppercase tracking-widest">
          Estoque na Praça: {available.toFixed(2)} {unit}
        </span>
      </div>
    </li>
  );
}

function PrepStep({ step, title, desc }: { step: string, title: string, desc: string, key?: any }) {
  return (
    <div className="flex gap-6 group">
      <span className="text-4xl font-black text-outline-variant/20 group-hover:text-primary transition-colors leading-none">{step}</span>
      <div>
        <h6 className="text-sm font-bold text-on-surface mb-2 uppercase tracking-wide">{title}</h6>
        <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModoDePreparo() {
  const { profile } = useAuth();
  const { fichas, isLoading: fichasLoading, getFicha } = useFTFichas();
  const { insumos, isLoading: insumosLoading } = useInsumos();
  const { searchFilter } = useNavigation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFicha, setActiveFicha] = useState<FTFicha | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const stationName = profile?.station || 'almoxarifado';
  
  // Filter fichas by station and search filter
  const stationFichas = fichas.filter(f => {
    const matchesStation = f.praca_id === stationName;
    const matchesSearch = !searchFilter || f.nome.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStation && matchesSearch;
  });
  
  // Effect to load detail when selectedId changes
  useEffect(() => {
    const targetId = selectedId || (stationFichas.length > 0 ? stationFichas[0].id : null);
    if (!targetId) {
        setActiveFicha(null);
        return;
    }

    setLoadingDetail(true);
    getFicha(targetId)
      .then(setActiveFicha)
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }, [selectedId, stationFichas.length, getFicha]);

  // Capacity calculation logic
  const calculateCapacity = (ficha: FTFicha) => {
    if (!ficha.ingredientes || ficha.ingredientes.length === 0) return 0;
    
    const portionLimits = ficha.ingredientes.map(ing => {
      const stationInsumo = insumos.find(i => i.ft_insumo_id === ing.insumo_id && i.station === stationName);
      if (!stationInsumo) return 0;
      return Math.floor(stationInsumo.quantity / (ing.pb_gramas || 1));
    });

    return Math.min(...portionLimits);
  };

  if (fichasLoading || insumosLoading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-outline-variant font-bold uppercase tracking-widest">Sincronizando Catálogo Técnico...</p>
        </div>
      </PageLayout>
    );
  }

  const steps = activeFicha?.modo_preparo ? activeFicha.modo_preparo.split('\n').filter(s => s.trim() !== '') : [];

  return (
    <PageLayout>
      <header className="flex justify-between items-center mb-12 w-full">
        <div>
          <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-secondary mb-2 block font-bold">ATELIÊ DE PRODUÇÃO</span>
          <h2 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter -ml-1 uppercase">Modo de Preparo</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className="text-sm font-semibold text-on-surface">{profile?.full_name || 'Chef'}</p>
            <p className="text-[10px] text-outline uppercase tracking-widest">Praça {stationName.toUpperCase()}</p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-primary-container bg-surface-container-highest flex items-center justify-center text-primary">
            <Utensils size={24} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recipe Selector */}
        <section className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-outline-variant uppercase tracking-widest">Fichas da Praça</h3>
            <span className="bg-primary-container text-primary text-[10px] px-2 py-1 rounded-full font-bold">
              {stationFichas.length} RECEITAS
            </span>
          </div>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {stationFichas.map(f => (
              <RecipeCard 
                key={f.id}
                ficha={f}
                active={activeFicha?.id === f.id}
                onClick={() => setSelectedId(f.id)}
                capacity={calculateCapacity(f)}
              />
            ))}
            {stationFichas.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-outline-variant/20 rounded-3xl">
                <PackageCheck className="mx-auto text-outline-variant mb-4" size={32} />
                <p className="text-xs text-outline font-bold uppercase tracking-widest">Nenhuma ficha vinculada</p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Detailed View */}
        {loadingDetail ? (
           <section className="lg:col-span-8 bg-surface-container-high rounded-3xl p-12 border border-outline-variant/10 flex items-center justify-center min-h-[60vh]">
             <Loader2 className="animate-spin text-primary" size={40} />
           </section>
        ) : activeFicha ? (
          <section className="lg:col-span-8 bg-surface-container-high rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/10">
            <div className="h-64 md:h-80 relative overflow-hidden bg-black">
              {(activeFicha.imagem_base64 || activeFicha.imagem_url) ? (
                <img 
                  src={activeFicha.imagem_base64 || activeFicha.imagem_url} 
                  alt={activeFicha.nome}
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-outline-variant/30">
                  <Utensils size={64} />
                  <p className="text-[10px] font-black uppercase mt-4">Foto de Montagem não disponível</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 md:left-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Status: Em Operação</span>
                </div>
                <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface uppercase drop-shadow-xl">{activeFicha.nome}</h3>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-1">
                  <div className="flex items-center gap-2 mb-6">
                    <PackageCheck size={16} className="text-secondary" />
                    <h5 className="text-[0.6875rem] font-black text-secondary uppercase tracking-[0.2em]">Mise en Place</h5>
                  </div>
                  <ul className="space-y-6">
                    {activeFicha.ingredientes?.map((ing, idx) => {
                      const stationInsumo = insumos.find(i => i.ft_insumo_id === ing.insumo_id && i.station === stationName);
                      return (
                        <IngredientItem 
                          key={idx}
                          name={ing.insumo_nome || 'Item'}
                          qty={`${ing.pb_gramas} ${stationInsumo?.unit || 'g'}`}
                          available={stationInsumo?.quantity || 0}
                          unit={stationInsumo?.unit || 'g'}
                        />
                      );
                    })}
                  </ul>

                  {activeFicha.complementos && (
                    <div className="mt-12 bg-surface-container p-6 rounded-2xl border-l-4 border-secondary">
                      <div className="flex items-center gap-3 mb-4 text-secondary">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Conservação</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-outline-variant uppercase">Validade:</span>
                          <span className="text-[10px] font-black text-on-surface uppercase">{activeFicha.complementos.validade_dias} Dias</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-outline-variant uppercase">Ambiente:</span>
                          <span className="text-[10px] font-black text-on-surface uppercase">{activeFicha.complementos.conservacao}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-10">
                  <div className="flex items-center gap-2 mb-6">
                    <PlayCircle size={16} className="text-secondary" />
                    <h5 className="text-[0.6875rem] font-black text-secondary uppercase tracking-[0.2em]">Manual de Execução</h5>
                  </div>
                  
                  {steps.length > 0 ? steps.map((step, idx) => (
                    <PrepStep 
                      key={idx}
                      step={String(idx + 1).padStart(2, '0')}
                      title={`Passo ${idx + 1}`}
                      desc={step}
                    />
                  )) : (
                    <div className="p-8 border-2 border-dashed border-outline-variant/20 rounded-3xl text-center">
                      <p className="text-sm italic text-outline">Nenhum passo de preparo detalhado na ficha.</p>
                    </div>
                  )}

                  <div className="bg-primary/5 p-6 rounded-2xl border-l-4 border-primary mt-12">
                    <div className="flex items-center gap-3 mb-2 text-primary">
                      <Lightbulb size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Observações Técnicas</span>
                    </div>
                    <p className="text-sm italic text-on-surface-variant leading-relaxed">
                      {activeFicha.complementos?.observacoes || "Siga rigorosamente os gramas informados para manter o CMV e o padrão de sabor Brigade Noir."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-12 mt-12 border-t border-outline-variant/10">
                <div className="flex gap-4">
                  <Button variant="outline" size="md" icon={<Printer size={16} />}>
                    Imprimir Guia
                  </Button>
                  <Button variant="outline" size="md" icon={<Share2 size={16} />}>
                    Exportar PDF
                  </Button>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Última Atualização</span>
                  <span className="text-xs font-black text-on-surface uppercase">
                    {new Date(activeFicha.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="lg:col-span-8 flex flex-col items-center justify-center bg-surface-container-high rounded-3xl p-12 border border-outline-variant/10 min-h-[60vh]">
            <Utensils size={64} className="text-outline-variant mb-6 opacity-20" />
            <h3 className="text-xl font-bold text-outline uppercase tracking-widest">Selecione uma receita</h3>
            <p className="text-sm text-outline-variant mt-2">Escolha uma ficha técnica ao lado para visualizar o modo de preparo.</p>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
