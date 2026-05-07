import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Check, ChevronDown } from 'lucide-react';
import { useFTInsumos, FTInsumo } from '../../hooks/useFTInsumos';

interface InsumoAutocompleteProps {
  onSelect: (insumo: FTInsumo) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

/**
 * Reusable Autocomplete component for linking physical items to the Master Technical Catalog.
 * Premium design with smooth transitions and search feedback.
 */
export default function InsumoAutocomplete({ 
  onSelect, 
  placeholder = "Buscar no catálogo técnico...", 
  className = "",
  defaultValue = ""
}: InsumoAutocompleteProps) {
  const { insumos, isLoading } = useFTInsumos();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(defaultValue);
  const [filtered, setFiltered] = useState<FTInsumo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.length > 0) {
      const results = insumos.filter(i => 
        i.nome.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(results);
    } else {
      setFiltered([]);
    }
  }, [search, insumos]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (insumo: FTInsumo) => {
    setSearch(insumo.nome);
    onSelect(insumo);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-surface-container-highest pl-12 pr-10 py-4 rounded-2xl border border-outline-variant/20 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant">
          <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (search.length > 0 || filtered.length > 0) && (
        <div className="absolute z-[100] w-full mt-2 bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {isLoading ? (
            <div className="p-4 text-center text-xs font-black uppercase tracking-widest text-outline-variant animate-pulse">
              Carregando Catálogo...
            </div>
          ) : filtered.length > 0 ? (
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/10 transition-colors border-b border-outline-variant/5 last:border-0 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Package size={14} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-on-surface uppercase tracking-tight">{item.nome}</p>
                      <p className="text-[9px] font-bold text-outline-variant uppercase">
                        {item.unidade_base} • R$ {item.preco_unitario_base.toFixed(2)}/{item.unidade_base}
                      </p>
                    </div>
                  </div>
                  <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check size={14} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant">Nenhum item encontrado</p>
              <button 
                onClick={() => setIsOpen(false)}
                className="mt-2 text-[9px] font-bold text-primary hover:underline uppercase"
              >
                Usar "{search}" mesmo assim
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
