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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
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

            {isLogin && (
              <>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.3em]">
                    <span className="bg-surface-container px-4 text-outline-variant">Ou use sua conta</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/95 text-gray-900 font-black uppercase text-[10px] tracking-widest py-4 px-6 rounded-xl border border-gray-200 shadow-sm transition-all active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar com Google
                </button>
              </>
            )}
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
