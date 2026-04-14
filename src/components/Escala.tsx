import React, { useState, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  User as UserIcon,
  RefreshCcw,
  Check,
  Undo2,
  AlertCircle,
  Clock,
  Palmtree,
  Coins
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../hooks/useProfiles';
import { useSchedule, DutyStatus, DutyRecord } from '../hooks/useSchedule';
import { useModal } from '../contexts/ModalContext';
import { formatLocalDate } from '../lib/dateUtils';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getMonthDaysArray = (year: number, month: number) => {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3).toUpperCase();
    return { day, weekday };
  });
};

const STATUS_CONFIG: Record<DutyStatus, { label: string; icon: any; color: string; bg: string }> = {
  trabalho: { label: 'Trabalho', icon: Check, color: 'text-primary', bg: 'bg-primary/20' },
  folga: { label: 'Folga', icon: Palmtree, color: 'text-secondary', bg: 'bg-secondary/20' },
  compensa: { label: 'Compensa', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-400/20' }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Escala() {
  const { profile, isManagement } = useAuth();
  const { showAlert } = useModal();
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Data
  const { data: users = [], isLoading: usersLoading } = useProfiles();
  const { schedule, upsertDuty, deleteDuty, isLoading: scheduleLoading } = useSchedule(monthKey);
  
  const days = getMonthDaysArray(year, month);
  const exportRef = useRef<HTMLDivElement>(null);

  // Filter out leaders if not admin? No, let leaders see everyone.
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    // Management sees everyone, Staff sees only themselves
    if (isManagement) {
      return [...users].sort((a, b) => (a.role > b.role ? 1 : -1));
    }
    return users.filter(u => u.id === profile?.id);
  }, [users, isManagement, profile?.id]);

  // Handle Logic
  const handleToggleDay = async (userId: string, day: number) => {
    if (!isManagement) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = schedule.find(s => s.user_id === userId && s.date === dateStr);

    let nextStatus: DutyStatus | null = null;
    if (!existing) nextStatus = 'folga';
    else if (existing.status === 'folga') nextStatus = 'compensa';
    else if (existing.status === 'compensa') nextStatus = 'trabalho';
    else if (existing.status === 'trabalho') nextStatus = null; // Back to default

    try {
      if (nextStatus) {
        await upsertDuty({
          user_id: userId,
          date: dateStr,
          status: nextStatus,
          month_key: monthKey
        });
      } else {
        await deleteDuty({ user_id: userId, date: dateStr });
      }
    } catch (err: any) {
      showAlert('Erro', 'Falha ao atualizar escala: ' + err.message);
    }
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      // Delay para garantir renderização total
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.download = `Escala_BrigadeNoir_${monthKey}.png`;
      link.href = dataUrl;
      link.click();
      showAlert('Sucesso', 'Escala exportada como imagem com sucesso!');
    } catch (err: any) {
      console.error('Erro de exportação:', err);
      showAlert('Erro na Exportação', 'Não foi possível gerar a imagem da escala.');
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    setCurrentDate(newDate);
  };

  if (usersLoading || scheduleLoading) {
    return (
      <PageLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <RefreshCcw className="animate-spin text-primary" size={40} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        leftContent={
          <div className="flex items-center gap-3">
            <CalendarIcon className="text-primary" size={24} />
            <h2 className="text-xl font-bold tracking-tighter text-on-surface uppercase">Escala Mensal</h2>
          </div>
        }
        avatarSeed={profile?.full_name || 'chef'}
      />

      {/* Controls */}
      <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">Calendário de Turnos</span>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-outline-variant hover:text-primary">
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-3xl font-black text-on-surface tracking-tighter min-w-[200px] text-center uppercase">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-outline-variant hover:text-primary">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Download size={16} />} 
            onClick={handleExport}
            className="bg-surface-container-high"
          >
            Exportar Imagem
          </Button>
          {!isManagement && (
             <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
               <AlertCircle size={14} className="text-primary" />
               <span className="text-[10px] font-bold text-primary uppercase">Somente Visualização</span>
             </div>
          )}
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="relative bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-2xl">
        
        {/* Export Target (Hidden visually but captured by html-to-image) */}
        <div 
          ref={exportRef} 
          id="export-container"
          className="bg-white p-10 w-[1200px]"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            opacity: 0.01, 
            pointerEvents: 'none', 
            zIndex: -1 
          }}
        >
          <div className="mb-8 border-b-2 border-blue-600 pb-6 flex justify-between items-end">
             <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Escala Operacional</h1>
               <p className="text-blue-600 font-bold tracking-[0.3em] text-sm mt-2">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
             </div>
             <div className="text-right">
               <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Brigade Noir | Intelligence</p>
               <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div> 
                   <span className="text-slate-600 text-[10px] font-bold">TRABALHO</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-600"></div> 
                   <span className="text-blue-600 text-[10px] font-bold">FOLGA (F)</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-600"></div> 
                   <span className="text-amber-600 text-[10px] font-bold">COMPENSA (C)</span>
                 </div>
               </div>
             </div>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className="p-4 text-left text-slate-900 text-[10px] uppercase font-black tracking-widest">Colaborador</th>
                {days.map(({ day }) => (
                  <th key={day} className="p-2 text-center text-slate-900 text-[10px] font-black">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-4 bg-slate-50/50">
                    <p className="text-slate-900 font-black text-xs uppercase tracking-tight">{u.full_name}</p>
                    <p className="text-blue-600 text-[7px] font-bold tracking-[0.2em] uppercase mt-0.5">{u.role}</p>
                  </td>
                  {days.map(({ day }) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                    return (
                      <td key={day} className="p-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto border ${
                          rec?.status === 'folga' ? 'bg-blue-50 border-blue-600' : 
                          rec?.status === 'compensa' ? 'bg-amber-50 border-amber-600' : 
                          'bg-slate-50 border-slate-200'
                        }`}>
                          {rec?.status === 'folga' && <span className="text-blue-700 font-black text-sm">F</span>}
                          {rec?.status === 'compensa' && <span className="text-amber-700 font-black text-sm">C</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-10 pt-6 border-t border-slate-200 text-center">
             <p className="text-slate-400 text-[8px] font-bold tracking-[0.5em] uppercase">Documento Gerado por Brigade Noir Intelligent Systems</p>
          </div>
        </div>

        {/* Interactive UI Grid - DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-surface-container-highest/20">
                <th className="w-[120px] px-4 py-3 text-[9px] font-black tracking-widest text-outline uppercase sticky left-0 bg-surface-container z-10 border-r border-outline-variant/10">Equipe</th>
                {days.map(({ day, weekday }) => (
                  <th key={day} className="py-2 text-center border-l border-outline-variant/5">
                    <p className="text-[7px] font-black text-primary/60 uppercase mb-0.5">{weekday}</p>
                    <p className="text-[10px] font-bold text-on-surface uppercase">{day}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors group">
                  <td className="px-4 py-2 sticky left-0 bg-surface-container z-10 border-r border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-[8px] font-bold text-primary border border-primary/20 shrink-0">
                        {u.full_name?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-on-surface uppercase tracking-tight truncate">{u.full_name}</p>
                        <p className="text-[7px] text-outline-variant font-bold uppercase tracking-widest truncate">{u.role}</p>
                      </div>
                    </div>
                  </td>
                  {days.map(({ day }) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                    const StatusIcon = rec ? STATUS_CONFIG[rec.status].icon : null;
                    
                    return (
                      <td key={day} className="p-0.5 border-l border-outline-variant/5">
                        <button
                          disabled={!isManagement}
                          onClick={() => handleToggleDay(u.id, day)}
                          className={`w-full aspect-square max-h-8 rounded-lg flex items-center justify-center mx-auto transition-all transform active:scale-90 ${
                            rec ? STATUS_CONFIG[rec.status].bg + ' border border-outline-variant/20 shadow-sm' : 'hover:bg-surface-container-highest text-outline-variant/10'
                          } ${!isManagement && 'cursor-default'}`}
                        >
                          {StatusIcon ? <StatusIcon size={12} className={STATUS_CONFIG[rec!.status].color} /> : <div className="w-0.5 h-0.5 rounded-full bg-outline-variant/20" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interactive UI Grid - MOBILE VIEW (Axis Inversion) */}
        <div className="md:hidden">
          <div className="flex bg-surface-container-highest/20 border-b border-outline-variant/10 sticky top-0 z-20">
            <div className="w-16 shrink-0 py-3 px-3 text-[8px] font-black text-outline uppercase border-r border-outline-variant/10 bg-surface-container">DIA</div>
            <div className="flex-1 flex overflow-x-auto scrollbar-hide py-3 px-2 gap-2">
              {filteredUsers.map(u => (
                <div key={u.id} className="shrink-0 flex flex-col items-center gap-1 w-10">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary border border-primary/20">
                    {u.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[6px] font-black text-outline uppercase tracking-tighter truncate w-full text-center">{u.full_name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {days.map(({ day, weekday }) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isWeekend = weekday === 'SÁB' || weekday === 'DOM';
              
              return (
                <div key={day} className="flex">
                  <div className={`w-16 shrink-0 py-3 px-3 border-r border-outline-variant/10 flex flex-col justify-center ${isWeekend ? 'bg-error/5' : 'bg-surface-container'}`}>
                    <span className="text-[7px] font-black text-primary/60 uppercase">{weekday}</span>
                    <span className="text-xs font-bold text-on-surface">{day}</span>
                  </div>
                  <div className="flex-1 flex px-2 gap-2 overflow-x-auto scrollbar-hide items-center">
                    {filteredUsers.map(u => {
                      const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                      const StatusIcon = rec ? STATUS_CONFIG[rec.status].icon : null;
                      return (
                        <button
                          key={u.id}
                          disabled={!isManagement}
                          onClick={() => handleToggleDay(u.id, day)}
                          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            rec ? STATUS_CONFIG[rec.status].bg + ' border border-outline-variant/20' : 'bg-surface-container-low/20'
                          }`}
                        >
                           {StatusIcon ? <StatusIcon size={14} className={STATUS_CONFIG[rec!.status].color} /> : <div className="w-1 h-1 rounded-full bg-outline-variant/10" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center items-center mb-20 bg-surface-container/40 p-6 rounded-2xl border border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Check size={14} className="text-primary" /></div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Trabalho</span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center"><Palmtree size={14} className="text-secondary" /></div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Folga</span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center"><Coins size={14} className="text-amber-400" /></div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Compensa</span>
        </div>
      </div>
    </PageLayout>
  );
}
