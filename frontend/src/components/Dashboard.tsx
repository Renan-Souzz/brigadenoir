import React, { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigation, TabId } from '../contexts/NavigationContext';
import { formatLocalDate, getCulinaryWeekRange } from '../lib/dateUtils';
import { calculateStationEfficiency } from '../lib/stats';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import { useProfiles } from '../hooks/useProfiles';
import { useTasks } from '../hooks/useTasks';
import { useInsumos } from '../hooks/useInsumos';
import { useDishes } from '../hooks/useDishes';
import { useSchedule } from '../hooks/useSchedule';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextEvent(schedule: any[], type: string, fromDate: Date) {
  const fromStr = formatLocalDate(fromDate);
  return schedule
    .filter(s => s.status === type && s.date > fromStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

function getNextSundayEvent(schedule: any[], fromDate: Date) {
  const fromStr = formatLocalDate(fromDate);
  return schedule
    .filter(s => {
      if (s.date <= fromStr) return false;
      const d = new Date(s.date + 'T12:00:00');
      return d.getDay() === 0 && (s.status === 'folga' || s.status === 'compensa');
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateBR(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EscalaHighlight({ schedule, onClick }: { schedule: any[]; onClick: () => void }) {
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const todayDuty = schedule.find(s => s.date === todayStr);
  const currentStatus = todayDuty?.status || 'trabalho';

  const nextFolga = getNextEvent(schedule, 'folga', today);
  const nextSundayOff = getNextSundayEvent(schedule, today);

  // Build current week (Mon-Sun)
  const weekStart = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(today.getDate() + diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dStr = formatLocalDate(d);
    const rec = schedule.find(s => s.date === dStr);
    return {
      date: dStr,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3).toUpperCase(),
      day: d.getDate(),
      status: rec?.status || null,
      isToday: dStr === todayStr,
    };
  });

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any; emoji: string }> = {
    trabalho: { label: 'Trabalho', color: 'text-primary', bg: 'bg-primary/10', icon: Icons.Briefcase, emoji: '🔥' },
    folga: { label: 'Folga', color: 'text-secondary', bg: 'bg-secondary/10', icon: Icons.Palmtree, emoji: '🌴' },
    compensa: { label: 'Compensa', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Icons.Coins, emoji: '💰' },
  };
  const cfg = statusConfig[currentStatus];
  const StatusIcon = cfg.icon;

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 rounded-[2rem] p-6 md:p-8 cursor-pointer group hover:border-primary/20 transition-all duration-500"
    >
      {/* Background glow */}
      <div className={`absolute -top-16 -right-16 w-48 h-48 blur-[100px] rounded-full opacity-15 transition-all duration-700 group-hover:opacity-25 ${cfg.color.replace('text-', 'bg-')}`} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${cfg.bg} ${cfg.color.replace('text-', 'border-')}/20`}>
              <StatusIcon size={22} className={cfg.color} />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em]">Minha Escala</p>
              <p className="text-[9px] text-outline-variant/60 uppercase tracking-widest mt-0.5">
                {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <Icons.ChevronRight size={18} className="text-outline-variant/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>

        {/* Today status */}
        <div className="mb-6">
          <h3 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${cfg.color}`}>
            {cfg.label} {cfg.emoji}
          </h3>
        </div>

        {/* Next events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-container/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Palmtree size={14} className="text-secondary" />
              <span className="text-[9px] font-black text-outline-variant uppercase tracking-widest">Próxima Folga</span>
            </div>
            {nextFolga ? (
              <div>
                <p className="text-sm font-black text-on-surface uppercase tracking-tight">{formatDateBR(nextFolga.date)}</p>
                <p className="text-[10px] text-secondary font-bold mt-0.5">em {daysUntil(nextFolga.date)} dia{daysUntil(nextFolga.date) !== 1 ? 's' : ''}</p>
              </div>
            ) : (
              <p className="text-[10px] text-outline-variant italic">Sem folga programada</p>
            )}
          </div>
          <div className="bg-surface-container/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Calendar size={14} className="text-amber-400" />
              <span className="text-[9px] font-black text-outline-variant uppercase tracking-widest">Próx. Domingo Off</span>
            </div>
            {nextSundayOff ? (
              <div>
                <p className="text-sm font-black text-on-surface uppercase tracking-tight">{formatDateBR(nextSundayOff.date)}</p>
                <p className={`text-[10px] font-bold mt-0.5 ${nextSundayOff.status === 'folga' ? 'text-secondary' : 'text-amber-400'}`}>
                  {nextSundayOff.status === 'folga' ? 'Folga' : 'Compensa'} — em {daysUntil(nextSundayOff.date)} dias
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-outline-variant italic">Sem domingo off programado</p>
            )}
          </div>
        </div>

        {/* Mini week calendar */}
        <div className="flex gap-1.5 md:gap-2">
          {weekDays.map(wd => {
            const cellColor = wd.status === 'folga' ? 'bg-secondary/20 border-secondary/30 text-secondary'
              : wd.status === 'compensa' ? 'bg-amber-400/20 border-amber-400/30 text-amber-400'
              : wd.status === 'trabalho' ? 'bg-primary/20 border-primary/30 text-primary'
              : 'bg-surface-container-highest/30 border-outline-variant/10 text-outline-variant/40';
            return (
              <div key={wd.date} className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${cellColor} ${wd.isToday ? 'ring-2 ring-primary/50 scale-105' : ''}`}>
                <span className="text-[7px] font-black uppercase tracking-widest">{wd.label}</span>
                <span className="text-xs font-black">{wd.day}</span>
                <span className="text-[8px] font-black uppercase">
                  {wd.status === 'folga' ? 'F' : wd.status === 'compensa' ? 'C' : wd.status === 'trabalho' ? 'T' : '·'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamFolgasCard({ profiles, schedule }: { profiles: any[]; schedule: any[] }) {
  const today = new Date();
  const todayStr = formatLocalDate(today);

  const membersInfo = profiles.map(p => {
    const userSchedule = schedule.filter(s => s.user_id === p.id);
    const todayDuty = userSchedule.find(s => s.date === todayStr);
    const nextFolga = getNextEvent(userSchedule, 'folga', today);
    return {
      id: p.id,
      name: p.full_name,
      role: p.role,
      todayStatus: todayDuty?.status || 'trabalho',
      nextFolgaDate: nextFolga?.date || null,
      nextFolgaDays: nextFolga ? daysUntil(nextFolga.date) : null,
    };
  }).sort((a, b) => (a.nextFolgaDays ?? 999) - (b.nextFolgaDays ?? 999));

  return (
    <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 rounded-[2rem] p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-secondary/10 border border-secondary/20">
          <Icons.Users size={18} className="text-secondary" />
        </div>
        <div>
          <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">Folgas da Equipe</h4>
          <p className="text-[9px] text-outline-variant font-bold uppercase tracking-widest mt-0.5">Próximas folgas programadas</p>
        </div>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
        {membersInfo.map(m => (
          <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-container/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${m.todayStatus === 'folga' ? 'bg-secondary shadow-[0_0_8px_rgba(var(--md-sys-color-secondary-rgb),0.4)]' : m.todayStatus === 'compensa' ? 'bg-amber-400' : 'bg-primary/40'}`} />
              <div>
                <span className="text-[11px] font-black text-on-surface uppercase tracking-tight">{m.name}</span>
                <span className="text-[8px] text-outline-variant font-bold uppercase tracking-widest ml-2">{m.role}</span>
              </div>
            </div>
            <div className="text-right">
              {m.todayStatus === 'folga' ? (
                <span className="text-[9px] font-black text-secondary uppercase tracking-tight">Folga Hoje 🌴</span>
              ) : m.nextFolgaDate ? (
                <div>
                  <span className="text-[9px] font-black text-on-surface uppercase">{formatDateBR(m.nextFolgaDate)}</span>
                  <span className="text-[8px] text-outline-variant font-bold ml-1.5">({m.nextFolgaDays}d)</span>
                </div>
              ) : (
                <span className="text-[9px] text-outline-variant italic">Sem folga</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLinks({ setActiveTab, pendingTasks, alertCount }: { setActiveTab: (t: TabId) => void; pendingTasks: number; alertCount: number }) {
  const links = [
    { tab: 'checklist' as TabId, icon: Icons.ClipboardCheck, label: 'Checklist', detail: `${pendingTasks} pendente${pendingTasks !== 1 ? 's' : ''}`, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { tab: 'escala' as TabId, icon: Icons.Calendar, label: 'Escala Completa', detail: 'Ver calendário', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { tab: 'insumos' as TabId, icon: Icons.Package, label: 'Insumos', detail: `${alertCount} alerta${alertCount !== 1 ? 's' : ''}`, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {links.map(l => {
        const Icon = l.icon;
        return (
          <button key={l.tab} onClick={() => setActiveTab(l.tab)} className={`${l.bg} border ${l.border} rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all duration-300 group`}>
            <Icon size={20} className={`${l.color} group-hover:scale-110 transition-transform`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${l.color}`}>{l.label}</span>
            <span className="text-[8px] text-outline-variant font-bold uppercase">{l.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

function AlertCard({ icon, title, desc, footer, borderColor, onClick }: any) {
  const isCritical = borderColor?.includes('error');
  const isWarning = borderColor?.includes('secondary');
  return (
    <div onClick={onClick} className={`bg-surface-container rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.15)] hover:-translate-y-0.5 active:scale-[0.98] group relative ${isCritical ? 'border-red-500/30' : isWarning ? 'border-yellow-500/20' : 'border-outline-variant/10'}`}>
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isCritical ? 'bg-red-500/80 text-white animate-pulse' : isWarning ? 'bg-yellow-500/80 text-white' : 'bg-primary/20 text-primary'}`}>{footer}</div>
      <div className="p-5 pt-10 flex items-start gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${isCritical ? 'bg-red-500/10 border-red-500/20' : isWarning ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-primary/10 border-primary/20'}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">{title}</p>
          <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">{desc}</p>
        </div>
        <Icons.ChevronRight size={16} className="text-outline-variant/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile, isManagement } = useAuth();
  const { notifications } = useNotifications();
  const { setActiveTab } = useNavigation();

  const firstName = profile?.full_name?.split(' ')[0] || 'Chef';

  // Schedule (current + next month for "next folga" lookups)
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  const { schedule: currentSchedule } = useSchedule(monthKey);
  const { schedule: nextSchedule } = useSchedule(nextMonthKey);
  const allSchedule = useMemo(() => [...currentSchedule, ...nextSchedule], [currentSchedule, nextSchedule]);

  const mySchedule = useMemo(() => allSchedule.filter(s => s.user_id === profile?.id), [allSchedule, profile?.id]);

  // Data for alerts
  const { data: profiles = [] } = useProfiles();
  const monthStartStr = useMemo(() => { const d = new Date(); return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1)); }, []);
  const { tasks = [] } = useTasks();
  const { insumos = [] } = useInsumos();
  const { data: dishes = [] } = useDishes();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom Dia';
    if (h >= 12 && h < 18) return 'Boa Tarde';
    return 'Boa Noite';
  }, []);

  // Alerts (kept from original)
  const alerts = useMemo(() => {
    const todayDate = new Date();
    const alertInsumos = isManagement ? insumos : insumos.filter(i => i.station === profile?.station);
    const alertTasks = isManagement ? tasks.filter(t => !t.is_completed) : tasks.filter(t => !t.is_completed && t.station === profile?.station);
    const alertDishes = dishes.filter(d => d.porcoes < 2);
    const result: any[] = [];
    const twoDays = new Date(); twoDays.setDate(todayDate.getDate() + 2);

    alertDishes.forEach(d => {
      const isZero = d.porcoes <= 0;
      result.push({ id: `dish-${d.id}`, type: isZero ? 'error' : 'warning', title: isZero ? 'PRATO ESGOTADO (86)' : 'ESTOQUE CRÍTICO', desc: `${d.title}: ${isZero ? 'Acabou' : 'Restam ' + d.porcoes} unidades.`, footer: (d.praca_responsavel || 'Cozinha').toUpperCase(), borderColor: isZero ? 'border-error' : 'border-secondary', tab: 'menu' });
    });
    alertInsumos.forEach(i => {
      if (i.expiry_date && new Date(i.expiry_date) <= todayDate) result.push({ id: `exp-${i.id}`, type: 'error', title: `Expirado: ${i.name}`, desc: 'Item venceu. Descarte imediato.', footer: 'ESTOQUE CRÍTICO', borderColor: 'border-error', tab: 'insumos' });
      else if (i.expiry_date && new Date(i.expiry_date) <= twoDays) result.push({ id: `exp-soon-${i.id}`, type: 'warning', title: `Vencimento Próximo: ${i.name}`, desc: 'Vence em < 48h.', footer: 'VALIDADE', borderColor: 'border-secondary', tab: 'insumos' });
      else if (i.quantity <= 2) result.push({ id: `qty-${i.id}`, type: i.quantity <= 0 ? 'error' : 'warning', title: `${i.quantity <= 0 ? 'Zerado' : 'Baixo'}: ${i.name}`, desc: `Restam ${i.quantity} ${i.unit}.`, footer: 'ESTOQUE', borderColor: i.quantity <= 0 ? 'border-error' : 'border-primary', tab: 'insumos' });
    });
    alertTasks.forEach(t => {
      const age = (todayDate.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      if (t.priority === 'high' || age > 24) result.push({ id: `task-${t.id}`, type: 'warning', title: 'Tarefa Atrasada', desc: `${t.title}. Praça: ${t.station}.`, footer: t.station.toUpperCase(), borderColor: 'border-secondary', tab: 'checklist' });
    });
    return result;
  }, [insumos, tasks, dishes, isManagement, profile]);

  const pendingTasks = useMemo(() => {
    const t = isManagement ? tasks.filter(t => !t.is_completed) : tasks.filter(t => !t.is_completed && t.station === profile?.station);
    return t.length;
  }, [tasks, isManagement, profile]);

  // Team online card
  const teamOnline = useMemo(() => {
    return profiles.map(m => {
      const lastSeen = m.last_seen ? new Date(m.last_seen).getTime() : 0;
      const isOnline = (Date.now() - lastSeen) < (3 * 60 * 1000);
      return { ...m, isOnline };
    });
  }, [profiles]);

  return (
    <PageLayout>
      <PageHeader hasNotification />

      <div className="space-y-6 mt-6 animate-in fade-in duration-500">
        {/* Greeting */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-outline-variant font-black mb-1">{greeting}, {firstName}</p>
          <h3 className="text-2xl md:text-3xl font-black text-on-surface tracking-tighter uppercase leading-tight">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* Escala Highlight - MAIN CARD */}
        <EscalaHighlight schedule={mySchedule} onClick={() => setActiveTab('escala')} />

        {/* Quick Links */}
        <QuickLinks setActiveTab={setActiveTab} pendingTasks={pendingTasks} alertCount={alerts.length} />

        {/* Management: Team Folgas */}
        {isManagement && <TeamFolgasCard profiles={profiles} schedule={allSchedule} />}

        {/* Team Online (compact) */}
        <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Wifi size={14} className="text-primary" />
            <span className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em]">Equipe Online</span>
            <span className="text-[9px] text-primary font-black ml-auto">{teamOnline.filter(t => t.isOnline).length}/{teamOnline.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamOnline.map(m => (
              <div key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${m.isOnline ? 'bg-primary/5 border-primary/20' : 'bg-surface-container border-outline-variant/5 opacity-50'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${m.isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-red-500/40'}`} />
                <span className="text-[10px] font-black text-on-surface uppercase tracking-tight">{m.full_name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-error rounded-full" />
                <h4 className="text-lg font-black text-on-surface uppercase tracking-tight">Alertas</h4>
              </div>
              <span className="px-3 py-1 bg-surface-container rounded-xl text-[10px] font-black text-on-surface-variant uppercase tracking-widest border border-outline-variant/10">{alerts.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map(a => (
                <AlertCard key={a.id} icon={a.type === 'error' ? <Icons.AlertTriangle size={20} className="text-error" /> : <Icons.Clock size={20} className="text-secondary" />} title={a.title} desc={a.desc} footer={a.footer} borderColor={a.borderColor} onClick={() => a.tab && setActiveTab(a.tab)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
