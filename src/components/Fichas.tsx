import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from './shared/PageLayout';
import PageHeader from './shared/PageHeader';
import Button from './shared/Button';
import { 
  BookOpen, 
  Plus,
  ChevronRight,
  Flame,
  ArrowLeft,
  Trash2,
  Edit2,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCcw
} from 'lucide-react';

// Hooks
import { useModosPreparo, ModoPreparo } from '../hooks/useModosPreparo';

const CATEGORIAS = ['Entradas', 'Pratos Principais', 'Sobremesas'];
const PRACAS = ['saucier', 'garde_manger', 'entremetier', 'rotisseur', 'poissonier', 'patissier'];

export default function Fichas() {
  const { profile, isManagement } = useAuth();
  const { data: modos = [], isLoading, upsertModoPreparo, deleteModoPreparo, refetch } = useModosPreparo();
  
  // UI Selection States
  const [activeModo, setActiveModo] = useState<ModoPreparo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [selectedPracas, setSelectedPracas] = useState<string[]>([]);
  const [passos, setPassos] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModoPreparo | null>(null);

  const togglePraca = (p: string) => {
    setSelectedPracas(prev => prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]);
  };

  const handleOpenModal = (modo?: ModoPreparo) => {
    if (modo) {
      setEditId(modo.id);
      setNome(modo.nome);
      setCategoria(modo.categoria);
      setSelectedPracas(modo.pracas || []);
      setPassos(modo.passos.length > 0 ? modo.passos : ['']);
    } else {
      setEditId(null);
      setNome('');
      setCategoria(activeCategory || CATEGORIAS[0]);
      setSelectedPracas(profile?.station && !isManagement ? [profile.station] : []);
      setPassos(['']);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || passos.filter(p => p.trim()).length === 0) return;
    setIsSaving(true);
    try {
      await upsertModoPreparo({
        id: editId || undefined,
        nome,
        categoria,
        passos: passos.filter(p => p.trim()),
        pracas: selectedPracas
      });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModoPreparo(deleteTarget.id);
      if (activeModo?.id === deleteTarget.id) setActiveModo(null);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Derived Filtering
  const filteredModos = useMemo(() => {
    return modos.filter(m => {
      const matchesCategory = activeCategory ? m.categoria === activeCategory : true;
      const matchesSearch = searchTerm ? m.nome.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const matchesUserStation = isManagement ? true : (m.pracas.length === 0 || m.pracas.includes(profile?.station || ''));
      return matchesCategory && matchesSearch && matchesUserStation;
    });
  }, [modos, activeCategory, searchTerm, isManagement, profile]);

  const canCreate = isManagement || !!profile?.station;
  const canEdit = (modo: ModoPreparo) => isManagement || (profile?.station && modo.pracas.includes(profile.station));

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader stationLabel={profile?.station || 'Cozinha'} avatarSeed={profile?.full_name || 'chef'} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 mt-8 hidden lg:flex">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase flex items-center gap-2">
            <BookOpen size={14} /> Receitas da Casa
          </span>
          <h3 className="text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">Modos de Preparo</h3>
          <p className="mt-4 text-on-surface-variant leading-relaxed text-sm">Todas as receitas e instruções de preparo da sua equipe.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" onClick={() => refetch()} className="gap-2">
             {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Atualizar
           </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 pb-32">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-outline-variant flex items-center gap-2">
              <BookOpen size={14} className="text-secondary" /> Categorias
            </h3>
            {canCreate && <Button variant="primary" onClick={() => handleOpenModal()} size="sm" icon={<Sparkles size={16} className="text-secondary" />}>Criar</Button>}
          </div>

          {CATEGORIAS.map(cat => {
            const count = modos.filter(m => m.categoria === cat && (isManagement ? true : m.pracas.includes(profile?.station || ''))).length;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => { setActiveCategory(isActive ? null : cat); setActiveModo(null); setSearchTerm(''); }} className={`group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden ${isActive ? 'shadow-[0_0_15px_-5px_rgba(0,180,216,0.4)]' : ''}`}>
                <span className={`absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary ${isActive ? 'opacity-100 blur-[2px]' : 'opacity-40 group-hover:opacity-100 blur-[1px]'}`}></span>
                <div className={`relative flex items-center justify-between gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full ${isActive ? 'bg-surface-container-highest' : 'bg-[#1a1c23] group-hover:bg-surface-container-highest'} transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isActive ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface-container-highest border-outline-variant/10 group-hover:text-primary'}`}><Flame size={18} /></div>
                    <div>
                      <span className={`text-sm font-black uppercase tracking-wider block ${isActive ? 'text-primary' : 'text-on-surface'}`}>{cat}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline-variant mt-0.5">{count} {count === 1 ? 'receita' : 'receitas'}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`transition-all ${isActive ? 'text-primary rotate-90' : 'text-outline-variant/40 group-hover:translate-x-1'}`} />
                </div>
              </button>
            );
          })}

          {canCreate && (
            <button onClick={() => handleOpenModal()} className="hidden lg:block group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden">
               <span className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary opacity-40 group-hover:opacity-100 blur-[1px]"></span>
               <div className="relative flex items-center gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full bg-[#1a1c23] group-hover:bg-surface-container-highest">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><Plus size={18} /></div>
                 <span className="text-sm font-black text-on-surface-variant uppercase tracking-wider group-hover:text-primary">Novo Preparo</span>
               </div>
            </button>
          )}
        </div>

        {activeCategory ? (
          <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => { setActiveCategory(null); setSearchTerm(''); }} className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-95"><ArrowLeft size={18} /></button>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-on-surface uppercase tracking-tighter">{activeCategory}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline-variant">{filteredModos.length} {filteredModos.length === 1 ? 'receita disponível' : 'receitas disponíveis'}</span>
                </div>
              </div>
              {canCreate && <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95"><Plus size={16} /> Novo</button>}
            </div>

            <div className="relative mb-6">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`BUSCAR EM ${activeCategory?.toUpperCase()}...`} className={`w-full bg-surface-container-low border rounded-2xl py-4 pl-12 pr-10 text-xs font-bold text-on-surface uppercase tracking-widest focus:ring-1 focus:ring-primary focus:outline-none transition-all ${searchTerm ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/10'}`} />
              <X className={`absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant/30 ${searchTerm ? 'cursor-pointer hover:text-error' : 'hidden'}`} size={16} onClick={() => setSearchTerm('')} />
            </div>

            {isLoading ? <div className="p-12 text-center text-outline-variant text-[10px] uppercase tracking-widest animate-pulse">Carregando...</div> :
             filteredModos.length === 0 ? <div className="bg-surface-container rounded-3xl p-12 text-center text-outline-variant text-[10px] uppercase tracking-widest">Nenhum preparo encontrado</div> :
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredModos.map(m => (
                 <button key={m.id} onClick={() => setActiveModo(m)} className="group relative p-6 bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.2)] text-left">
                   <h4 className="text-lg font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">{m.nome}</h4>
                   <div className="flex flex-wrap items-center gap-2 mt-3">
                     {m.pracas.map(p => <span key={p} className="px-2 py-0.5 bg-surface-container-highest border border-outline-variant/10 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant flex items-center gap-1"><Flame size={8} /> {p.replace('_', ' ')}</span>)}
                     <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-outline-variant ml-auto">{m.passos.length} passos</span>
                   </div>
                 </button>
               ))}
             </div>}
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 bg-surface-container rounded-3xl border border-outline-variant/5 shadow-2xl flex-col justify-center items-center text-center p-12 animate-in fade-in duration-700">
            <BookOpen size={36} className="text-primary/30 mb-8" />
            <h2 className="text-4xl font-black text-on-surface uppercase tracking-tighter mb-4">Acervo de Preparos</h2>
            <p className="text-on-surface-variant text-sm">Escolha uma categoria ao lado para explorar receitas.</p>
          </div>
        )}
      </div>

      {activeModo && (
        <div className="fixed inset-0 w-screen h-screen z-[9998] flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setActiveModo(null)} />
          <div className="relative z-10 w-full h-full max-w-4xl mx-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="shrink-0 p-6 md:p-8 flex items-center justify-between">
              <button onClick={() => setActiveModo(null)} className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-md rounded-xl text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10"><ArrowLeft size={14} /> Voltar</button>
              {canEdit(activeModo) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setDeleteTarget(activeModo)} className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                  <button onClick={() => handleOpenModal(activeModo)} className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-primary transition-all"><Edit2 size={16} /></button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-32">
              <div className="mb-12">
                <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">{activeModo.nome}</h1>
                <div className="flex flex-wrap gap-3 mt-8">
                  <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{activeModo.categoria}</span>
                  {activeModo.pracas.map(p => <span key={p} className="px-4 py-2 bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary">{p.replace('_', ' ')}</span>)}
                </div>
              </div>
              <div className="space-y-6 max-w-3xl mx-auto">
                {activeModo.passos.map((passo, idx) => (
                  <div key={idx} className="flex gap-5 group">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center group-hover:border-primary/50 transition-all"><span className="text-[11px] font-black text-white/60">{String(idx + 1).padStart(2, '0')}</span></div>
                    <div className="flex-1 p-6 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 transition-all"><p className="text-lg font-medium text-white/80 leading-relaxed">{passo}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-container-high border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="shrink-0 p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="text-xl font-black text-on-surface uppercase">{editId ? 'Editar Preparo' : 'Novo Preparo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-outline-variant hover:text-error transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
               <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Nome do Preparo</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm text-on-surface font-bold outline-none focus:border-primary" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-black uppercase outline-none">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Praças Técnicas</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-surface-container border border-outline-variant/20 rounded-xl">
                      {PRACAS.map(p => {
                        const isSelected = selectedPracas.includes(p);
                        return <button key={p} type="button" disabled={!isManagement && p !== profile?.station} onClick={() => togglePraca(p)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-surface-container-highest border-outline-variant/10 text-outline-variant'} disabled:opacity-30`}>{p.replace('_', ' ')}</button>;
                      })}
                    </div>
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex justify-between">Passo a Passo <span>{passos.length} passos</span></label>
                  <div className="space-y-3">
                    {passos.map((passo, idx) => (
                      <div key={idx} className="flex gap-3 group">
                        <span className="w-10 flex items-center justify-center text-[10px] font-black bg-surface-container-highest rounded-xl">{String(idx + 1).padStart(2, '0')}</span>
                        <textarea value={passo} onChange={e => { const newPassos = [...passos]; newPassos[idx] = e.target.value; setPassos(newPassos); }} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none resize-none min-h-[70px]" />
                        <button onClick={() => setPassos(passos.filter((_, i) => i !== idx))} className="shrink-0 p-2 text-outline-variant hover:text-error opacity-50 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPassos([...passos, ''])} className="w-full mt-2 py-4 border border-dashed border-outline-variant/20 text-outline-variant hover:text-primary hover:border-primary/50 rounded-xl text-[10px] font-black uppercase transition-all flex justify-center items-center gap-2"><Plus size={16} /> Adicionar Passo</button>
               </div>
            </div>
            <div className="shrink-0 flex gap-3 justify-end p-6 border-t border-outline-variant/10">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Descartar</Button>
                <Button variant="primary" loading={isSaving} onClick={handleSave}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md bg-surface-container-high border border-outline-variant/20 rounded-3xl p-8 text-center animate-in zoom-in-95">
            <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase mb-4">Excluir Preparo</h3>
            <p className="text-sm text-on-surface-variant mb-6 italic">"{deleteTarget.nome}"</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-surface-container rounded-xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500/20 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/30">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
