import React, { useState, useEffect } from 'react';
import { 
  User, 
  Moon, 
  Sun, 
  Save, 
  LogOut,
  Check,
  ChevronRight,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';
import { useModal } from '../contexts/ModalContext';

// Hooks
import { useProfiles } from '../hooks/useProfiles';

export default function Configuracoes() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showAlert } = useModal();
  
  const { updateProfile } = useProfiles();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [success, setSuccess] = useState(false);

  // Sync with profile if it changes (e.g. from context)
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setLoading(true);
    setSuccess(false);

    try {
      await updateProfile({ 
        userId: profile.id, 
        updates: { 
          full_name: fullName,
          avatar_url: avatarUrl 
        } 
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Optional: Refresh the page or trust that AuthProvider will update from DB
      // Most Supabase AuthProviders need a manual profile refresh if they don't listen to 'profiles' changes.
    } catch (err: any) {
      showAlert('Erro de Perfil', 'Falha ao atualizar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_PRESETS = ['chef1', 'chef2', 'chef3', 'chef4', 'chef5', 'user1', 'user2'];

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto mt-8 pb-32">
        <header className="mb-12">
          <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-secondary uppercase">Personalização</span>
          <h2 className="text-4xl md:text-5xl font-black text-on-surface mt-2 tracking-tighter uppercase">Configurações</h2>
          <p className="text-outline-variant uppercase tracking-widest text-[10px] font-bold mt-2">Gerencie sua identidade e preferências na Brigade</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Section */}
            <section className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><User size={20} /></div>
                <h3 className="text-xl font-bold text-on-surface">Perfil do Usuário</h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Nome Completo</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-surface border border-outline-variant/30 rounded-xl py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-4 block">Avatar da Brigade</label>
                  <div className="flex flex-wrap gap-4">
                    {AVATAR_PRESETS.map((seed) => (
                      <button key={seed} type="button" onClick={() => setAvatarUrl(seed)} className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${avatarUrl === seed ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/20 grayscale hover:grayscale-0'}`}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} className="w-full h-full object-cover" alt="Avatar" />
                        {avatarUrl === seed && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><Check className="text-primary" size={24} /></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Button variant="primary" size="lg" type="submit" loading={loading} icon={success ? <Check size={18} /> : <Save size={18} />}>
                    {success ? 'Atualizado' : 'Salvar Perfil'}
                  </Button>
                  {success && <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Sincronizado</span>}
                </div>
              </form>
            </section>

            {/* Appearance Section */}
            <section className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-tertiary-dim/10 flex items-center justify-center text-tertiary">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div>
                <h3 className="text-xl font-bold text-on-surface">Aparência do Sistema</h3>
              </div>
              <div className="flex items-center justify-between p-6 bg-surface rounded-2xl border border-outline-variant/10">
                <div><h4 className="font-bold text-on-surface">Modo Noturno</h4><p className="text-xs text-outline tracking-tight mt-1">Conforto visual para operações em baixa luz.</p></div>
                <button onClick={toggleTheme} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-offset-surface ${theme === 'dark' ? 'bg-primary ring-primary' : 'bg-outline-variant ring-outline-variant'}`}>
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </section>
          </div>

          <div className="md:col-span-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-primary-container/5 rounded-2xl p-6 border border-primary/10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Membro da Brigada</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm"><span className="text-outline">Cargo</span><span className="font-bold text-on-surface capitalize">{profile?.role?.replace('_', ' ')}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-outline">Praça</span><span className="font-bold text-on-surface capitalize">{profile?.station || 'Geral'}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-outline">Status</span><span className="text-[10px] font-black uppercase px-2 py-0.5 bg-green-500/10 text-green-400 rounded">Operacional</span></div>
              </div>
            </div>

            <button onClick={signOut} className="w-full flex items-center justify-between p-6 bg-error/10 hover:bg-error/20 rounded-2xl border border-error/20 transition-all text-error group">
              <div className="flex items-center gap-3"><LogOut size={20} /><span className="font-bold uppercase text-xs tracking-widest">Encerrar Sessão</span></div>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
