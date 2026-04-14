import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  MoreVertical, 
  Utensils,
  ArrowRight,
  Loader2,
  Trash2,
  X,
  Package,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import StatCard from './shared/StatCard';
import Button from './shared/Button';
import { useModal } from '../contexts/ModalContext';
import { useNavigation } from '../contexts/NavigationContext';
import Skeleton, { CardSkeleton } from './shared/Skeleton';

// Hooks
import { useInsumos, Insumo } from '../hooks/useInsumos';

// ─── Sub-components ───────────────────────────────────────────────────────────

function InventoryCard({ name, expiry, qty, unit, onUpdate, onDelete }: any) {
  const { statusLabel, statusColor } = calculateStatusDisplay(expiry, qty);
  const isCritical = statusColor === 'bg-error';
  const isWarning = statusColor === 'bg-secondary';

  return (
    <div className={`bg-surface-container rounded-2xl overflow-hidden border transition-all duration-500 hover:shadow-[0_8px_30px_-8px_rgba(0,180,216,0.15)] hover:-translate-y-0.5 relative group flex flex-col justify-between min-h-[180px] ${
      isCritical ? 'border-red-500/30' : isWarning ? 'border-yellow-500/20' : 'border-outline-variant/10'
    }`}>
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
        isCritical ? 'bg-red-500/80 text-white animate-pulse' : isWarning ? 'bg-yellow-500/80 text-white' : 'bg-black/40 text-white/70'
      }`}>
        {(isCritical || isWarning) && <AlertTriangle size={9} />}
        {statusLabel}
      </div>
      
      <div className="p-4 pt-10">
        <h4 className="text-[11px] font-black text-on-surface line-clamp-2 leading-tight uppercase mb-3">{name}</h4>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-black text-primary leading-none">{qty}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-outline-variant">{unit}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3 pt-0 mt-auto">
        <div className="flex items-center justify-between bg-surface-container-highest/50 rounded-xl p-1.5 border border-outline-variant/5">
          <button onClick={() => onUpdate(qty - 1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-red-400 active:scale-90 border border-outline-variant/10"><Minus size={12} /></button>
          <div className="flex flex-col items-center flex-1 mx-1"><span className="text-xs font-black text-primary leading-none">{qty}</span><span className="text-[7px] font-black uppercase tracking-tighter text-outline-variant">{unit}</span></div>
          <button onClick={() => onUpdate(qty + 1)} className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 border border-outline-variant/10"><Plus size={12} /></button>
        </div>
        <button onClick={onDelete} className="w-full h-7 rounded-lg bg-red-500/5 text-red-400/60 flex items-center justify-center transition-all border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 text-[8px] font-black uppercase tracking-widest gap-1"><Trash2 size={10} /> Remover</button>
      </div>
    </div>
  );
}

const calculateStatusDisplay = (expiry: string | undefined, qty: number) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const twoDaysSoon = new Date();
  twoDaysSoon.setDate(now.getDate() + 2);
  const twoDaysStr = twoDaysSoon.toISOString().split('T')[0];

  let statusLabel = 'Estável';
  let statusColor = 'bg-primary-dim';

  if (expiry && expiry < todayStr) { statusLabel = 'Expirado'; statusColor = 'bg-error'; }
  else if (expiry && expiry <= twoDaysStr) { statusLabel = 'Validade Crítica'; statusColor = 'bg-secondary'; }
  else if (qty < 3) { statusLabel = 'Qtd. Crítica'; statusColor = 'bg-error'; }
  else if (qty <= 5) { statusLabel = 'Qtd. Baixa'; statusColor = 'bg-secondary'; }

  return { statusLabel, statusColor };
};

function InventoryRow({ name, prep, expiry, qty, unit, onUpdate, onDelete }: any) {
  const { statusLabel, statusColor } = calculateStatusDisplay(expiry, qty);
  const isCritical = statusColor === 'bg-error';
  const isWarning = statusColor === 'bg-secondary';

  return (
    <tr className={`transition-colors ${isCritical ? 'bg-red-500/5' : 'hover:bg-surface-container-highest/50'}`}>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={`text-sm font-black text-on-surface uppercase tracking-tight ${isCritical ? 'text-red-400' : ''}`}>{name}</span>
          <span className="text-[10px] text-on-surface-variant font-medium">
            Prep: {prep ? new Date(prep).toLocaleDateString('pt-BR') : 'N/A'} | Validade: {expiry ? new Date(expiry).toLocaleDateString('pt-BR') : 'Indefinida'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdate(qty - 1)} className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-red-400 active:scale-90 transition-all border border-outline-variant/10"><Minus size={14} /></button>
          <span className={`text-sm font-black w-12 text-center ${isCritical ? 'text-red-400' : ''}`}>{qty} <span className="text-[10px] text-outline ml-0.5 font-bold">{unit}</span></span>
          <button onClick={() => onUpdate(qty + 1)} className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all border border-outline-variant/10"><Plus size={14} /></button>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
          isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/20 animate-pulse' : isWarning ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-primary/10 text-primary border border-primary/20'
        }`}>
          {(isCritical || isWarning) && <AlertTriangle size={10} />}
          {statusLabel}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button onClick={onDelete} className="w-8 h-8 rounded-xl text-outline-variant hover:text-red-400 hover:bg-red-500/10 transition-all p-2 border border-transparent hover:border-red-500/20 active:scale-90"><Trash2 size={16} /></button>
      </td>
    </tr>
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

// ─── Component ───

export default function Insumos() {
  const { profile, isManagement } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { searchFilter, setSearchFilter } = useNavigation();
  
  // States
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchFilter);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New Insumo Form State
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Litros');
  const [newQty, setNewQty] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [formStation, setFormStation] = useState<string>(profile?.station || '');

  // TanStack Query
  const { 
    insumos, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage, 
    updateQuantity, 
    createInsumo, 
    deleteInsumo, 
    refetch 
  } = useInsumos(isManagement ? undefined : profile?.station);

  useEffect(() => {
    setSearchTerm(searchFilter);
  }, [searchFilter]);

  const handleUpdateQty = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    try {
      await updateQuantity({ id, quantity: newQty });
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
    const targetStation = isManagement ? formStation : profile?.station;
    if (!targetStation) return showAlert('Praça Ausente', 'Selecione uma praça de destino.');
    
    try {
      await createInsumo({
        name: newName,
        quantity: parseFloat(newQty),
        unit: newUnit,
        station: targetStation,
        expiry_date: newExpiry || undefined
      });
      setIsFormOpen(false);
      setNewName('');
      setNewQty('');
      setNewExpiry('');
    } catch (err: any) {
      showAlert('Falha na Operação', err.message);
    }
  };

  // Derived Values
  const filteredInsumos = useMemo(() => {
    return insumos.filter(i => {
      const searchMatch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.station && i.station.toLowerCase().includes(searchTerm.toLowerCase()));
      const stationMatch = isManagement && activeStation ? i.station === activeStation : true;
      const userStationMatch = !isManagement && profile?.station ? i.station === profile.station : true;
      return searchMatch && stationMatch && userStationMatch;
    });
  }, [insumos, searchTerm, activeStation, isManagement, profile]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const twoDaysSoon = new Date();
    twoDaysSoon.setDate(now.getDate() + 2);
    const twoDaysStr = twoDaysSoon.toISOString().split('T')[0];

    const currentSet = !isManagement && profile?.station ? insumos.filter(i => i.station === profile.station) : insumos;

    return {
      expired: currentSet.filter(i => i.expiry_date && i.expiry_date < todayStr).length,
      expiringSoon: currentSet.filter(i => i.expiry_date && i.expiry_date >= todayStr && i.expiry_date <= twoDaysStr).length,
      criticalQty: currentSet.filter(i => i.quantity < 3).length,
      lowQty: currentSet.filter(i => i.quantity >= 3 && i.quantity <= 5).length
    };
  }, [insumos, isManagement, profile]);

  const stationName = profile?.station ? profile.station.charAt(0).toUpperCase() + profile.station.slice(1) : 'Geral';

  return (
    <PageLayout>
      <PageHeader showSearch onSearchChange={(val) => { setSearchTerm(val); setSearchFilter(val); }} searchPlaceholder="BUSCAR INSUMO..." avatarSeed={profile?.full_name || 'chef'} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 mt-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase">Gestão da Praça</span>
          <h3 className="text-3xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none uppercase">{isManagement ? 'Insumos' : 'Insumos da Praça'}</h3>
          <p className="mt-4 text-on-surface-variant leading-relaxed text-sm">Monitoramento e gestão de insumos da praça. Mantenha a qualidade e o mise en place impecáveis.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
          <StatCard label="Vencidos" value={String(stats.expired).padStart(2, '0')} color="border-error" textColor="text-error" variant="border-left" className="!p-3 sm:min-w-[120px]" />
          <StatCard label="Vencendo" value={String(stats.expiringSoon).padStart(2, '0')} color="border-secondary" textColor="text-secondary" variant="border-left" className="!p-3 sm:min-w-[120px]" />
          <StatCard label="Qtd. Crítica" value={String(stats.criticalQty).padStart(2, '0')} color="border-error" textColor="text-error" variant="border-left" className="!p-3 sm:min-w-[120px]" />
          <StatCard label="Qtd. Baixa" value={String(stats.lowQty).padStart(2, '0')} color="border-secondary" textColor="text-secondary" variant="border-left" className="!p-3 sm:min-w-[120px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        <div className="lg:col-span-8">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-surface-container rounded-xl p-6 border border-outline-variant/10 shadow-lg">
              <h4 className="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant">Inventário Ativo</h4>
              <div className="flex items-center gap-4">
                <Button variant="primary" onClick={() => setIsFormOpen(true)} className="md:hidden" size="sm" icon={<Plus size={14} />}>Novo Insumo</Button>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">{isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Atualizar</Button>
              </div>
            </div>

            {isManagement && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Button variant={!activeStation ? 'primary' : 'outline'} size="sm" onClick={() => setActiveStation(null)}>Todas</Button>
                {Object.entries(STATION_LABELS).map(([id, label]) => (
                  <Button key={id} variant={activeStation === id ? 'primary' : 'outline'} size="sm" onClick={() => setActiveStation(activeStation === id ? null : id)}>{label}</Button>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:hidden gap-3 mt-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filteredInsumos.length === 0 ? (
              <div className="py-20 text-center text-outline-variant text-sm col-span-2">Nenhum insumo encontrado.</div>
            ) : (
              <>
                {filteredInsumos.map((i) => (
                   <InventoryCard key={i.id} name={i.name} expiry={i.expiry_date} qty={i.quantity} unit={i.unit} onUpdate={(val: number) => handleUpdateQty(i.id, val)} onDelete={() => handleDelete(i.id)} />
                ))}
                {hasNextPage && (
                  <div className="col-span-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full py-4 border-dashed border-outline-variant/30 text-outline-variant hover:text-primary hover:border-primary/30"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                      Mostrar Mais Insumos
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="hidden md:block bg-surface-container rounded-xl overflow-hidden min-h-[400px] border border-outline-variant/10 shadow-lg mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Item / Prep</th>
                    <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Quantidade</th>
                    <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><Skeleton variant="text" className="w-3/4 mb-1" /><Skeleton variant="text" className="w-1/2 h-3" /></td>
                        <td className="px-6 py-4"><Skeleton variant="text" className="w-20 h-8 rounded-xl" /></td>
                        <td className="px-6 py-4"><Skeleton variant="text" className="w-24 h-6 rounded-lg" /></td>
                        <td className="px-6 py-4"><Skeleton variant="circle" className="ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredInsumos.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-outline-variant text-sm">Nenhum insumo encontrado.</td></tr>
                  ) : (
                    <>
                      {filteredInsumos.map((i) => (
                         <InventoryRow key={i.id} name={i.name} prep={i.last_prep_at} expiry={i.expiry_date} qty={i.quantity} unit={i.unit} onUpdate={(val: number) => handleUpdateQty(i.id, val)} onDelete={() => handleDelete(i.id)} />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
              {hasNextPage && !isLoading && (
                <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/5">
                  <Button 
                    variant="outline" 
                    className="w-full py-3 border-none text-outline-variant hover:text-primary"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCcw size={14} className="mr-2" />}
                    {isFetchingNextPage ? 'Carregando...' : 'Carregar mais itens'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`lg:col-span-4 fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:static lg:bg-transparent lg:backdrop-blur-none lg:p-0 ${isFormOpen ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-2xl relative overflow-hidden w-full max-w-md lg:max-w-none max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsFormOpen(false)} className="lg:hidden absolute top-4 right-4 p-3 text-outline-variant hover:text-on-surface z-50"><X size={24} /></button>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] rounded-full" />
            <div className="relative z-10">
              <h4 className="text-xl font-bold text-on-surface mb-1">Cadastrar Insumo</h4>
              <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em] mb-8 italic">Nova Entrada Técnica</p>
              <form onSubmit={handleAddInsumo} className="space-y-6">
                {isManagement && (
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-2">Praça de Destino</label>
                    <select value={formStation} onChange={(e) => setFormStation(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/50 uppercase">
                      <option value="">Selecionar Praça...</option>
                      {Object.entries(STATION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-2">Identificação do Item</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="EX: MOLHO HOLLANDAISE..." className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-sm font-semibold text-on-surface placeholder:text-outline-variant/30 uppercase outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-2">Medida</label>
                    <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-sm font-semibold text-on-surface outline-none">
                      <option>Litros</option><option>Kg</option><option>Unidade</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-2">Volume Inicial</label>
                    <input type="number" required step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="0.00" className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-sm font-semibold text-on-surface placeholder:text-outline-variant/30 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-widest block mb-2">Data de Validade</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[1, 3, 5, 7, 15, 30].map(d => <button key={d} type="button" onClick={() => { const date = new Date(); date.setDate(date.getDate() + d); setNewExpiry(date.toISOString().split('T')[0]); }} className="px-3 py-1.5 bg-surface-container-highest rounded-lg text-[9px] font-black uppercase tracking-widest text-outline-variant hover:bg-primary/20 hover:text-primary active:scale-95 transition-all">+{d}d</button>)}
                  </div>
                  <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-sm font-semibold text-on-surface outline-none" />
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full mt-4" icon={<ArrowRight size={16} />} iconPosition="right">Confirmar Entrada</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
