/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NavigationProvider, useNavigation, TabId } from './contexts/NavigationContext';

// Page components
import Almoxarifado from './components/Almoxarifado';
import Brigada from './components/Brigada';
import Checklist from './components/Checklist';
import Dashboard from './components/Dashboard';
import Fichas from './components/Fichas';
import Insumos from './components/Insumos';
import MenuPrincipal from './components/MenuPrincipal';
import Relatorio from './components/Relatorio';
import Configuracoes from './components/Configuracoes';
import SuporteTecnico from './components/SuporteTecnico';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import Escala from './components/Escala';
import Modal from './components/shared/Modal';

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEWS: Record<TabId, React.ComponentType> = {
  dashboard: Dashboard,
  insumos: Insumos,
  checklist: Checklist,
  fichas: Fichas,
  almoxarifado: Almoxarifado,
  brigada: Brigada,
  escala: Escala,
  menu: MenuPrincipal,
  relatorio: Relatorio,
  configuracoes: Configuracoes,
  suporte: SuporteTecnico,
};

/** Navigation items shown in the mobile bottom bar. */
const MOBILE_NAV_ITEMS: Array<{ id: TabId; label: string; icon: string; minRole?: string[] }> = [
  { id: 'dashboard',    label: 'Início',    icon: 'LayoutDashboard' },
  { id: 'checklist',    label: 'Checklist', icon: 'ClipboardCheck'  },
  { id: 'insumos',      label: 'Estoque',   icon: 'Package'         },
  { id: 'fichas',       label: 'Fichas',    icon: 'BookOpen'        },
  { id: 'almoxarifado', label: 'Almoxa',    icon: 'Warehouse',      minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'] },
  { id: 'brigada',      label: 'Brigada',   icon: 'Users',          minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
  { id: 'menu',         label: 'Menu',      icon: 'UtensilsCrossed' },
  { id: 'suporte',      label: 'Suporte',   icon: 'HelpCircle'      },
  { id: 'configuracoes', label: 'Ajustes',   icon: 'Settings'        },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MobileNavItemProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function MobileNavItem({ active, onClick, icon, label }: MobileNavItemProps) {
  const Icon = (Icons as Record<string, any>)[icon] || Icons.HelpCircle;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center transition-all duration-300 px-1 ${
        active ? 'text-primary scale-110' : 'text-outline-variant hover:text-on-surface/80'
      }`}
    >
      <Icon size={18} />
      <span className="text-[8px] uppercase tracking-wider font-bold mt-1 leading-none">
        {label}
      </span>
    </button>
  );
}

// ─── App Internal ──────────────────────────────────────────────────────────────

function AppContent() {
  const { session, loading, profile, requirePasswordChange } = useAuth();
  const { activeTab, setActiveTab } = useNavigation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (requirePasswordChange) {
    return <ResetPassword />;
  }

  const View = VIEWS[activeTab];

  const filteredNavItems = MOBILE_NAV_ITEMS.filter(item => {
    if (!item.minRole) return true;
    return profile?.role && item.minRole.includes(profile.role);
  });

  return (
    <div className="flex min-h-screen bg-surface overflow-x-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-0 md:ml-64 min-h-screen w-full max-w-full relative overflow-x-hidden min-w-0 flex flex-col focus:outline-none">
        <div key={activeTab} className="flex-1 w-full max-w-full animate-view overflow-x-hidden">
          <View />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-surface/60 backdrop-blur-xl rounded-t-xl shadow-[0px_-10px_30px_rgba(0,0,0,0.5)] border-t border-outline-variant/10">
        {filteredNavItems.map((item) => (
          <div key={item.id} className="flex-1">
            <MobileNavItem
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              icon={item.icon}
              label={item.label}
            />
          </div>
        ))}
      </nav>
    </div>
  );
}


export default function App() {
  return (
    <ThemeProvider>
      <ModalProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationProvider>
              <AppContent />
              <Modal />
            </NavigationProvider>
          </NotificationProvider>
        </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}
