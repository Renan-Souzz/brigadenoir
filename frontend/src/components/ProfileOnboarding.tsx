import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Utensils, ChefHat, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from './shared/Button';
import { useModal } from '../contexts/ModalContext';

export default function ProfileOnboarding() {
  const { user, refreshProfile } = useAuth();
  const { showAlert } = useModal();
  const [inviteCode, setInviteCode] = useState('');
  const [station, setStation] = useState('');
  const [shift, setShift] = useState('manha');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || !station) return showAlert('Atenção', 'Preencha todos os campos técnicos.');
    
    setLoading(true);
    try {
      // 1. Chamar a função RPC para ativar o perfil e validar o código
      const { error } = await supabase.rpc('activate_profile', {
        p_invite_code: inviteCode,
        p_station: station,
        p_shift: shift,
        p_full_name: fullName
      });

      if (error) throw error;

      showAlert('Perfil Configurado', 'Sua conta técnica foi ativada com sucesso!');
      await refreshProfile(); // Recarrega o perfil para liberar as abas
    } catch (err: any) {
      console.error('Erro na ativação:', err);
      showAlert('Erro na Ativação', err.message || 'Código de convite inválido ou erro na conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20">
            <ChefHat size={40} className="text-primary" />
          </div>
          <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Quase lá, Chef!</h2>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-outline-variant mt-2 px-10">Vincule sua conta Google às suas credenciais técnicas na Brigade Noir</p>
        </div>

        <div className="bg-surface-container rounded-[40px] p-10 border border-outline-variant/10 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-3 block">Identificação Profissional</label>
              <div className="relative">
                <ChefHat className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                  placeholder="Seu Nome de Chef"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-3 block">Código de Convite (Brigada)</label>
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                <input 
                  type="text" 
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                  placeholder="BN-XXXXXX"
                />
              </div>
              <p className="text-[8px] text-outline-variant mt-2 uppercase font-black tracking-widest flex items-center gap-1.5 px-2">
                <AlertCircle size={10} /> O código define seu nível de acesso
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-3 block">Praça de Atuação</label>
              <div className="relative">
                <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                <select 
                  required
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold appearance-none cursor-pointer"
                >
                  <option value="" disabled>Selecione sua Praça</option>
                  <option value="saucier">Saucier</option>
                  <option value="garde_manger">Garde Manger</option>
                  <option value="entremetier">Entremetier</option>
                  <option value="rotisseur">Rôtisseur</option>
                  <option value="poissonier">Poissonnier</option>
                  <option value="patissier">Pâtissier</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-3 block">Turno de Trabalho</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShift('manha')}
                  className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    shift === 'manha' 
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(var(--md-sys-color-primary-rgb),0.2)]' 
                    : 'bg-surface-container-highest border-transparent text-outline-variant hover:border-outline-variant/30'
                  }`}
                >
                  Manhã (5h - 15h)
                </button>
                <button
                  type="button"
                  onClick={() => setShift('tarde')}
                  className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    shift === 'tarde' 
                    ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_20px_rgba(var(--md-sys-color-secondary-rgb),0.2)]' 
                    : 'bg-surface-container-highest border-transparent text-outline-variant hover:border-outline-variant/30'
                  }`}
                >
                  Tarde (15h - 0h)
                </button>
              </div>
            </div>

            <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full" 
                loading={loading}
                icon={<CheckCircle2 size={18} />}
            >
              Ativar Credenciais
            </Button>
          </form>
        </div>

        <p className="text-center mt-10 text-[9px] text-outline font-black uppercase tracking-[0.3em] opacity-30">
          Ativação Técnica Obrigatória • Brigade Noir 2026
        </p>
      </div>
    </div>
  );
}
