import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  Target,
  ArrowRight,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  RefreshCcw,
  History,
  Download,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import StatCard from './shared/StatCard';
import Button from './shared/Button';
import { useModal } from '../contexts/ModalContext';
import { useNavigation } from '../contexts/NavigationContext';
import Skeleton, { CardSkeleton } from './shared/Skeleton';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

// Hooks
import { useInsumos, Insumo, useInsumoLogs, useStationStreaks, useInsumoHistory } from '../hooks/useInsumos';
import { useProfiles } from '../hooks/useProfiles';
import { useStations } from '../hooks/useStations';
import InsumoAutocomplete from './shared/InsumoAutocomplete';

const CATEGORIAS = ['Proteínas', 'Laticínios', 'Vegetais', 'Molhos', 'Secos', 'Descartáveis', 'Bebidas', 'Outros'];


const calculateStatusDisplay = (expiry: string | undefined, qty: number, minStock: number = 3) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const twoDaysSoon = new Date();
  twoDaysSoon.setDate(now.getDate() + 2);
  const twoDaysStr = twoDaysSoon.toISOString().split('T')[0];

  let statusLabel = 'Estável';
  let statusColor = 'bg-primary-dim';

  if (expiry && expiry < todayStr) { statusLabel = 'Expirado'; statusColor = 'bg-error'; }
  else if (qty <= 0) { statusLabel = 'Esgotado'; statusColor = 'bg-error'; }
  else if (expiry && expiry <= twoDaysStr) { statusLabel = 'Validade Crítica'; statusColor = 'bg-secondary'; }
  else if (qty < minStock) { statusLabel = 'Qtd. Crítica'; statusColor = 'bg-error'; }
  else if (qty <= minStock * 1.5) { statusLabel = 'Qtd. Baixa'; statusColor = 'bg-secondary'; }

  return { statusLabel, statusColor };
};

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

function InsumoLogModal({ insumoId, onClose }: { insumoId: string, onClose: () => void }) {
  const { data: logs, isLoading } = useInsumoLogs(insumoId);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative z-20">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter">Histórico</h3>
          <button onClick={onClose} className="p-2 text-outline-variant hover:text-red-400"><X size={20}/></button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div> :
           !logs || logs.length === 0 ? <p className="text-center text-outline-variant">Nenhum registro encontrado.</p> :
           logs.map(log => (
             <div key={log.id} className="flex justify-between items-center p-3 bg-surface-container rounded-xl border border-outline-variant/5">
                <div>
                   <p className="text-xs font-black text-on-surface uppercase tracking-widest">{log.action}</p>
                   <p className="text-[10px] text-outline-variant font-bold">{log.user?.full_name} • {new Date(log.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-primary">{log.old_qty} → {log.new_qty}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function InventoryEvolutionChart({ data, isLoading }: { data: any[], isLoading: boolean }) {
  if (isLoading) return <div className="h-64 flex items-center justify-center bg-surface-container rounded-3xl border border-outline-variant/10"><Loader2 className="animate-spin text-primary" /></div>;
  
  return (
    <div className="h-72 w-full bg-surface-container rounded-[2.5rem] p-6 border border-outline-variant/10 shadow-xl relative overflow-hidden group">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Tendência de Movimentação</h4>
           <p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest">Entradas vs Saídas (15 dias)</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[8px] font-black uppercase text-outline-variant">Entradas</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-secondary" /><span className="text-[8px] font-black uppercase text-outline-variant">Saídas</span></div>
        </div>
      </div>
      
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a6cce3" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a6cce3" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b89b4e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#b89b4e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#8e9199', fontSize: 10, fontWeight: 900}} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#8e9199', fontSize: 10, fontWeight: 900}} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1c1e', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '900',
                textTransform: 'uppercase'
              }}
              itemStyle={{ padding: '2px 0' }}
            />
            <Area 
              type="monotone" 
              dataKey="entradas" 
              stroke="#a6cce3" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorEntradas)" 
              animationDuration={2000}
            />
            <Area 
              type="monotone" 
              dataKey="saidas" 
              stroke="#b89b4e" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSaidas)" 
              animationDuration={2500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InventoryCard({ insumo, onUpdate, onDelete, profiles, isMission }: any) {
  const { statusLabel, statusColor } = calculateStatusDisplay(insumo.expiry_date, insumo.quantity, insumo.min_stock);
  const isCritical = statusColor === 'bg-error';
  const isWarning = statusColor === 'bg-secondary';
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState(insumo.quantity.toString());
  const [showLogs, setShowLogs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingQty && inputRef.current) inputRef.current.focus();
  }, [isEditingQty]);

  const handleQtySubmit = () => {
    const val = parseFloat(tempQty);
    if (!isNaN(val) && val >= 0) {
      onUpdate(val, isMission);
    } else {
      setTempQty(insumo.quantity.toString());
    }
    setIsEditingQty(false);
  };

  const updater = profiles.find((p: any) => p.id === insumo.updated_by);

  return (
    <>
    <div className={`bg-surface-container rounded-2xl overflow-hidden border transition-all duration-500 hover:-translate-y-0.5 relative group flex flex-col justify-between min-h-[220px] ${
      isMission ? 'border-primary shadow-[0_0_20px_rgba(166,204,227,0.2)]' : isCritical ? 'border-red-500/30' : isWarning ? 'border-yellow-500/20' : 'border-outline-variant/10'
    }`}>
      {isMission && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />}
      
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
        isCritical ? 'bg-red-500/80 text-white animate-pulse' : isWarning ? 'bg-yellow-500/80 text-white' : 'bg-black/40 text-white/70'
      }`}>
        {(isCritical || isWarning) && <AlertTriangle size={9} />}
        {statusLabel}
      </div>
      
      <div className="p-4 pt-10">
        <div className="flex gap-2 mb-1">
          {insumo.categoria && <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">{insumo.categoria}</span>}
          {isMission && <span className="text-[8px] font-black uppercase tracking-widest text-secondary bg-secondary/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Target size={8}/> Missão</span>}
        </div>
        <h4 className="text-[11px] font-black text-on-surface line-clamp-2 leading-tight uppercase mb-3">{insumo.name}</h4>
        
        <div className="flex items-center gap-2 mb-2" onClick={() => setIsEditingQty(true)}>
          {isEditingQty ? (
             <input 
               ref={inputRef}
               type="number" 
               step="0.01"
               value={tempQty} 
               onChange={e => setTempQty(e.target.value)}
               onBlur={handleQtySubmit}
               onKeyDown={e => e.key === 'Enter' && handleQtySubmit()}
               className="w-20 text-xl font-black text-primary bg-surface-container-highest border border-primary/50 rounded-lg p-1 outline-none"
             />
          ) : (
             <span className="text-2xl font-black text-primary leading-none cursor-pointer hover:opacity-80 transition-opacity" title="Clique para editar">{insumo.quantity}</span>
          )}
          <span className="text-[8px] font-black uppercase tracking-widest text-outline-variant">{insumo.unit}</span>
        </div>
        <div className="text-[9px] text-outline-variant font-bold uppercase tracking-widest">
           Min: {insumo.min_stock} {insumo.unit}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3 pt-0 mt-auto">
        <div className="flex justify-between items-center text-[8px] font-bold text-outline-variant mb-1 px-1">
           {updater ? <span>👤 {updater.full_name.split(' ')[0]}</span> : <span></span>}
           <button onClick={() => setShowLogs(true)} className="flex items-center gap-1 hover:text-primary transition-colors"><History size={10}/> Histórico</button>
        </div>
        <div className="flex items-center justify-between bg-surface-container-highest/50 rounded-xl p-1.5 border border-outline-variant/5">
          <button onClick={() => onUpdate(insumo.quantity - 1, isMission)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-red-400 active:scale-90 border border-outline-variant/10"><Minus size={12} /></button>
          <div className="flex flex-col items-center flex-1 mx-1 text-[8px] font-black uppercase text-outline-variant cursor-pointer" onClick={() => setIsEditingQty(true)}>EDITAR</div>
          <button onClick={() => onUpdate(insumo.quantity + 1, isMission)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 border border-outline-variant/10"><Plus size={12} /></button>
        </div>
        <button onClick={onDelete} className="w-full h-7 rounded-lg bg-red-500/5 text-red-400/60 flex items-center justify-center transition-all border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 text-[8px] font-black uppercase tracking-widest gap-1"><Trash2 size={10} /> Remover</button>
      </div>
    </div>
    {showLogs && <InsumoLogModal insumoId={insumo.id} onClose={() => setShowLogs(false)} />}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Insumos() {
  const { profile, isManagement, user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { searchFilter, setSearchFilter } = useNavigation();
  
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchFilter);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New Insumo Form
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Litros');
  const [newQty, setNewQty] = useState('');
  const [newMinStock, setNewMinStock] = useState('3');
  const [newExpiry, setNewExpiry] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIAS[0]);
  const [ftInsumoId, setFtInsumoId] = useState<string | undefined>(undefined);
  const [formStation, setFormStation] = useState<string>(profile?.station || '');

  const { data: allProfiles = [] } = useProfiles();
  const { data: streaks = [] } = useStationStreaks();

  const { 
    insumos, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, 
    updateQuantity, createInsumo, deleteInsumo, refetch 
  } = useInsumos(isManagement ? undefined : profile?.station);

  const { stations, formatStationName } = useStations();

  const { data: history = [], isLoading: historyLoading } = useInsumoHistory(isManagement ? activeStation || 'todos' : profile?.station);

  useEffect(() => { setSearchTerm(searchFilter); }, [searchFilter]);

  const handleUpdateQty = async (id: string, newQty: number, wasMission: boolean = false) => {
    if (newQty < 0 || !user) return;
    try {
      await updateQuantity({ id, quantity: newQty, userId: user.id });
      if (wasMission) {
        fireConfetti();
        showAlert('Missão Cumprida! 🎯', 'Excelente trabalho atualizando o estoque!');
      }
    } catch (err: any) {
      showAlert('Erro ao atualizar', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Excluir Insumo', 'Deseja remover este insumo permanentemente?');
    if (confirmed) {
      try {
        await deleteInsumo(id);
      } catch (err: any) {
        showAlert('Erro de Exclusão', err.message);
      }
    }
  };

  const handleAddInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetStation = isManagement ? formStation : profile?.station;
    if (!targetStation) return showAlert('Praça Ausente', 'Selecione uma praça de destino.');
    
    try {
      await createInsumo({
        name: newName,
        quantity: parseFloat(newQty),
        unit: newUnit,
        min_stock: parseFloat(newMinStock),
        categoria: newCategory,
        station: targetStation,
        expiry_date: newExpiry || undefined,
        ft_insumo_id: ftInsumoId,
        userId: user.id
      });
      setIsFormOpen(false);
      setNewName(''); setNewQty(''); setNewExpiry(''); setNewMinStock('3'); setFtInsumoId(undefined);
    } catch (err: any) {
      showAlert('Falha na Operação', err.message);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Estoque - Brigade Noir', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    
    let y = 40;
    stations.forEach((st) => {
      const stInsumos = insumos.filter(i => i.station === st.id);
      if (stInsumos.length === 0) return;
      
      doc.setFontSize(14);
      doc.text(`Praça: ${st.display_name}`, 14, y);
      y += 8;
      doc.setFontSize(10);
      
      stInsumos.forEach(i => {
        const { statusLabel } = calculateStatusDisplay(i.expiry_date, i.quantity, i.min_stock);
        doc.text(`${i.name.toUpperCase()} - ${i.quantity} ${i.unit} (Min: ${i.min_stock}) [${statusLabel}]`, 14, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 20; }
      });
      y += 10;
    });

    doc.save('estoque_brigadenoir.pdf');
  };

  // Derived Values
  const filteredInsumos = useMemo(() => {
    return insumos.filter(i => {
      const searchMatch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.categoria && i.categoria.toLowerCase().includes(searchTerm.toLowerCase()));
      const stationMatch = isManagement && activeStation ? i.station === activeStation : true;
      const userStationMatch = !isManagement && profile?.station ? i.station === profile.station : true;
      return searchMatch && stationMatch && userStationMatch;
    });
  }, [insumos, searchTerm, activeStation, isManagement, profile]);

  const stats = useMemo(() => {
    const currentSet = !isManagement && profile?.station ? insumos.filter(i => i.station === profile.station) : insumos;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const twoDaysSoon = new Date();
    twoDaysSoon.setDate(now.getDate() + 2);
    const twoDaysStr = twoDaysSoon.toISOString().split('T')[0];

    return {
      expired: currentSet.filter(i => i.expiry_date && i.expiry_date < todayStr).length,
      expiringSoon: currentSet.filter(i => i.expiry_date && i.expiry_date >= todayStr && i.expiry_date <= twoDaysStr).length,
      criticalQty: currentSet.filter(i => i.quantity < i.min_stock).length,
      lowQty: currentSet.filter(i => i.quantity >= i.min_stock && i.quantity <= i.min_stock * 1.5).length
    };
  }, [insumos, isManagement, profile]);

  const myStreak = useMemo(() => {
    if (isManagement || !profile?.station) return 0;
    const s = streaks.find((st: any) => st.station === profile.station);
    return s ? s.current_streak : 0;
  }, [streaks, profile, isManagement]);

  const missionInsumo = useMemo(() => {
    if (isManagement || filteredInsumos.length === 0) return null;
    // Pick the most critical one or a random one deterministically based on date
    const criticals = filteredInsumos.filter(i => i.quantity <= i.min_stock);
    if (criticals.length > 0) return criticals[new Date().getDate() % criticals.length];
    return filteredInsumos[new Date().getDate() % filteredInsumos.length];
  }, [filteredInsumos, isManagement]);

  // Management Radar Data
  const radarData = useMemo(() => {
    if (!isManagement) return [];
    return stations.map((st) => {
      const items = insumos.filter(i => i.station === st.id);
      const alerts = items.filter(i => {
        const s = calculateStatusDisplay(i.expiry_date, i.quantity, i.min_stock);
        return s.statusColor === 'bg-error' || s.statusColor === 'bg-secondary';
      }).length;
      const streak = streaks.find((s: any) => s.station === st.id)?.current_streak || 0;
      return { id: st.id, label: st.display_name, items: items.length, alerts, streak };
    });
  }, [insumos, isManagement, streaks, stations]);

  return (
    <PageLayout>
      <PageHeader showSearch onSearchChange={(val) => { setSearchTerm(val); setSearchFilter(val); }} searchPlaceholder="BUSCAR INSUMO..." avatarSeed={profile?.full_name || 'chef'} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 mt-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase">Gestão da Praça</span>
          <h3 className="text-3xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">{isManagement ? 'Insumos e Estoque' : 'Insumos da Praça'}</h3>
          <p className="mt-4 text-on-surface-variant leading-relaxed text-sm">
            {isManagement ? 'Visão global e auditoria de estoque.' : 'Mantenha seus insumos atualizados para garantir o fluxo de produção.'}
          </p>
        </div>
        
        {!isManagement && (
          <div className="flex items-center gap-4 bg-surface-container rounded-2xl p-4 border border-primary/20 shadow-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <Flame size={24} className={myStreak > 0 ? 'text-primary animate-pulse' : 'text-outline-variant'} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant">Seu Streak Diário</p>
               <p className="text-2xl font-black text-on-surface leading-none">{myStreak} <span className="text-sm font-bold text-outline-variant">Dias Seguidos</span></p>
            </div>
          </div>
        )}

        {isManagement && (
          <div className="flex gap-3">
             <Button variant="outline" onClick={exportPDF} icon={<Download size={16}/>}>Exportar PDF</Button>
          </div>
        )}
      </div>

      {/* Gamification Mission Banner for Staff */}
      {!isManagement && missionInsumo && (
        <div className="mb-8 bg-gradient-to-r from-surface-container to-surface-container-high border border-secondary/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(184,155,78,0.1)] relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 blur-[80px] rounded-full group-hover:bg-secondary/20 transition-all duration-700"/>
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary shadow-inner"><Target size={28}/></div>
              <div>
                 <p className="text-xs font-black uppercase tracking-widest text-secondary mb-1">Missão do Dia</p>
                 <p className="text-lg md:text-xl font-bold text-on-surface">Confira o estoque de <span className="font-black text-primary">{missionInsumo.name}</span></p>
              </div>
           </div>
           <div className="relative z-10 w-full md:w-auto">
              <Button variant="primary" className="w-full md:w-auto" onClick={() => {
                const el = document.getElementById(`insumo-${missionInsumo.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}>Ir para o Item</Button>
           </div>
        </div>
      )}

          <div className="mb-10">
            <h4 className="text-xs font-black text-outline-variant uppercase tracking-[0.2em] mb-4">Radar de Praças</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
               {radarData.map(st => (
                 <div key={st.id} onClick={() => setActiveStation(activeStation === st.id ? null : st.id)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeStation === st.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-surface-container border-outline-variant/10 hover:border-outline-variant/30'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface mb-2">{st.label}</p>
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-2xl font-black leading-none">{st.alerts}</p>
                          <p className="text-[8px] font-bold text-error uppercase tracking-widest">Alertas</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black flex items-center justify-end gap-1 text-secondary"><Flame size={12}/> {st.streak}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            
            <InventoryEvolutionChart data={history} isLoading={historyLoading} />
         </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full mb-8">
        <StatCard label="Vencidos" value={String(stats.expired).padStart(2, '0')} color="border-error" textColor="text-error" variant="border-left" className="!p-3 sm:min-w-[120px]" />
        <StatCard label="Vencendo" value={String(stats.expiringSoon).padStart(2, '0')} color="border-secondary" textColor="text-secondary" variant="border-left" className="!p-3 sm:min-w-[120px]" />
        <StatCard label="Críticos (< Min)" value={String(stats.criticalQty).padStart(2, '0')} color="border-error" textColor="text-error" variant="border-left" className="!p-3 sm:min-w-[120px]" />
        <StatCard label="Atenção" value={String(stats.lowQty).padStart(2, '0')} color="border-secondary" textColor="text-secondary" variant="border-left" className="!p-3 sm:min-w-[120px]" />
      </div>

      <div className="flex justify-between items-center bg-surface-container rounded-xl p-4 md:p-6 border border-outline-variant/10 shadow-lg mb-6">
        <h4 className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant">Inventário Ativo</h4>
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={() => setIsFormOpen(true)} size="sm" icon={<Plus size={14} />}>Novo Insumo</Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 hidden md:flex">{isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Atualizar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-20">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
        ) : filteredInsumos.length === 0 ? (
          <div className="py-20 text-center text-outline-variant text-sm col-span-full">Nenhum insumo encontrado.</div>
        ) : (
          <>
            {filteredInsumos.map((i) => (
               <div id={`insumo-${i.id}`} key={i.id}>
                 <InventoryCard insumo={i} onUpdate={handleUpdateQty} onDelete={() => handleDelete(i.id)} profiles={allProfiles} isMission={missionInsumo?.id === i.id} />
               </div>
            ))}
            {hasNextPage && (
              <div className="col-span-full pt-4">
                <Button variant="outline" className="w-full py-4 border-dashed border-outline-variant/30 text-outline-variant" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />} Carregar Mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── ADD INSUMO MODAL ────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-2xl relative overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 text-outline-variant hover:text-red-400 z-50 bg-surface-container-highest rounded-full"><X size={20} /></button>
            <div className="relative z-10">
              <h4 className="text-xl font-bold text-on-surface mb-1 uppercase tracking-tighter">Cadastrar Insumo</h4>
              <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em] mb-8 italic">Nova Entrada Técnica</p>
              
              <form onSubmit={handleAddInsumo} className="space-y-4">
                {isManagement && (
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Praça de Destino</label>
                    <select required value={formStation} onChange={(e) => setFormStation(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none uppercase">
                      <option value="">Selecionar Praça...</option>
                      {stations.map((st) => <option key={st.id} value={st.id}>{st.display_name}</option>)}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Item (Busca no Catálogo)</label>
                  <InsumoAutocomplete 
                    defaultValue={newName}
                    onSelect={(item) => {
                      setNewName(item.nome);
                      setFtInsumoId(item.id);
                      setNewUnit(item.unidade_base === 'g' ? 'Gramas' : item.unidade_base === 'ml' ? 'ML' : 'Unidade');
                      // Try to match category if possible or keep current
                    }}
                    placeholder="DIGITE O NOME OU BUSQUE NO CATÁLOGO..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Categoria</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none uppercase">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Medida</label>
                    <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none uppercase">
                      <option>Litros</option><option>Kg</option><option>Unidade</option><option>Gramas</option><option>ML</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Estoque Atual</label>
                    <input type="number" required step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="0.00" className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Estoque Mínimo</label>
                    <input type="number" required step="0.01" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} placeholder="3.00" className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-1">Data de Validade (Opcional)</label>
                  <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none" />
                </div>
                
                <div className="pt-2 flex gap-3">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                   <Button type="submit" variant="primary" className="flex-1" icon={<ArrowRight size={16} />} iconPosition="right">Confirmar</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
