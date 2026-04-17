import React, { useState } from 'react';
import FichaTecnicaList from './FichaTecnicaList';
import InsumosTecnicos from './InsumosTecnicos';
import { Beaker, BookOpen, Package } from 'lucide-react';

export default function ModuloFichaTecnica() {
  const [activeSubTab, setActiveSubTab] = useState<'fichas' | 'insumos'>('fichas');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sub-navigation Header */}
      <div className="bg-surface-container/50 border-b border-outline-variant/10 px-8 py-4 flex gap-8 items-center sticky top-0 z-30 backdrop-blur-md">
        <button 
          onClick={() => setActiveSubTab('fichas')}
          className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'fichas' ? 'text-primary' : 'text-outline-variant hover:text-on-surface'}`}
        >
          <BookOpen size={16} /> Fichas Técnicas
        </button>
        <button 
          onClick={() => setActiveSubTab('insumos')}
          className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'insumos' ? 'text-primary' : 'text-outline-variant hover:text-on-surface'}`}
        >
          <Package size={16} /> Insumos Técnicos
        </button>
      </div>

      <div className="flex-1">
        {activeSubTab === 'fichas' ? <FichaTecnicaList /> : <InsumosTecnicos />}
      </div>
    </div>
  );
}
