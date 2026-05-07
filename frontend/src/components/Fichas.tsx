import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from './shared/PageLayout';
import PageHeader from './shared/PageHeader';
import Button from './shared/Button';
import { 
  BookOpen, 
  Plus,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Flame,
  ArrowLeft,
  Trash2,
  Edit2,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Clock,
  Users,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';

// Hooks
import { useModosPreparo, ModoPreparo } from '../hooks/useModosPreparo';
import { useStations } from '../hooks/useStations';
import { useModal } from '../contexts/ModalContext';

const CATEGORIAS = ['Entradas', 'Pratos Principais', 'Sobremesas', 'Bebidas', 'Bases & Molhos', 'Guarnições'];

export default function Fichas() {
  const { profile, isManagement } = useAuth();
  const { data: modos = [], isLoading, upsertModoPreparo, deleteModoPreparo, refetch } = useModosPreparo();
  const { activeStations } = useStations();
  const { showAlert } = useModal();
  
  // UI Selection States
  const [activeModo, setActiveModo] = useState<ModoPreparo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'nome' | 'tempo' | 'passos'>('nome');
  
  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [selectedPracas, setSelectedPracas] = useState<string[]>([]);
  const [passos, setPassos] = useState<string[]>(['']);
  const [tempoPreparo, setTempoPreparo] = useState(0);
  const [rendimento, setRendimento] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModoPreparo | null>(null);

  const togglePraca = (p: string) => {
    setSelectedPracas(prev => prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]);
  };

  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const newPassos = [...passos];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newPassos.length) return;
    [newPassos[idx], newPassos[target]] = [newPassos[target], newPassos[idx]];
    setPassos(newPassos);
  };

  const handleOpenModal = (modo?: ModoPreparo) => {
    if (modo) {
      setEditId(modo.id);
      setNome(modo.nome);
      setCategoria(modo.categoria);
      setSelectedPracas(modo.pracas || []);
      setPassos(modo.passos.length > 0 ? modo.passos : ['']);
      setTempoPreparo(modo.tempo_preparo || 0);
      setRendimento(modo.rendimento || 1);
      setImageUrl(modo.image_url || '');
      setImageBase64(modo.image_base64 || '');
    } else {
      setEditId(null);
      setNome('');
      setCategoria(activeCategory || CATEGORIAS[0]);
      setSelectedPracas(profile?.station && !isManagement ? [profile.station] : []);
      setPassos(['']);
      setTempoPreparo(0);
      setRendimento(1);
      setImageUrl('');
      setImageBase64('');
    }
    setIsModalOpen(true);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert('Arquivo muito grande', 'Por favor, selecione uma imagem de até 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) return showAlert('Atenção', 'O nome do preparo é obrigatório.');
    if (passos.filter(p => p.trim()).length === 0) return showAlert('Atenção', 'Adicione pelo menos um passo.');
    setIsSaving(true);
    try {
      await upsertModoPreparo({
        id: editId || undefined,
        nome,
        categoria,
        passos: passos.filter(p => p.trim()),
        pracas: selectedPracas,
        tempo_preparo: tempoPreparo,
        rendimento,
        image_url: imageUrl || undefined,
        image_base64: imageBase64 || undefined
      });
      setIsModalOpen(false);
      showAlert('Sucesso', editId ? 'Preparo atualizado com sucesso!' : 'Novo preparo criado com sucesso!');
    } catch (err: any) {
      showAlert('Erro ao Salvar', err?.message || 'Não foi possível salvar o preparo. Tente novamente.');
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
      showAlert('Excluído', 'O preparo foi removido com sucesso.');
    } catch (err: any) {
      showAlert('Erro ao Excluir', err?.message || 'Não foi possível excluir.');
    }
  };

  // Derived Filtering + Sorting
  const filteredModos = useMemo(() => {
    const filtered = modos.filter(m => {
      const matchesCategory = activeCategory ? m.categoria === activeCategory : true;
      const matchesSearch = searchTerm ? m.nome.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const matchesUserStation = isManagement ? true : (m.pracas.length === 0 || m.pracas.includes(profile?.station || ''));
      return matchesCategory && matchesSearch && matchesUserStation;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'tempo') return (a.tempo_preparo || 0) - (b.tempo_preparo || 0);
      if (sortBy === 'passos') return b.passos.length - a.passos.length;
      return a.nome.localeCompare(b.nome);
    });
  }, [modos, activeCategory, searchTerm, isManagement, profile, sortBy]);

  const canCreate = isManagement || !!profile?.station;
  const canEdit = (modo: ModoPreparo) => isManagement || (profile?.station && modo.pracas.includes(profile.station));

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader stationLabel={profile?.station || 'Cozinha'} avatarSeed={profile?.full_name || 'chef'} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 mb-8 mt-4 md:mt-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase flex items-center gap-2">
            <BookOpen size={14} /> Receitas da Casa
          </span>
          <h3 className="text-3xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">Modos de Preparo</h3>
          <p className="mt-2 md:mt-4 text-on-surface-variant leading-relaxed text-xs md:text-sm">Todas as receitas e instruções de preparo da sua equipe.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" onClick={() => refetch()} className="gap-2" size="sm">
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
            {canCreate && <Button variant="primary" onClick={() => handleOpenModal()} size="sm" icon={<Plus size={16} />}>Criar</Button>}
          </div>

          {CATEGORIAS.map(cat => {
            const count = modos.filter(m => m.categoria === cat && (isManagement ? true : m.pracas.includes(profile?.station || ''))).length;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => { setActiveCategory(isActive ? null : cat); setActiveModo(null); setSearchTerm(''); }} className={`group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden ${isActive ? 'shadow-[0_0_15px_-5px_rgba(0,180,216,0.4)]' : ''}`}>
                <span className={`absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary ${isActive ? 'opacity-100 blur-[2px]' : 'opacity-40 group-hover:opacity-100 blur-[1px]'}`}></span>
                <div className={`relative flex items-center justify-between gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full ${isActive ? 'bg-surface-container-highest' : 'bg-surface-container group-hover:bg-surface-container-highest'} transition-all`}>
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
               <div className="relative flex items-center gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full bg-surface-container group-hover:bg-surface-container-highest">
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
                <button onClick={() => { setActiveCategory(null); setSearchTerm(''); }} className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-95" aria-label="Voltar"><ArrowLeft size={18} /></button>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-on-surface uppercase tracking-tighter">{activeCategory}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline-variant">{filteredModos.length} {filteredModos.length === 1 ? 'receita disponível' : 'receitas disponíveis'}</span>
                </div>
              </div>
              {canCreate && <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95" aria-label="Novo Preparo"><Plus size={16} /> Novo</button>}
            </div>

            {/* Search + Sort Bar */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant/40" size={16} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`BUSCAR EM ${activeCategory?.toUpperCase()}...`} className={`w-full bg-surface-container-low border rounded-2xl py-4 pl-12 pr-10 text-xs font-bold text-on-surface uppercase tracking-widest focus:ring-1 focus:ring-primary focus:outline-none transition-all ${searchTerm ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/10'}`} />
                <X className={`absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant/30 ${searchTerm ? 'cursor-pointer hover:text-error' : 'hidden'}`} size={16} onClick={() => setSearchTerm('')} />
              </div>
              <div className="flex bg-surface-container rounded-xl border border-outline-variant/10 p-1 shrink-0">
                {([['nome', 'A-Z'], ['tempo', '⏱'], ['passos', '📋']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === val ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`} title={`Ordenar por ${val}`}>{label}</button>
                ))}
              </div>
            </div>

            {isLoading ? <div className="p-12 text-center text-outline-variant text-[10px] uppercase tracking-widest animate-pulse">Carregando...</div> :
             filteredModos.length === 0 ? <div className="bg-surface-container rounded-3xl p-12 text-center text-outline-variant text-[10px] uppercase tracking-widest">Nenhum preparo encontrado</div> :
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredModos.map(m => (
                 <button key={m.id} onClick={() => setActiveModo(m)} className="group relative bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.2)] text-left overflow-hidden flex flex-col">
                   {/* Image Header */}
                   {(m.image_base64 || m.image_url) && (
                     <div className="w-full h-36 bg-surface-container-highest overflow-hidden">
                       <img src={m.image_base64 || m.image_url} alt={m.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                     </div>
                   )}
                   <div className="p-6 flex-1 flex flex-col">
                     <h4 className="text-lg font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">{m.nome}</h4>
                     {/* Preview of first step */}
                     {m.passos[0] && (
                       <p className="text-[11px] text-on-surface-variant/60 mt-2 line-clamp-2 leading-relaxed italic">
                         "{m.passos[0].length > 100 ? m.passos[0].slice(0, 100) + '...' : m.passos[0]}"
                       </p>
                     )}
                     <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-outline-variant/5">
                       {m.pracas.map(p => <span key={p} className="px-2 py-0.5 bg-surface-container-highest border border-outline-variant/10 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant flex items-center gap-1"><Flame size={8} /> {p.replace('_', ' ')}</span>)}
                       <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-outline-variant ml-auto flex items-center gap-1"><BookOpen size={10} /> {m.passos.length} passos</span>
                       {(m.tempo_preparo || 0) > 0 && <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary flex items-center gap-1"><Clock size={10} /> {m.tempo_preparo}min</span>}
                       {(m.rendimento || 0) > 1 && <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-secondary flex items-center gap-1"><Users size={10} /> {m.rendimento} porções</span>}
                     </div>
                   </div>
                 </button>
               ))}
             </div>}
          </div>
        ) : (
          <div className="flex flex-1 bg-surface-container rounded-3xl border border-outline-variant/5 shadow-2xl flex-col justify-center items-center text-center p-12 animate-in fade-in duration-700">
            <BookOpen size={36} className="text-primary/30 mb-8" />
            <h2 className="text-2xl md:text-4xl font-black text-on-surface uppercase tracking-tighter mb-4">Acervo de Preparos</h2>
            <p className="text-on-surface-variant text-sm">Escolha uma categoria ao lado para explorar receitas.</p>
          </div>
        )}
      </div>

      {activeModo && (
        <div className="fixed inset-0 w-screen h-screen z-[9998] flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setActiveModo(null)} />
          <div className="relative z-10 w-full h-full max-w-4xl mx-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="shrink-0 p-6 md:p-8 flex items-center justify-between">
              <button onClick={() => setActiveModo(null)} className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-md rounded-xl text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10" aria-label="Voltar"><ArrowLeft size={14} /> Voltar</button>
              {canEdit(activeModo) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setDeleteTarget(activeModo)} className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-red-400 transition-all" aria-label="Excluir"><Trash2 size={16} /></button>
                  <button onClick={() => handleOpenModal(activeModo)} className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-primary transition-all" aria-label="Editar"><Edit2 size={16} /></button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-32">
              {/* Image Banner */}
              {(activeModo.image_base64 || activeModo.image_url) && (
                <div className="w-full h-48 md:h-72 rounded-3xl overflow-hidden mb-10 border border-white/10">
                  <img src={activeModo.image_base64 || activeModo.image_url} alt={activeModo.nome} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="mb-12">
                <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">{activeModo.nome}</h1>
                <div className="flex flex-wrap gap-3 mt-8">
                  <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{activeModo.categoria}</span>
                  {activeModo.pracas.map(p => <span key={p} className="px-4 py-2 bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary">{p.replace('_', ' ')}</span>)}
                  {(activeModo.tempo_preparo || 0) > 0 && (
                    <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2"><Clock size={12} /> {activeModo.tempo_preparo} minutos</span>
                  )}
                  {(activeModo.rendimento || 0) > 0 && (
                    <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2"><Users size={12} /> {activeModo.rendimento} {activeModo.rendimento === 1 ? 'porção' : 'porções'}</span>
                  )}
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
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-outline-variant hover:text-error transition-colors" aria-label="Fechar"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
               <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Nome do Preparo</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="EX: RISOTTO AL FUNGHI..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm text-on-surface font-bold outline-none focus:border-primary uppercase placeholder:text-outline-variant/30" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-black uppercase outline-none">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Praças Técnicas</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-surface-container border border-outline-variant/20 rounded-xl">
                      {activeStations.map(s => {
                        const isSelected = selectedPracas.includes(s.id);
                        return <button key={s.id} type="button" disabled={!isManagement && s.id !== profile?.station} onClick={() => togglePraca(s.id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-surface-container-highest border-outline-variant/10 text-outline-variant'} disabled:opacity-30`}>{s.display_name}</button>;
                      })}
                    </div>
                  </div>
               </div>

               {/* Tempo + Rendimento + Imagem */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5"><Clock size={12} /> Tempo de Preparo</label>
                   <div className="relative">
                     <input type="number" min={0} value={tempoPreparo} onChange={e => setTempoPreparo(parseInt(e.target.value) || 0)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 pr-14 text-sm font-black text-on-surface outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-outline-variant/40 uppercase">min</span>
                   </div>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5"><Users size={12} /> Rendimento</label>
                   <div className="relative">
                     <input type="number" min={1} value={rendimento} onChange={e => setRendimento(parseInt(e.target.value) || 1)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 pr-20 text-sm font-black text-on-surface outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-outline-variant/40 uppercase">porções</span>
                   </div>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5"><ImageIcon size={12} /> Foto do Preparo</label>
                   <div className="flex gap-2">
                     <div className="flex-1 relative">
                       <input 
                         type="file" 
                         accept="image/*" 
                         onChange={handleImageUpload} 
                         className="hidden" 
                         id="file-upload-legacy" 
                       />
                       <label 
                         htmlFor="file-upload-legacy"
                         className="w-full flex items-center justify-between bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-[10px] font-black text-outline-variant cursor-pointer hover:border-primary/40 transition-all"
                       >
                         <span>{imageBase64 ? 'ALTERAR FOTO' : 'ENVIAR FOTO'}</span>
                         <ImageIcon size={14} />
                       </label>
                     </div>
                     {(imageBase64 || imageUrl) && (
                       <div className="w-12 h-12 rounded-xl overflow-hidden border border-outline-variant/20">
                         <img src={imageBase64 || imageUrl} className="w-full h-full object-cover" alt="Preview" />
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex justify-between">Passo a Passo <span>{passos.length} passos</span></label>
                  <div className="space-y-3">
                    {passos.map((passo, idx) => (
                      <div key={idx} className="flex gap-2 group">
                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="w-10 flex items-center justify-center text-[10px] font-black bg-surface-container-highest rounded-lg py-1">{String(idx + 1).padStart(2, '0')}</span>
                          <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="w-10 flex items-center justify-center text-outline-variant/40 hover:text-primary disabled:opacity-20 transition-colors" aria-label="Mover para cima"><ChevronUp size={14} /></button>
                          <button onClick={() => moveStep(idx, 'down')} disabled={idx === passos.length - 1} className="w-10 flex items-center justify-center text-outline-variant/40 hover:text-primary disabled:opacity-20 transition-colors" aria-label="Mover para baixo"><ChevronDown size={14} /></button>
                        </div>
                        <textarea value={passo} onChange={e => { const newPassos = [...passos]; newPassos[idx] = e.target.value; setPassos(newPassos); }} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none resize-y min-h-[70px]" placeholder={`Descreva o passo ${idx + 1}...`} />
                        <button onClick={() => { if (passos.length > 1) setPassos(passos.filter((_, i) => i !== idx)); }} className="shrink-0 p-2 text-outline-variant hover:text-error opacity-50 group-hover:opacity-100 transition-opacity" aria-label="Remover passo"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPassos([...passos, ''])} className="w-full mt-2 py-4 border border-dashed border-outline-variant/20 text-outline-variant hover:text-primary hover:border-primary/50 rounded-xl text-[10px] font-black uppercase transition-all flex justify-center items-center gap-2"><Plus size={16} /> Adicionar Passo</button>
               </div>
            </div>
            <div className="shrink-0 flex gap-3 justify-end p-6 border-t border-outline-variant/10">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Descartar</Button>
                <Button variant="primary" loading={isSaving} onClick={handleSave} icon={<CheckCircle2 size={16} />}>Salvar Alterações</Button>
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
