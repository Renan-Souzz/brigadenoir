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
  Trash2
} from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, AppRole, KitchenStation, Profile } from '../contexts/AuthContext';
import { useProfiles, useInvites } from '../hooks/useProfiles';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import { useModal } from '../contexts/ModalContext';
import Button from './shared/Button';

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
  const { data: users = [], isLoading: usersLoading, updateProfile, refetch: refetchUsers } = useProfiles();
  const { data: invites = [], isLoading: invitesLoading, generateInvite, deleteInvite } = useInvites();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Invite generation state
  const [inviteRole, setInviteRole] = useState<AppRole>('commis');
  const [isGenerating, setIsGenerating] = useState(false);

  // Local state for editing
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
    setEditRole(user.role as AppRole);
    setEditStation(user.station as KitchenStation || '');
    setEditShift(user.shift as 'manha' | 'tarde' || 'manha');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRole('');
    setEditStation('');
  };

  const handleSaveChanges = async (userId: string) => {
    try {
      await updateProfile({ 
        userId, 
        updates: { 
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
    const email = await showPrompt(
      `Redefinição de Senha`,
      `Por favor, confirme o E-MAIL do funcionário [${user.full_name}] para enviarmos o link temporário de acesso:`
    );
    if (!email || !email.trim()) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      showAlert('Link Enviado', `O link de acesso temporário foi encaminhado para ${email}. No próximo login, será solicitada a criação de uma nova senha.`);
    } catch (err: any) {
      showAlert('Erro no Envio', err.message || 'Falha ao enviar link de redefinição.');
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

      <div className="mt-8 mb-12 flex flex-col md:flex-row justify-between gap-8">
        <div className="max-w-2xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase">Quadro de Pessoal</span>
          <h3 className="text-5xl font-black text-on-surface mt-2 tracking-tighter leading-none">A ESCALA</h3>
          <p className="mt-4 text-on-surface-variant leading-relaxed text-sm">
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
        <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low flex justify-between items-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Membros Ativos ({filteredUsers.length})</h4>
          <Button variant="ghost" size="sm" onClick={() => refetchUsers()} icon={<RefreshCcw size={14} className={usersLoading ? 'animate-spin' : ''} />}>Recarregar</Button>
        </div>

        <div className="overflow-x-auto">
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
                        <span className="text-sm font-semibold text-on-surface">{u.full_name || 'Usuário Sem Nome'}</span>
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
                        <div className="flex flex-col">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit shadow-sm ${
                            ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'].includes(u.role) ? 'bg-primary/20 text-primary border border-primary/10' :
                            u.role === 'chef_de_partie' ? 'bg-secondary/20 text-secondary' :
                            'bg-outline-variant/20 text-outline'
                          }`}>
                            {ROLE_LABELS[u.role as AppRole] || u.role}
                          </span>
                          {!isManagement && editingId === u.id && (
                            <span className="text-[8px] text-outline-variant mt-1 uppercase font-bold tracking-tighter">Somente Gestão pode alterar cargo</span>
                          )}
                        </div>
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
                          <button 
                            onClick={() => handleSaveChanges(u.id)}
                            className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="p-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          {isManagement && (
                            <button 
                              onClick={() => handleResetPassword(u)}
                              title="Redefinir Senha"
                              className="p-2 transition-colors rounded-lg text-outline-variant hover:text-secondary hover:bg-secondary/10"
                            >
                              <Key size={18} />
                            </button>
                          )}
                          <button 
                            disabled={!canEditUser(u)}
                            onClick={() => startEditing(u)}
                            title="Editar Dados"
                            className={`p-2 transition-colors rounded-lg ${
                              canEditUser(u) ? 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest' : 'opacity-20 cursor-not-allowed'
                            }`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
