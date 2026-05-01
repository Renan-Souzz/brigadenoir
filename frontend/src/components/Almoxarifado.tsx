import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Loader2, 
  Trash2, 
  X, 
  ChevronRight, 
  Calendar,
  Flame,
  Sparkles,
  BarChart3,
  ShieldAlert,
  Archive,
  ChefHat,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useNavigation } from '../contexts/NavigationContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';
import Skeleton, { CardSkeleton } from './shared/Skeleton';

// Hooks
import { useInsumos, Insumo } from '../hooks/useInsumos';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'proteinas', label: 'Proteínas', icon: Flame },
  { id: 'molhos',    label: 'Molhos',    icon: Archive },
  { id: 'massas',    label: 'Massas',    icon: Package },
  { id: 'porcoes',   label: 'Porções Fracionadas', icon: ChefHat }
];

const UNIDADES = ['Kg', 'Litros', 'Unidade'];

const STATION_LABELS: Record<string, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  entremetier: 'Entremetier',
  rotisseur: 'Rôtisseur',
  poissonier: 'Poissonnier',
  patissier: 'Pâtissier',
  almoxarifado: 'Almoxarifado'
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExpiryBadge({ date }: { date: string }) {
  if (!date) return null;
  const diffDays = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return <div className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">Vencido</div>;
  if (diffDays <= 3) return <div className="bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase">Vence em {diffDays}d</div>;
  return <div className="bg-green-500/20 text-green-400 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-green-500/20">Validade Ok</div>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Almoxarifado() {
  const { profile, isManagement } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { searchFilter, setSearchFilter } = useNavigation();
  
  const { 
    insumos: allInsumos, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage, 
    createInsumo: addInsumo, 
    deleteInsumo, 
    refetch 
  } = useInsumos('almoxarifado');
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0].id);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(UNIDADES[0]);
  const [expiry, setExpiry] = useState('');

  // Filtering Logic
  const almoxItems = useMemo(() => allInsumos.filter(i => i.station === 'almoxarifado'), [allInsumos]);
  
  const filteredItems = useMemo(() => {
    return almoxItems.filter(i => {
      const matchesCategory = !activeCategory || i.categoria === activeCategory;
      const matchesSearch = !searchFilter || i.name.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [almoxItems, activeCategory, searchFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !expiry) return;
    setSaving(true);
    try {
      await addInsumo({
        name: name.toUpperCase(),
        quantity: parseFloat(quantity),
        unit,
        expiry_date: expiry,
        station: 'almoxarifado'
      });
      setIsModalOpen(false);
      setName('');
      setQuantity('');
      setExpiry('');
    } catch (err: any) {
      showAlert('Erro ao Salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    const confirmed = await showConfirm('Excluir do Almoxarifado', `Deseja remover ${itemName} permanentemente do estoque central?`);
    if (confirmed) {
      try {
        await deleteInsumo(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!isManagement) {
    return (
      <PageLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] animate-pulse"><ShieldAlert size={48} className="text-red-500" /></div>
          <h2 className="text-3xl font-black text-on-surface uppercase tracking-tighter mb-4">Acesso Restrito</h2>
          <p className="text-on-surface-variant max-w-md leading-relaxed uppercase tracking-widest text-[10px] font-bold">Esta área é exclusiva para a Liderança e Gestão Executiva da Brigade Noir.</p>
          <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>Voltar ao Dashboard</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader 
        leftContent={<h2 className="text-xl font-bold tracking-tighter text-on-surface uppercase">Estoque Central</h2>}
        showSearch 
        onSearchChange={setSearchFilter}
        searchPlaceholder="BUSCAR NO ALMOX..."
        avatarSeed={profile?.full_name || 'chef-mgmt'}
      />

      <div className="flex flex-col lg:flex-row gap-8 relative mt-8 pb-32">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl mb-6">
             <div className="flex items-center gap-3 mb-4"><BarChart3 size={18} className="text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Métricas Globais</h3></div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10"><p className="text-[8px] font-bold text-outline uppercase tracking-widest">Total Itens</p><p className="text-2xl font-black text-primary">{almoxItems.length}</p></div>
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10"><p className="text-[8px] font-bold text-outline uppercase tracking-widest">Vencendo</p><p className="text-2xl font-black text-red-500">{almoxItems.filter(i => { const d = Math.ceil((new Date(i.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)); return d <= 3; }).length}</p></div>
             </div>
          </div>

          {CATEGORIAS.map(cat => {
            const Icon = cat.icon;
            const count = almoxItems.filter(i => i.categoria === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(isActive ? null : cat.id)} className={`group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden ${isActive ? 'shadow-[0_0_15px_-5px_rgba(0,180,216,0.4)]' : ''}`}>
                <span className={`absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary ${isActive ? 'opacity-100 blur-[2px]' : 'opacity-40 group-hover:opacity-100 blur-[1px]'}`}></span>
                <div className={`relative flex items-center justify-between gap-4 p-5 rounded-[15px] text-left h-full w-full ${isActive ? 'bg-surface-container-highest' : 'bg-surface-container group-hover:bg-surface-container-highest'} transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isActive ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface-container-highest border-outline-variant/10 group-hover:text-primary'}`}><Icon size={18} /></div>
                    <div><span className={`text-xs font-black uppercase tracking-wider block ${isActive ? 'text-primary' : 'text-on-surface'}`}>{cat.label}</span><span className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline-variant mt-0.5">{count} itens</span></div>
                  </div>
                  <ChevronRight size={16} className={`transition-all ${isActive ? 'text-primary rotate-90' : 'text-outline-variant/40 group-hover:translate-x-1'}`} />
                </div>
              </button>
            );
          })}

          <button onClick={() => setIsModalOpen(true)} className="group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden mt-8">
            <span className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary opacity-40 group-hover:opacity-100 blur-[1px]"></span>
            <div className="relative flex items-center gap-4 p-6 rounded-[15px] text-left h-full w-full bg-surface-container group-hover:bg-surface-container-highest">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><Plus size={18} /></div>
              <span className="text-sm font-black text-on-surface-variant uppercase tracking-wider group-hover:text-primary">Novo Registro</span>
            </div>
          </button>
          
          <Button variant="outline" onClick={() => refetch()} className="w-full gap-2">
             {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Sincronizar Tudo
          </Button>
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-surface-container rounded-3xl p-16 text-center border border-outline-variant/5">
              <Package size={40} className="text-outline-variant/30 mx-auto mb-4" />
              <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">
                {searchFilter ? `Nenhum item para "${searchFilter}"` : 'Nenhum item nesta categoria.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                {filteredItems.map(item => (
                  <div key={item.id} className="group bg-surface-container rounded-2xl border border-outline-variant/10 p-6 relative hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.2)] transition-all">
                    <div className="absolute top-6 right-6"><ExpiryBadge date={item.expiry_date || ''} /></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-surface-container-highest rounded-2xl flex items-center justify-center border border-outline-variant/10 text-primary"><Package size={20} /></div>
                      <div>
                        <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">{item.name}</h4>
                        <span className="text-[8px] font-bold text-outline-variant uppercase tracking-[0.2em]">{STATION_LABELS[item.station] || 'Geral'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/5"><span className="text-[8px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Volume</span><span className="text-2xl font-black text-on-surface">{item.quantity} <span className="text-sm text-outline-variant">{item.unit}</span></span></div>
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/5"><span className="text-[8px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Vencimento</span><span className="text-xs font-black text-on-surface uppercase">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('pt-BR') : 'N/A'}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5">
                      <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest italic">ID: {item.id.substring(0, 8)}</span>
                      <button onClick={() => handleDelete(item.id, item.name)} className="p-2.5 bg-red-500/5 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              
              {hasNextPage && (
                <div className="mt-8">
                  <Button 
                    variant="outline" 
                    className="w-full py-4 border-dashed border-outline-variant/30 text-outline-variant hover:text-primary"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                    Mostrar Mais Itens do Almoxarifado
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-surface-container-high border border-outline-variant/20 rounded-3xl overflow-hidden animate-in zoom-in-95 flex flex-col shadow-2xl">
            <div className="p-8">
               <div className="flex justify-between items-center mb-8">
                  <div><h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">Novo Registro</h3><p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em] mt-1">Almoxarifado Central</p></div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-outline-variant hover:text-red-400"><X size={24} /></button>
               </div>
               <form onSubmit={handleSave} className="space-y-6">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block">Identificação</label><input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="EX: MIGNON LIMPO..." className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm font-bold text-on-surface uppercase" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm font-bold text-on-surface">{CATEGORIAS.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block">Validade</label>
                      <input type="date" required value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm font-bold text-on-surface" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block">Volume</label><input type="number" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm font-bold" /></div>
                    <div><label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block">Unidade</label><select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm font-bold">{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  </div>
                  <button type="submit" disabled={saving} className="group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden shadow-lg mt-4">
                    <span className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary opacity-100 blur-[1px]"></span>
                    <div className="relative flex items-center justify-center gap-4 p-5 rounded-[15px] bg-surface-container-highest">
                      {saving ? <Loader2 className="animate-spin text-primary" size={24} /> : <><Sparkles size={18} className="text-primary" /><span className="text-xs font-black text-primary uppercase tracking-widest">Confirmar Estoque Central</span></>}
                    </div>
                  </button>
               </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
