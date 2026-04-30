import React, { useState } from 'react';
import FichaTecnicaList from './FichaTecnicaList';
import InsumosTecnicos from './InsumosTecnicos';
import { Beaker, BookOpen, Package } from 'lucide-react';

export default function ModuloFichaTecnica() {
  const [activeSubTab, setActiveSubTab] = useState<'fichas' | 'insumos'>('fichas');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sub-navigation Header */}
      <div className="bg-surface/60 border-b border-outline-variant/10 px-8 py-0 flex gap-10 items-center sticky top-0 z-30 backdrop-blur-2xl">
        <button 
          onClick={() => setActiveSubTab('fichas')}
          className={`relative py-5 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
            activeSubTab === 'fichas' ? 'text-primary' : 'text-outline-variant hover:text-on-surface'
          }`}
        >
          <BookOpen size={18} className={activeSubTab === 'fichas' ? 'animate-pulse' : ''} />
          <span>Fichas Técnicas</span>
          {activeSubTab === 'fichas' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--primary),0.5)]" />
          )}
        </button>
        
        <button 
          onClick={() => setActiveSubTab('insumos')}
          className={`relative py-5 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
            activeSubTab === 'insumos' ? 'text-primary' : 'text-outline-variant hover:text-on-surface'
          }`}
        >
          <Package size={18} className={activeSubTab === 'insumos' ? 'animate-pulse' : ''} />
          <span>Insumos Técnicos</span>
          {activeSubTab === 'insumos' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--primary),0.5)]" />
          )}
        </button>
      </div>

      <div className="flex-1 animate-view">
        {activeSubTab === 'fichas' ? <FichaTecnicaList /> : <InsumosTecnicos />}
      </div>
    </div>
  );
}
