import { 
  CheckSquare, 
  AlertTriangle, 
  ShieldCheck, 
  Zap,
  Utensils,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  User,
  Users,
  Search,
  Filter,
  LayoutGrid,
  ChevronRight,
  ChefHat,
  Clock,
  ArrowRight,
  History,
  ArrowLeft
} from 'lucide-react';
import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useNavigation, TabId } from '../contexts/NavigationContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';
import Skeleton, { CardSkeleton } from './shared/Skeleton';

// Hooks
import { useTasks, Task } from '../hooks/useTasks';
import { useProfiles } from '../hooks/useProfiles';
import { useInsumos } from '../hooks/useInsumos';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChecklistGroup({ title, completed, total, children }: any) {
  return (
    <div className="bg-surface-container rounded-2xl p-1">
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-outline-variant/10 mb-1">
        <h3 className="text-[9px] font-black uppercase tracking-[0.15em] text-on-surface-variant">{title}</h3>
        <span className="text-[9px] md:text-[10px] font-bold text-secondary">{completed}/{total} Concluídos</span>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ChecklistItem({ title, subtitle, checked, priority, date, creatorName, onToggle, onDelete, canDelete }: any) {
  const isHighPriority = priority === 'high';
  const isLate = date && !checked && new Date(date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  
  return (
    <div 
      className={`group flex items-center justify-between p-2.5 px-3 rounded-xl transition-all cursor-pointer border-l-[3px] ${
        isLate ? 'bg-error-container/5 border-error' :
        isHighPriority ? 'bg-primary-container/5 border-primary' :
        'bg-transparent border-transparent hover:bg-surface-container-high'
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1" onClick={onToggle}>
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
          checked ? 'bg-secondary border-secondary shadow-[0_0_15px_rgba(var(--color-secondary),0.3)]' : 
          isLate ? 'border-error bg-error/10' :
          isHighPriority ? 'border-primary bg-primary/10' :
          'border-outline-variant bg-transparent'
        }`}>
          {checked && <CheckSquare size={12} className="text-on-secondary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs md:text-sm font-semibold transition-colors truncate ${
            checked ? 'text-on-surface line-through opacity-60' : 
            isLate ? 'text-error' :
            isHighPriority ? 'text-primary' :
            'text-on-surface'
          }`}>{title}</p>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
             {subtitle && <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-medium truncate max-w-[150px]">{subtitle}</p>}
             <span className={`text-[8px] md:text-[9px] font-bold opacity-60 ${isLate ? 'text-error' : 'text-outline'}`}>
               {isLate ? '⚠️ ATRASADA' : date ? new Date(date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '--/--'}
             </span>
             {creatorName && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-highest/50 border border-outline-variant/10">
                 <User size={8} className="text-primary" />
                 <span className="text-[8px] font-bold text-on-surface-variant/80">{creatorName.split(' ')[0]}</span>
               </div>
             )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {canDelete && (
          <button 
            onClick={onDelete}
            className="p-1.5 text-outline-variant/40 hover:text-error hover:bg-error/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Checklist() {
  const { profile, isManagement, user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { setActiveTab } = useNavigation();

  // UI States
  const [dayFilter, setDayFilter] = useState<'hoje' | 'ontem'>('hoje');

  // Data fetching via TanStack Query
  const { 
    tasks: allTasks, 
    isLoading: tasksLoading, 
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    toggleTask, 
    addTask, 
    deleteTask, 
    archiveTask, 
    refetch: refetchTasks 
  } = useTasks(isManagement ? undefined : profile?.station, dayFilter);
  const { data: allProfiles = [] } = useProfiles();
  const { insumos: allInsumos = [] } = useInsumos();

  // Other UI States
  const [activeShift, setActiveShift] = useState<'manha' | 'tarde' | 'todos'>(profile?.shift === 'tarde' ? 'tarde' : 'manha');
  const [activeStation, setActiveStation] = useState<string>(profile?.station || 'saucier');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [stationTimeFilters, setStationTimeFilters] = useState<Record<string, 'hoje' | 'ontem'>>({});

  // Carousel Drag-to-Scroll Logic for Desktop
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'carousel' || !carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-speed
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Search/Filter Global
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high'>('normal');
  const [newShift, setNewShift] = useState<'manha' | 'tarde'>('manha');
  const [newStation, setNewStation] = useState<string>('saucier');
  const [isSaving, setIsSaving] = useState(false);

  // Computed Data
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      // Shift Filter
      if (activeShift !== 'todos' && t.shift !== 'todos' && t.shift !== activeShift) return false;

      // Search Filter
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Note: Data/Day filtering is now handled server-side in useTasks
      return !t.is_archived;
    });
  }, [allTasks, activeShift, searchQuery]);

  const completedCount = filteredTasks.filter(t => t.is_completed).length;
  const efficiency = filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 100;

  const insumoAlerts = useMemo(() => {
    return allInsumos.filter(i => {
      const now = new Date();
      const expiry = new Date(i.expiry_date);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return i.quantity <= 3 || diffDays <= 2;
    }).map(i => ({ 
      name: i.name, 
      station: i.station, 
      label: i.quantity <= 3 ? 'Estoque Baixo' : 'Vencendo' 
    }));
  }, [allInsumos]);

  // Handlers
  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleTask({ id, is_completed: !current });
    } catch (err) {
      showAlert('Erro', 'Não foi possível atualizar a tarefa.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      await addTask({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        station: newStation,
        priority: newPriority,
        shift: newShift,
        status: 'pending',
        is_completed: false,
        is_archived: false,
        assigned_to: user?.id
      });
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewSubtitle('');
    } catch (err) {
      showAlert('Erro', 'Falha ao criar tarefa tática.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm('Excluir Tarefa', 'Deseja remover este item da lista tática?');
    if (confirmed) {
      try {
        await deleteTask(id);
      } catch (err) {
        showAlert('Erro', 'Não foi possível excluir.');
      }
    }
  };

  const handleDeleteStationTasks = async (station: string) => {
    const confirmed = await showConfirm('Limpar Estação', `Remover TODAS as tarefas da estação ${station}?`);
    if (confirmed) {
      const tasksToDelete = allTasks.filter(t => t.station === station);
      try {
        await Promise.all(tasksToDelete.map(t => deleteTask(t.id)));
      } catch (err) {
        showAlert('Erro', 'Ocorreu um erro ao limpar a estação.');
      }
    }
  };

  const stationsList = ['saucier', 'garde_manger', 'entremetier', 'rotisseur', 'poissonier', 'patissier', 'almoxarifado'];

  const formatStationName = (s: string) => {
    if (s === 'lideranca') return 'CHEF / SUBS';
    if (s === 'almoxarifado') return 'ALMOX';
    return s.toUpperCase().replace('_', ' ');
  };

  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        leftContent={
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20"><CheckSquare size={20} /></div>
             <h2 className="text-xl font-bold tracking-tighter text-on-surface uppercase">Checklist Operacional</h2>
          </div>
        }
        stationLabel={isManagement ? 'Liderança' : profile?.station || 'Geral'}
        showSearch
        onSearchChange={setSearchQuery}
        searchPlaceholder="BUSCAR TAREFA..."
        avatarSeed={profile?.full_name || 'chef'}
      />

      <div className="mt-8 mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-[0.6875rem] font-black tracking-[0.3em] text-primary uppercase">Mise en Place & Produção</span>
            <h1 className="text-4xl md:text-6xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">A LISTA</h1>
            <p className="mt-4 text-on-surface-variant leading-relaxed text-sm md:text-base font-medium max-w-lg">
              {isManagement ? 'Gerenciamento tático de todas as praças da Brigade Noir em tempo real.' : `Controle de production da praça ${profile?.station?.toUpperCase()}. Mantenha o padrão de excelência.`}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/10 shadow-sm">
              <button 
                onClick={() => setDayFilter('hoje')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dayFilter === 'hoje' ? 'bg-primary text-on-primary shadow-lg' : 'text-outline-variant hover:text-on-surface'}`}
              >
                Ativo (Hoje)
              </button>
              <button 
                onClick={() => setDayFilter('ontem')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dayFilter === 'ontem' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-outline-variant hover:text-on-surface'}`}
              >
                Histórico (Ontem)
              </button>
            </div>
            
            {!isManagement && (
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => { setNewShift(activeShift === 'todos' ? 'manha' : activeShift); setNewStation(profile?.station || 'saucier'); setIsAddModalOpen(true); }}
                icon={<Plus size={20} />}
                className="shadow-xl shadow-primary/20"
              >
                Nova Tarefa
              </Button>
            )}
            
            <Button variant="outline" size="lg" onClick={() => refetchTasks()} icon={<RefreshCcw size={18} className={tasksLoading ? 'animate-spin' : ''} />}>Sincronizar</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
           <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 rounded-full transition-colors ${efficiency >= 80 ? 'bg-primary' : 'bg-error'}`} />
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary border border-outline-variant/10"><Zap size={24} /></div>
              <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Eficiência</p><p className="text-3xl font-black text-on-surface tracking-tighter">{efficiency}%</p></div>
           </div>
        </div>
        <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-secondary border border-outline-variant/10"><CheckCircle2 size={24} /></div>
              <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Concluídas</p><p className="text-3xl font-black text-on-surface tracking-tighter">{completedCount}</p></div>
           </div>
        </div>
        <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-tertiary border border-outline-variant/10"><Users size={24} /></div>
              <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Praça</p><p className="text-2xl font-black text-on-surface tracking-tighter uppercase">{profile?.station || 'GERAL'}</p></div>
           </div>
        </div>
        <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => setActiveTab('insumos')}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-outline-variant/10 transition-colors ${insumoAlerts.length > 0 ? 'bg-error/10 text-error' : 'bg-surface-container-highest text-outline-variant'}`}><AlertTriangle size={24} /></div>
              <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Alertas</p><p className={`text-3xl font-black tracking-tighter ${insumoAlerts.length > 0 ? 'text-error' : 'text-on-surface'}`}>{insumoAlerts.length}</p></div>
           </div>
           <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant/20 group-hover:text-primary transition-all group-hover:translate-x-1" size={24} />
        </div>
      </div>

      {isManagement ? (
        <div className="space-y-12">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
              <div><h3 className="text-3xl font-black text-on-surface uppercase tracking-tighter leading-none mb-1">Radar de Estações</h3><p className="text-xs text-outline-variant font-bold uppercase tracking-widest italic">Monitoramento global de produtividade e alertas táticos.</p></div>
              <div className="flex items-center gap-3">
                 <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10 shadow-sm">
                    <button onClick={() => setActiveShift('manha')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'manha' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Manhã</button>
                    <button onClick={() => setActiveShift('tarde')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'tarde' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Tarde</button>
                    <button onClick={() => setActiveShift('todos')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'todos' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Geral</button>
                 </div>
                 <div className="flex gap-2">
                    <Button variant={viewMode === 'carousel' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('carousel')} icon={<ChevronRight size={14} />}>Carousel</Button>
                    <Button variant={viewMode === 'grid' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('grid')} icon={<LayoutGrid size={14} />}>Grid</Button>
                 </div>
               </div>
            </div>

           <div 
             ref={carouselRef}
             onMouseDown={handleMouseDown}
             onMouseLeave={handleMouseLeave}
             onMouseUp={handleMouseUp}
             onMouseMove={handleMouseMove}
             className={viewMode === 'carousel' 
               ? `flex flex-nowrap gap-6 overflow-x-auto pb-12 snap-x hide-scrollbar scroll-smooth ${isDragging ? 'cursor-grabbing select-none scroll-auto' : 'cursor-grab'}` 
               : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
             }
           >
              {stationsList.filter(s => s !== 'almoxarifado').map(station => {
                  // Filter tasks for this station and keep only those that match the global dayFilter
                  // Note: allTasks is already filtered by dayFilter from the hook
                  const stTasks = allTasks.filter(t => t.station === station && !t.is_archived);
                  const stAlerts = insumoAlerts.filter(a => a.station === station);
                  const stCompleted = stTasks.filter(t => t.is_completed).length;
                  const stEff = stTasks.length > 0 ? Math.round((stCompleted/stTasks.length)*100) : 100;

                  return (
                    <div key={station} className={`bg-surface-container rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden group transition-all duration-500 hover:scale-[1.02] ${dayFilter === 'ontem' ? 'border-secondary/40 shadow-secondary/5' : 'border-outline-variant/10'} ${viewMode === 'carousel' ? 'shrink-0 w-[85vw] md:w-[380px] snap-center' : 'w-full'}`}>
                       <div className={`${viewMode === 'grid' ? 'p-6' : 'p-8'} pb-4`}>
                          <div className={`flex justify-between items-center ${viewMode === 'grid' ? 'mb-4' : 'mb-6'}`}>
                             <div className="flex items-center gap-2">
                                <ChefHat size={16} className={dayFilter === 'ontem' ? 'text-secondary' : 'text-primary'} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${dayFilter === 'ontem' ? 'text-secondary' : 'text-primary'}`}>{formatStationName(station)}</span>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${dayFilter === 'ontem' ? 'bg-secondary/10 text-secondary' : stEff >= 80 ? 'bg-green-500/10 text-green-400' : stEff >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-500'}`}>{stEff}% Efficiency</div>
                          </div>
                          <h4 className={`${viewMode === 'grid' ? 'text-3xl' : 'text-4xl'} font-black text-on-surface tracking-tighter uppercase leading-none ${viewMode === 'grid' ? 'mb-4' : 'mb-6'}`}>{formatStationName(station)}</h4>
                          <div className="space-y-4">
                             <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden shadow-inner">
                               <div 
                                 className={`h-full transition-all duration-1000 ease-out ${dayFilter === 'ontem' ? 'bg-secondary shadow-[0_0_10px_rgba(184,155,78,0.5)]' : stEff >= 80 ? 'bg-primary shadow-[0_0_10px_#a6cce3]' : stEff >= 50 ? 'bg-secondary' : 'bg-error'}`} 
                                 style={{ width: `${stEff}%` }} 
                               />
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-[9px] font-black uppercase tracking-widest text-outline-variant">{stCompleted} / {stTasks.length} TAREFAS</span>
                               <Button variant="ghost" size="icon" onClick={() => { setNewStation(station); setIsAddModalOpen(true); }}>
                                 <Plus size={18} className={dayFilter === 'ontem' ? 'text-secondary' : ''} />
                               </Button>
                             </div>
                          </div>
                       </div>
                       <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-[300px] bg-surface-container-low/50">
                          {stTasks.filter(t => !t.is_archived).length === 0 ? <div className="py-8 text-center opacity-20 italic text-[10px] font-bold uppercase tracking-widest">Sem tarefas</div> :
                           stTasks.map(t => <ChecklistItem key={t.id} title={t.title} checked={t.is_completed} priority={t.priority} onToggle={() => handleToggle(t.id, t.is_completed)} canDelete onDelete={(e: any) => handleDeleteTask(t.id, e)} />)}
                       </div>
                       {stAlerts.length > 0 && (
                          <div className="px-8 py-4 bg-error/5 border-t border-error/10 flex items-center justify-between">
                             <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-error" /><span className="text-[9px] font-black text-error uppercase tracking-widest">{stAlerts.length} Alertas de Estoque</span></div>
                             <ArrowRight size={14} className="text-error/30" />
                          </div>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
           <div className="lg:col-span-8 flex flex-col gap-6 animate-in slide-in-from-bottom-6 duration-700">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" /> Lista de Produção</h3>
                 <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">{activeShift.toUpperCase()}</span>
              </div>
              <div className="space-y-4">
                 {tasksLoading ? (
                   <div className="space-y-3">
                     {Array.from({ length: 5 }).map((_, i) => (
                       <div key={i} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                          <Skeleton variant="circle" className="w-5 h-5" />
                          <div className="flex-1"><Skeleton variant="text" className="w-1/2 mb-1" /><Skeleton variant="text" className="w-1/4 h-2" /></div>
                          <Skeleton variant="circle" className="w-8 h-8" />
                       </div>
                     ))}
                   </div>
                 ) : filteredTasks.length === 0 ? (
                   <div className="bg-surface-container rounded-3xl p-20 text-center border-2 border-dashed border-outline-variant/10">
                      <CheckCircle2 size={48} className="text-secondary/20 mx-auto mb-4" />
                      <p className="text-on-surface-variant font-black uppercase tracking-widest text-xs">A lista está limpa. Aguarde novas diretrizes.</p>
                   </div>
                 ) : (
                   <>
                     {filteredTasks.filter(t => t.priority === 'high').length > 0 && (
                       <ChecklistGroup title="Urgente / Crítico" completed={filteredTasks.filter(t => t.priority === 'high' && t.is_completed).length} total={filteredTasks.filter(t => t.priority === 'high').length}>
                          {filteredTasks.filter(t => t.priority === 'high').map(task => (
                             <ChecklistItem key={task.id} title={task.title} subtitle={task.subtitle} checked={task.is_completed} priority={task.priority} creatorName={allProfiles.find(p => p.id === task.assigned_to)?.full_name} onToggle={() => handleToggle(task.id, task.is_completed)} onDelete={(e: any) => handleDeleteTask(task.id, e)} />
                          ))}
                       </ChecklistGroup>
                     )}
                     
                     <ChecklistGroup title="Base de Produção" completed={filteredTasks.filter(t => t.priority !== 'high' && t.is_completed).length} total={filteredTasks.filter(t => t.priority !== 'high').length}>
                        {filteredTasks.filter(t => t.priority !== 'high').map(task => (
                           <ChecklistItem key={task.id} title={task.title} subtitle={task.subtitle} checked={task.is_completed} priority={task.priority} creatorName={allProfiles.find(p => p.id === task.assigned_to)?.full_name} onToggle={() => handleToggle(task.id, task.is_completed)} onDelete={(e: any) => handleDeleteTask(task.id, e)} />
                        ))}
                     </ChecklistGroup>

                     {hasNextPage && (
                       <div className="pt-6">
                         <Button 
                           variant="outline" 
                           className="w-full py-4 border-dashed border-outline-variant/30 text-outline-variant hover:text-primary transition-all group"
                           onClick={() => fetchNextPage()}
                           disabled={isFetchingNextPage}
                         >
                           {isFetchingNextPage ? (
                             <Loader2 size={18} className="animate-spin mr-2" />
                           ) : (
                             <History size={18} className="mr-2 group-hover:rotate-[-45deg] transition-transform" />
                           )}
                           {isFetchingNextPage ? 'Carregando Histórico...' : 'Mostrar Mais Tarefas (Histórico)'}
                         </Button>
                       </div>
                     )}
                   </>
                 )}
              </div>
           </div>

           <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] group-hover:bg-primary/20 transition-all rounded-full" />
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 block">Equipe em Atividade</h4>
                 <div className="space-y-3">
                    {allProfiles.filter(p => p.station === profile?.station).length === 0 ? <p className="text-[10px] text-outline-variant italic">Nenhum membro logado nesta praça.</p> :
                     allProfiles.filter(p => p.station === profile?.station).map(p => (
                       <div key={p.id} className="flex items-center justify-between bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5">
                          <div className="flex items-center gap-3">
                             <img 
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.full_name}`} 
                                className="w-8 h-8 rounded-full border border-primary/20 bg-primary/5" 
                                loading="lazy"
                                alt={p.full_name}
                             />
                             <div><p className="text-xs font-bold text-on-surface leading-none">{p.full_name}</p><p className="text-[8px] font-black uppercase text-outline-variant tracking-widest">{p.role}</p></div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                       </div>
                     ))}
                 </div>
              </div>

              <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-xl">
                 <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4 block">Operações de Praça</h4>
                 <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => archiveTask('')} disabled={completedCount === 0} icon={<History size={18} />}>Arquivar Concluídas</Button>
                    <Button variant="outline" className="w-full justify-start gap-3 h-14 text-error hover:bg-error/5" icon={<Trash2 size={18} />}>Reparar Erros</Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
           <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-8">
               <div><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Directiva de Cozinha</span><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">Nova Tarefa</h2></div>
               <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-xl hover:text-red-400 transition-colors"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleAddTask} className="space-y-6">
                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Título</label><input autoFocus required type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="EX: LIMPAR CAMARÃO..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Detalhes</label><input type="text" value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="EX: 4KG, MANTER CABEÇAS..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Urgência</label><select value={newPriority} onChange={(e: any) => setNewPriority(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-4 text-sm font-black text-on-surface outline-none"><option value="normal">NORMAL</option><option value="high">ALTA</option></select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Turno</label><select value={newShift} onChange={(e: any) => setNewShift(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-4 text-sm font-black text-on-surface outline-none"><option value="manha">MANHÃ</option><option value="tarde">TARDE</option></select></div>
                </div>
                {isManagement && (
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Estação</label><select value={newStation} onChange={(e) => setNewStation(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-4 text-sm font-black text-on-surface outline-none">{stationsList.map(s => <option key={s} value={s}>{formatStationName(s)}</option>)}</select></div>
                )}
                <div className="pt-4 flex gap-3">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                   <Button type="submit" variant="primary" className="flex-1" loading={isSaving}>Confirmar</Button>
                </div>
             </form>
           </div>
        </div>
      )}
    </PageLayout>
  );
}
