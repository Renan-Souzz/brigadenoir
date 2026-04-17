import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus, AlertCircle, ChefHat, User, Ticket, Utensils } from 'lucide-react';
import Button from './shared/Button';
import { useModal } from '../contexts/ModalContext';

export default function Auth() {
  const { showAlert } = useModal();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [station, setStation] = useState('');
  const [shift, setShift] = useState('manha');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              invite_code: inviteCode,
              station: station || null,
              shift: shift
            }
          }
        });
        if (error) throw error;
        showAlert('Conta Criada', 'Confirme seu e-mail para ativar sua conta técnica na Brigade.');
      }
    } catch (err: any) {
      showAlert('Erro de Autenticação', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      return showAlert('E-mail Obrigatório', 'Por favor, digite seu e-mail no campo acima para redefinir a senha.');
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      showAlert('Link Enviado', 'Um link de redefinição de senha foi enviado para o seu e-mail. Caso não encontre, verifique a caixa de spam.');
    } catch (err: any) {
      showAlert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-surface-container rounded-[2rem] mb-6 shadow-2xl border border-outline-variant/10 overflow-hidden">
            <img src="/logo.png" alt="Logo BN" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">Brigade Noir</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-outline-variant mt-2">Sistema de Gestão Executiva</p>
        </div>

        <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Credencial Técnica (E-mail)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                  placeholder="chef@brigadenoir.com"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Identificação (Nome Completo)</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                    <input 
                      type="text" 
                      required={!isLogin}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                      placeholder="Chef Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Código de Acesso (Convite)</label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                    <input 
                      type="text" 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                      placeholder="BN-XXXXXX"
                    />
                  </div>
                  <p className="text-[8px] text-outline-variant mt-1 uppercase font-bold tracking-tighter">* Obrigatório para cargos de liderança</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Praça de Atuação</label>
                  <div className="relative">
                    <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                    <select 
                      required
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold appearance-none"
                    >
                      <option value="" disabled>Selecione uma Praça</option>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Turno de Trabalho</label>
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
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Assinatura Digital (Senha)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold"
                  placeholder="••••••••"
                />
              </div>
              {isLogin && (
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[9px] font-bold uppercase tracking-widest text-outline-variant hover:text-primary transition-colors"
                  >
                    Esqueceu a assinatura?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 flex items-center gap-3 animate-shake">
                <AlertCircle className="text-error" size={18} />
                <p className="text-xs font-bold text-error uppercase tracking-tight">{error}</p>
              </div>
            )}

            <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full" 
                loading={loading}
                icon={isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            >
              {isLogin ? 'Entrar no Sistema' : 'Solicitar Acesso'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black uppercase tracking-widest text-outline-variant hover:text-primary transition-colors"
            >
              {isLogin ? 'Não possui acesso? Solicite agora' : 'Já possui credenciais? Acesse aqui'}
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-[9px] text-outline font-bold uppercase tracking-[0.2em] opacity-40">
          © 2026 Brigade Noir Executivo • Criptografia de Ponta-a-Ponta
        </p>
      </div>
    </div>
  );
}
