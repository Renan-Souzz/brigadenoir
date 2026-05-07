import React, { useState } from 'react';
import {
  PackageOpen, Plus, Save, X, Loader2, ArrowUpRight,
  Calendar, Weight, Tag, Clock, Trash2
} from 'lucide-react';
import { useAlmoxMovimentacoes, LoteSaldo } from '../../hooks/useAlmoxMovimentacoes';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { formatLocalDate } from '../../lib/dateUtils';
import InsumoAutocomplete from '../shared/InsumoAutocomplete';

const CATEGORIAS = [
  { id: 'proteinas', label: 'Proteínas' },
  { id: 'molhos', label: 'Molhos' },
  { id: 'massas', label: 'Massas' },
  { id: 'porcoes', label: 'Porções Fracionadas' },
  { id: 'hortifruti', label: 'Hortifruti' },
  { id: 'outros', label: 'Outros' },
];

export default function AlmoxChegadas() {
  const { createMovimentacao, deleteMovimentacao, getLotesPendentes, isUpdating } = useAlmoxMovimentacoes();
  const { isManagement } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [isCreating, setIsCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [ftInsumoId, setFtInsumoId] = useState<string | undefined>(undefined);
  const [categoria, setCategoria] = useState('proteinas');
  const [pesoBruto, setPesoBruto] = useState('');
  const [validade, setValidade] = useState('');
  const [dataChegada, setDataChegada] = useState(formatLocalDate());

  const pendentes = getLotesPendentes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !pesoBruto || !validade) {
      showAlert('Campos Obrigatórios', 'Preencha nome, peso bruto e validade.');
      return;
    }
    const pb = parseFloat(pesoBruto);
    if (pb <= 0) {
      showAlert('Valor Inválido', 'O peso bruto deve ser maior que zero.');
      return;
    }

    try {
      await createMovimentacao({
        produto_nome: nome.toUpperCase().trim(),
        ft_insumo_id: ftInsumoId,
        categoria,
        tipo: 'chegada',
        peso_bruto_kg: pb,
        validade,
        data_movimentacao: new Date(dataChegada + 'T12:00:00').toISOString(),
      });
      setIsCreating(false);
      setNome('');
      setFtInsumoId(undefined);
      setPesoBruto('');
      setValidade('');
      setDataChegada(formatLocalDate());
      showAlert('✅ Registrado', 'Chegada registrada com sucesso!');
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao registrar chegada.');
    }
  };

  const handleEnviarCozinha = async (lote: LoteSaldo) => {
    const ok = await showConfirm(
      'Enviar para Cozinha',
      `Confirma o envio de "${lote.produto_nome}" (${lote.movimentacoes[0]?.peso_bruto_kg}Kg) para a cozinha processar?`
    );
    if (!ok) return;

    try {
      const chegada = lote.movimentacoes.find(m => m.tipo === 'chegada');
      await createMovimentacao({
        produto_nome: lote.produto_nome,
        categoria: lote.categoria,
        lote_id: lote.lote_id,
        tipo: 'subida_cozinha',
        quantidade_enviada: chegada?.peso_bruto_kg || 0,
        data_movimentacao: new Date().toISOString(),
      });
      showAlert('✅ Enviado', `${lote.produto_nome} enviado para a cozinha!`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao enviar.');
    }
  };

  const handleDeleteLote = async (lote: LoteSaldo) => {
    const ok = await showConfirm(
      'Excluir Chegada',
      `Tem certeza que deseja excluir o lote "${lote.produto_nome}"?`
    );
    if (!ok) return;

    try {
      for (const m of lote.movimentacoes) {
        await deleteMovimentacao(m.id);
      }
      showAlert('Sucesso', 'Lote excluído.');
    } catch (err) {
      showAlert('Erro', 'Não foi possível excluir o lote.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <PackageOpen size={16} className="text-green-400" /> Recebimento de Mercadoria
        </h3>
        {!isCreating && isManagement && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-xl text-xs font-black uppercase hover:bg-green-500/20 transition-all"
          >
            <Plus size={14} /> Nova Chegada
          </button>
        )}
      </div>

      {/* Form */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-surface-container-highest p-6 rounded-2xl border border-green-500/20 relative animate-in fade-in zoom-in-95">
          <button type="button" onClick={() => setIsCreating(false)} className="absolute top-4 right-4 p-2 text-outline-variant hover:text-red-400">
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-6 text-green-400">
            <PackageOpen size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">Registrar Nova Chegada</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                <Tag size={10} className="inline mr-1" />Produto
              </label>
              <InsumoAutocomplete 
                defaultValue={nome}
                onSelect={(item) => {
                  setNome(item.nome);
                  setFtInsumoId(item.id);
                  // Optionally match category if the catalog item has one (though ft_insumos doesn't have category yet)
                }}
                placeholder="BUSQUE NO CATÁLOGO OU DIGITE..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-green-400"
              >
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                <Weight size={10} className="inline mr-1" />Peso Bruto (Kg)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={pesoBruto}
                onChange={e => setPesoBruto(e.target.value)}
                placeholder="Ex: 12.5"
                className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                <Calendar size={10} className="inline mr-1" />Data Chegada
              </label>
              <input
                type="date"
                required
                value={dataChegada}
                onChange={e => setDataChegada(e.target.value)}
                className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                <Clock size={10} className="inline mr-1" />Validade
              </label>
              <input
                type="date"
                required
                value={validade}
                onChange={e => setValidade(e.target.value)}
                className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-green-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-outline-variant/10">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase text-xs hover:bg-green-600 disabled:opacity-50 transition-all"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar Chegada
            </button>
          </div>
        </form>
      )}

      {/* Pendentes List */}
      {pendentes.length === 0 && !isCreating ? (
        <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/10">
          <PackageOpen size={40} className="mx-auto text-outline-variant/30 mb-4" />
          <p className="text-outline-variant text-xs font-black uppercase tracking-widest">
            Nenhuma mercadoria aguardando processamento.
          </p>
          <p className="text-outline-variant/50 text-[10px] mt-2 uppercase tracking-wider">
            Registre uma nova chegada para iniciar o fluxo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendentes.map(lote => {
            const chegada = lote.movimentacoes.find(m => m.tipo === 'chegada');
            if (!chegada) return null;

            const diffDays = chegada.validade
              ? Math.ceil((new Date(chegada.validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={lote.lote_id} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 group hover:border-green-500/20 hover:shadow-[0_8px_30px_-8px_rgba(34,197,94,0.15)] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                      <PackageOpen size={18} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-on-surface uppercase">{lote.produto_nome}</h5>
                      <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">
                        {new Date(chegada.data_movimentacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {diffDays !== null && (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        diffDays <= 0 ? 'bg-red-500 text-white animate-pulse' :
                        diffDays <= 3 ? 'bg-yellow-500 text-black' :
                        'bg-green-500/20 text-green-400 border border-green-500/20'
                      }`}>
                        {diffDays <= 0 ? 'Vencido' : diffDays <= 3 ? `${diffDays}d` : 'OK'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-surface-container-highest p-3 rounded-xl text-center">
                    <span className="block text-[8px] font-bold text-outline-variant uppercase mb-1">Peso Bruto</span>
                    <span className="text-lg font-black text-on-surface">{chegada.peso_bruto_kg?.toFixed(1)}<span className="text-xs text-outline-variant ml-1">Kg</span></span>
                  </div>
                  <div className="bg-surface-container-highest p-3 rounded-xl text-center">
                    <span className="block text-[8px] font-bold text-outline-variant uppercase mb-1">Validade</span>
                    <span className="text-xs font-black text-on-surface">{chegada.validade ? new Date(chegada.validade + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                  <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Aguardando envio
                  </span>
                  {isManagement && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEnviarCozinha(lote)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase hover:bg-primary/20 transition-all disabled:opacity-50"
                      >
                        <ArrowUpRight size={12} /> Enviar p/ Cozinha
                      </button>
                      <button
                        onClick={() => handleDeleteLote(lote)}
                        disabled={isUpdating}
                        className="p-2 text-outline-variant hover:text-red-400 transition-colors"
                        title="Excluir Lote"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
