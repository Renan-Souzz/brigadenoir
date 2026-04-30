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
  Coins,
  FileText,
  MousePointer2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
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

const STATUS_CONFIG: Record<DutyStatus, { label: string; icon: any; color: string; bg: string; excel: string }> = {
  trabalho: { label: 'Trabalho', icon: Check, color: 'text-primary', bg: 'bg-primary/20', excel: 'T' },
  folga: { label: 'Folga', icon: Palmtree, color: 'text-secondary', bg: 'bg-secondary/20', excel: 'F' },
  compensa: { label: 'Compensa', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-400/20', excel: 'C' }
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
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Group days into weeks
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  const activeDays = viewMode === 'monthly' ? days : weeks[currentWeekIndex] || [];

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
      setIsGenerating(true);
      // Wait for font and images
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        backgroundColor: '#0e0e12',
        pixelRatio: 2,
        style: {
          opacity: '1',
          visibility: 'visible',
          display: 'block'
        }
      });
      
      const link = document.createElement('a');
      link.download = `Escala_${monthKey}_BrigadeNoir.png`;
      link.href = dataUrl;
      link.click();
      showAlert('Sucesso', 'Escala exportada como imagem premium!');
    } catch (err: any) {
      console.error('Export error:', err);
      showAlert('Erro na Exportação', 'Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const data = filteredUsers.map(u => {
        const row: any = { 'Colaborador': u.full_name, 'Cargo': u.role };
        days.forEach(({ day }) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
          row[day] = rec ? STATUS_CONFIG[rec.status].excel : '.';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Escala");
      XLSX.writeFile(wb, `Escala_${monthKey}.xlsx`);
      showAlert('Sucesso', 'Planilha Excel gerada com sucesso!');
    } catch (err) {
      showAlert('Erro', 'Falha ao gerar Excel.');
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    setCurrentDate(newDate);
    setCurrentWeekIndex(0);
  };

  const changeWeek = (offset: number) => {
    const next = currentWeekIndex + offset;
    if (next >= 0 && next < weeks.length) {
      setCurrentWeekIndex(next);
    } else if (next < 0) {
      // Go to previous month's last week? Simple for now: stay.
    } else if (next >= weeks.length) {
      // Go to next month? Simple for now: stay.
    }
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
            <button 
              onClick={() => viewMode === 'monthly' ? changeMonth(-1) : changeWeek(-1)} 
              className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-outline-variant hover:text-primary"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-center min-w-[240px]">
              <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase leading-none">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              {viewMode === 'weekly' && (
                <p className="text-[9px] font-black text-primary uppercase mt-1 tracking-widest">
                  Semana {currentWeekIndex + 1} de {weeks.length}
                </p>
              )}
            </div>
            <button 
              onClick={() => viewMode === 'monthly' ? changeMonth(1) : changeWeek(1)} 
              className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-outline-variant hover:text-primary"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/10 mr-2">
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'monthly' ? 'bg-primary text-on-primary shadow-sm' : 'text-outline-variant hover:text-on-surface'}`}
            >
              Mês
            </button>
            <button 
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'weekly' ? 'bg-primary text-on-primary shadow-sm' : 'text-outline-variant hover:text-on-surface'}`}
            >
              Semana
            </button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<FileText size={16} />} 
            onClick={handleExportExcel}
            className="bg-surface-container-high border border-outline-variant/10"
          >
            Excel
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            icon={isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />} 
            onClick={handleExport}
            disabled={isGenerating}
            className="shadow-lg shadow-primary/10"
          >
            {isGenerating ? 'Gerando...' : 'Download Imagem'}
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
        
        {/* Export Target (HIDDEN PREMIUM VERSION) */}
        <div 
          ref={exportRef} 
          id="export-container"
          className="bg-[#0e0e12] p-16 w-[1600px] font-sans"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            opacity: 0, 
            pointerEvents: 'none', 
            zIndex: -1 
          }}
        >
          <div className="mb-12 flex justify-between items-end border-b border-outline-variant/20 pb-10">
             <div>
               <div className="flex items-center gap-4 mb-4">
                 <img src="/logo.png" alt="BN" className="w-16 h-16 rounded-2xl" />
                 <div>
                   <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase leading-none">Brigade Noir</h1>
                   <p className="text-primary font-black tracking-[0.4em] text-xs mt-2 uppercase">Operational Intelligence</p>
                 </div>
               </div>
               <h2 className="text-7xl font-black text-on-surface tracking-tighter uppercase mt-6 leading-[0.8]">Escala Mensal</h2>
               <p className="text-outline-variant font-bold tracking-[0.2em] text-lg mt-4 uppercase">Turnos & Disponibilidade | {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
             </div>
             <div className="text-right">
               <div className="flex flex-col gap-3 items-end">
                 <div className="flex items-center gap-3 bg-surface-container-highest/50 px-6 py-3 rounded-2xl border border-outline-variant/10">
                   <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/50"></div> 
                   <span className="text-on-surface text-xs font-black uppercase tracking-widest">Trabalho</span>
                 </div>
                 <div className="flex items-center gap-3 bg-surface-container-highest/50 px-6 py-3 rounded-2xl border border-outline-variant/10">
                   <div className="w-4 h-4 rounded-full bg-secondary/20 border border-secondary/50"></div> 
                   <span className="text-on-surface text-xs font-black uppercase tracking-widest">Folga (F)</span>
                 </div>
                 <div className="flex items-center gap-3 bg-surface-container-highest/50 px-6 py-3 rounded-2xl border border-outline-variant/10">
                   <div className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/50"></div> 
                   <span className="text-on-surface text-xs font-black uppercase tracking-widest">Compensa (C)</span>
                 </div>
               </div>
             </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/30">
                <th className="p-8 text-left text-on-surface text-sm uppercase font-black tracking-[0.3em] border-b border-outline-variant/20">Equipe Técnica</th>
                {days.map(({ day }) => (
                  <th key={day} className="p-2 text-center text-on-surface text-lg font-black border-b border-outline-variant/20">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-outline-variant/5">
                  <td className="p-8 bg-surface-container-low/30">
                    <p className="text-on-surface font-black text-xl uppercase tracking-tighter leading-none">{u.full_name}</p>
                    <p className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mt-2">{u.role}</p>
                  </td>
                  {days.map(({ day }) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                    return (
                      <td key={day} className="p-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border-2 ${
                          rec?.status === 'folga' ? 'bg-secondary/10 border-secondary/40 text-secondary' : 
                          rec?.status === 'compensa' ? 'bg-amber-400/10 border-amber-400/40 text-amber-400' : 
                          rec?.status === 'trabalho' ? 'bg-primary/10 border-primary/40 text-primary' :
                          'bg-surface-container-highest/30 border-outline-variant/10 text-outline-variant/20'
                        }`}>
                          {rec?.status === 'folga' && <span className="font-black text-2xl uppercase">F</span>}
                          {rec?.status === 'compensa' && <span className="font-black text-2xl uppercase">C</span>}
                          {rec?.status === 'trabalho' && <span className="font-black text-2xl uppercase">T</span>}
                          {!rec && <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/30"></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-16 pt-10 border-t border-outline-variant/10 text-center">
             <p className="text-outline-variant text-[10px] font-black tracking-[0.8em] uppercase">Documento Gerado por Brigade Noir Intelligence Systems</p>
             <p className="text-outline-variant/40 text-[8px] font-bold uppercase mt-4 tracking-widest">Hash de Autenticidade: {Math.random().toString(36).substring(7).toUpperCase()}-{Date.now()}</p>
          </div>
        </div>

        {/* Interactive UI Grid - DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-surface-container-highest/20">
                <th className="w-[100px] px-3 py-2 text-[8px] font-black tracking-widest text-outline uppercase sticky left-0 bg-surface-container z-10 border-r border-outline-variant/10">Equipe</th>
                {activeDays.map(({ day, weekday }) => (
                  <th key={day} className="py-1 text-center border-l border-outline-variant/5">
                    <p className="text-[6px] font-black text-primary/60 uppercase">{weekday}</p>
                    <p className="text-[8px] font-bold text-on-surface uppercase">{day}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors group">
                  <td className="px-3 py-1.5 sticky left-0 bg-surface-container z-10 border-r border-outline-variant/10">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-[7px] font-bold text-primary border border-primary/20 shrink-0">
                        {u.full_name?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-on-surface uppercase tracking-tight truncate">{u.full_name}</p>
                        <p className="text-[6px] text-outline-variant font-bold uppercase tracking-widest truncate">{u.role}</p>
                      </div>
                    </div>
                  </td>
                  {activeDays.map(({ day }) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                    
                    return (
                      <td key={day} className="p-0.5 border-l border-outline-variant/5">
                        <button
                          disabled={!isManagement}
                          onClick={() => handleToggleDay(u.id, day)}
                          className={`w-full aspect-square max-h-6 rounded-md flex items-center justify-center mx-auto transition-all transform active:scale-90 ${
                            rec ? STATUS_CONFIG[rec.status].bg + ' border border-outline-variant/20' : 'hover:bg-surface-container-highest text-outline-variant/10'
                          } ${!isManagement && 'cursor-default'}`}
                        >
                          {rec?.status === 'folga' && <span className="text-[9px] font-black text-secondary">F</span>}
                          {rec?.status === 'compensa' && <span className="text-[9px] font-black text-amber-400">C</span>}
                          {rec?.status === 'trabalho' && <span className="text-[9px] font-black text-primary">T</span>}
                          {!rec && <div className="w-0.5 h-0.5 rounded-full bg-outline-variant/20" />}
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
          <div className="flex bg-surface-container-highest/20 border-b border-outline-variant/10 sticky top-0 z-20 overflow-x-auto hide-scrollbar">
            <div className="w-12 shrink-0 py-2 px-2 text-[7px] font-black text-outline uppercase border-r border-outline-variant/10 bg-surface-container flex items-center justify-center">DIA</div>
            <div className="flex flex-1 py-2 px-1 gap-1">
              {filteredUsers.map(u => (
                <div key={u.id} className="shrink-0 flex flex-col items-center gap-0.5 w-8">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-bold text-primary border border-primary/20">
                    {u.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[5px] font-black text-outline uppercase tracking-tighter truncate w-full text-center">{u.full_name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {activeDays.map(({ day, weekday }) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isWeekend = weekday === 'SÁB' || weekday === 'DOM';
              
              return (
                <div key={day} className="flex">
                  <div className={`w-12 shrink-0 py-2 px-2 border-r border-outline-variant/10 flex flex-col items-center justify-center ${isWeekend ? 'bg-error/5' : 'bg-surface-container'}`}>
                    <span className="text-[6px] font-black text-primary/60 uppercase">{weekday}</span>
                    <span className="text-[10px] font-bold text-on-surface">{day}</span>
                  </div>
                  <div className="flex-1 flex px-1 gap-1 items-center overflow-x-auto hide-scrollbar">
                    {filteredUsers.map(u => {
                      const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
                      return (
                        <button
                          key={u.id}
                          disabled={!isManagement}
                          onClick={() => handleToggleDay(u.id, day)}
                          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            rec ? STATUS_CONFIG[rec.status].bg + ' border border-outline-variant/20' : 'bg-surface-container-low/20'
                          }`}
                        >
                           {rec?.status === 'folga' && <span className="text-[10px] font-black text-secondary">F</span>}
                           {rec?.status === 'compensa' && <span className="text-[10px] font-black text-amber-400">C</span>}
                           {rec?.status === 'trabalho' && <span className="text-[10px] font-black text-primary">T</span>}
                           {!rec && <div className="w-0.5 h-0.5 rounded-full bg-outline-variant/10" />}
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
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">T</div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Trabalho</span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-[10px] font-black text-secondary">F</div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Folga</span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400">C</div>
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Compensa</span>
        </div>
      </div>
    </PageLayout>
  );
}
