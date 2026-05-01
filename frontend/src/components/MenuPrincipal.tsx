import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit2, 
  Trash2, 
  ChevronDown, 
  Loader2,
  Check,
  Plus,
  Upload,
  Flame,
  AlertTriangle,
  X,
  ChevronRight,
  BookOpen,
  Minus,
  UtensilsCrossed,
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import { useModal } from '../contexts/ModalContext';
import Button from './shared/Button';

// Hooks
import { useDishes, Dish } from '../hooks/useDishes';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATION_LABELS: Record<string, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  entremetier: 'Entremetier',
  rotisseur: 'Rôtisseur',
  poissonier: 'Poissonnier',
  patissier: 'Pâtissier',
};

const CATEGORIAS = ['Entrada', 'Prato Principal', 'Sobremesa'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenuPrincipal() {
  const { profile, isManagement } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { searchFilter, setSearchFilter } = useNavigation();
  const { 
    data: dishes = [], 
    isLoading, 
    upsertDish, 
    deleteDish, 
    updatePorcao,
    refetch 
  } = useDishes();
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchFilter);

  // Sync with global search filter
  useEffect(() => {
    setSearchTerm(searchFilter);
  }, [searchFilter]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDish, setEditDish] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIAS[0]);
  const [pracaResponsavel, setPracaResponsavel] = useState('saucier');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Porção edit inline
  const [editingPorcao, setEditingPorcao] = useState<string | null>(null);
  const [tempPorcao, setTempPorcao] = useState(0);
  const [isUpdatingPorcao, setIsUpdatingPorcao] = useState(false);

  // ─── Image Compression & Upload ──────────────────────────────────────────────

  const compressImage = async (file: File, maxWidth = 800, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/webp',
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    try {
      const compressed = await compressImage(file);
      const { error } = await supabase.storage
        .from('dish-images')
        .upload(fileName, compressed, { 
          cacheControl: '31536000',
          contentType: 'image/webp',
          upsert: false 
        });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('dish-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const openModal = (dish?: Dish) => {
    if (dish) {
      setEditDish(dish);
      setTitle(dish.title);
      setDescription(dish.description || '');
      setCategory(dish.category);
      setPracaResponsavel(dish.praca_responsavel || 'saucier');
      setImagePreview(dish.image_url || null);
      setImageFile(null);
    } else {
      setEditDish(null);
      setTitle('');
      setDescription('');
      setCategory(CATEGORIAS[0]);
      setPracaResponsavel(profile?.station || 'saucier');
      setImagePreview(null);
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let imageUrl = editDish?.image_url || '';
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (url) imageUrl = url;
      }
      await upsertDish({
        id: editDish?.id,
        title: title.trim(),
        description: description.trim(),
        category,
        praca_responsavel: pracaResponsavel,
        image_url: imageUrl,
        porcoes: editDish ? undefined : 0
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Excluir Prato', 'Deseja remover este prato permanentemente do cardápio?');
    if (confirmed) {
      try {
        await deleteDish(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSavePorcao = async (dishId: string) => {
    setIsUpdatingPorcao(true);
    try {
      if (tempPorcao < 1) {
        showAlert('ESTOQUE CRÍTICO', 'Este prato atingiu 0 porções e precisa ser bloqueado ou reposto com urgência na praça!');
      }
      await updatePorcao({ dishId, porcoes: tempPorcao });
      setEditingPorcao(null);
      // Small visual success confirmation could be added here if needed, but the card will refresh
    } catch (err: any) {
      console.error(err);
      showAlert('ERRO DE PERMISSÃO', 'Falha ao atualizar porções. Verifique se este prato pertence à sua praça ou se você tem permissão de liderança.');
    } finally {
      setIsUpdatingPorcao(false);
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const isSearching = searchTerm.trim().length > 0;
  const filteredDishes = dishes.filter(d => {
    const matchesSearch = !isSearching || d.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeCategory) return d.category === activeCategory;
    if (isManagement) return d.porcoes < 3; 
    return profile?.station === d.praca_responsavel;
  });

  const groupedDishes = CATEGORIAS.reduce<Record<string, Dish[]>>((acc, cat) => {
    const items = filteredDishes.filter(d => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader 
        leftContent={<h2 className="text-xl font-bold tracking-tighter text-on-surface">Brigade Noir</h2>}
        stationLabel={profile?.station || 'Cozinha'}
        showSearch 
        onSearchChange={(val) => { setSearchTerm(val); setSearchFilter(val); }}
        searchPlaceholder="BUSCAR NO CARDÁPIO..."
        avatarSeed={profile?.full_name || 'chef'}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase flex items-center gap-2">
            <UtensilsCrossed size={14} /> Cardápio Oficial
          </span>
          <h3 className="text-4xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">Menu Principal</h3>
          <p className="mt-3 text-on-surface-variant leading-relaxed text-sm">Todos os pratos do cardápio da casa, com porções em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" onClick={() => refetch()} className="gap-2">
             {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Atualizar
           </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative pb-32">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-outline-variant flex items-center gap-2">
              <BookOpen size={14} className="text-secondary" /> Categorias
            </h3>
            {isManagement && <Button variant="primary" onClick={() => openModal()} size="sm" icon={<Sparkles size={16} className="text-secondary" />}>Criar Prato</Button>}
          </div>

          {CATEGORIAS.map(cat => {
            const count = dishes.filter(m => m.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(isActive ? null : cat)} className={`group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden ${isActive ? 'shadow-[0_0_15px_-5px_rgba(0,180,216,0.4)]' : ''}`}>
                <span className={`absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary ${isActive ? 'opacity-100 blur-[2px]' : 'opacity-40 group-hover:opacity-100 blur-[1px]'}`}></span>
                <div className={`relative flex items-center justify-between gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full ${isActive ? 'bg-surface-container-highest' : 'bg-surface-container group-hover:bg-surface-container-highest'} transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isActive ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface-container-highest border-outline-variant/10 group-hover:text-primary'}`}><Flame size={18} /></div>
                    <div>
                      <span className={`text-sm font-black uppercase tracking-wider block ${isActive ? 'text-primary' : 'text-on-surface'}`}>{cat}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline-variant mt-0.5">{count} {count === 1 ? 'prato' : 'pratos'}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`transition-all ${isActive ? 'text-primary rotate-90' : 'text-outline-variant/40 group-hover:translate-x-1'}`} />
                </div>
              </button>
            );
          })}

          {isManagement && (
            <button onClick={() => openModal()} className="hidden lg:block group w-full relative p-[1px] rounded-2xl active:scale-95 transition-all duration-300 overflow-hidden">
               <span className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary opacity-40 group-hover:opacity-100 blur-[1px]"></span>
               <div className="relative flex items-center gap-4 p-5 md:p-6 rounded-[15px] text-left h-full w-full bg-surface-container group-hover:bg-surface-container-highest">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><Plus size={18} /></div>
                 <span className="text-sm font-black text-on-surface-variant uppercase tracking-wider group-hover:text-primary">Novo Prato</span>
               </div>
            </button>
          )}
        </div>

        <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
          {isLoading ? (
            <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
          ) : filteredDishes.length === 0 ? (
            <div className="bg-surface-container rounded-3xl p-16 text-center border border-outline-variant/5">
              <UtensilsCrossed size={40} className="text-outline-variant/30 mx-auto mb-4" />
              <p className="text-on-surface-variant text-sm">{isSearching ? `Nenhum prato encontrado para "${searchTerm}"` : 'Nenhum prato no cardápio disponível para visualização atual.'}</p>
            </div>
          ) : (
            Object.entries(groupedDishes).map(([cat, items]) => (
              <section key={cat} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-1 h-6 bg-secondary rounded-full"></span>
                  <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">{cat}</h3>
                  <span className="px-2.5 py-1 bg-surface-container text-outline-variant text-[9px] font-black rounded-lg uppercase tracking-widest">{items.length} pratos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map(dish => {
                    const canEdit = isManagement || profile?.station === dish.praca_responsavel;
                    const isCritical = dish.porcoes < 1;
                    const isLow = dish.porcoes > 0 && dish.porcoes < 3;
                    const isEditing = editingPorcao === dish.id;

                    return (
                      <div key={dish.id} className={`group rounded-2xl border overflow-hidden transition-all duration-500 ${isCritical && canEdit ? 'bg-error/5 border-red-500/60 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50' : 'bg-surface-container border-outline-variant/10'}`}>
                        <div className="relative w-full h-48 bg-surface-container-highest overflow-hidden">
                          {dish.image_url ? <img src={dish.image_url} alt={dish.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed size={40} className="opacity-20 text-outline-variant" /></div>}
                          <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg backdrop-blur-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isCritical ? 'bg-red-500 text-white animate-pulse' : isLow ? 'bg-red-500/80 text-white animate-pulse' : 'bg-black/60 text-white'}`}>
                            {(isLow || isCritical) && canEdit && <AlertTriangle size={12} />} {dish.porcoes} {dish.porcoes === 1 ? 'porção' : 'porções'}
                          </div>
                        </div>
                        <div className="p-5">
                          <h4 className="text-lg font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">{dish.title}</h4>
                          <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">{dish.description}</p>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/10">
                            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] text-primary flex items-center gap-1.5"><Flame size={10} /> {STATION_LABELS[dish.praca_responsavel] || dish.praca_responsavel}</span>
                            <div className="flex items-center gap-1.5">
                              {canEdit && (isEditing ? (
                                <div className="flex items-center gap-1 bg-surface-container-highest rounded-lg border border-outline-variant/10 p-1">
                                  <button disabled={isUpdatingPorcao} onClick={() => setTempPorcao(Math.max(0, tempPorcao - 1))} className="w-7 h-7 flex items-center justify-center text-outline-variant hover:text-error disabled:opacity-30"><Minus size={12} /></button>
                                  <span className="w-6 text-center text-xs font-black">{tempPorcao}</span>
                                  <button disabled={isUpdatingPorcao} onClick={() => setTempPorcao(tempPorcao + 1)} className="w-7 h-7 flex items-center justify-center text-outline-variant hover:text-primary disabled:opacity-30"><Plus size={12} /></button>
                                  <button 
                                    disabled={isUpdatingPorcao}
                                    onClick={() => handleSavePorcao(dish.id)} 
                                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${isUpdatingPorcao ? 'bg-outline-variant/10 text-outline-variant' : 'bg-primary/20 text-primary'}`}
                                  >
                                    {isUpdatingPorcao ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingPorcao(dish.id); setTempPorcao(dish.porcoes); }} className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/10 rounded-lg text-[9px] font-black uppercase text-on-surface-variant hover:text-primary">Porções</button>
                              ))}
                              {isManagement && (
                                <>
                                  <button onClick={() => openModal(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline-variant hover:text-primary border border-outline-variant/10"><Edit2 size={12} /></button>
                                  <button onClick={() => handleDelete(dish.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline-variant hover:text-red-400 border border-outline-variant/10"><Trash2 size={12} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-container-high border border-outline-variant/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="shrink-0 p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">{editDish ? 'Editar Prato' : 'Novo Prato'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-outline-variant hover:text-error transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Foto do Prato</label>
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 rounded-2xl border-2 border-dashed border-outline-variant/20 hover:border-primary/40 bg-surface-container-low cursor-pointer transition-all overflow-hidden flex items-center justify-center relative">
                  {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center"><Upload size={24} className="text-outline-variant/40 mx-auto mb-2" /><p className="text-[10px] font-black text-outline-variant uppercase">Clique para enviar foto</p></div>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Nome</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-primary" /></div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm outline-none focus:border-primary resize-none min-h-[100px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Categoria</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-black uppercase outline-none">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Praça</label><select value={pracaResponsavel} onChange={e => setPracaResponsavel(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-black uppercase outline-none">{Object.entries(STATION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
              </div>
            </div>
            <div className="shrink-0 flex gap-3 justify-end p-6 border-t border-outline-variant/10">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Descartar</Button>
              <Button variant="primary" loading={saving} onClick={handleSave} disabled={!title.trim()}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
