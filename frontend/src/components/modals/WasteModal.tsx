import React, { useState } from 'react';
import { X, Trash2, Scale, AlertCircle, Save, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWaste } from '../../hooks/useWaste';
import { useStations } from '../../hooks/useStations';
import { useInsumos } from '../../hooks/useInsumos';
import Button from '../shared/Button';
import InsumoAutocomplete from '../shared/InsumoAutocomplete';

interface WasteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WasteModal({ isOpen, onClose }: WasteModalProps) {
  const { profile } = useAuth();
  const { createWasteLog, isCreating } = useWaste();
  const { activeStations } = useStations();
  const { insumos } = useInsumos();

  const [formData, setFormData] = useState({
    product_name: '',
    ft_insumo_id: undefined as string | undefined,
    quantity: '',
    unit: 'kg',
    station: profile?.station || 'saucier',
    reason: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredInsumos = insumos.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name || !formData.quantity || !formData.station) return;

    try {
      await createWasteLog({
        user_id: profile!.id,
        station: formData.station,
        product_name: formData.product_name,
        ft_insumo_id: formData.ft_insumo_id,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        reason: formData.reason
      });
      onClose();
      // Limpar form
      setFormData({
        product_name: '',
        quantity: '',
        unit: 'kg',
        station: profile?.station || 'saucier',
        reason: ''
      });
      setSearchTerm('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="bg-surface-container-high border border-outline-variant/20 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative z-20 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center border border-error/20">
              <Trash2 className="text-error" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase">Registrar Desperdício</h2>
              <p className="text-[10px] text-outline-variant font-black uppercase tracking-[0.2em] mt-1">Gestão de Perdas e Quebras</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center text-outline-variant">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Produto c/ Sugestões */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block ml-1">Produto / Insumo (Busca no Catálogo)</label>
            <InsumoAutocomplete 
               defaultValue={formData.product_name}
               onSelect={(item) => {
                 setFormData(prev => ({ 
                    ...prev, 
                    product_name: item.nome, 
                    ft_insumo_id: item.id,
                    unit: item.unidade_base === 'g' ? 'g' : item.unidade_base === 'ml' ? 'ml' : 'un'
                 }));
               }}
               placeholder="DIGITE O NOME OU BUSQUE NO CATÁLOGO..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block ml-1">Quantidade</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error/50 transition-all tabular-nums"
                  placeholder="0.00"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Scale size={16} className="text-outline-variant/30" />
                </div>
              </div>
            </div>

            {/* Unidade */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block ml-1">Unidade</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error/50 transition-all appearance-none cursor-pointer"
              >
                <option value="kg">Quilos (kg)</option>
                <option value="g">Gramas (g)</option>
                <option value="L">Litros (L)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="un">Unidades (un)</option>
                <option value="pct">Pacotes (pct)</option>
              </select>
            </div>
          </div>

          {/* Praça */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block ml-1">Praça de Origem</label>
            <div className="relative group">
              <select
                value={formData.station}
                onChange={(e) => setFormData(prev => ({ ...prev, station: e.target.value }))}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error/50 transition-all appearance-none cursor-pointer uppercase tracking-tight"
              >
                {activeStations.map(s => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={18} className="text-outline-variant group-hover:text-error transition-colors" />
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block ml-1">Motivo (Opcional)</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error/50 transition-all resize-none placeholder:text-outline-variant/30"
              placeholder="Ex: Queda no chão, erro de ponto, validade vencida..."
            />
          </div>

          <div className="pt-4">
             <Button 
                type="submit" 
                variant="error-solid" 
                className="w-full py-6 gap-3 group"
                disabled={isCreating}
             >
                {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                <span className="text-sm font-black uppercase tracking-[0.2em]">Confirmar Registro</span>
             </Button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-error/5 rounded-2xl border border-error/10 flex items-start gap-3">
          <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            <span className="font-bold text-error uppercase mr-1">Importante:</span>
            Este registro impactará diretamente o CMV da sua praça. Certifique-se de que o peso/quantidade está correto antes de salvar.
          </p>
        </div>
      </div>
    </div>
  );
}
