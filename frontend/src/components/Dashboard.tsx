import React, { useMemo, useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import { 
  AlertTriangle, 
  Clock, 
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigation, TabId } from '../contexts/NavigationContext';
import { calculateStationEfficiency } from '../lib/stats';
import { formatLocalDate, getCulinaryWeekRange } from '../lib/dateUtils';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import StatCard from './shared/StatCard';

// Hooks
import { useProfiles } from '../hooks/useProfiles';
import { useTasks } from '../hooks/useTasks';
import { useInsumos } from '../hooks/useInsumos';
import { useDishes } from '../hooks/useDishes';
import { usePax } from '../hooks/usePax';
import { useSchedule } from '../hooks/useSchedule';
import DashboardEscalaCard from './DashboardEscalaCard';

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertCard({ icon, title, desc, footer, borderColor, onClick }: any) {
  const isCritical = borderColor?.includes('error');
  const isWarning = borderColor?.includes('secondary');

  return (
    <div 
      onClick={onClick}
      className={`bg-surface-container rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.15)] hover:-translate-y-0.5 active:scale-[0.98] group relative ${
        isCritical ? 'border-red-500/30 shadow-[0_0_20px_-8px_rgba(239,68,68,0.15)]' : isWarning ? 'border-yellow-500/20' : 'border-outline-variant/10'
      }`}
    >
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
        isCritical ? 'bg-red-500/80 text-white animate-pulse' : isWarning ? 'bg-yellow-500/80 text-white' : 'bg-primary/20 text-primary'
      }`}>
        {footer}
      </div>

      <div className="p-5 pt-10 flex items-start gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
          isCritical ? 'bg-red-500/10 border-red-500/20' : isWarning ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-primary/10 border-primary/20'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">{title}</p>
          <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">{desc}</p>
        </div>
        <Icons.ChevronRight size={16} className="text-outline-variant/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </div>
  );
}

function GrowthChart({ data }: { data: any[] }) {
  if (data.length < 2) return null;

  const width = 1000;
  const height = 160;
  const padding = 20;
  
  const maxPax = Math.max(...data.map(d => Math.max(d.lunch, d.dinner)), 20) + 10;
  
  const getX = (index: number) => (index / (data.length - 1)) * (width - 2 * padding) + padding;
  const getY = (value: number) => height - ((value / maxPax) * (height - 2 * padding) + padding);

  const createPath = (points: {x: number, y: number}[]) => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i+1].x) / 2;
        const yc = (points[i].y + points[i+1].y) / 2;
        path += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${points[points.length-1].x} ${points[points.length-1].y}`;
    return path;
  };

  const lunchCoords = data.map((d, i) => ({ x: getX(i), y: getY(d.lunch) }));
  const dinnerCoords = data.map((d, i) => ({ x: getX(i), y: getY(d.dinner) }));

  return (
    <div className="w-full mt-6">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible group">
        <defs>
          <linearGradient id="gradLunch" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradDinner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="currentColor" strokeOpacity="0.05" />
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="currentColor" strokeOpacity="0.05" />
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="currentColor" strokeOpacity="0.1" />

        <path 
          d={`${createPath(lunchCoords)} L ${getX(data.length-1)} ${height-padding} L ${padding} ${height-padding} Z`} 
          fill="url(#gradLunch)" 
        />
        <path 
          d={`${createPath(dinnerCoords)} L ${getX(data.length-1)} ${height-padding} L ${padding} ${height-padding} Z`} 
          fill="url(#gradDinner)" 
        />
        
        <path d={createPath(lunchCoords)} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" className="drop-shadow-lg" />
        <path d={createPath(dinnerCoords)} fill="none" stroke="#eab308" strokeWidth="4" strokeLinecap="round" className="drop-shadow-lg" />

        {data.map((d, i) => (
          <g key={i} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <circle cx={getX(i)} cy={getY(d.lunch)} r="4" fill="#3b82f6" />
             <circle cx={getX(i)} cy={getY(d.dinner)} r="4" fill="#eab308" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-4 px-2">
        <span className="text-[8px] font-black text-outline-variant uppercase tracking-widest">{data[0].dateLabel}</span>
        <span className="text-[8px] font-black text-outline-variant uppercase tracking-widest">{data[Math.floor(data.length/2)].dateLabel}</span>
        <span className="text-[8px] font-black text-outline-variant uppercase tracking-widest">{data[data.length-1].dateLabel}</span>
      </div>
    </div>
  );
}

function StationDonutChart({ station, data }: { station: string, data: any }) {
  const size = 120;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const donePct = data.total > 0 ? (data.done / data.total) : 0;
  const latePct = data.total > 0 ? (data.late / data.total) : 0;
  const expiredPct = data.total > 0 ? (data.expired / data.total) : 0;

  const doneOffset = circumference * (1 - donePct);
  const lateOffset = circumference * (1 - (donePct + latePct));
  const expiredOffset = circumference * (1 - (donePct + latePct + expiredPct));

  return (
    <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex flex-col items-center">
      <div className="relative w-[120px] h-[120px] mb-4">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} className="text-surface-container-highest" />
          {expiredPct > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="var(--md-sys-color-error)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={expiredOffset} strokeLinecap="round" />}
          {latePct > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#EAB308" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={lateOffset} strokeLinecap="round" />}
          {donePct > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="var(--md-sys-color-primary)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={doneOffset} strokeLinecap="round" />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-on-surface leading-none">{Math.round(donePct * 100)}%</span>
          <span className="text-[8px] font-bold text-on-surface-variant uppercase mt-1">Conformidade</span>
        </div>
      </div>
      <h4 className="text-xs font-black text-on-surface uppercase tracking-widest mb-4">{station.replace('_', ' ')}</h4>
      <div className="w-full space-y-2">
        <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-on-surface-variant font-medium">Feitos</span></div><span className="font-black text-on-surface">{data.done}</span></div>
        <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-on-surface-variant font-medium">Atrasados</span></div><span className="font-black text-on-surface">{data.late}</span></div>
        <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-error" /><span className="text-on-surface-variant font-medium">Expirados</span></div><span className="font-black text-on-surface">{data.expired}</span></div>
      </div>
    </div>
  );
}

const STATION_LABELS: Record<string, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  entremetier: 'Entremetier',
  rotisseur: 'Rôtisseur',
  poissonier: 'Poissonnier',
  patissier: 'Pâtissier',
  almoxarifado: 'Almoxarifado'
};

function StationBentoStats({ stats, members = [] }: { stats: any, members?: any[] }) {
  const { isManagement } = useAuth();
  const now = new Date();
  const currentHour = now.getHours();
  const isMorningActive = currentHour >= 5 && currentHour < 15;
  const isAfternoonActive = currentHour >= 15 || currentHour < 24;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-surface-container-low/40 backdrop-blur-xl p-8 rounded-[2rem] border border-outline-variant/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-700"></div>
        <div className="flex flex-col h-full justify-between relative z-10">
          <div><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500"><Icons.Zap size={24} className="text-primary group-hover:animate-pulse" /></div><p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em]">Saúde da Praça</p></div><h4 className="text-sm font-black text-on-surface uppercase tracking-tighter mb-1">Índice de Prontidão</h4><p className="text-[9px] text-outline-variant font-medium uppercase tracking-widest italic opacity-60">Performance Geral</p></div>
          <div className="mt-8 flex items-baseline gap-2"><span className={`text-7xl font-black tracking-tighter ${stats.efficiency >= 80 ? 'text-primary' : stats.efficiency >= 50 ? 'text-secondary' : 'text-error'} group-hover:scale-[1.05] transition-transform duration-500 origin-left`}>{stats.efficiency}</span><span className="text-2xl font-black text-outline-variant/40">%</span></div>
        </div>
      </div>
      <div className="md:col-span-1 bg-surface-container-low/40 backdrop-blur-xl p-8 rounded-[2rem] border border-outline-variant/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-secondary/20 transition-all duration-700"></div>
        <div className="flex flex-col h-full justify-between relative z-10">
          <div><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20 shadow-inner group-hover:scale-110 transition-transform duration-500"><Icons.ClipboardCheck size={24} className="text-secondary" /></div><p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em]">Checklist</p></div><h4 className="text-sm font-black text-on-surface uppercase tracking-tighter mb-1">Mise en Place</h4><p className="text-[9px] text-outline-variant font-medium uppercase tracking-widest italic opacity-60">Tareas pendentes hoje</p></div>
          <div className="mt-8"><div className="flex items-baseline gap-2 mb-4"><span className={`text-7xl font-black tracking-tighter ${stats.pending > 0 ? 'text-on-surface' : 'text-primary/40'}`}>{stats.pending}</span><span className="text-2xl font-black text-outline-variant/40">Itens</span></div><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${stats.pending > 0 ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>{stats.pending > 0 ? 'Aguardando Execução' : 'Finalizado'}</span></div></div>
        </div>
      </div>
      <div className="md:col-span-1 bg-surface-container-low/40 backdrop-blur-xl p-8 rounded-[2rem] border border-outline-variant/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-error/20 transition-all duration-700"></div>
        <div className="flex flex-col h-full justify-between relative z-10">
          <div><div className="flex items-center gap-3 mb-6"><div className={`p-3 rounded-2xl border shadow-inner group-hover:scale-110 transition-transform duration-500 ${!isManagement ? (stats.expiredInsumosCount > 0 ? 'bg-error/20 border-error/30 animate-pulse' : 'bg-primary/10 border-primary/20') : 'bg-secondary/10 border-secondary/20'}`}>{!isManagement ? (<Icons.ShieldCheck size={24} className={stats.expiredInsumosCount > 0 ? 'text-error' : 'text-primary'} />) : (<Icons.Users size={24} className="text-secondary" />)}</div><p className="text-[10px] font-black text-outline-variant uppercase tracking-[0.2em]">{!isManagement ? 'Riscos de Insumos' : 'Brigada Local'}</p></div><h4 className="text-sm font-black text-on-surface uppercase tracking-tighter mb-1">{!isManagement ? 'Visualização Rápida' : 'Membros da Praça'}</h4></div>
          <div className="mt-8 flex-1 overflow-y-auto max-h-[120px] scrollbar-hide">
            {isManagement ? (
              <div className="space-y-3">{members.length > 0 ? members.map((m: any) => {
                const isActive = (m.shift === 'manha' && isMorningActive) || (m.shift === 'tarde' && isAfternoonActive);
                return (<div key={m.id} className="flex items-center justify-between group/member"><div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary shadow-[0_0_8px_#a6cce3]' : 'bg-outline-variant/30'}`} /><span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-on-surface' : 'text-outline-variant'}`}>{m.full_name}</span></div><span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${isActive ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-surface-container-highest text-outline-variant border border-transparent opacity-40'}`}>{isActive ? 'ATIVO' : m.shift}</span></div>);
              }) : <p className="text-[10px] text-outline-variant italic">Nenhum responsável alocado</p>}</div>
            ) : (
              <div className="space-y-2">
                {stats.expiredInsumosCount > 0 && <div className="flex items-center gap-2 text-error"><div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" /><span className="text-[10px] font-black uppercase tracking-tighter">{stats.expiredInsumosCount} Itens Vencidos</span></div>}
                {stats.hasExpiringSoon && <div className="flex items-center gap-2 text-secondary"><div className="w-1.5 h-1.5 rounded-full bg-secondary" /><span className="text-[10px] font-black uppercase tracking-tighter">Validades Próximas</span></div>}
                {stats.hasLowStock && <div className="flex items-center gap-2 text-primary"><div className="w-1.5 h-1.5 rounded-full bg-primary/50" /><span className="text-[10px] font-black uppercase tracking-tighter">Estoque Baixo / Zerado</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function Dashboard() {
  const { profile, isManagement } = useAuth();
  const { notifications } = useNotifications();
  const { setActiveTab, setSearchFilter } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const { showAlert } = useModal();

  // User Identification (Must be early for scope)
  const firstName = profile?.full_name?.split(' ')[0] || 'Chef';
  const stationName = profile?.station ? profile.station.charAt(0).toUpperCase() + profile.station.slice(1) : 'Geral';

  // Schedule Logic
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const { schedule: globalSchedule } = useSchedule(monthKey);
  
  // Filter only current user's schedule for the widget
  const mySchedule = useMemo(() => {
    return globalSchedule.filter(s => s.user_id === profile?.id);
  }, [globalSchedule, profile?.id]);

  // Notifications Logic (tomorrow's off day + month ending)
  useEffect(() => {
    if (!profile) return;

    const checkNotifications = async () => {
      // Safety check for Notification API
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      // 1. Request Permission if not determined
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // 2. Tomorrow's Off-Day Notification
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const tomorrowDuty = mySchedule.find(s => s.date === tomorrowStr);

      if (tomorrowDuty?.status === 'folga' && Notification.permission === 'granted') {
        const lastNotified = localStorage.getItem(`notified_off_${tomorrowStr}`);
        if (lastNotified !== 'true') {
          new Notification('Brigade Noir: Lembrete de Folga', {
            body: `Chef ${firstName}, amanhã é seu dia de descanso! Aproveite para recarregar as energias. 🌴`,
            icon: '/favicon.ico'
          });
          localStorage.setItem(`notified_off_${tomorrowStr}`, 'true');
        }
      }

      // 3. Month Ending Alert for Leadership
      if (isManagement && today.getDate() >= 27) {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        // Check if next month's schedule has any data
        const { data: nextData } = await supabase.from('duty_roster').select('id').eq('month_key', nextMonthKey).limit(1);
        
        if (!nextData || nextData.length === 0) {
          const lastNotifiedEnd = localStorage.getItem(`notified_end_${nextMonthKey}`);
          if (lastNotifiedEnd !== 'true') {
             // System notification
             if (Notification.permission === 'granted') {
              new Notification('Alerta de Escala', {
                body: `Atenção Liderança: A escala de ${nextMonth.toLocaleDateString('pt-BR', { month: 'long' })} precisa ser criada em no máximo 3 dias!`,
              });
             }
             showAlert('Aviso de Gestão', `Faltam poucos dias para o fim do mês e a escala de ${nextMonth.toLocaleDateString('pt-BR', { month: 'long' })} ainda não foi iniciada.`);
             localStorage.setItem(`notified_end_${nextMonthKey}`, 'true');
          }
        }
      }
    };

    checkNotifications();
  }, [mySchedule, isManagement, profile, firstName]);

  // 1. Fetching Data with TanStack Query
  const { data: profiles = [] } = useProfiles();
  const monthStartStr = useMemo(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const { data: paxData = [] } = usePax(monthStartStr);
  const { tasks = [] } = useTasks();
  const { insumos = [] } = useInsumos();
  const { data: dishes = [] } = useDishes();

  // 2. Computed Values (Derived Stats)
  const stats = useMemo(() => {
    const today = new Date();
    const { start: weekStart } = getCulinaryWeekRange();
    const weekStartStr = formatLocalDate(weekStart);
    
    // Week PAX
    const weekPaxTotal = paxData
      .filter(p => p.date >= weekStartStr)
      .reduce((acc, p) => acc + p.lunch_pax + p.dinner_pax, 0);

    // Month PAX
    const monthPaxTotal = paxData.reduce((acc, p) => acc + p.lunch_pax + p.dinner_pax, 0);

    // Weekly Timeline
    const history = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d > today) break;
      const dStr = formatLocalDate(d);
      const dayData = paxData.find(p => p.date === dStr);
      history.push({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: (dayData?.lunch_pax || 0) + (dayData?.dinner_pax || 0),
        lunch: dayData?.lunch_pax || 0,
        dinner: dayData?.dinner_pax || 0,
        dateLabel: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      });
    }

    // Monthly Curve
    const monthlyHistory = [];
    const daysInMonthLimit = today.getDate();
    for (let i = 1; i <= daysInMonthLimit; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), i);
        const dStr = formatLocalDate(d);
        const dayData = paxData.find(p => p.date === dStr);
        monthlyHistory.push({
          dateLabel: `${i}/${today.getMonth() + 1}`,
          lunch: dayData?.lunch_pax || 0,
          dinner: dayData?.dinner_pax || 0
        });
    }

    // Efficiency and Station Stats
    const stationNames = ['saucier', 'garde_manger', 'entremetier', 'rotisseur', 'poissonier', 'patissier', 'almoxarifado'];
    const perStation = stationNames.map(s => {
      const stationTasks = tasks.filter(t => t.station === s);
      const stationInsumos = insumos.filter(i => i.station === s);
      const result = calculateStationEfficiency(stationInsumos, stationTasks);
      return {
        id: s,
        name: s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '),
        efficiency: result.score,
        pending: result.pendingCount,
        hasLowStock: result.hasLowStock,
        hasExpiringSoon: result.hasExpiringSoon,
        expiredInsumosCount: result.expiredInsumosCount
      };
    });

    // Alert Logic
    const alertInsumos = isManagement ? insumos : insumos.filter(i => i.station === profile?.station);
    const alertTasks = isManagement ? tasks.filter(t => !t.is_completed) : tasks.filter(t => !t.is_completed && t.station === profile?.station);
    const alertDishes = dishes.filter(d => d.porcoes < 2);
    
    const alerts: any[] = [];
    const twoDaysSoon = new Date();
    twoDaysSoon.setDate(today.getDate() + 2);

    // Process Dish Alerts (86)
    alertDishes.forEach(d => {
      const isZero = d.porcoes <= 0;
      alerts.push({
        id: `dish-${d.id}`,
        type: isZero ? 'error' : 'warning',
        title: isZero ? `PRATO ESGOTADO (86)` : `ESTOQUE CRÍTICO`,
        desc: `${d.title}: ${isZero ? 'Acabou' : 'Restam ' + d.porcoes} unidades.`,
        footer: (d.praca_responsavel || 'Cozinha').toUpperCase(),
        borderColor: isZero ? 'border-error' : 'border-secondary',
        tab: 'menu',
        icon: <Icons.AlertCircle size={20} className={isZero ? 'text-error' : 'text-secondary'} />
      });
    });

    alertInsumos.forEach(i => {
      if (i.expiry_date && new Date(i.expiry_date) <= today) alerts.push({ id: `exp-${i.id}`, type: 'error', title: `Expirado: ${i.name}`, desc: `Item venceu. Descarte imediato.`, footer: 'ESTOQUE CRÍTICO', borderColor: 'border-error', tab: 'insumos' });
      else if (i.expiry_date && new Date(i.expiry_date) <= twoDaysSoon) alerts.push({ id: `exp-soon-${i.id}`, type: 'warning', title: `Vencimento Próximo: ${i.name}`, desc: `Vence em < 48h.`, footer: 'VALIDADE', borderColor: 'border-secondary', tab: 'insumos' });
      else if (i.quantity <= 2) alerts.push({ id: `qty-${i.id}`, type: i.quantity <= 0 ? 'error' : 'warning', title: `${i.quantity <= 0 ? 'Zerado' : 'Baixo'}: ${i.name}`, desc: `Restam ${i.quantity} ${i.unit}.`, footer: 'ESTOQUE', borderColor: i.quantity <= 0 ? 'border-error' : 'border-primary', tab: 'insumos' });
    });

    alertTasks.forEach(t => {
      const taskAge = (today.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      if (t.priority === 'high' || taskAge > 24) alerts.push({ id: `task-${t.id}`, type: 'warning', title: `Tarefa Atrasada`, desc: `${t.title}. Praça: ${t.station}.`, footer: t.station.toUpperCase(), borderColor: 'border-secondary', tab: 'checklist' });
    });

    return {
      weekPax: weekPaxTotal,
      monthPax: monthPaxTotal,
      weekPaxHistory: history,
      monthPaxHistory: monthlyHistory,
      stationStats: perStation,
      alerts
    };
  }, [paxData, tasks, insumos, dishes, isManagement, profile]);

  // Handle formatting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom Dia';
    if (hour >= 12 && hour < 18) return 'Boa Tarde';
    return 'Boa Noite';
  }, []);

  const unreadNotifications = notifications.filter(n => !n.is_read).map(n => ({
    id: n.id,
    icon: n.type === 'error' ? <Icons.AlertTriangle className="text-error" /> : n.type === 'warning' ? <Icons.Clock className="text-secondary" /> : <Icons.Package className="text-primary" />,
    title: n.title,
    desc: n.message,
    footer: n.station ? `PRAÇA: ${n.station.toUpperCase()}` : 'SISTEMA',
    borderColor: n.type === 'error' ? 'border-error' : n.type === 'warning' ? 'border-secondary' : 'border-primary',
    tab: n.title.includes('86') ? 'menu' : (n.station === 'almoxarifado' ? 'almoxarifado' : 'insumos')
  }));


  const displayAlerts = [
    ...stats.alerts, 
    ...unreadNotifications.filter(n => {
      // If notification is about an insumo, ensure it still exists
      if (n.title.includes(':')) {
        const itemName = n.title.split(': ')[1];
        if (itemName && (n.title.includes('Estoque') || n.title.includes('Validade') || n.title.includes('Risco'))) {
          return insumos.some(i => i.name === itemName);
        }
      }
      return true;
    })
  ];
  const filteredAlerts = displayAlerts.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader showSearch onSearchChange={setSearchTerm} searchPlaceholder="Buscar pedidos, alertas, estações..." hasNotification />

      <div className="space-y-10 mt-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-0">
              <p className="text-[10px] uppercase tracking-[0.4em] text-outline-variant font-black mb-2">{greeting}, {firstName}</p>
              <h3 className="text-3xl md:text-5xl font-black text-on-surface tracking-tighter uppercase leading-[0.85]">
                {isManagement ? 'Bem-vindo' : 'Bom Serviço na'} <br/> 
                <span className="text-secondary opacity-90 italic text-2xl md:text-4xl block mt-1">
                  {isManagement ? `Chefe ${firstName}` : `Praça ${stationName}`}
                </span>
              </h3>
            </div>
            
            <div onClick={() => setActiveTab('brigada')} className="group cursor-pointer">
              <div className={`relative overflow-hidden bg-surface-container-low/60 backdrop-blur-xl border border-outline-variant/10 shadow-lg p-6 rounded-3xl flex flex-col justify-center hover:scale-[1.02] hover:bg-surface-container-highest/20 transition-all duration-500`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Icons.ShieldCheck size={20} className="text-primary opacity-80" />
                    <span className="text-[10px] font-black text-on-surface-variant/60 tracking-[0.2em] uppercase truncate">{isManagement ? 'Supervisão de Turno' : 'Equipe na Praça'}</span>
                  </div>
                  <Icons.ArrowUpRight size={14} className="text-outline-variant/30 group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {profiles.map(member => {
                      const lastSeen = member.last_seen ? new Date(member.last_seen).getTime() : 0;
                      const isOnline = (Date.now() - lastSeen) < (3 * 60 * 1000); // Online if active in last 3 min
                      const mStation = member.station ? member.station.charAt(0).toUpperCase() + member.station.slice(1).replace('_', ' ') : 'N/A';
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between group/item py-1">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500/40'}`} />
                              {isOnline && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping opacity-20" />}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-on-surface group-hover/item:text-primary transition-colors">{member.full_name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-outline-variant/40 group-hover/item:text-outline-variant transition-colors">{mStation}</span>
                            <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-solid ${isOnline ? 'border-primary/20 text-primary bg-primary/5' : 'border-outline-variant/10 text-outline-variant/40'}`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-center">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-on-surface leading-[0.8] italic uppercase">
                  A la <br/> Minute
                </h2>
                <p className="text-[10px] uppercase tracking-[0.5em] text-outline-variant font-bold opacity-40 mt-6 leading-relaxed">
                  “Cada segundo importa”
                </p>
              </div>
              <div className="flex items-center justify-end">
                <DashboardEscalaCard 
                  schedule={mySchedule} 
                  onClick={() => setActiveTab('escala' as TabId)} 
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <StatCard 
              label="PAX (Mês)" 
              value={String(stats.monthPax)} 
              variant="flat" 
              icon={<Icons.Users size={18} />} 
              color="text-primary" 
              onClick={() => setActiveTab('relatorio')} 
            />
            <StatCard 
              label="Saúde da Praça" 
              value={`${stats.stationStats.find(s => s.id === profile?.station)?.efficiency || 0}%`}
              variant="flat" 
              icon={<Icons.Zap size={18} />} 
              color="text-secondary" 
              onClick={() => !isManagement && setActiveTab('insumos')} 
            />
            
            <div className="col-span-2 bg-surface-container rounded-3xl p-6 border border-outline-variant/10 relative overflow-hidden group">
               <div className="flex justify-between items-center mb-6">
                 <div><h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Movimento Mensal</h4><p className="text-[9px] text-outline-variant font-bold uppercase mt-1 tracking-widest">Fluxo de Cubertos</p></div>
                 <div className="text-right"><span className="text-2xl font-black text-primary hover:scale-110 transition-transform cursor-default">↑ {stats.monthPax}</span><p className="text-[8px] font-bold text-outline-variant uppercase">Volume Acumulado</p></div>
               </div>
               <GrowthChart data={stats.monthPaxHistory} />
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="w-1.5 h-8 bg-primary rounded-full" /><div><h4 className="text-2xl font-black text-on-surface uppercase tracking-tight">Alertas Críticos</h4><p className="text-[10px] font-black text-outline-variant uppercase tracking-widest mt-1">Items que exigem atenção imediata</p></div></div><div className="px-3 py-1.5 bg-surface-container rounded-xl text-[10px] font-black text-on-surface-variant uppercase tracking-widest border border-outline-variant/10">{filteredAlerts.length} Ocorrências</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
              <AlertCard key={alert.id} icon={alert.icon || <AlertTriangle size={20} className={alert.type === 'error' ? 'text-error' : 'text-secondary'} />} title={alert.title} desc={alert.desc} footer={alert.footer} borderColor={alert.borderColor} onClick={() => alert.tab && setActiveTab(alert.tab)} />
            )) : <div className="col-span-full py-12 text-center bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20"><Icons.CheckCircle2 size={40} className="mx-auto text-primary opacity-20 mb-4" /><p className="text-sm font-black text-outline-variant uppercase tracking-widest">Nenhum risco crítico detectado</p></div>}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8"><div className="w-1.5 h-8 bg-secondary rounded-full" /><div><h4 className="text-2xl font-black text-on-surface uppercase tracking-tight">Status Operacional</h4><p className="text-[10px] font-black text-outline-variant uppercase tracking-widest mt-1">Métricas de Prontidão por Praça</p></div></div>
          {isManagement ? (
             <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
               {stats.stationStats.map(s => (
                 <div key={s.id} onClick={() => { setActiveTab('insumos'); setSearchFilter(s.name); }} className="bg-surface-container p-5 rounded-2xl border border-outline-variant/10 hover:border-primary/40 transition-all cursor-pointer group">
                   <p className="text-[9px] font-black text-outline-variant uppercase mb-2 group-hover:text-primary transition-colors">{s.name}</p>
                   <p className={`text-2xl font-black tracking-tighter ${s.efficiency >= 80 ? 'text-primary' : s.efficiency >= 50 ? 'text-secondary' : 'text-error'}`}>{s.efficiency}%</p>
                   <div className="mt-3 flex gap-1">{s.hasLowStock && <div className="w-1.5 h-1.5 rounded-full bg-error" />}{s.pending > 0 && <div className="w-1.5 h-1.5 rounded-full bg-secondary" />}</div>
                 </div>
               ))}
             </div>
          ) : (
             <StationBentoStats stats={stats.stationStats.find(s => s.id === profile?.station) || { efficiency: 0, pending: 0 }} />
          )}
        </section>
      </div>
    </PageLayout>
  );
}
