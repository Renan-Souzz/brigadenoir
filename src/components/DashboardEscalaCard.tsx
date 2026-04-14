import React from 'react';
import { Palmtree, Check, Coins, Calendar, ChevronRight } from 'lucide-react';
import { DutyRecord, DutyStatus } from '../hooks/useSchedule';

interface DashboardEscalaCardProps {
  schedule: DutyRecord[];
  onClick: () => void;
}

const STATUS_MAP: Record<DutyStatus, { label: string; icon: any; color: string; bg: string }> = {
  trabalho: { label: 'Trabalho', icon: Check, color: 'text-primary', bg: 'bg-primary/10' },
  folga: { label: 'Folga Hoje 🌴', icon: Palmtree, color: 'text-secondary', bg: 'bg-secondary/10' },
  compensa: { label: 'Compensa', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-400/10' }
};

export default function DashboardEscalaCard({ schedule, onClick }: DashboardEscalaCardProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayDuty = schedule.find(s => s.date === todayStr);
  const tomorrowDuty = schedule.find(s => s.date === tomorrowStr);

  const currentStatus = todayDuty?.status || 'trabalho';
  const config = STATUS_MAP[currentStatus];
  const Icon = config.icon;

  return (
    <div 
      onClick={onClick}
      className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 cursor-pointer group relative overflow-hidden h-full flex flex-col justify-between"
    >
      {/* Background Glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 blur-[60px] rounded-full transition-all duration-700 opacity-20 ${currentStatus === 'folga' ? 'bg-secondary' : 'bg-primary'}`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${currentStatus === 'folga' ? 'bg-secondary/10 border-secondary/20' : 'bg-primary/10 border-primary/20'}`}>
              <Icon size={20} className={config.color} />
            </div>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Minha Jornada</span>
          </div>
          <ChevronRight size={16} className="text-outline-variant/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
        </div>

        <div className="space-y-1">
          <h4 className={`text-2xl font-black uppercase tracking-tighter ${config.color}`}>
            {config.label}
          </h4>
          <p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-outline-variant/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-outline-variant" />
          <span className="text-[9px] font-black text-outline-variant uppercase tracking-widest">Amanhã:</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${tomorrowDuty?.status === 'folga' ? 'text-secondary' : 'text-on-surface'}`}>
            {tomorrowDuty ? (tomorrowDuty.status === 'folga' ? 'Folga' : tomorrowDuty.status === 'compensa' ? 'Compensa' : 'Trabalho') : 'Escala Pendente'}
          </span>
        </div>
        
        {currentStatus === 'folga' && (
          <span className="animate-bounce text-[10px] font-black text-secondary uppercase tracking-tighter">Aproveite! 🍹</span>
        )}
      </div>
    </div>
  );
}
