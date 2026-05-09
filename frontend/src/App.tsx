/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard, UtensilsCrossed, Package, FileSpreadsheet,
  ClipboardCheck, Calendar, Warehouse, Users, BarChart3,
  BookOpen, HelpCircle, Settings, X, Menu, FileText, type LucideIcon
} from 'lucide-react';

// Icon lookup map — replaces import * to avoid bundling all 1500+ icons
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, UtensilsCrossed, Package, FileSpreadsheet,
  ClipboardCheck, Calendar, Warehouse, Users, BarChart3,
  BookOpen, HelpCircle, Settings, X, Menu, FileText
};
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
import ModuloFichaTecnica from './components/ModuloFichaTecnica';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import Escala from './components/Escala';
import Modal from './components/shared/Modal';
import ProfileOnboarding from './components/ProfileOnboarding';
import Documentation from './components/Documentation';
import ModoDePreparo from './components/ModoDePreparo';

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEWS: Record<TabId, React.ComponentType> = {
  dashboard: Dashboard,
  insumos: Insumos,
  checklist: Checklist,
  fichas: ModoDePreparo,
  almoxarifado: Almoxarifado,
  brigada: Brigada,
  escala: Escala,
  menu: MenuPrincipal,
  relatorio: Relatorio,
  configuracoes: Configuracoes,
  suporte: SuporteTecnico,
  mod_ficha_tecnica: ModuloFichaTecnica,
  docs: Documentation,
};

/** Navigation items shown in the mobile bottom bar. Core items only. */
const CORE_MOBILE_ITEMS: Array<{ id: TabId; label: string; icon: string; minRole?: string[] }> = [
  { id: 'dashboard',    label: 'Início',    icon: 'LayoutDashboard' },
  { id: 'menu',         label: 'Menu',      icon: 'UtensilsCrossed' },
  { id: 'insumos',      label: 'Estoque',   icon: 'Package'         },
  { id: 'mod_ficha_tecnica', label: 'Ficha Técnica', icon: 'FileSpreadsheet' },
];

/** Secondary items for the 'More' menu. */
const SECONDARY_MOBILE_ITEMS: Array<{ id: TabId; label: string; icon: string; minRole?: string[] }> = [
  { id: 'checklist',    label: 'Checklist', icon: 'ClipboardCheck'   },
  { id: 'escala',       label: 'Escala',    icon: 'Calendar'         },
  { id: 'almoxarifado', label: 'Almoxa',    icon: 'Warehouse',       minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'] },
  { id: 'brigada',      label: 'Brigada',   icon: 'Users',           minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
  { id: 'relatorio',    label: 'Inteligência & CMV', icon: 'BarChart3'        },
  { id: 'fichas',       label: 'Biblioteca', icon: 'BookOpen'        },
  { id: 'suporte',      label: 'Suporte',   icon: 'HelpCircle'       },
  { id: 'docs',         label: 'Docs & Manuais', icon: 'FileText'     },
  { id: 'configuracoes', label: 'Ajustes',   icon: 'Settings'         },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MobileNavItemProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  isMore?: boolean;
}

function MobileNavItem({ active, onClick, icon, label, isMore }: MobileNavItemProps) {
  const Icon = ICON_MAP[icon] || HelpCircle;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center transition-all duration-300 w-full py-2 ${
        active ? 'text-primary' : 'text-outline-variant hover:text-on-surface/80'
      }`}
    >
      <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? 'scale-110' : ''}`}>
        {active && (
          <div className="absolute -inset-2 bg-primary/10 rounded-xl blur-lg animate-pulse" />
        )}
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className={`text-[9px] uppercase tracking-wider font-black mt-1.5 transition-colors ${active ? 'text-primary' : 'text-outline-variant'}`}>
        {label}
      </span>
    </button>
  );
}

// ─── App Internal ──────────────────────────────────────────────────────────────

function AppContent() {
  const { session, loading, profile, requirePasswordChange } = useAuth();
  const { activeTab, setActiveTab } = useNavigation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // ─── View Isolation for Restricted Roles ──────────────────────────────────
  React.useEffect(() => {
    if (!profile) return;

    if (profile.role === 'fichas') {
       // O login "Fichas" só pode ver o módulo de ficha técnica, suporte e sair
       if (activeTab !== 'mod_ficha_tecnica' && activeTab !== 'suporte' && activeTab !== 'configuracoes') {
         setActiveTab('mod_ficha_tecnica');
       }
       return;
    }

    if (profile.role === 'ficha_tecnica' && activeTab !== 'mod_ficha_tecnica' && activeTab !== 'configuracoes' && activeTab !== 'suporte') {
      setActiveTab('mod_ficha_tecnica');
    }
  }, [profile, activeTab, setActiveTab]);

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

  // Se logado mas sem perfil técnico (Google Users novos), forçar onboarding
  if (session && (!profile || !profile.station)) {
    return <ProfileOnboarding />;
  }

  const View = VIEWS[activeTab];

  const filteredCoreItems = CORE_MOBILE_ITEMS.filter(item => {
    if (profile?.role === 'fichas') {
      return item.id === 'mod_ficha_tecnica';
    }
    if (!item.minRole) return true;
    return (profile?.role && item.minRole.includes(profile.role)) || profile?.station === 'lideranca';
  });

  const filteredSecondaryItems = SECONDARY_MOBILE_ITEMS.filter(item => {
    if (profile?.role === 'fichas') {
      return ['suporte', 'configuracoes'].includes(item.id);
    }
    if (!item.minRole) return true;
    return (profile?.role && item.minRole.includes(profile.role)) || profile?.station === 'lideranca';
  });

  const isTabInSecondary = filteredSecondaryItems.some(i => i.id === activeTab);

  return (
    <div className="flex min-h-screen bg-surface overflow-x-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-0 md:ml-64 min-h-screen w-full max-w-full relative overflow-x-hidden min-w-0 flex flex-col focus:outline-none">
        <div key={activeTab} className="flex-1 w-full max-w-full animate-view overflow-x-hidden pb-24 md:pb-0">
          <View />
        </div>
      </main>

      {/* Mobile Secondary Menu (More) */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMoreOpen(false)} />
          <div className="absolute bottom-24 left-4 right-4 bg-surface-container-high/90 backdrop-blur-2xl rounded-3xl border border-outline-variant/20 shadow-2xl p-6 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Todas as Abas</h4>
              <button onClick={() => setIsMoreOpen(false)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
                <X size={18} className="text-outline-variant" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-y-8">
              {filteredSecondaryItems.map(item => {
                const Icon = ICON_MAP[item.icon] || HelpCircle;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreOpen(false);
                    }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      active ? 'bg-primary text-on-primary shadow-lg shadow-primary/25' : 'bg-surface-container-highest/50 text-outline-variant group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      <Icon size={22} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider text-center ${active ? 'text-primary' : 'text-outline-variant group-hover:text-on-surface'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex justify-around items-center h-20 bg-surface-container-highest/80 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-outline-variant/10 px-2">
        {filteredCoreItems.map((item) => (
          <div key={item.id} className="flex-1">
            <MobileNavItem
              active={activeTab === item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMoreOpen(false);
              }}
              icon={item.icon}
              label={item.label}
            />
          </div>
        ))}
        
        {/* More Button */}
        <div className="flex-1">
          <MobileNavItem
            active={isMoreOpen || isTabInSecondary}
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            icon={isMoreOpen ? 'X' : 'Menu'}
            label="Mais"
          />
        </div>
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
