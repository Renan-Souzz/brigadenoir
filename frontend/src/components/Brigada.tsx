import { 
  Users, 
  Shield, 
  UserPlus, 
  Search,
  MoreVertical,
  Check,
  X,
  Loader2,
  Ticket,
  Copy,
  Plus,
  RefreshCcw,
  Key,
  Trash2,
  Pencil
} from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, AppRole, KitchenStation, Profile } from '../contexts/AuthContext';
import { useProfiles, useInvites } from '../hooks/useProfiles';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import { useModal } from '../contexts/ModalContext';
import Button from './shared/Button';
import { NotificationService } from '../services/NotificationService';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Sys Admin',
  chef_executivo: 'Chef Executivo',
  chef_de_cuisine: 'Chef de Cozinha',
  sous_chef: 'Sous Chef',
  chef_de_partie: 'Chefe de Partida',
  commis: 'Commis / Cozinheiro',
  ficha_tecnica: 'Gestor de Custos',
  fichas: 'Acesso Fichas'
};

const STATION_LABELS: Record<string, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  entremetier: 'Entremetier',
  rotisseur: 'Rôtisseur',
  poissonier: 'Poissonnier',
  patissier: 'Pâtissier'
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Brigada() {
  const { profile, isManagement, isStationLead } = useAuth();
  const { showAlert, showConfirm, showPrompt } = useModal();
  const { data: users = [], isLoading: usersLoading, updateProfile, deleteProfile, refetch: refetchUsers } = useProfiles();
  const { data: invites = [], isLoading: invitesLoading, generateInvite, deleteInvite } = useInvites();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Invite generation state
  const [inviteRole, setInviteRole] = useState<AppRole>('commis');
  const [isGenerating, setIsGenerating] = useState(false);

  // Local state for editing
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<AppRole | ''>('');
  const [editStation, setEditStation] = useState<KitchenStation | ''>('');
  const [editShift, setEditShift] = useState<'manha' | 'tarde'>('manha');

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    try {
      await generateInvite({ role: inviteRole, createdBy: profile?.id || '' });
    } catch (err) {
      showAlert('Falha no Convite', 'Não foi possível gerar um código técnico no momento.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeInvite = async (id: string, code: string) => {
    const confirmed = await showConfirm(
      'Revogar Convite',
      `Tem certeza que deseja invalidar o acesso [${code}]? Este código deixará de funcionar imediatamente.`
    );
    if (confirmed) {
      try {
        await deleteInvite(id);
      } catch (err: any) {
        showAlert('Erro', 'Não foi possível excluir o convite: ' + err.message);
      }
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    showAlert('Código Copiado', `O acesso [${code}] foi transferido para sua área de transferência.`);
  };

  const startEditing = (user: Profile) => {
    setEditingId(user.id);
    setEditName(user.full_name || '');
    setEditRole(user.role as AppRole);
    setEditStation(user.station as KitchenStation || '');
    setEditShift(user.shift as 'manha' | 'tarde' || 'manha');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditRole('');
    setEditStation('');
  };

  const handleSaveChanges = async (userId: string) => {
    try {
      await updateProfile({ 
        userId, 
        updates: { 
          full_name: editName.trim() || undefined,
          role: editRole as AppRole, 
          station: editStation as KitchenStation,
          shift: editShift
        } 
      });
      setEditingId(null);
    } catch (err) {
      showAlert('Erro de Permissão', 'Falha ao atualizar usuário. Verifique suas credenciais de liderança.');
      console.error(err);
    }
  };

  const handleResetPassword = async (user: Profile) => {
    const newPassword = await showPrompt(
      `Nova Senha para ${user.full_name}`,
      `Digite a nova senha (mínimo 6 caracteres). O funcionário poderá usar essa senha imediatamente, sem necessidade de confirmar por e-mail.`
    );
    if (!newPassword || !newPassword.trim()) return;

    if (newPassword.trim().length < 6) {
      showAlert('Senha Inválida', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-reset-password', {
        body: { targetUserId: user.id, newPassword: newPassword.trim() },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      // Notify the user about their password change
      await NotificationService.notifyUser(user.id, {
        title: 'Assinatura Atualizada',
        message: 'A liderança definiu uma nova assinatura (senha) para sua credencial técnica.',
        type: 'warning'
      });

      showAlert('Senha Alterada', `A senha de ${user.full_name} foi atualizada com sucesso! Ele(a) já pode usar a nova senha.`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao alterar a senha.');
    }
  };

  const handleDeleteMember = async (user: Profile) => {
    const confirmed = await showConfirm(
      'Excluir Membro',
      `Tem certeza que deseja remover "${user.full_name}" da brigada? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    try {
      await deleteProfile(user.id);
      showAlert('Membro Removido', `${user.full_name} foi removido da brigada com sucesso.`);
    } catch (err: any) {
      showAlert('Erro', 'Não foi possível remover o membro: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEditUser = (targetUser: Profile) => {
    if (isManagement) return true;
    if (isStationLead && targetUser.station === profile?.station) return true;
    return false;
  };

  if (!isManagement && !isStationLead) {
    return (
      <PageLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center text-center">
          <Shield size={48} className="text-outline-variant mb-4" />
          <h2 className="text-2xl font-bold text-on-surface">Acesso Restrito</h2>
          <p className="text-on-surface-variant max-w-xs mt-2">
            Somente Chefs e Sous-Chefs podem gerenciar a brigada.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        leftContent={
          <div className="flex items-center gap-3">
            <Users className="text-primary" size={24} />
            <h2 className="text-xl font-bold tracking-tighter text-on-surface uppercase">Gestão da Brigada</h2>
          </div>
        }
        showSearch
        searchPlaceholder="BUSCAR MEMBRO..."
        onSearchChange={setSearchTerm}
        avatarSeed={profile?.full_name || 'chef'}
      />

      <div className="mt-6 md:mt-8 mb-8 md:mb-12 flex flex-col md:flex-row justify-between gap-6 md:gap-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase">Quadro de Pessoal</span>
          <h3 className="text-3xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none">A ESCALA</h3>
          <p className="mt-3 md:mt-4 text-on-surface-variant leading-relaxed text-xs md:text-sm">
            Distribua os talentos da cozinha pelas praças. O acesso a cargos de liderança exige um código de convite técnico.
          </p>
        </div>

        {isManagement && (
          <div className="bg-surface-container rounded-2xl p-6 border border-primary/10 w-full md:w-80 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Ticket size={40} /></div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Gerar Novo Convite</h4>
            <div className="space-y-4 relative z-10">
              <select 
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AppRole)}
                className="w-full bg-surface-container-highest border-none rounded-lg p-2.5 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary"
              >
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full" 
                onClick={handleGenerateInvite}
                loading={isGenerating}
                icon={<Plus size={14} />}
              >
                Gerar Código
              </Button>
            </div>
          </div>
        )}
      </div>

      {isManagement && invites.length > 0 && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={16} className="text-primary" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Convites Ativos</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {invites.map(invite => (
              <div
                key={invite.id}
                className="group min-w-[160px] relative p-[1px] rounded-2xl shadow-none hover:shadow-[0_0_20px_rgba(0,180,216,0.2)] transition-all duration-500 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/40 to-primary/40 group-hover:from-primary group-hover:via-secondary group-hover:to-primary opacity-50 group-hover:opacity-100 blur-[0.5px] group-hover:scale-110 transition-all duration-500"></span>
                <div className="relative flex flex-col justify-between p-4 rounded-[15px] h-full w-full bg-[#1a1c23] group-hover:bg-surface-container-highest transition-all duration-300">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-tighter text-primary/70 group-hover:text-primary mb-1 transition-colors">{ROLE_LABELS[invite.role]}</p>
                    <p className="text-base font-black text-on-surface tracking-widest">{invite.code}</p>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant/10 pt-3">
                    <button 
                      onClick={() => copyToClipboard(invite.code)}
                      className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                    >
                      <Copy size={11} /> Copiar
                    </button>
                    <button 
                      onClick={() => handleRevokeInvite(invite.id, invite.code)}
                      className="p-1 text-outline-variant/30 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                      title="Excluir Convite"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm mb-20">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-outline-variant/10 bg-surface-container-low flex justify-between items-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Membros Ativos ({filteredUsers.length})</h4>
          <Button variant="ghost" size="sm" onClick={() => refetchUsers()} icon={<RefreshCcw size={14} className={usersLoading ? 'animate-spin' : ''} />}>Recarregar</Button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/30">
                <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Nome</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Cargo</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Praça</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase">Turno</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-outline uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary" size={32} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-outline-variant font-medium">Nenhum membro encontrado.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-high/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                          {u.full_name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        {editingId === u.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-surface-container-highest border-none rounded-lg p-2 text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary w-full max-w-[200px]"
                            placeholder="Nome do funcionário"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-on-surface">{u.full_name || 'Usuário Sem Nome'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === u.id && isManagement ? (
                        <select 
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as AppRole)}
                          className="bg-surface-container-highest border-none rounded-lg p-2 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary"
                        >
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit shadow-sm ${
                          ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'].includes(u.role) ? 'bg-primary/20 text-primary border border-primary/10' :
                          u.role === 'chef_de_partie' ? 'bg-secondary/20 text-secondary' :
                          'bg-outline-variant/20 text-outline'
                        }`}>
                          {ROLE_LABELS[u.role as AppRole] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === u.id ? (
                        <select 
                          required
                          value={editStation}
                          onChange={(e) => setEditStation(e.target.value as KitchenStation)}
                          className="bg-surface-container-highest border-none rounded-lg p-2 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary"
                        >
                          <option value="" disabled>Selecione uma Praça</option>
                          {Object.entries(STATION_LABELS).map(([val, label]) => {
                            const isDisabled = isStationLead && val !== profile?.station;
                            if (isDisabled && val !== u.station) return null;
                            return (
                              <option key={val} value={val} disabled={isDisabled}>
                                {label} {isDisabled ? '(Restrito)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#a6cce3]"></div>
                          {STATION_LABELS[u.station || 'saucier'] || 'Praça Indefinida'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === u.id ? (
                        <select 
                          value={editShift}
                          onChange={(e) => setEditShift(e.target.value as 'manha' | 'tarde')}
                          className="bg-surface-container-highest border-none rounded-lg p-2 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary"
                        >
                          <option value="manha">Manhã</option>
                          <option value="tarde">Tarde</option>
                        </select>
                      ) : (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${u.shift === 'tarde' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                          {u.shift === 'tarde' ? 'Tarde' : 'Manhã'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === u.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleSaveChanges(u.id)} className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"><Check size={16} /></button>
                          <button onClick={cancelEditing} className="p-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          {isManagement && (
                            <>
                              <button onClick={() => handleResetPassword(u)} title="Redefinir Senha" className="p-2 transition-colors rounded-lg text-outline-variant hover:text-secondary hover:bg-secondary/10"><Key size={16} /></button>
                              <button onClick={() => handleDeleteMember(u)} title="Excluir Membro" className="p-2 transition-colors rounded-lg text-outline-variant hover:text-red-400 hover:bg-red-400/10"><Trash2 size={16} /></button>
                            </>
                          )}
                          <button disabled={!canEditUser(u)} onClick={() => startEditing(u)} title="Editar Dados" className={`p-2 transition-colors rounded-lg ${canEditUser(u) ? 'text-outline-variant hover:text-primary hover:bg-primary/10' : 'opacity-20 cursor-not-allowed'}`}><Pencil size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-outline-variant/10">
          {usersLoading ? (
            <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-outline-variant font-medium text-sm">Nenhum membro encontrado.</div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="p-4">
                {editingId === u.id ? (
                  <div className="space-y-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-surface-container-highest rounded-xl p-3 text-sm font-bold text-on-surface border border-primary/20 focus:ring-1 focus:ring-primary outline-none" placeholder="Nome" />
                    <div className="grid grid-cols-2 gap-2">
                      {isManagement && (
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value as AppRole)} className="bg-surface-container-highest rounded-lg p-2.5 text-[11px] font-bold text-on-surface border-none">
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
                        </select>
                      )}
                      <select value={editStation} onChange={(e) => setEditStation(e.target.value as KitchenStation)} className="bg-surface-container-highest rounded-lg p-2.5 text-[11px] font-bold text-on-surface border-none">
                        <option value="" disabled>Praça</option>
                        {Object.entries(STATION_LABELS).map(([val, label]) => {
                          const isDisabled = isStationLead && val !== profile?.station;
                          if (isDisabled && val !== u.station) return null;
                          return (<option key={val} value={val} disabled={isDisabled}>{label}</option>);
                        })}
                      </select>
                      <select value={editShift} onChange={(e) => setEditShift(e.target.value as 'manha' | 'tarde')} className="bg-surface-container-highest rounded-lg p-2.5 text-[11px] font-bold text-on-surface border-none">
                        <option value="manha">Manhã</option>
                        <option value="tarde">Tarde</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveChanges(u.id)} className="flex-1 py-2.5 bg-primary/20 text-primary rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2"><Check size={14} /> Salvar</button>
                      <button onClick={cancelEditing} className="flex-1 py-2.5 bg-error/20 text-error rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2"><X size={14} /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-[11px] font-bold text-primary border border-primary/20 shrink-0">
                      {u.full_name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{u.full_name || 'Sem Nome'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'].includes(u.role) ? 'bg-primary/20 text-primary' :
                          u.role === 'chef_de_partie' ? 'bg-secondary/20 text-secondary' : 'bg-outline-variant/20 text-outline'
                        }`}>{ROLE_LABELS[u.role as AppRole] || u.role}</span>
                        <span className="text-[9px] text-on-surface-variant font-bold">{STATION_LABELS[u.station || 'saucier'] || '—'}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${u.shift === 'tarde' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>{u.shift === 'tarde' ? 'Tarde' : 'Manhã'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isManagement && (
                        <>
                          <button onClick={() => handleResetPassword(u)} className="p-2 text-outline-variant active:text-secondary"><Key size={16} /></button>
                          <button onClick={() => handleDeleteMember(u)} className="p-2 text-outline-variant active:text-red-400"><Trash2 size={16} /></button>
                        </>
                      )}
                      <button disabled={!canEditUser(u)} onClick={() => startEditing(u)} className={`p-2 ${canEditUser(u) ? 'text-outline-variant active:text-primary' : 'opacity-20'}`}><Pencil size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
