import React, { createContext, useContext, useState, useCallback } from 'react';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

interface ModalContextType {
  showAlert: (title: string, message: string) => Promise<void>;
  showConfirm: (title: string, message: string, options?: Partial<ModalOptions>) => Promise<boolean>;
  showPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>;
  modalState: ModalOptions | null;
  onConfirm: (value?: string | boolean) => void;
  onCancel: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (val: any) => void } | null>(null);

  const showAlert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setModalState({ title, message, type: 'alert' });
      setResolver({ resolve });
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, options?: Partial<ModalOptions>) => {
    return new Promise<boolean>((resolve) => {
      setModalState({ title, message, type: 'confirm', ...options });
      setResolver({ resolve });
    });
  }, []);

  const showPrompt = useCallback((title: string, message: string, defaultValue = '') => {
    return new Promise<string | null>((resolve) => {
      setModalState({ title, message, type: 'prompt', defaultValue });
      setResolver({ resolve });
    });
  }, []);

  const onConfirm = (value?: string | boolean) => {
    if (resolver) resolver.resolve(value ?? true);
    setModalState(null);
    setResolver(null);
  };

  const onCancel = () => {
    if (resolver) resolver.resolve(false);
    setModalState(null);
    setResolver(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt, modalState, onConfirm, onCancel }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
