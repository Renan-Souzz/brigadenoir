import React from 'react';
import * as Icons from 'lucide-react';
import { 
  Plus, 
  LogOut, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import Button from './shared/Button';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_ITEMS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  minRole?: string[];
}> = [
  { id: 'dashboard',     label: 'Dashboard',         icon: Icons.LayoutDashboard },
  { id: 'insumos',      label: 'Estoque de Insumos', icon: Icons.Package         },
  { id: 'checklist',    label: 'Checklist Diário',  icon: Icons.ClipboardCheck  },
  { id: 'fichas',       label: 'Modo de Preparo',   icon: Icons.BookOpen        },
  { id: 'mod_ficha_tecnica', label: 'Ficha Técnica', icon: Icons.FileSpreadsheet },
  { id: 'menu',         label: 'Menu Principal',    icon: Icons.UtensilsCrossed },
  { id: 'almoxarifado', label: 'Almoxarifado',      icon: Icons.Warehouse,       minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
  { id: 'relatorio',    label: 'Inteligência & CMV', icon: Icons.BarChart3,    minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
  { id: 'brigada',      label: 'Gestão da Brigada', icon: Icons.Users,           minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
  { id: 'escala',       label: 'Escala Mensal',     icon: Icons.Calendar,        minRole: ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef', 'chef_de_partie'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Sys Admin',
  chef_executivo: 'Chef Executivo',
  chef_de_cuisine: 'Chef de Cozinha',
  sous_chef: 'Sous-Chef',
  chef_de_partie: 'Chef de Partie',
  commis: 'Commis',
  ficha_tecnica: 'Gestor de Custos',
  fichas: 'Acesso Fichas',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { profile, signOut } = useAuth();

  const filteredItems = MENU_ITEMS.filter(item => {
    if (!item.minRole) return true;
    return profile?.role && item.minRole.includes(profile.role);
  });

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface py-8 z-50 border-r border-outline-variant/10">
      {/* Brand */}
      <div className="px-5 mb-10 flex items-center gap-3">
        <img src="/logo.png" alt="Logo BN" className="w-10 h-10 object-contain rounded-xl shadow-lg border border-outline-variant/5" />
        <div>
          <h1 className="text-xl font-black text-on-surface tracking-tighter leading-none">Brigade Noir</h1>
          <p className="text-[8px] uppercase tracking-widest font-bold text-outline-variant mt-1.5 translate-y-[-2px]">
            Executive Station
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {filteredItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-lg group ${
                isActive
                  ? 'text-primary font-semibold bg-surface-container-high border-l-2 border-primary'
                  : 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <Icon size={20} />
              <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-bold">
                {label}
              </span>
            </button>
          );
        })}
      </nav>


      {/* Footer links */}
      <div className="px-3 border-t border-outline-variant/10 pt-6">
        <button 
          onClick={() => setActiveTab('configuracoes')}
          className={`w-full flex items-center gap-3 px-4 py-2 transition-colors rounded-lg mb-1 ${
            activeTab === 'configuracoes'
              ? 'text-primary bg-surface-container-high' 
              : 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Icons.Settings size={18} />
          <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-bold">Configurações</span>
        </button>
        <button 
          onClick={() => setActiveTab('suporte')}
          className={`w-full flex items-center gap-3 px-4 py-2 transition-all duration-300 rounded-lg mb-1 ${
            activeTab === 'suporte'
              ? 'text-primary bg-surface-container-high border-l-2 border-primary' 
              : 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Icons.HelpCircle size={18} />
          <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-bold">Suporte Técnico</span>
        </button>
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-outline-variant hover:text-error transition-colors"
        >
          <Icons.LogOut size={18} />
          <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-bold">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
