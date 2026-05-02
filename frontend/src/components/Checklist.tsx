import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CheckSquare, AlertTriangle, Zap, Utensils, Loader2, RefreshCcw, 
  CheckCircle2, Plus, Trash2, X, User, Users, ChevronRight, 
  ChefHat, ArrowRight, History, FileText, Sparkles, Package,
  Clock, MessageSquare, Play, Calendar, Trophy, Flame, LayoutGrid, BarChart3, Settings, Settings2
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useNavigation } from '../contexts/NavigationContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';
import Skeleton from './shared/Skeleton';

// Hooks
import { useTasks, Task, TASK_CATEGORIES, TaskCategory, useWeeklyStats } from '../hooks/useTasks';
import { useTaskTemplates, TaskTemplate } from '../hooks/useTaskTemplates';
import { useProfiles } from '../hooks/useProfiles';
import { useInsumos } from '../hooks/useInsumos';
import { useStations } from '../hooks/useStations';
import { supabase } from '../lib/supabase';

// ─── Gamification ─────────────────────────────────────────────────────────────
const fireConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#a6cce3', '#b89b4e']
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#a6cce3', '#b89b4e']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

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

function ChecklistItem({ 
  task, 
  creatorName, 
  completerName,
  onToggle, 
  onDelete, 
  onAddNote,
  canDelete 
}: { 
  task: Task; 
  creatorName?: string; 
  completerName?: string;
  onToggle: () => void; 
  onDelete: (e: any) => void; 
  onAddNote: () => void;
  canDelete: boolean;
}) {
  const isHighPriority = task.priority === 'high';
  const isLate = task.due_time && !task.is_completed && new Date(`1970-01-01T${task.due_time}`) < new Date(`1970-01-01T${new Date().toTimeString().split(' ')[0]}`);
  const catInfo = TASK_CATEGORIES[task.category] || TASK_CATEGORIES.geral;

  return (
    <div 
      className={`group flex items-start justify-between p-3 rounded-xl transition-all cursor-pointer border-l-[3px] ${
        isLate ? 'bg-error-container/5 border-error' :
        isHighPriority ? 'bg-primary-container/5 border-primary' :
        'bg-transparent border-transparent hover:bg-surface-container-high'
      }`}
    >
      <div className="flex items-start gap-3 flex-1" onClick={onToggle}>
        <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
          task.is_completed ? 'bg-secondary border-secondary shadow-[0_0_15px_rgba(var(--color-secondary),0.3)]' : 
          isLate ? 'border-error bg-error/10' :
          isHighPriority ? 'border-primary bg-primary/10' :
          'border-outline-variant bg-transparent'
        }`}>
          {task.is_completed && <CheckSquare size={14} className="text-on-secondary" />}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-surface-container-highest border border-outline-variant/10 text-${catInfo.color}-400`}>
              {catInfo.label}
            </span>
            {task.due_time && (
              <span className={`text-[8px] font-black flex items-center gap-1 ${isLate && !task.is_completed ? 'text-error animate-pulse' : 'text-outline-variant'}`}>
                <Clock size={10} />
                {task.due_time.substring(0, 5)}
              </span>
            )}
          </div>
          
          <p className={`text-sm md:text-base font-semibold transition-colors ${
            task.is_completed ? 'text-on-surface line-through opacity-60' : 
            isLate ? 'text-error' :
            isHighPriority ? 'text-primary' :
            'text-on-surface'
          }`}>{task.title}</p>
          
          {task.subtitle && (
            <p className={`text-[10px] md:text-xs uppercase tracking-wider font-medium mt-0.5 ${task.is_completed ? 'opacity-40' : 'text-on-surface-variant/80'}`}>
              {task.subtitle}
            </p>
          )}

          {task.notes && (
            <div className="mt-2 p-2 rounded-lg bg-surface-container-highest/30 border border-outline-variant/5 border-l-secondary text-xs italic text-on-surface-variant">
              <span className="font-bold mr-1">Nota:</span>{task.notes}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
             {creatorName && !task.is_completed && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-highest/50 border border-outline-variant/10" title="Criado por">
                 <User size={8} className="text-outline-variant" />
                 <span className="text-[8px] font-bold text-outline-variant/80">{creatorName.split(' ')[0]}</span>
               </div>
             )}
             {task.is_completed && completerName && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20" title="Concluído por">
                 <CheckCircle2 size={8} className="text-secondary" />
                 <span className="text-[8px] font-bold text-secondary">{completerName.split(' ')[0]} às {new Date(task.completed_at || '').toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onAddNote(); }}
          className="p-2 text-outline-variant/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
          title="Adicionar Nota"
        >
          <MessageSquare size={14} />
        </button>
        {canDelete && (
          <button 
            onClick={onDelete}
            className="p-2 text-outline-variant/40 hover:text-error hover:bg-error/10 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: DrillDown ────────────────────────────────────────────────
function PerformanceDrillDownModal({ station, shift, onClose }: { station: string, shift: string, onClose: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      
      let q = supabase
        .from('tasks')
        .select('*')
        .eq('station', station)
        .eq('is_completed', false)
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('is_archived', 'eq', true)
        .order('created_at', { ascending: false });
        
      if (shift !== 'todos') {
        q = q.eq('shift', shift);
      }
      
      const { data } = await q;
      setTasks(data || []);
      setLoading(false);
    };
    fetchTasks();
  }, [station, shift]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
       <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-2xl rounded-[2rem] p-6 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
         <div className="flex justify-between items-start mb-6">
           <div><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">{station.toUpperCase().replace('_', ' ')}</h2><p className="text-[10px] text-error font-bold uppercase tracking-widest mt-1">Tarefas negligenciadas (Últimos 7 dias)</p></div>
           <button onClick={onClose} className="w-8 h-8 rounded-xl hover:text-red-400 transition-colors bg-surface-container flex items-center justify-center"><X size={20}/></button>
         </div>
         <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
           {loading ? <div className="py-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-primary" /></div> :
            tasks.length === 0 ? <p className="text-center text-outline-variant font-bold text-xs uppercase tracking-widest py-8">Nenhuma tarefa pendente encontrada.</p> :
            tasks.map(t => (
              <div key={t.id} className="p-4 bg-surface-container rounded-xl border border-error/20 flex flex-col gap-1 border-l-4 border-l-error">
                <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-on-surface uppercase">{t.title}</span>
                   <span className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 px-2 py-0.5 rounded">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {t.subtitle && <span className="text-xs text-outline-variant">{t.subtitle}</span>}
              </div>
            ))}
         </div>
       </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Checklist() {
  const { profile, isManagement, user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { setActiveTab } = useNavigation();

  // Active View (Tasks, Templates, Dashboard)
  const [activeView, setActiveView] = useState<'tasks' | 'templates' | 'dashboard'>('tasks');

  // UI States (Tasks)
  const [dayFilter, setDayFilter] = useState<'hoje' | 'ontem'>('hoje');
  const [activeShift, setActiveShift] = useState<'manha' | 'tarde' | 'todos'>(profile?.shift === 'tarde' ? 'tarde' : 'manha');
  const [activeStation, setActiveStation] = useState<string>(profile?.station || 'saucier');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [noteModalData, setNoteModalData] = useState<{ id: string; notes: string } | null>(null);
  const [performanceModalStation, setPerformanceModalStation] = useState<string | null>(null);
  const [isStationsModalOpen, setIsStationsModalOpen] = useState(false);
  
  const { stations, activeStations, updateStation, toggleStation } = useStations();
  const stationsList = activeStations.map(s => s.id);

  // Forms
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high'>('normal');
  const [newShift, setNewShift] = useState<'manha' | 'tarde'>('manha');
  const [newStation, setNewStation] = useState<string>('saucier');
  const [newCategory, setNewCategory] = useState<TaskCategory>('geral');
  const [newDueTime, setNewDueTime] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<'daily' | 'weekdays' | 'weekly'>('daily');
  
  const [isSaving, setIsSaving] = useState(false);

  // Data fetching
  const { 
    tasks: allTasks, 
    isLoading: tasksLoading, 
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    toggleTask, 
    addTask, 
    updateTaskNotes,
    deleteTask, 
    archiveTask,
    archiveCompletedTasks,
    refetch: refetchTasks 
  } = useTasks(isManagement ? undefined : profile?.station, dayFilter);

  const {
    templates: allTemplates,
    isLoading: templatesLoading,
    addTemplate,
    deleteTemplate,
    toggleTemplate,
    generateFromTemplates,
    isGenerating
  } = useTaskTemplates();

  const { data: weeklyStats, isLoading: weeklyStatsLoading } = useWeeklyStats(activeShift);

  const { data: allProfiles = [] } = useProfiles();
  const { insumos: allInsumos = [] } = useInsumos();

  // Computed
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (activeShift !== 'todos' && t.shift !== 'todos' && t.shift !== activeShift) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
      await toggleTask({ id, is_completed: !current, userId: user?.id });
      // Gamification
      if (!current) {
        fireConfetti();
        // Custom message logic
        const msgs = ['Mise en Place impecável! 🏆', 'Excelente trabalho! 🔥', 'Praça dominada! ⚡'];
        // We can show a toast here if we have a toast system, but confetti is a great visual reward.
      }
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
        category: newCategory,
        due_time: newDueTime || undefined,
        status: 'pending',
        is_completed: false,
        is_archived: false,
        assigned_to: user?.id
      });
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewDueTime('');
    } catch (err) {
      showAlert('Erro', 'Falha ao criar tarefa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      await addTemplate({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        station: newStation,
        priority: newPriority,
        shift: newShift,
        category: newCategory,
        due_time: newDueTime || undefined,
        recurrence: newRecurrence,
        is_active: true,
        created_by: user?.id
      });
      setIsAddTemplateModalOpen(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewDueTime('');
    } catch (err) {
      showAlert('Erro', 'Falha ao criar template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModalData) return;
    setIsSaving(true);
    try {
      await updateTaskNotes({ id: noteModalData.id, notes: noteModalData.notes });
      setNoteModalData(null);
    } catch (err) {
      showAlert('Erro', 'Falha ao salvar nota.');
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

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm('Excluir Template', 'Deseja remover este template? As tarefas já geradas não serão afetadas.');
    if (confirmed) {
      try {
        await deleteTemplate(id);
      } catch (err) {
        showAlert('Erro', 'Não foi possível excluir.');
      }
    }
  };

  const handleGenerateTasks = async () => {
    const confirmed = await showConfirm('Gerar Tarefas', 'Deseja gerar as tarefas de hoje a partir dos templates ativos?', 'Gerar Tarefas');
    if (confirmed && user?.id) {
      try {
        const count = await generateFromTemplates(user.id);
        showAlert('Sucesso', `${count} tarefas foram geradas com sucesso.`);
      } catch (err) {
        showAlert('Erro', 'Falha ao gerar tarefas.');
      }
    }
  };

  const formatStationName = (s: string) => {
    if (s === 'todos') return 'TODAS AS PRAÇAS';
    const station = stations.find(st => st.id === s);
    return station?.display_name || s.toUpperCase().replace('_', ' ');
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

      {/* Tabs (Liderança) */}
      {isManagement && (
        <div className="flex items-center gap-2 mb-8 bg-surface-container rounded-2xl p-1 border border-outline-variant/10 inline-flex">
          <button 
            onClick={() => setActiveView('tasks')} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'tasks' ? 'bg-primary text-on-primary shadow-lg' : 'text-outline-variant hover:text-on-surface'}`}
          >
            <CheckSquare size={14} /> Tempo Real
          </button>
          <button 
            onClick={() => setActiveView('templates')} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'templates' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-outline-variant hover:text-on-surface'}`}
          >
            <Settings size={14} /> Templates
          </button>
          <button 
            onClick={() => setActiveView('dashboard')} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'dashboard' ? 'bg-tertiary text-on-tertiary shadow-lg' : 'text-outline-variant hover:text-on-surface'}`}
          >
            <BarChart3 size={14} /> Desempenho
          </button>
        </div>
      )}

      {/* ─── TASKS VIEW ──────────────────────────────────────────────────────── */}
      {activeView === 'tasks' && (
        <>
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="text-[0.6875rem] font-black tracking-[0.3em] text-primary uppercase">Mise en Place & Produção</span>
                <h1 className="text-3xl md:text-6xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">A LISTA</h1>
                <p className="mt-3 md:mt-4 text-on-surface-variant leading-relaxed text-xs md:text-base font-medium max-w-lg">
                  {isManagement ? 'Gerenciamento tático de todas as praças da Brigade Noir em tempo real.' : `Controle de produção da praça ${profile?.station?.toUpperCase()}. Mantenha o padrão de excelência.`}
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
                    size="sm" 
                    onClick={() => { setNewShift(activeShift === 'todos' ? 'manha' : activeShift); setNewStation(profile?.station || 'saucier'); setIsAddModalOpen(true); }}
                    icon={<Plus size={16} />}
                    className="shadow-xl shadow-primary/20"
                  >
                    Nova Tarefa
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={() => refetchTasks()} icon={<RefreshCcw size={16} className={tasksLoading ? 'animate-spin' : ''} />}>Sincronizar</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="bg-surface-container rounded-2xl md:rounded-3xl p-4 md:p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
               <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 rounded-full transition-colors ${efficiency >= 80 ? 'bg-primary' : 'bg-error'}`} />
               <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary border border-outline-variant/10"><Zap size={24} /></div>
                  <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Eficiência</p><p className="text-3xl font-black text-on-surface tracking-tighter">{efficiency}%</p></div>
               </div>
            </div>
            <div className="bg-surface-container rounded-2xl md:rounded-3xl p-4 md:p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-secondary border border-outline-variant/10"><CheckCircle2 size={24} /></div>
                  <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Concluídas</p><p className="text-3xl font-black text-on-surface tracking-tighter">{completedCount}</p></div>
               </div>
            </div>
            <div className="bg-surface-container rounded-2xl md:rounded-3xl p-4 md:p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-tertiary border border-outline-variant/10"><Users size={24} /></div>
                  <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Praça</p><p className="text-2xl font-black text-on-surface tracking-tighter uppercase">{profile?.station || 'GERAL'}</p></div>
               </div>
            </div>
            <div className="bg-surface-container rounded-2xl md:rounded-3xl p-4 md:p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => setActiveTab('insumos')}>
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-outline-variant/10 transition-colors ${insumoAlerts.length > 0 ? 'bg-error/10 text-error' : 'bg-surface-container-highest text-outline-variant'}`}><AlertTriangle size={24} /></div>
                  <div><p className="text-xs font-black text-outline-variant uppercase tracking-widest">Alertas</p><p className={`text-3xl font-black tracking-tighter ${insumoAlerts.length > 0 ? 'text-error' : 'text-on-surface'}`}>{insumoAlerts.length}</p></div>
               </div>
               <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant/20 group-hover:text-primary transition-all group-hover:translate-x-1" size={24} />
            </div>
          </div>

          {isManagement ? (
            <div className="space-y-12">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-outline-variant/10 pb-6 md:pb-8">
                  <div><h3 className="text-xl md:text-3xl font-black text-on-surface uppercase tracking-tighter leading-none mb-1">Radar de Estações</h3><p className="text-[10px] md:text-xs text-outline-variant font-bold uppercase tracking-widest italic">Monitoramento global.</p></div>
                   <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => setIsStationsModalOpen(true)} icon={<Settings2 size={14} />}>Praças</Button>
                     <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10 shadow-sm">
                        <button onClick={() => setActiveShift('manha')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'manha' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Manhã</button>
                        <button onClick={() => setActiveShift('tarde')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'tarde' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Tarde</button>
                        <button onClick={() => setActiveShift('todos')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'todos' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Geral</button>
                     </div>
                   </div>
                </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {stationsList.filter(s => s !== 'almoxarifado').map(station => {
                      const stTasks = allTasks.filter(t => t.station === station && !t.is_archived);
                      const stAlerts = insumoAlerts.filter(a => a.station === station);
                      const stCompleted = stTasks.filter(t => t.is_completed).length;
                      const stEff = stTasks.length > 0 ? Math.round((stCompleted/stTasks.length)*100) : 100;

                      const isLate = (t: Task) => t.due_time && !t.is_completed && new Date(`1970-01-01T${t.due_time}`) < new Date(`1970-01-01T${new Date().toTimeString().split(' ')[0]}`);
                      const stLate = stTasks.filter(isLate).length;

                      return (
                        <div key={station} className={`bg-surface-container rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden group transition-all duration-500 hover:scale-[1.02] ${dayFilter === 'ontem' ? 'border-secondary/40 shadow-secondary/5' : 'border-outline-variant/10'} w-full`}>
                           <div className="p-6 pb-4">
                              <div className="flex justify-between items-center mb-4">
                                 <div className="flex items-center gap-2">
                                    <ChefHat size={16} className={dayFilter === 'ontem' ? 'text-secondary' : 'text-primary'} />
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${dayFilter === 'ontem' ? 'text-secondary' : 'text-primary'}`}>{formatStationName(station)}</span>
                                 </div>
                                 <div className="flex gap-2">
                                    {stLate > 0 && <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-error/10 text-error flex items-center gap-1 animate-pulse"><Clock size={10}/> {stLate} Atrasada{stLate !== 1 ? 's' : ''}</div>}
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${dayFilter === 'ontem' ? 'bg-secondary/10 text-secondary' : stEff >= 80 ? 'bg-green-500/10 text-green-400' : stEff >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-500'}`}>{stEff}%</div>
                                 </div>
                              </div>
                              <h4 className="text-3xl font-black text-on-surface tracking-tighter uppercase leading-none mb-4">{formatStationName(station)}</h4>
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
                           <div className="flex-1 overflow-hidden relative bg-surface-container-low/50">
                             <div className="absolute inset-0 p-6 overflow-y-auto space-y-3 custom-scrollbar">
                                {stTasks.length === 0 ? <div className="py-8 text-center opacity-20 italic text-[10px] font-bold uppercase tracking-widest">Sem tarefas</div> :
                                 stTasks.map(t => <ChecklistItem key={t.id} task={t} creatorName={allProfiles.find(p => p.id === t.assigned_to)?.full_name} completerName={allProfiles.find(p => p.id === t.completed_by)?.full_name} onToggle={() => handleToggle(t.id, t.is_completed)} canDelete onDelete={(e: any) => handleDeleteTask(t.id, e)} onAddNote={() => setNoteModalData({id: t.id, notes: t.notes || ''})} />)}
                             </div>
                             {stTasks.length > 3 && <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-surface-container to-transparent pointer-events-none flex items-end justify-center pb-2 z-10"><span className="text-[8px] font-black text-outline-variant uppercase tracking-widest bg-surface-container/90 px-3 py-1 rounded-full shadow-lg border border-outline-variant/10">↓ Scroll</span></div>}
                           </div>
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
                                 <ChecklistItem key={task.id} task={task} creatorName={allProfiles.find(p => p.id === task.assigned_to)?.full_name} completerName={allProfiles.find(p => p.id === task.completed_by)?.full_name} onToggle={() => handleToggle(task.id, task.is_completed)} canDelete onDelete={(e: any) => handleDeleteTask(task.id, e)} onAddNote={() => setNoteModalData({id: task.id, notes: task.notes || ''})} />
                              ))}
                           </ChecklistGroup>
                         )}
                         
                         <ChecklistGroup title="Base de Produção" completed={filteredTasks.filter(t => t.priority !== 'high' && t.is_completed).length} total={filteredTasks.filter(t => t.priority !== 'high').length}>
                            {filteredTasks.filter(t => t.priority !== 'high').map(task => (
                               <ChecklistItem key={task.id} task={task} creatorName={allProfiles.find(p => p.id === task.assigned_to)?.full_name} completerName={allProfiles.find(p => p.id === task.completed_by)?.full_name} onToggle={() => handleToggle(task.id, task.is_completed)} canDelete onDelete={(e: any) => handleDeleteTask(task.id, e)} onAddNote={() => setNoteModalData({id: task.id, notes: task.notes || ''})} />
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
                               {isFetchingNextPage ? <Loader2 size={18} className="animate-spin mr-2" /> : <History size={18} className="mr-2 group-hover:rotate-[-45deg] transition-transform" />}
                               {isFetchingNextPage ? 'Carregando...' : 'Mostrar Mais Tarefas (Histórico)'}
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
                                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.full_name}`} className="w-8 h-8 rounded-full border border-primary/20 bg-primary/5" loading="lazy" alt={p.full_name} />
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
                        <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => archiveCompletedTasks(profile?.station || '')} disabled={completedCount === 0} icon={<History size={18} />}>Arquivar Concluídas</Button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}

      {/* ─── TEMPLATES VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'templates' && isManagement && (
        <div className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Modelos de Tarefa</h2>
              <p className="text-xs text-outline-variant font-bold uppercase tracking-widest mt-1">Crie tarefas recorrentes geradas automaticamente</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerateTasks} loading={isGenerating} icon={<Play size={16}/>}>Gerar Agora</Button>
              <Button variant="primary" onClick={() => { setNewStation('saucier'); setIsAddTemplateModalOpen(true); }} icon={<Plus size={16}/>}>Novo Template</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates.map(tpl => {
              const catInfo = TASK_CATEGORIES[tpl.category as TaskCategory] || TASK_CATEGORIES.geral;
              return (
                <div key={tpl.id} className={`bg-surface-container rounded-2xl p-5 border shadow-sm flex flex-col ${tpl.is_active ? 'border-outline-variant/10' : 'border-outline-variant/5 opacity-60'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-${catInfo.color}-500/10 text-${catInfo.color}-400`}>{catInfo.label}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-surface-container-highest text-outline-variant">{formatStationName(tpl.station)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTemplate({id: tpl.id, is_active: !tpl.is_active})} className={`text-[10px] font-bold ${tpl.is_active ? 'text-green-400' : 'text-outline-variant'}`}>
                        {tpl.is_active ? 'Ativo' : 'Pausado'}
                      </button>
                      <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="text-outline-variant hover:text-error transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-on-surface mb-1">{tpl.title}</h4>
                  {tpl.subtitle && <p className="text-xs text-on-surface-variant mb-4">{tpl.subtitle}</p>}
                  
                  <div className="mt-auto pt-4 border-t border-outline-variant/5 flex items-center justify-between text-[10px] font-bold text-outline-variant uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {tpl.recurrence === 'daily' ? 'Diário' : tpl.recurrence === 'weekdays' ? 'Dias Úteis' : 'Semanal'}</span>
                    {tpl.due_time && <span className="flex items-center gap-1"><Clock size={12}/> {tpl.due_time.substring(0,5)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DASHBOARD VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'dashboard' && isManagement && (
        <div className="animate-in fade-in duration-300 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Desempenho Semanal</h2>
              <p className="text-xs text-outline-variant font-bold uppercase tracking-widest mt-1">Eficiência das praças nos últimos 7 dias</p>
            </div>
            <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant/10 shadow-sm">
              <button onClick={() => setActiveShift('manha')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'manha' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Manhã</button>
              <button onClick={() => setActiveShift('tarde')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'tarde' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Tarde</button>
              <button onClick={() => setActiveShift('todos')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeShift === 'todos' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Geral</button>
            </div>
          </div>

          {weeklyStatsLoading ? <div className="p-12 text-center text-outline-variant"><Loader2 size={32} className="animate-spin mx-auto"/></div> : (
            <>
              {/* Ranking Geral */}
              <div className="bg-surface-container rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-6 flex items-center gap-2"><Trophy size={18} className="text-secondary"/> Ranking Geral de Eficiência</h3>
                <div className="space-y-4">
                  {weeklyStats?.stationRanking.map((s, idx) => (
                    <div key={s.station} onClick={() => setPerformanceModalStation(s.station)} className="flex items-center gap-4 cursor-pointer hover:bg-surface-container/50 p-2 rounded-xl transition-colors -mx-2 group">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-outline-variant'}`}>
                        {idx + 1}
                      </div>
                      <div className="w-24 text-xs font-bold uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">{formatStationName(s.station)}</div>
                      <div className="flex-1 h-3 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className={`h-full ${s.efficiency >= 80 ? 'bg-primary' : s.efficiency >= 50 ? 'bg-secondary' : 'bg-error'}`} style={{ width: `${s.efficiency}%` }} />
                      </div>
                      <div className="w-12 text-right font-black text-sm">{s.efficiency}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolução Diária (CSS Bar Chart) */}
              <div className="bg-surface-container rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-8 flex items-center gap-2"><BarChart3 size={18} className="text-primary"/> Evolução Global (7 dias)</h3>
                
                <div className="h-48 flex items-end justify-between gap-2">
                  {weeklyStats?.dailyGlobal.map((d, i) => {
                    const date = new Date(d.date + 'T00:00:00');
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                        <div className="text-[10px] font-bold text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity">{d.efficiency}%</div>
                        <div className="w-full max-w-[40px] bg-surface-container-highest rounded-t-lg relative flex items-end overflow-hidden" style={{ height: '100%' }}>
                          <div className={`w-full transition-all duration-1000 ${d.efficiency >= 80 ? 'bg-primary' : d.efficiency >= 50 ? 'bg-secondary' : 'bg-error'}`} style={{ height: `${d.efficiency}%` }} />
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-outline-variant text-center leading-none">
                          {date.toLocaleDateString('pt-BR', { weekday: 'short' })}<br/>{date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Nova Tarefa Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
           <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-lg rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-6">
               <div><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Directiva de Cozinha</span><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">Nova Tarefa</h2></div>
               <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-xl hover:text-red-400 transition-colors"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleAddTask} className="space-y-4">
                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Título</label><input required type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="EX: LIMPAR CAMARÃO..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Detalhes (Opcional)</label><input type="text" value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="EX: 4KG, MANTER CABEÇAS..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Categoria</label><select value={newCategory} onChange={(e: any) => setNewCategory(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none">
                    {Object.entries(TASK_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                  </select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Horário Limite (Opcional)</label><input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Urgência</label><select value={newPriority} onChange={(e: any) => setNewPriority(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none"><option value="normal">NORMAL</option><option value="high">ALTA</option></select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Turno</label><select value={newShift} onChange={(e: any) => setNewShift(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none"><option value="manha">MANHÃ</option><option value="tarde">TARDE</option><option value="todos">GERAL</option></select></div>
                </div>

                {isManagement && (
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Estação</label><select value={newStation} onChange={(e) => setNewStation(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none">{stationsList.map(s => <option key={s} value={s}>{formatStationName(s)}</option>)}</select></div>
                )}
                <div className="pt-2 flex gap-3">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                   <Button type="submit" variant="primary" className="flex-1" loading={isSaving}>Criar Tarefa</Button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Novo Template Modal */}
      {isAddTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddTemplateModalOpen(false)} />
           <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-lg rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-6">
               <div><span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">Recorrência Automática</span><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">Novo Template</h2></div>
               <button onClick={() => setIsAddTemplateModalOpen(false)} className="w-10 h-10 rounded-xl hover:text-red-400 transition-colors"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleAddTemplate} className="space-y-4">
                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Título da Tarefa Base</label><input required type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="EX: HIGIENIZAR BANCADAS" className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Categoria</label><select value={newCategory} onChange={(e: any) => setNewCategory(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none">
                    {Object.entries(TASK_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                  </select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Recorrência</label><select value={newRecurrence} onChange={(e: any) => setNewRecurrence(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none"><option value="daily">TODOS OS DIAS</option><option value="weekdays">DIAS ÚTEIS</option><option value="weekly">SEMANAL (SEG)</option></select></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Turno</label><select value={newShift} onChange={(e: any) => setNewShift(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none"><option value="manha">MANHÃ</option><option value="tarde">TARDE</option><option value="todos">GERAL</option></select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Horário Limite (Opcional)</label><input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all" /></div>
                </div>

                <div><label className="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Estação</label><select value={newStation} onChange={(e) => setNewStation(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-black text-on-surface outline-none">{stationsList.map(s => <option key={s} value={s}>{formatStationName(s)}</option>)}</select></div>
                
                <div className="pt-2 flex gap-3">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddTemplateModalOpen(false)}>Cancelar</Button>
                   <Button type="submit" variant="primary" className="flex-1" loading={isSaving}>Salvar Template</Button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModalData && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setNoteModalData(null)} />
           <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-sm rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-6">
               <div><h2 className="text-xl font-black text-on-surface tracking-tighter uppercase">Adicionar Nota</h2></div>
               <button onClick={() => setNoteModalData(null)} className="w-8 h-8 rounded-xl hover:text-red-400 transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddNote} className="space-y-4">
                <textarea autoFocus value={noteModalData.notes} onChange={(e) => setNoteModalData({...noteModalData, notes: e.target.value})} placeholder="Ex: Produto X estava em falta..." className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all resize-none h-32" />
                <div className="flex gap-3">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setNoteModalData(null)}>Cancelar</Button>
                   <Button type="submit" variant="primary" className="flex-1" loading={isSaving}>Salvar</Button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Drill Down Modal */}
      {performanceModalStation && (
        <PerformanceDrillDownModal 
          station={performanceModalStation} 
          shift={activeShift} 
          onClose={() => setPerformanceModalStation(null)} 
        />
      )}

      {/* Stations Manage Modal */}
      {isStationsModalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsStationsModalOpen(false)} />
           <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-lg rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-6">
               <div><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Configurações</span><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">Gerenciar Praças</h2><p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest mt-1">Ative, desative e renomeie as praças.</p></div>
               <button onClick={() => setIsStationsModalOpen(false)} className="w-10 h-10 rounded-xl hover:text-red-400 transition-colors"><X size={24}/></button>
             </div>
             
             <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
               {stations.filter(s => s.id !== 'almoxarifado').map(s => (
                  <div key={s.id} className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${s.is_active ? 'bg-surface-container border-outline-variant/20' : 'bg-surface-container-low border-error/20 opacity-70'}`}>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.is_active ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                            <ChefHat size={16} />
                         </div>
                         <input 
                           type="text" 
                           defaultValue={s.display_name} 
                           onBlur={(e) => { if(e.target.value && e.target.value !== s.display_name) updateStation({ id: s.id, display_name: e.target.value }) }}
                           className="bg-surface-container-lowest border border-outline-variant/10 text-sm font-bold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 w-full uppercase tracking-widest transition-all"
                         />
                      </div>
                      <div className="shrink-0">
                        <Button 
                          variant={s.is_active ? 'outline' : 'primary'} 
                          size="sm" 
                          onClick={() => toggleStation({ id: s.id, is_active: !s.is_active })}
                        >
                           {s.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </div>
               ))}
             </div>
           </div>
        </div>
      )}

    </PageLayout>
  );
}
