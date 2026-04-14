import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, X, Trash2, Keyboard } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';

export default function Modal() {
  const { modalState, onConfirm, onCancel } = useModal();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalState?.type === 'prompt') {
      setInputValue(modalState.defaultValue || '');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [modalState]);

  if (!modalState) return null;

  const isConfirm = modalState.type === 'confirm';
  const isPrompt = modalState.type === 'prompt';

  const handleConfirm = () => {
    if (isPrompt) {
      onConfirm(inputValue);
    } else {
      onConfirm(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-surface-container-high border border-outline-variant/20 rounded-3xl shadow-[0_0_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        
        {/* Indicador visual no topo */}
        <div className={`h-1 w-full ${isConfirm ? 'bg-gradient-to-r from-red-500 via-red-400 to-red-500' : 'bg-gradient-to-r from-primary via-secondary to-primary'}`} />
        
        <div className="p-8 text-center">
          {/* Ícone */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isConfirm 
              ? 'bg-red-500/10 border border-red-500/20' 
              : isPrompt
              ? 'bg-secondary/10 border border-secondary/20'
              : 'bg-primary/10 border border-primary/20'
          }`}>
            {isConfirm 
              ? <AlertTriangle size={28} className="text-red-400" /> 
              : isPrompt
              ? <Keyboard size={28} className="text-secondary" />
              : <CheckCircle2 size={28} className="text-primary" />
            }
          </div>
          
          {/* Título */}
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-3">
            {modalState.title}
          </h3>
          
          {/* Mensagem */}
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            {modalState.message}
          </p>

          {/* Input para Prompt */}
          {isPrompt && (
            <div className="mt-2 animate-in slide-in-from-bottom-2 duration-300">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite aqui..."
                className="w-full bg-surface-container-highest border-2 border-primary/10 focus:border-primary/40 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none transition-all placeholder:text-outline-variant/40"
              />
            </div>
          )}
          
          {isConfirm && (
            <p className="text-[10px] text-outline-variant uppercase tracking-widest mt-3">
              Esta ação não pode ser desfeita.
            </p>
          )}
        </div>
        
        {/* Botões */}
        <div className="flex gap-3 p-6 pt-0">
          {(isConfirm || isPrompt) && (
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-black text-on-surface uppercase tracking-widest hover:bg-surface-container-highest transition-all active:scale-95"
            >
              {modalState.cancelText || 'Cancelar'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isConfirm 
                ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30' 
                : 'bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30'
            }`}
          >
            {isConfirm ? (
              <><Trash2 size={16} /> {modalState.confirmText || 'Excluir'}</>
            ) : (
              modalState.confirmText || (isPrompt ? 'Confirmar' : 'Entendido')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
