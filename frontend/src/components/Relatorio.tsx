import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calculateStationEfficiency } from '../lib/stats';
import PageLayout from './shared/PageLayout';
import StatCard from './shared/StatCard';
import { 
  TrendingUp, AlertCircle, PackageCheck, Loader2, Calendar, Users, Plus, Minus, Save, RefreshCcw, ChefHat, Clock, AlertTriangle, X
} from 'lucide-react';
import { useModal } from '../contexts/ModalContext';
import Button from './shared/Button';

// Hooks
import { usePax } from '../hooks/usePax';
import { useStations } from '../hooks/useStations';
import { useReportData, ReportPeriod } from '../hooks/useReportData';
import { formatLocalDate } from '../lib/dateUtils';
import { Task } from '../hooks/useTasks';

// Local Component for Drill Down
function StationDrillDownModal({ stationId, stationName, tasks, insumos, onClose }: { stationId: string, stationName: string, tasks: Task[], insumos: any[], onClose: () => void }) {
  const isLate = (t: Task) => t.due_time && !t.is_completed && new Date(`1970-01-01T${t.due_time}`) < new Date(`1970-01-01T${new Date().toTimeString().split(' ')[0]}`);
  const lateTasks = tasks.filter(isLate);
  const criticalInsumos = insumos.filter(i => {
    const isLow = i.quantity <= i.min_stock;
    const isExpiring = i.expiry_date && new Date(i.expiry_date).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000;
    return isLow || isExpiring;
  });

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
       <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-2xl rounded-[2rem] p-6 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
         <div className="flex justify-between items-start mb-6">
           <div><h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">{stationName}</h2><p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest mt-1">Análise de Riscos da Praça</p></div>
           <button onClick={onClose} className="w-8 h-8 rounded-xl hover:text-red-400 transition-colors bg-surface-container flex items-center justify-center"><X size={20}/></button>
         </div>
         
         <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {/* Tarefas Atrasadas */}
            <div>
               <h3 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2 mb-3"><Clock size={14} className="text-error" /> Tarefas Pendentes/Atrasadas ({lateTasks.length})</h3>
               {lateTasks.length === 0 ? <p className="text-xs text-outline-variant italic">Nenhuma tarefa atrasada.</p> : (
                 <div className="space-y-2">
                   {lateTasks.map(t => (
                     <div key={t.id} className="p-3 bg-surface-container rounded-xl border-l-2 border-l-error flex justify-between items-center">
                       <span className="text-xs font-bold text-on-surface uppercase">{t.title}</span>
                       <span className="text-[9px] font-black uppercase tracking-widest bg-error/10 text-error px-2 py-0.5 rounded">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Estoque Crítico */}
            <div>
               <h3 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-error" /> Estoque Crítico ({criticalInsumos.length})</h3>
               {criticalInsumos.length === 0 ? <p className="text-xs text-outline-variant italic">Nenhum insumo em risco.</p> : (
                 <div className="space-y-2">
                   {criticalInsumos.map(i => (
                     <div key={i.id} className="p-3 bg-surface-container rounded-xl border-l-2 border-l-error flex justify-between items-center">
                       <div>
                         <span className="text-xs font-bold text-on-surface uppercase block">{i.name}</span>
                         <span className="text-[9px] text-outline-variant font-black tracking-widest uppercase">Mín: {i.min_stock} {i.unit}</span>
                       </div>
                       <span className="text-sm font-black text-error uppercase tabular-nums">{i.quantity} {i.unit}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </div>
       </div>
    </div>
  );
}

export default function Relatorio() {
  const { isManagement } = useAuth();
  const { showAlert } = useModal();
  
  const [period, setPeriod] = useState<ReportPeriod>('7d');
  const [drillDownStation, setDrillDownStation] = useState<string | null>(null);

  const { activeStations } = useStations();
  const { data: paxData = [], isLoading: paxLoading, upsertPax, refetch: refetchPax } = usePax();
  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useReportData(period);
  
  const isLoading = paxLoading || reportLoading;

  const todayStr = useMemo(() => formatLocalDate(), []);
  const todayPax = useMemo(() => paxData.find(p => p.date === todayStr), [paxData, todayStr]);
  
  const [lunchPax, setLunchPax] = useState(0);
  const [dinnerPax, setDinnerPax] = useState(0);
  const [isSavingPax, setIsSavingPax] = useState(false);

  React.useEffect(() => {
    if (todayPax) {
      setLunchPax(todayPax.lunch_pax);
      setDinnerPax(todayPax.dinner_pax);
    }
  }, [todayPax]);

  const analytics = useMemo(() => {
    if (!reportData) return null;
    const { tasks, insumos, pax, movements } = reportData;

    // 1. Efficiency Chart
    const historyData = [];
    let totalPaxPeriod = 0;
    
    let daysToLoop = 7;
    if (period === '15d') daysToLoop = 15;
    else if (period === '30d') daysToLoop = 30;
    else if (period === 'this_month') daysToLoop = new Date().getDate();

    for (let i = daysToLoop - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = formatLocalDate(d);
        
        const dayTasks = tasks.filter(t => t.created_at.startsWith(dateStr));
        const dayEfficiency = dayTasks.length > 0 
            ? (dayTasks.filter(t => t.is_completed).length / dayTasks.length) * 100 
            : 0;
        
        const dayPax = pax.find(p => p.date === dateStr);
        const lpax = dayPax?.lunch_pax || 0;
        const dpax = dayPax?.dinner_pax || 0;
        totalPaxPeriod += (lpax + dpax);

        historyData.push({
            date: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
            fullDate: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
            efficiency: Math.round(dayEfficiency),
            lunchPax: lpax,
            dinnerPax: dpax,
            total: lpax + dpax
        });
    }

    // 2. Monthly Growth (always use current month relative to today)
    const growthData = [];
    let totalPaxMonth = 0;
    const now = new Date();
    const todayNum = now.getDate();
    for (let i = 1; i <= todayNum; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const dStr = formatLocalDate(d);
        const dayPax = paxData.find(p => p.date === dStr);
        totalPaxMonth += (dayPax?.lunch_pax || 0) + (dayPax?.dinner_pax || 0);
        growthData.push({ day: i, total: totalPaxMonth });
    }

    // 3. Station Statistics
    const stationStats = activeStations.map(s => {
      const stationTasks = tasks.filter(t => t.station === s.id);
      const stationInsumos = insumos.filter(i => i.station === s.id);
      const result = calculateStationEfficiency(stationInsumos, stationTasks);
      return {
        id: s.id,
        station: s.display_name,
        efficiency: result.score,
        pending: result.pendingCount,
        hasLowStock: result.hasLowStock,
        hasExpiringSoon: result.hasExpiringSoon,
      };
    });

    const overallEfficiency = stationStats.length > 0 
        ? Math.round(stationStats.reduce((acc, curr) => acc + curr.efficiency, 0) / stationStats.length) 
        : 0;

    // 4. Estoque Metrics
    const almoxInsumos = insumos.filter(i => i.station === 'almoxarifado');
    const totalProteinas = almoxInsumos.filter(i => i.categoria === 'proteinas').reduce((acc, curr) => acc + curr.quantity, 0);
    const totalMolhos = almoxInsumos.filter(i => i.categoria === 'molhos').reduce((acc, curr) => acc + curr.quantity, 0);
    const totalPorcoes = almoxInsumos.filter(i => i.categoria === 'porcoes').reduce((acc, curr) => acc + curr.quantity, 0);

    // 5. Entregas Recentes
    const entregasRecentes = movements.map(m => ({
      id: m.id,
      name: m.produto_nome,
      tipo: m.tipo === 'subida_cozinha' ? 'Enviado' : 'Requisitado',
      quantity: m.quantidade_enviada || m.peso_liquido_kg || 0,
      unit: m.categoria === 'porcoes' ? 'un' : 'kg/L',
      date: m.data_movimentacao
    }));

    return { historyData, totalPaxPeriod, totalPaxMonth, growthData, stationStats, overallEfficiency, totalProteinas, totalMolhos, totalPorcoes, entregasRecentes, rawTasks: tasks, rawInsumos: insumos };
  }, [reportData, paxData, activeStations, period]);

  const handleSavePax = async () => {
    setIsSavingPax(true);
    try {
      await upsertPax({
        date: todayStr,
        lunch_pax: lunchPax,
        dinner_pax: dinnerPax
      });
      showAlert('Sucesso', 'Movimento de PAX registrado com sucesso!');
    } catch (err: any) {
      showAlert('Erro', 'Falha ao salvar registro: ' + err.message);
    } finally {
      setIsSavingPax(false);
    }
  };

  const handleRefetch = () => {
    refetchPax();
    refetchReport();
  };

  if (!isManagement) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto text-secondary mb-4 opacity-20" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-on-surface mb-2">Acesso Restrito</h2>
            <p className="text-outline-variant text-sm uppercase tracking-tighter">Relatórios executivos exclusivos para liderança.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Chart Helpers
  const chartWidth = 600;
  const chartHeight = 260;
  const padding = 40;
  
  const historyData = analytics?.historyData || [];
  // For charts with more than 7 days, we might want to skip some labels to avoid crowding
  const getX = (index: number) => padding + (index * (chartWidth - 2 * padding) / Math.max(1, historyData.length - 1));
  const getY = (value: number) => (chartHeight - 80) - (value * (chartHeight - 120) / 100) + 20;

  const points = historyData.map((d, i) => `${getX(i)},${getY(d.efficiency)}`).join(' ');
  const areaPoints = points ? `M ${points} L ${getX(historyData.length - 1)},${chartHeight-60} L ${getX(0)},${chartHeight-60} Z` : '';

  const selectedStationData = drillDownStation ? activeStations.find(s => s.id === drillDownStation) : null;

  return (
    <PageLayout maxWidth="6xl">
      {/* Drill Down Modal */}
      {drillDownStation && selectedStationData && (
        <StationDrillDownModal 
          stationId={selectedStationData.id}
          stationName={selectedStationData.display_name}
          tasks={analytics?.rawTasks.filter(t => t.station === selectedStationData.id) || []}
          insumos={analytics?.rawInsumos.filter(i => i.station === selectedStationData.id) || []}
          onClose={() => setDrillDownStation(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-primary">Inteligência Operacional</span>
          <h2 className="text-3xl md:text-5xl font-black text-on-surface tracking-tighter mt-2 uppercase">Evolução da Cozinha</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10 shadow-sm">
             <button onClick={() => setPeriod('7d')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${period === '7d' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>7 Dias</button>
             <button onClick={() => setPeriod('15d')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${period === '15d' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>15 Dias</button>
             <button onClick={() => setPeriod('30d')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${period === '30d' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>30 Dias</button>
             <button onClick={() => setPeriod('this_month')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${period === 'this_month' ? 'bg-primary text-on-primary shadow-md' : 'text-outline-variant hover:text-on-surface'}`}>Mês</button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefetch} className="gap-2">
             {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard icon={<TrendingUp className="text-secondary" />} value={`${analytics?.overallEfficiency || 0}%`} label="Eficiência Média" />
        <StatCard icon={<Users className="text-primary-dim" />} value={String(analytics?.totalPaxPeriod || 0)} label="PAX no Período" />
        <StatCard icon={<Calendar className="text-primary" />} value={String(analytics?.totalPaxMonth || 0)} label="PAX Mês Atual" />
        <StatCard icon={<PackageCheck className="text-tertiary-dim" />} value={String(analytics?.stationStats.reduce((acc, s) => acc + (s.hasLowStock || s.hasExpiringSoon ? 1 : 0), 0) || 0)} label="Praças em Risco" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Form de Atendimento */}
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface flex items-center gap-2 mb-6">
              <Users size={16} className="text-primary" /> Atendimento de Hoje
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Almoço', val: lunchPax, set: setLunchPax, color: 'bg-primary' },
                { label: 'Jantar', val: dinnerPax, set: setDinnerPax, color: 'bg-secondary' }
              ].map(p => (
                <div key={p.label} className="bg-surface-container-low p-4 rounded-[20px] border border-outline-variant/10 relative overflow-hidden">
                  <div className={`absolute left-0 inset-y-0 w-1 ${p.val < 30 ? 'bg-error' : p.val < 60 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <div className="flex items-center justify-between pl-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${p.color}`} /> {p.label}</p>
                      <p className="text-3xl font-black tracking-tighter mt-1 text-on-surface">{p.val}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1 justify-end">
                        <button onClick={() => p.set(Math.max(0, p.val - 1))} className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-container-highest text-outline-variant transition-colors"><Minus size={14} /></button>
                        <button onClick={() => p.set(p.val + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-container-highest text-outline-variant transition-colors"><Plus size={14} /></button>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => p.set(Math.max(0, p.val - 10))} className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-highest text-[8px] font-black text-outline-variant transition-colors border border-outline-variant/10">-10</button>
                        <button onClick={() => p.set(Math.max(0, p.val - 5))} className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-highest text-[8px] font-black text-outline-variant transition-colors border border-outline-variant/10">-5</button>
                        <button onClick={() => p.set(p.val + 5)} className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-highest text-[8px] font-black text-outline-variant transition-colors border border-outline-variant/10">+5</button>
                        <button onClick={() => p.set(p.val + 10)} className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-highest text-[8px] font-black text-outline-variant transition-colors border border-outline-variant/10">+10</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={handleSavePax} disabled={isSavingPax} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] mt-2 shadow-sm">
                {isSavingPax ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Movimento</>}
              </button>
            </div>
          </div>

          {/* Histórico Semanal ou Período */}
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-4">Detalhamento {period === '7d' ? 'Semanal' : 'do Período'}</h4>
             <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
               {analytics?.historyData.map((day, i) => (
                 <div key={i} className="flex justify-between items-center bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/5">
                   <span className="text-[9px] font-black uppercase text-on-surface w-12">{day.fullDate}</span>
                   <div className="flex gap-4"><span className="text-[10px] font-black text-primary w-6 text-right">{day.lunchPax}</span><span className="text-[10px] font-black text-outline-variant/30">/</span><span className="text-[10px] font-black text-secondary w-6 text-left">{day.dinnerPax}</span></div>
                   <div className="text-right border-l border-outline-variant/10 pl-3"><span className="text-xs font-black text-on-surface">{day.total}</span></div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Performance Chart */}
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden flex-1 flex flex-col min-h-[300px]">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface mb-6">Eficiência do Período</h3>
              {isLoading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div> :
               !analytics ? <div className="flex-1 flex items-center justify-center text-outline-variant uppercase text-[10px] font-black tracking-widest">Aguardando dados...</div> :
              <div className="relative w-full h-full">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="efficiencyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a6cce3" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0.05" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(v => (
                    <g key={v}>
                      <line x1={padding} y1={getY(v)} x2={chartWidth-padding} y2={getY(v)} stroke="currentColor" className="text-outline-variant" strokeOpacity="0.05" strokeWidth="1" />
                      <text x={padding-10} y={getY(v)} textAnchor="end" className="fill-outline-variant font-bold text-[8px] uppercase">{v}%</text>
                    </g>
                  ))}

                  {/* Area Fill */}
                  {areaPoints && <path d={areaPoints} fill="url(#efficiencyGrad)" />}

                  {/* Main Line */}
                  {points && <path d={`M ${points}`} fill="none" stroke="#a6cce3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />}

                  {/* Points and Labels */}
                  {historyData.map((d, i) => {
                    const skipLabels = historyData.length > 15 && i % 3 !== 0 && i !== historyData.length - 1;
                    return (
                    <g key={i}>
                      <circle cx={getX(i)} cy={getY(d.efficiency)} r={skipLabels ? "3" : "6"} className="fill-surface stroke-primary" strokeWidth={skipLabels ? "2" : "3"} />
                      {!skipLabels && <circle cx={getX(i)} cy={getY(d.efficiency)} r="2" className="fill-secondary" />}
                      
                      {!skipLabels && (
                        <>
                          <text x={getX(i)} y={chartHeight - 45} textAnchor="middle" className="fill-on-surface font-black text-[10px] uppercase tracking-tighter">{d.date}</text>
                          <text x={getX(i)} y={chartHeight - 30} textAnchor="middle" className="fill-secondary font-black text-[12px] tabular-nums">{d.efficiency}%</text>
                        </>
                      )}
                    </g>
                  )})}
                </svg>
              </div>}
          </div>

          {/* Growth Curve */}
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface mb-6">Acumulado Mês Atual</h3>
             <div className="h-32 w-full flex items-end gap-1 mb-8">
                {analytics?.growthData.map((d, i) => {
                  const h = (d.total / (analytics.totalPaxMonth || 1)) * 100;
                  const isMainDay = i % 5 === 0 || i === analytics.growthData.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center group h-full">
                      <div className="w-full bg-surface-container-highest/20 relative group-hover:bg-primary/20 transition-all rounded-t-sm" style={{ height: `${h}%` }}>
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary to-secondary opacity-50" />
                        {isMainDay && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-outline-variant/10 px-2 py-0.5 rounded text-[8px] font-black text-secondary z-10 shadow-lg">
                            {d.total} PAX
                          </div>
                        )}
                      </div>
                      <div className="h-4 flex flex-col items-center justify-center mt-2">
                        {isMainDay && <span className="text-[7px] font-black text-outline-variant uppercase">{d.day}</span>}
                      </div>
                    </div>
                  );
                })}
             </div>
             <div className="flex justify-between items-center px-2 py-3 bg-surface-container-low rounded-xl border border-outline-variant/5">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-outline-variant uppercase">Total Acumulado</span>
                    <span className="text-xl font-black text-primary tracking-tighter tabular-nums">{analytics?.totalPaxMonth} <span className="text-[10px] text-secondary">PAX</span></span>
                  </div>
                </div>
                <div className="h-8 w-px bg-outline-variant/10 mx-4" />
                <div className="flex-1 grid grid-cols-4 gap-2">
                  {[1, 10, 20, analytics?.growthData.length].map(day => {
                    const data = analytics?.growthData.find(d => d.day === day);
                    if (!data) return null;
                    return (
                      <div key={day} className="flex flex-col">
                        <span className="text-[7px] font-black text-outline-variant uppercase">Dia {day}</span>
                        <span className="text-sm font-black text-on-surface tracking-tighter">{data.total}</span>
                      </div>
                    )
                  })}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Estoque e Entregas (Almoxarifado) */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 mb-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-6">Integração Almoxarifado e Produção</h4>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Métricas de Estoque Central */}
          <div className="col-span-1 space-y-4">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 shadow-lg">
              <h5 className="text-[9px] font-black uppercase tracking-[0.1em] text-on-surface mb-4">Total no Almoxarifado</h5>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-outline-variant/5 pb-2">
                  <span className="text-xs font-bold text-outline-variant uppercase">Proteínas</span>
                  <span className="text-xl font-black text-primary">{analytics?.totalProteinas.toFixed(1)} <span className="text-[10px] font-normal text-secondary">kg</span></span>
                </div>
                <div className="flex justify-between items-end border-b border-outline-variant/5 pb-2">
                  <span className="text-xs font-bold text-outline-variant uppercase">Molhos</span>
                  <span className="text-xl font-black text-primary">{analytics?.totalMolhos.toFixed(1)} <span className="text-[10px] font-normal text-secondary">L/kg</span></span>
                </div>
                <div className="flex justify-between items-end border-b border-outline-variant/5 pb-2">
                  <span className="text-xs font-bold text-outline-variant uppercase">Porções</span>
                  <span className="text-xl font-black text-primary">{analytics?.totalPorcoes} <span className="text-[10px] font-normal text-secondary">un</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Entregas à Cozinha / Preparo Recente */}
          <div className="col-span-1 lg:col-span-2">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 shadow-lg h-full">
              <h5 className="text-[9px] font-black uppercase tracking-[0.1em] text-on-surface mb-4">Entregas do Almoxarifado p/ Cozinha (Transações)</h5>
              {analytics?.entregasRecentes.length === 0 ? (
                <p className="text-xs text-outline-variant italic">Nenhuma entrega registrada no período.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics?.entregasRecentes.map((e) => (
                    <div key={e.id} className="flex justify-between items-center bg-surface-container-highest p-3 rounded-xl border border-outline-variant/5">
                      <div>
                        <p className="text-xs font-black uppercase text-on-surface">{e.name}</p>
                        <p className="text-[8px] font-bold uppercase text-outline-variant mt-1">{e.tipo} • {new Date(e.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-secondary">{e.quantity} <span className="text-[9px]">{e.unit}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 mb-20">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-6">Monitoramento de Praças (Clique para Inspecionar)</h4>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {analytics?.stationStats.map(s => (
                <div key={s.id} onClick={() => setDrillDownStation(s.id)} className="p-5 bg-surface-container rounded-2xl border border-outline-variant/10 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group">
                    <p className="text-[9px] font-black uppercase text-outline-variant mb-1 truncate group-hover:text-primary transition-colors">{s.station}</p>
                    <p className={`text-2xl font-black tracking-tighter ${s.efficiency >= 80 ? 'text-green-400' : 'text-error'}`}>{s.efficiency}%</p>
                    <div className="mt-4 pt-4 border-t border-outline-variant/5 flex justify-between">
                       <div className={`w-2 h-2 rounded-full ${s.hasLowStock || s.hasExpiringSoon ? 'bg-error shadow-[0_0_10px_rgba(2ef,68,68,0.5)] animate-pulse' : 'bg-green-500'}`} title="Estoque" />
                       <div className={`w-2 h-2 rounded-full ${s.pending > 0 ? 'bg-error shadow-[0_0_10px_rgba(2ef,68,68,0.5)] animate-pulse' : 'bg-green-500'}`} title="Tarefas Pendentes" />
                    </div>
                </div>
            ))}
         </div>
      </div>
    </PageLayout>
  );
}
