import React, { useState, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  RefreshCcw,
  AlertCircle,
  Palmtree,
  Coins,
  Check,
  FileText
} from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../hooks/useProfiles';
import { useSchedule, DutyStatus } from '../hooks/useSchedule';
import { useModal } from '../contexts/ModalContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getMonthDaysArray = (year: number, month: number) => {
  const total = getDaysInMonth(year, month);
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3).toUpperCase();
    const dow = date.getDay(); // 0=Sun, 6=Sat
    return { day, weekday, isWeekend: dow === 0 || dow === 6 };
  });
};

const STATUS_LABEL: Record<DutyStatus, { letter: string; color: string; bg: string; border: string }> = {
  trabalho: { letter: 'T', color: '#a6cce3', bg: 'rgba(166,204,227,0.15)', border: 'rgba(166,204,227,0.4)' },
  folga:    { letter: 'F', color: '#b89b4e', bg: 'rgba(184,155,78,0.15)',  border: 'rgba(184,155,78,0.4)' },
  compensa: { letter: 'C', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Escala() {
  const { profile, isManagement } = useAuth();
  const { showAlert } = useModal();

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const { data: users = [], isLoading: usersLoading } = useProfiles();
  const { schedule, upsertDuty, deleteDuty, isLoading: scheduleLoading } = useSchedule(monthKey);

  const days = getMonthDaysArray(year, month);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (isManagement) return [...users].sort((a, b) => (a.role > b.role ? 1 : -1));
    return users.filter(u => u.id === profile?.id);
  }, [users, isManagement, profile?.id]);

  // ── Cycle status on click ──
  const handleToggleDay = async (userId: string, day: number) => {
    if (!isManagement) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = schedule.find(s => s.user_id === userId && s.date === dateStr);

    let nextStatus: DutyStatus | null = null;
    if (!existing) nextStatus = 'folga';
    else if (existing.status === 'folga') nextStatus = 'compensa';
    else if (existing.status === 'compensa') nextStatus = 'trabalho';
    else nextStatus = null;

    try {
      if (nextStatus) {
        await upsertDuty({ user_id: userId, date: dateStr, status: nextStatus, month_key: monthKey });
      } else {
        await deleteDuty({ user_id: userId, date: dateStr });
      }
    } catch (err: any) {
      showAlert('Erro', 'Falha ao atualizar escala: ' + err.message);
    }
  };

  // ── Image export (full month) ──
  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      setIsGenerating(true);

      const el = exportRef.current;
      // Reveal the container so the browser lays out content
      el.style.height = 'auto';
      el.style.overflow = 'visible';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.zIndex = '99999';

      // Wait for browser to layout the content
      await new Promise(r => setTimeout(r, 600));

      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: '#0e0e12',
        pixelRatio: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      // Re-hide
      el.style.height = '0';
      el.style.overflow = 'hidden';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.style.zIndex = '-1';

      const link = document.createElement('a');
      link.download = `Escala_${monthKey}_BrigadeNoir.png`;
      link.href = dataUrl;
      link.click();
      showAlert('Sucesso', 'Escala completa exportada como imagem!');
    } catch (err: any) {
      console.error('Export error:', err);
      showAlert('Erro na Exportação', 'Não foi possível gerar a imagem.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Excel export ──
  const handleExportExcel = () => {
    try {
      const data = filteredUsers.map(u => {
        const row: any = { Colaborador: u.full_name, Cargo: u.role };
        days.forEach(({ day }) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const rec = schedule.find(s => s.user_id === u.id && s.date === dateStr);
          row[day] = rec ? STATUS_LABEL[rec.status].letter : '.';
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Escala');
      XLSX.writeFile(wb, `Escala_${monthKey}.xlsx`);
      showAlert('Sucesso', 'Planilha gerada!');
    } catch { showAlert('Erro', 'Falha ao gerar Excel.'); }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // ── Helper: get status for cell ──
  const getStatus = (userId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedule.find(s => s.user_id === userId && s.date === dateStr);
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

      {/* ── Controls ── */}
      <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-black text-on-surface tracking-tight uppercase min-w-[200px] text-center">
            {monthLabel}
          </h3>
          <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" size="sm" icon={<FileText size={16} />} onClick={handleExportExcel}
            className="bg-surface-container-high border border-outline-variant/10">
            Excel
          </Button>
          <Button variant="primary" size="sm"
            icon={isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleExport} disabled={isGenerating} className="shadow-lg shadow-primary/10">
            {isGenerating ? 'Gerando...' : 'Imagem'}
          </Button>
          {!isManagement && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
              <AlertCircle size={14} className="text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase">Somente Visualização</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-5 mb-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-black text-primary">T</div>
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Trabalho</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-[11px] font-black text-secondary">F</div>
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Folga</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-[11px] font-black text-amber-400">C</div>
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Compensa</span>
        </div>
        {isManagement && (
          <span className="text-[10px] font-medium text-on-surface-variant/60 italic ml-auto self-center">Clique na célula para alternar o status</span>
        )}
      </div>

      {/* ── Interactive Table ── */}
      <div className="bg-surface-container/60 rounded-2xl border border-outline-variant/20 overflow-x-auto shadow-xl">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-container-high px-4 py-3 text-left text-[11px] font-black text-on-surface uppercase tracking-wider border-b border-r border-outline-variant/15 min-w-[140px]">
                Colaborador
              </th>
              {days.map(({ day, weekday, isWeekend }) => (
                <th key={day} className={`px-0.5 py-2 text-center border-b border-outline-variant/15 min-w-[32px] ${isWeekend ? 'bg-error/5' : ''}`}>
                  <span className={`block text-[9px] font-bold uppercase ${isWeekend ? 'text-error/60' : 'text-on-surface-variant/50'}`}>{weekday}</span>
                  <span className={`block text-[12px] font-black ${isWeekend ? 'text-error/80' : 'text-on-surface'}`}>{day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={u.id} className={`group transition-colors hover:bg-primary/[0.03] ${idx % 2 === 0 ? '' : 'bg-surface-container-low/30'}`}>
                <td className="sticky left-0 z-10 bg-surface-container px-4 py-2.5 border-r border-outline-variant/15 group-hover:bg-primary/[0.03]">
                  <p className="text-[12px] font-black text-on-surface uppercase tracking-tight leading-tight truncate max-w-[130px]">{u.full_name}</p>
                  <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">{u.role}</p>
                </td>
                {days.map(({ day, isWeekend }) => {
                  const rec = getStatus(u.id, day);
                  return (
                    <td key={day} className={`px-0.5 py-1 text-center ${isWeekend ? 'bg-error/[0.03]' : ''}`}>
                      <button
                        disabled={!isManagement}
                        onClick={() => handleToggleDay(u.id, day)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${
                          rec?.status === 'folga'    ? 'bg-secondary/15 border border-secondary/30' :
                          rec?.status === 'compensa' ? 'bg-amber-400/15 border border-amber-400/30' :
                          rec?.status === 'trabalho' ? 'bg-primary/15 border border-primary/30' :
                          'hover:bg-surface-container-highest border border-transparent'
                        } ${!isManagement && 'cursor-default'}`}
                      >
                        {rec?.status === 'folga'    && <span className="text-[11px] font-black text-secondary">F</span>}
                        {rec?.status === 'compensa' && <span className="text-[11px] font-black text-amber-400">C</span>}
                        {rec?.status === 'trabalho' && <span className="text-[11px] font-black text-primary">T</span>}
                        {!rec && <div className="w-1 h-1 rounded-full bg-outline-variant/20" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Hidden Export Container (outside overflow parent, captures full month) ── */}
      <div
        ref={exportRef}
        style={{ position: 'absolute', left: '-9999px', top: '0', height: '0', overflow: 'hidden', zIndex: -1, fontFamily: 'Inter, sans-serif' }}
      >
        <div style={{ background: '#0e0e12', padding: '48px', width: `${Math.max(1400, days.length * 48 + 260)}px` }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(70,71,85,0.3)', paddingBottom: '32px', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#e5e4f6', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>Brigade Noir</h1>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#a6cce3', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '6px 0 0' }}>Escala Mensal</p>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#e5e4f6', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '16px 0 0' }}>{monthLabel}</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['trabalho', 'folga', 'compensa'] as DutyStatus[]).map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(36,37,50,0.6)', padding: '8px 14px', borderRadius: '12px', border: `1px solid ${STATUS_LABEL[s].border}` }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '6px', background: STATUS_LABEL[s].bg, border: `1px solid ${STATUS_LABEL[s].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: STATUS_LABEL[s].color }}>{STATUS_LABEL[s].letter}</div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#e5e4f6', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: '#a6cce3', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid rgba(70,71,85,0.3)', minWidth: '180px' }}>Colaborador</th>
                {days.map(({ day, weekday, isWeekend }) => (
                  <th key={day} style={{ padding: '6px 2px', textAlign: 'center', borderBottom: '1px solid rgba(70,71,85,0.3)', background: isWeekend ? 'rgba(238,125,119,0.05)' : 'transparent', minWidth: '36px' }}>
                    <span style={{ display: 'block', fontSize: '8px', fontWeight: 800, color: isWeekend ? 'rgba(238,125,119,0.6)' : 'rgba(170,169,187,0.5)', textTransform: 'uppercase' }}>{weekday}</span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 900, color: isWeekend ? 'rgba(238,125,119,0.8)' : '#e5e4f6' }}>{day}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => (
                <tr key={u.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(18,19,25,0.5)' }}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid rgba(70,71,85,0.1)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 900, color: '#e5e4f6', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>{u.full_name}</p>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#a6cce3', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '3px 0 0' }}>{u.role}</p>
                  </td>
                  {days.map(({ day, isWeekend }) => {
                    const rec = getStatus(u.id, day);
                    const st = rec ? STATUS_LABEL[rec.status] : null;
                    return (
                      <td key={day} style={{ padding: '3px', textAlign: 'center', borderBottom: '1px solid rgba(70,71,85,0.1)', background: isWeekend ? 'rgba(238,125,119,0.02)' : 'transparent' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                          background: st ? st.bg : 'rgba(36,37,50,0.3)',
                          border: st ? `1.5px solid ${st.border}` : '1px solid rgba(70,71,85,0.1)',
                        }}>
                          {st ? <span style={{ fontSize: '14px', fontWeight: 900, color: st.color }}>{st.letter}</span> : <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(70,71,85,0.3)' }} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(70,71,85,0.15)', textAlign: 'center' }}>
            <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(170,169,187,0.4)', letterSpacing: '0.5em', textTransform: 'uppercase', margin: 0 }}>Brigade Noir Intelligence Systems</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
