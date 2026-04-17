import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  ChevronLeft, 
  Calculator, 
  TrendingUp, 
  AlertTriangle,
  Info,
  CheckCircle2,
  Utensils,
  Maximize2,
  FileText,
  Clock,
  ShieldAlert,
  Droplets,
  Zap,
  ThermometerSnowflake
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import { useFTFichas, FTFicha, FTFichaIngrediente, FTFichaComplemento } from '../../hooks/useFTFichas';
import { useFTInsumos } from '../../hooks/useFTInsumos';
import { calcularPLFinal, calcularCustoIngrediente, calcularResumoFicha, verificarAlertasAnvisa } from '../../utils/engineFT';
import { useModal } from '../../contexts/ModalContext';
import { exportToExcel } from '../../services/exportService';
import { syncToGoogleSheets } from '../../services/googleSheetsService';

interface FichaEditorProps {
  fichaId?: string;
  onClose: () => void;
}

export default function FichaEditor({ fichaId, onClose }: FichaEditorProps) {
  const { getFicha, upsertFicha, isLoading: isFichaLoading } = useFTFichas();
  const { insumos, isLoading: isInsumosLoading } = useFTInsumos();
  const { showAlert } = useModal();

  // Root States
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Entrada');
  const [rendimento, setRendimento] = useState(1);
  const [precoVenda, setPrecoVenda] = useState<number>(0);
  const [cmvIdeal, setCmvIdeal] = useState(30);

  // Detail States
  const [ingredientes, setIngredientes] = useState<Partial<FTFichaIngrediente>[]>([]);
  const [complementos, setComplementos] = useState<FTFichaComplemento>({
    ficha_id: '',
    validade_dias: 3,
    conservacao: 'Refrigerado',
    contem_gluten: false,
    contem_lactose: false,
    observacoes: ''
  });

  const [activeTab, setActiveTab] = useState<'financeiro' | 'producao' | 'rotulagem'>('financeiro');
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    if (fichaId) {
      getFicha(fichaId).then(data => {
        setNome(data.nome);
        setCategoria(data.categoria);
        setRendimento(data.rendimento_total);
        setPrecoVenda(data.preco_venda);
        setCmvIdeal(data.cmv_ideal || 30);
        setIngredientes(data.ingredientes || []);
        if (data.complementos) setComplementos(data.complementos);
      });
    } else {
      setIngredientes([{ 
        id: Math.random().toString(), 
        insumo_id: '', 
        pb_gramas: 0, 
        fc: 1, 
        ir: 1, 
        ia: 1, 
        icd: 1,
        acucares_adicionados_g: 0,
        sodio_mg: 0,
        gordura_saturada_g: 0
      }]);
    }
  }, [fichaId]);

  // Calculations & Anvisa
  const resumo = useMemo(() => {
    return calcularResumoFicha(ingredientes.map(i => ({
      pb: i.pb_gramas || 0,
      fc: i.fc || 1,
      ir: i.ir || 1,
      ia: i.ia || 1,
      icd: i.icd || 1,
      precoUnitario: insumos.find(ins => ins.id === i.insumo_id)?.preco_unitario_base || 0,
      acucares_adicionados_g: i.acucares_adicionados_g || 0,
      sodio_mg: i.sodio_mg || 0,
      gordura_saturada_g: i.gordura_saturada_g || 0,
      insumo_nome: insumos.find(ins => ins.id === i.insumo_id)?.nome
    })), rendimento, precoVenda);
  }, [ingredientes, insumos, rendimento, precoVenda]);

  const alertasAnvisa = useMemo(() => {
    const isLiquid = categoria === 'Bebida' || categoria === 'Base / Molho';
    return verificarAlertasAnvisa({
      acucar: resumo.nutricao.acucar,
      sodio: resumo.nutricao.sodio,
      gordura: resumo.nutricao.gordura,
      pesoTotal: resumo.pesoTotalPL
    }, isLiquid);
  }, [resumo, categoria]);

  const handleAddIngrediente = () => {
    setIngredientes([...ingredientes, { 
      id: Math.random().toString(), 
      insumo_id: '', 
      pb_gramas: 0, 
      fc: 1, 
      ir: 1, 
      ia: 1, 
      icd: 1,
      acucares_adicionados_g: 0,
      sodio_mg: 0,
      gordura_saturada_g: 0
    }]);
  };

  const handleUpdateIngrediente = (id: string, field: string, value: any) => {
    setIngredientes(ingredientes.map(i => {
      if (i.id === id) {
        const update: any = { ...i, [field]: value };
        
        // Se mudou o insumo, preenche os valores nutricionais padrão
        if (field === 'insumo_id') {
          const insumo = insumos.find(ins => ins.id === value);
          if (insumo) {
            update.acucares_adicionados_g = insumo.acucares_adicionados_g || 0;
            update.sodio_mg = insumo.sodio_mg || 0;
            update.gordura_saturada_g = insumo.gordura_saturada_g || 0;
          }
        }
        
        return update;
      }
      return i;
    }));
  };

  const handleRemoveIngrediente = (id: string) => {
    setIngredientes(ingredientes.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    if (!nome) return showAlert('Atenção', 'O nome da ficha é obrigatório.');
    setIsSaving(true);
    try {
      await upsertFicha({
        ficha: { id: fichaId, nome, categoria, rendimento_total: rendimento, preco_venda: precoVenda, cmv_ideal: cmvIdeal },
        ingredientes: ingredientes.filter(i => i.insumo_id).map(({ id, insumo_nome, preco_unitario_base, ...rest }: any) => rest),
        complementos: { ...complementos, contem_gluten: complementos.contem_gluten }
      });
      onClose();
    } catch (err: any) {
      showAlert('Erro ao Salvar', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isCmvCritical = resumo.cmv > cmvIdeal;
  const isCmvWarning = resumo.cmv > cmvIdeal * 0.9 && resumo.cmv <= cmvIdeal;

  if (isFichaLoading) return <div className="p-20 text-center animate-pulse text-outline-variant uppercase font-black tracking-widest">Carregando Ficha...</div>;

  return (
    <PageLayout maxWidth="full">
      <div className="flex items-center justify-between mb-8 group">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <div>
             <h2 className="text-3xl font-black text-on-surface uppercase tracking-tighter">
               {fichaId ? 'Engenharia de Ficha' : 'Nova Engenharia Técnica'}
             </h2>
             <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em]">{nome || 'Rascunho de Produção'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => exportToExcel({
            ficha: { nome, categoria, rendimento, precoVenda, cmvIdeal },
            ingredientes,
            financeiro: { ...resumo, precoSugerido: resumo.precoSugerido(cmvIdeal) },
            producao: { passos: complementos.observacoes },
            rotulagem: { alergenos: [], gluten: complementos.contem_gluten ? 'SIM' : 'NÃO', lactose: complementos.contem_lactose ? 'SIM' : 'NÃO', validade: `${complementos.validade_dias} dias`, conservacao: complementos.conservacao }
          })}>Excel</Button>
          <Button variant="primary" icon={<Save size={18} />} loading={isSaving} onClick={handleSave}>Salvar Projeto</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-40">
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-2xl">
            <div className="bg-surface-container-low p-6 border-b border-outline-variant/10 grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="md:col-span-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Nome da Preparação</label>
                 <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="EX: RISOTTO DE COGUMELOS..." className="w-full bg-surface-container border-none rounded-xl p-4 text-sm font-black text-on-surface outline-none focus:ring-1 focus:ring-primary uppercase" />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Categoria</label>
                 <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface-container border-none rounded-xl p-4 text-sm font-black text-on-surface outline-none uppercase">
                   <option>Entrada</option>
                   <option>Prato Principal</option>
                   <option>Sobremesa</option>
                   <option>Bebida</option>
                   <option>Base / Molho</option>
                 </select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-2 block">Rendimento Total</label>
                  <div className="relative">
                    <input type="number" value={rendimento} onChange={e => setRendimento(parseFloat(e.target.value))} className="w-full bg-surface-container border-none rounded-xl p-4 text-sm font-black text-on-surface outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline-variant uppercase">Doses/kg</span>
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-highest/20">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5">Insumo</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center">Peso Bruto</th>
                    <th className="px-2 py-3 text-[8px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center" title="Fator de Correção">FC</th>
                    <th className="px-2 py-3 text-[8px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center" title="Índice de Reidratação">IR</th>
                    <th className="px-2 py-3 text-[8px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center" title="Índice de Absorção">IA</th>
                    <th className="px-2 py-3 text-[8px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center" title="Índice de Descongelamento">ICD</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-outline-variant border-r border-outline-variant/5 text-center">PL Final</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-outline-variant text-center">Custo</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {ingredientes.map((ing) => {
                    const insumoData = insumos.find(i => i.id === ing.insumo_id);
                    const plFinal = calcularPLFinal(ing.pb_gramas || 0, { fc: ing.fc || 1, ir: ing.ir || 1, ia: ing.ia || 1, icd: ing.icd || 1 });
                    const custo = (ing.pb_gramas || 0) * (insumoData?.preco_unitario_base || 0);

                    return (
                      <tr key={ing.id} className="group hover:bg-surface-container-highest/20 transition-colors">
                        <td className="p-2 border-r border-outline-variant/5 min-w-[200px]">
                           <select 
                            value={ing.insumo_id} 
                            onChange={e => handleUpdateIngrediente(ing.id!, 'insumo_id', e.target.value)}
                            className="w-full bg-transparent border-none p-2 text-xs font-bold text-on-surface outline-none"
                           >
                             <option value="">Selecionar...</option>
                             {insumos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                           </select>
                        </td>
                        <td className="p-2 border-r border-outline-variant/5 w-24">
                           <input type="number" step="0.001" value={ing.pb_gramas} onChange={e => handleUpdateIngrediente(ing.id!, 'pb_gramas', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-xs font-bold text-on-surface outline-none" />
                        </td>
                        <td className="p-1 border-r border-outline-variant/5 w-12">
                           <input type="number" step="0.01" value={ing.fc} onChange={e => handleUpdateIngrediente(ing.id!, 'fc', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-[10px] font-bold text-outline-variant outline-none" />
                        </td>
                        <td className="p-1 border-r border-outline-variant/5 w-12">
                           <input type="number" step="0.01" value={ing.ir} onChange={e => handleUpdateIngrediente(ing.id!, 'ir', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-[10px] font-bold text-outline-variant outline-none" />
                        </td>
                        <td className="p-1 border-r border-outline-variant/5 w-12">
                           <input type="number" step="0.01" value={ing.ia} onChange={e => handleUpdateIngrediente(ing.id!, 'ia', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-[10px] font-bold text-outline-variant outline-none" />
                        </td>
                        <td className="p-1 border-r border-outline-variant/5 w-12">
                           <input type="number" step="0.01" value={ing.icd} onChange={e => handleUpdateIngrediente(ing.id!, 'icd', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-[10px] font-bold text-outline-variant outline-none" />
                        </td>
                        <td className="p-2 border-r border-outline-variant/5 w-24 bg-surface-container-highest/10 text-center">
                           <span className="text-xs font-black text-on-surface/50">{plFinal.toFixed(1)}<small>{insumoData?.unidade_base}</small></span>
                        </td>
                        <td className="p-2 w-28 bg-primary/5 text-center">
                           <span className="text-xs font-black text-primary">R$ {custo.toFixed(2)}</span>
                        </td>
                        <td className="p-2 text-center w-10">
                          <button onClick={() => handleRemoveIngrediente(ing.id!)} className="text-outline-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button onClick={handleAddIngrediente} className="w-full p-4 text-[10px] font-black uppercase tracking-widest text-outline-variant hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 border-t border-outline-variant/5">
                <Plus size={16} /> Adicionar Insumo à Engenharia
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-4 flex items-center gap-2"><Utensils size={14} /> Modo de Preparo Profissional</h4>
                <textarea 
                  placeholder="DESCREVA O PASSO A PASSO DA PRODUÇÃO..." 
                  value={complementos.observacoes} 
                  onChange={e => setComplementos({...complementos, observacoes: e.target.value})}
                  className="w-full bg-surface-container-low rounded-2xl p-6 text-sm font-medium text-on-surface min-h-[250px] outline-none border-2 border-transparent focus:border-primary/20 transition-all shadow-inner"
                />
             </div>

             <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-6 flex items-center gap-2"><ShieldAlert size={14} /> Rotulagem ANVISA RDC 429/2020</h4>
                
                {/* Alertas ANVISA */}
                <div className="space-y-4 mb-8">
                  {alertasAnvisa.altoAcucar && (
                    <div className="bg-black text-white p-4 rounded-xl flex items-center gap-4 border-2 border-white/10 animate-pulse">
                      <div className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-lg font-black text-xl">!</div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest leading-none">ALTO EM</div>
                        <div className="text-lg font-black uppercase">AÇÚCAR ADICIONADO</div>
                      </div>
                    </div>
                  )}
                  {alertasAnvisa.altoSodio && (
                    <div className="bg-black text-white p-4 rounded-xl flex items-center gap-4 border-2 border-white/10 animate-pulse">
                      <div className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-lg font-black text-xl">!</div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest leading-none">ALTO EM</div>
                        <div className="text-lg font-black uppercase">SÓDIO</div>
                      </div>
                    </div>
                  )}
                  {!alertasAnvisa.altoAcucar && !alertasAnvisa.altoSodio && (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="text-primary" size={20} />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Conforme com limites da RDC 429</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/5">
                   <div className="p-3 bg-surface-container-low rounded-xl">
                      <span className="text-[8px] font-black text-outline-variant uppercase block">Açúcar / 100g</span>
                      <span className="text-sm font-black text-on-surface">{alertasAnvisa.valoresPor100.acucarPor100.toFixed(1)}g</span>
                   </div>
                   <div className="p-3 bg-surface-container-low rounded-xl">
                      <span className="text-[8px] font-black text-outline-variant uppercase block">Sódio / 100g</span>
                      <span className="text-sm font-black text-on-surface">{alertasAnvisa.valoresPor100.sodioPor100.toFixed(0)}mg</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-2xl sticky top-8 overflow-hidden">
             {isCmvCritical && <div className="absolute top-0 left-0 w-full h-1 bg-error animate-pulse" />}
             
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-8 flex items-center gap-2"><Calculator size={14} /> Engenharia Financeira</h4>
             
             <div className="space-y-8">
                <div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-outline-variant block mb-1">Custo da Receita</span>
                   <div className="text-4xl font-black text-on-surface tracking-tighter">R$ {resumo.custoTotal.toFixed(2)}</div>
                </div>

                <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Preço de Venda</span>
                      <div className="flex items-center gap-2 bg-surface-container p-1 px-2 rounded-lg border border-primary/20">
                        <span className="text-[8px] font-black text-primary">META</span>
                        <input type="number" value={cmvIdeal} onChange={e => setCmvIdeal(parseFloat(e.target.value))} className="w-6 bg-transparent text-[10px] font-black text-primary text-right outline-none" />
                        <span className="text-[8px] font-black text-primary">%</span>
                      </div>
                   </div>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-outline-variant">R$</span>
                      <input type="number" step="0.50" value={precoVenda} onChange={e => setPrecoVenda(parseFloat(e.target.value))} className={`w-full bg-surface-container border-2 rounded-xl py-4 pl-12 pr-4 text-xl font-black outline-none transition-all ${isCmvCritical ? 'border-error/30 text-error focus:border-error' : 'border-outline-variant/10 text-on-surface focus:border-primary'}`} />
                   </div>
                   <p className="mt-3 text-[9px] font-bold text-outline-variant uppercase">Sugerido para {cmvIdeal}%: <span className="text-primary font-black">R$ {resumo.precoSugerido(cmvIdeal).toFixed(2)}</span></p>
                </div>

                <div className={`p-6 rounded-3xl border-2 transition-all duration-500 shadow-lg ${isCmvCritical ? 'bg-error/10 border-error/50 animate-shake' : isCmvWarning ? 'bg-warning/10 border-warning/50' : 'bg-primary/10 border-primary/50'}`}>
                   <div className="flex justify-between items-center mb-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest ${isCmvCritical ? 'text-error' : 'text-primary'}`}>CMV ATUAL</span>
                     {isCmvCritical ? <AlertTriangle className="text-error" size={20} /> : <CheckCircle2 className={`text-primary ${!isCmvCritical && !isCmvWarning && 'animate-bounce'}`} size={20} />}
                   </div>
                   <div className={`text-5xl font-black tracking-tighter ${isCmvCritical ? 'text-error' : isCmvWarning ? 'text-warning' : 'text-primary'}`}>{resumo.cmv.toFixed(1)}%</div>
                   
                   <div className="w-full h-3 bg-black/10 rounded-full mt-6 overflow-hidden border border-white/5">
                      <div className={`h-full transition-all duration-1000 ${isCmvCritical ? 'bg-error' : isCmvWarning ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(resumo.cmv, 100)}%` }} />
                   </div>
                   
                   {isCmvCritical && (
                     <div className="mt-6 p-3 bg-error text-white rounded-xl">
                        <p className="text-[9px] font-black uppercase text-center leading-tight">PREJUÍZO! O CMV excedeu a meta de {cmvIdeal}%.</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
