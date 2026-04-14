import React, { createContext, useContext, useState } from 'react';

export type TabId =
  | 'dashboard'
  | 'insumos'
  | 'checklist'
  | 'almoxarifado'
  | 'brigada'
  | 'menu'
  | 'relatorio'
  | 'configuracoes'
  | 'fichas'
  | 'suporte'
  | 'escala';

interface NavigationContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children, initialTab = 'dashboard' }: { children: React.ReactNode, initialTab?: TabId }) {
  const [activeTab, setActiveTabInternal] = useState<TabId>(initialTab);
  const [searchFilter, setSearchFilter] = useState('');

  const setActiveTab = (tab: TabId) => {
    setActiveTabInternal(tab);
  };

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, searchFilter, setSearchFilter }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
