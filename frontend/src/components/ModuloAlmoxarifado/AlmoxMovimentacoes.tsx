import React, { useState } from 'react';
import {
  GitCommitHorizontal, PackageOpen, ArrowUpRight, Scissors, ArrowDownLeft,
  Send, Loader2, Hash, Clock, ChevronDown, ChevronUp, Package, Trash2, Pencil, Save
} from 'lucide-react';
import { useAlmoxMovimentacoes, AlmoxTipoMov, LoteSaldo, AlmoxMovimentacao } from '../../hooks/useAlmoxMovimentacoes';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';

const TIPO_CONFIG: Record<AlmoxTipoMov, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  chegada:        { label: 'Chegada',           color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: <PackageOpen size={14} /> },
  subida_cozinha: { label: 'Enviado p/ Cozinha', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: <ArrowUpRight size={14} /> },
  teste_quebra:   { label: 'Teste de Quebra',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20', icon: <Scissors size={14} /> },
  retorno_almox:  { label: 'Retorno ao Almox',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20', icon: <ArrowDownLeft size={14} /> },
  requisicao:     { label: 'Requisição',        color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: <Send size={14} /> },
};

export default function AlmoxMovimentacoes() {
  const { createMovimentacao, updateMovimentacao, deleteMovimentacao, getLotes, getLotesComEstoque, isUpdating } = useAlmoxMovimentacoes();
  const { isManagement } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AlmoxMovimentacao>>({});

  const lotes = getLotes();
  const lotesComEstoque = getLotesComEstoque();

  const [expandedLote, setExpandedLote] = useState<string | null>(null);
  const [reqLote, setReqLote] = useState<string | null>(null);
  const [reqQtd, setReqQtd] = useState('');

  const handleRequisicao = async (lote: LoteSaldo) => {
    const qtd = parseInt(reqQtd);
    if (!qtd || qtd <= 0) {
      showAlert('Quantidade Inválida', 'Informe uma quantidade válida de porções.');
      return;
    }
    if (qtd > lote.saldo_porcoes) {
      showAlert('Saldo Insuficiente', `Apenas ${lote.saldo_porcoes} porções disponíveis.`);
      return;
    }

    const ok = await showConfirm(
      'Confirmar Requisição',
      `Enviar ${qtd} porções de "${lote.produto_nome}" para a cozinha?`
    );
    if (!ok) return;

    try {
      await createMovimentacao({
        produto_nome: lote.produto_nome,
        categoria: lote.categoria,
        lote_id: lote.lote_id,
        tipo: 'requisicao',
        porcoes_solicitadas: qtd,
        data_movimentacao: new Date().toISOString(),
      });
      setReqLote(null);
      setReqQtd('');
      showAlert('✅ Enviado', `${qtd} porções de ${lote.produto_nome} enviadas para a cozinha!`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Falha ao registrar requisição.');
    }
  };

  const handleDelete = async (movId: string) => {
    const ok = await showConfirm(
      'Excluir Movimentação',
      'Tem certeza que deseja excluir este registro? Isso pode afetar o saldo do lote.'
    );
    if (!ok) return;

    try {
      await deleteMovimentacao(movId);
      showAlert('Sucesso', 'Movimentação excluída.');
    } catch (err: any) {
      showAlert('Erro', 'Não foi possível excluir.');
    }
  };

  const handleDeleteFullLote = async (lote: LoteSaldo) => {
    const ok = await showConfirm(
      'EXCLUIR TUDO',
      `ATENÇÃO: Isso apagará TODOS os registros do produto "${lote.produto_nome}" (Chegada, Quebra, Saídas). Esta ação é irreversível. Confirma?`
    );
    if (!ok) return;

    try {
      for (const m of lote.movimentacoes) {
        await deleteMovimentacao(m.id);
      }
      showAlert('Sucesso', 'Toda a história do lote foi apagada.');
    } catch (err) {
      showAlert('Erro', 'Falha ao apagar lote completo.');
    }
  };

  const startEdit = (mov: any) => {
    setEditingId(mov.id);
    setEditData({ ...mov });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateMovimentacao(editingId, editData);
      setEditingId(null);
      showAlert('Sucesso', 'Registro atualizado.');
    } catch (err) {
      showAlert('Erro', 'Falha ao atualizar.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <GitCommitHorizontal size={16} className="text-blue-400" /> Movimentações e Requisições
        </h3>
      </div>

      {/* Estoque Disponível (quick overview) */}
      {lotesComEstoque.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-5 border border-blue-500/10">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
            <Package size={12} /> Porções em Estoque
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lotesComEstoque.map(l => (
              <div key={l.lote_id} className="bg-surface-container-highest p-3 rounded-xl text-center border border-outline-variant/10">
                <span className="block text-[9px] font-bold text-outline-variant uppercase tracking-wider mb-1">{l.produto_nome}</span>
                <span className="text-2xl font-black text-primary">{l.saldo_porcoes}</span>
                <span className="text-[8px] text-outline-variant font-bold block mt-0.5">porções</span>
                {isManagement && (
                  <button
                    onClick={() => { setReqLote(l.lote_id); setReqQtd(''); }}
                    className="mt-2 text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg hover:bg-purple-500/20 transition-all"
                  >
                    <Send size={8} className="inline mr-1" /> Requisitar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requisição inline form */}
      {reqLote && (
        <div className="bg-surface-container-highest p-5 rounded-2xl border border-purple-500/20 animate-in fade-in zoom-in-95">
          {(() => {
            const lote = lotesComEstoque.find(l => l.lote_id === reqLote);
            if (!lote) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-4 text-purple-400">
                  <Send size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Requisitar — {lote.produto_nome}
                  </h4>
                  <span className="ml-auto text-[10px] text-outline-variant font-bold">
                    Saldo: {lote.saldo_porcoes} porções
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2">
                      <Hash size={10} className="inline mr-1" />Qtd Porções
                    </label>
                    <input
                      type="number" step="1" min="1" max={lote.saldo_porcoes}
                      value={reqQtd} onChange={e => setReqQtd(e.target.value)}
                      placeholder={`Máx: ${lote.saldo_porcoes}`}
                      className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/20 text-sm focus:border-purple-400"
                    />
                  </div>
                  <button
                    onClick={() => handleRequisicao(lote)}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-black uppercase text-xs hover:bg-purple-600 disabled:opacity-50 transition-all mt-6"
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
                  </button>
                  <button
                    onClick={() => setReqLote(null)}
                    className="text-outline-variant hover:text-red-400 mt-6 p-3"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Full Timeline by Lote */}
      {lotes.length === 0 ? (
        <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/10">
          <GitCommitHorizontal size={40} className="mx-auto text-outline-variant/30 mb-4" />
          <p className="text-outline-variant text-xs font-black uppercase tracking-widest">
            Nenhuma movimentação registrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lotes.map(lote => {
            const isExpanded = expandedLote === lote.lote_id;

            return (
              <div key={lote.lote_id} className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
                <button
                  onClick={() => setExpandedLote(isExpanded ? null : lote.lote_id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-surface-container-highest/50 transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Package size={18} />
                    </div>
                    <div className="flex flex-col">
                      <h5 className="text-sm font-black text-on-surface uppercase group-hover:text-primary transition-colors">
                        {lote.produto_nome}
                      </h5>
                      <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">
                        {lote.categoria}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isManagement && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFullLote(lote); }}
                        className="text-[9px] font-black uppercase text-red-400 bg-red-400/10 px-3 py-1 rounded-lg hover:bg-red-400/20 transition-all"
                      >
                        Excluir Tudo
                      </button>
                    )}
                    <div className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-xl border border-outline-variant/10">
                      {lote.movimentacoes.map(m => {
                        const cfg = TIPO_CONFIG[m.tipo];
                        return (
                          <div key={m.id} className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} title={cfg.label} />
                        );
                      })}
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-outline-variant" /> : <ChevronDown size={16} className="text-outline-variant" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-outline-variant/10 animate-in fade-in slide-in-from-top-2">
                    <div className="relative pl-6 mt-4 space-y-4">
                      {/* Vertical line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-outline-variant/20" />

                      {lote.movimentacoes.map(mov => {
                        const cfg = TIPO_CONFIG[mov.tipo];
                        return (
                          <div key={mov.id} className="relative flex items-start gap-4">
                            {/* Dot */}
                            <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full ${cfg.bg} border flex items-center justify-center ${cfg.color} z-10`}>
                              {cfg.icon}
                            </div>

                            <div className="flex-1 bg-surface-container-highest p-4 rounded-xl border border-outline-variant/5">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-[9px] font-bold text-outline-variant flex items-center gap-1">
                                  <Clock size={9} />
                                  {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')} {new Date(mov.data_movimentacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isManagement && !editingId && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => startEdit(mov)}
                                      className="text-outline-variant hover:text-primary p-1 transition-colors"
                                      title="Editar"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(mov.id)}
                                      className="text-outline-variant hover:text-red-400 p-1 transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {editingId === mov.id ? (
                                <div className="bg-surface-container p-3 rounded-xl border border-primary/20 space-y-3 mt-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[8px] font-black uppercase text-outline-variant">Nome</label>
                                      <input
                                        type="text"
                                        value={editData.produto_nome || ''}
                                        onChange={e => setEditData({...editData, produto_nome: e.target.value.toUpperCase()})}
                                        className="w-full bg-surface-container-highest p-1.5 rounded text-[10px] border border-outline-variant/20"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-black uppercase text-outline-variant">Data</label>
                                      <input
                                        type="datetime-local"
                                        value={editData.data_movimentacao?.slice(0,16) || ''}
                                        onChange={e => setEditData({...editData, data_movimentacao: new Date(e.target.value).toISOString()})}
                                        className="w-full bg-surface-container-highest p-1.5 rounded text-[10px] border border-outline-variant/20"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingId(null)} className="text-[8px] font-black uppercase px-2 py-1 text-outline-variant">Cancelar</button>
                                    <button onClick={handleSaveEdit} className="text-[8px] font-black uppercase px-3 py-1 bg-primary text-on-primary rounded flex items-center gap-1">
                                      <Save size={10} /> Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-on-surface-variant">
                                  {mov.peso_bruto_kg != null && <span>Bruto: <strong className="text-on-surface">{mov.peso_bruto_kg.toFixed(2)}Kg</strong></span>}
                                  {mov.quantidade_enviada != null && <span>Enviado: <strong className="text-on-surface">{mov.quantidade_enviada.toFixed(2)}Kg</strong></span>}
                                  {mov.peso_liquido_kg != null && <span>Líquido: <strong className="text-on-surface">{mov.peso_liquido_kg.toFixed(2)}Kg</strong></span>}
                                  {mov.num_porcoes != null && <span>Porções: <strong className="text-on-surface">{mov.num_porcoes}</strong></span>}
                                  {mov.porcoes_solicitadas != null && <span>Solicitadas: <strong className="text-on-surface">{mov.porcoes_solicitadas}</strong></span>}
                                  {mov.porcoes_retornadas != null && <span>Retornadas: <strong className="text-on-surface">{mov.porcoes_retornadas}</strong></span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
