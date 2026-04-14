import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { Lock, Loader2 } from 'lucide-react';
import Button from './shared/Button';

export default function ResetPassword() {
  const { completePasswordChange } = useAuth();
  const { showAlert } = useModal();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return showAlert('Atenção', 'As senhas não coincidem. Tente novamente.');
    }
    if (password.length < 6) {
      return showAlert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
    }

    setLoading(true);
    try {
      await completePasswordChange(password);
      showAlert('Sucesso', 'Sua senha foi redefinida com sucesso. Bem-vindo de volta!');
    } catch (err: any) {
      showAlert('Erro', 'Ocorreu um erro ao redefinir a senha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10 bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-high rounded-2xl mb-4 shadow-inner">
            <Lock size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Nova Senha</h2>
          <p className="text-xs text-outline-variant mt-2 font-medium">Por razões de segurança ou redefinição, defina uma nova senha para o seu acesso.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Nova Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Confirmar Nova Senha</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary transition-all font-semibold outline-none"
              placeholder="••••••••"
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full mt-4 h-12 rounded-xl uppercase tracking-widest font-black text-[10px]"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Nova Senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
