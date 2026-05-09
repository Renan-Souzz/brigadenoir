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
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  Droplets,
  Zap,
  ThermometerSnowflake,
  ChevronDown
} from 'lucide-react';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useFTFichas, FTFicha, FTFichaIngrediente, FTFichaComplemento } from '../../hooks/useFTFichas';
import { useFTInsumos } from '../../hooks/useFTInsumos';
import { useStations } from '../../hooks/useStations';
import { calcularPLFinal, calcularCustoIngrediente, calcularResumoFicha, verificarAlertasAnvisa, detectarAlergenos } from '../../utils/engineFT';
import { useModal } from '../../contexts/ModalContext';
import { exportToExcel } from '../../services/exportService';
import { syncToGoogleSheets } from '../../services/googleSheetsService';
import { NotificationService } from '../../services/NotificationService';

interface FichaEditorProps {
  fichaId?: string;
  onClose: () => void;
}

export default function FichaEditor({ fichaId, onClose }: FichaEditorProps) {
  const { profile, canEditTechnical } = useAuth();
  const { getFicha, upsertFicha, deleteFicha, isLoading: isFichaLoading } = useFTFichas();
  const { insumos, isLoading: isInsumosLoading } = useFTInsumos();
  const { showAlert, showConfirm } = useModal();

  const canEdit = canEditTechnical;

  // Root States
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Entrada');
  const [rendimento, setRendimento] = useState(1);
  const [precoVenda, setPrecoVenda] = useState<number>(0);
  const [cmvIdeal, setCmvIdeal] = useState(30);
  const [pracaId, setPracaId] = useState<string>('');
  const [imagemUrl, setImagemUrl] = useState<string>('');
  const [imagemBase64, setImagemBase64] = useState<string>('');

  const { stations } = useStations();

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
        setPracaId(data.praca_id || '');
        setImagemUrl(data.imagem_url || '');
        setImagemBase64(data.imagem_base64 || '');
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

  const alergenosDetectados = useMemo(() => {
    return detectarAlergenos(ingredientes);
  }, [ingredientes]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64
        showAlert('Arquivo muito grande', 'Por favor, selecione uma imagem de até 2MB para garantir a performance do sistema.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!fichaId) return;
    const confirmed = await showConfirm(
      'Excluir Ficha Técnica',
      `Tem certeza que deseja excluir "${nome}"? Esta ação removerá permanentemente todos os dados financeiros e técnicos desta ficha.`
    );
    if (confirmed) {
      try {
        await deleteFicha(fichaId);
        onClose();
      } catch (err: any) {
        showAlert('Erro ao Excluir', err.message);
      }
    }
  };

  const handleSave = async () => {
    if (!nome) return showAlert('Atenção', 'O nome da ficha é obrigatório.');
    setIsSaving(true);
    try {
      await upsertFicha({
        ficha: { 
          id: fichaId, 
          nome, 
          categoria, 
          rendimento_total: rendimento, 
          preco_venda: precoVenda, 
          cmv_ideal: cmvIdeal, 
          praca_id: pracaId, 
          imagem_url: imagemUrl,
          imagem_base64: imagemBase64 
        },
        ingredientes: ingredientes.filter(i => i.insumo_id).map(({ id, insumo_nome, preco_unitario_base, ...rest }: any) => rest),
        complementos: { ...complementos, contem_gluten: complementos.contem_gluten }
      });
      
      const isCmvCritical = resumo.cmv > cmvIdeal;
      if (isCmvCritical) {
        await NotificationService.notifyLeadership({
          title: 'Alerta CMV Crítico',
          message: `A ficha técnica "${nome}" foi salva com CMV de ${resumo.cmv.toFixed(1)}% (Meta: ${cmvIdeal}%).`,
          type: 'error'
        });
      }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={onClose} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-surface-container/60 backdrop-blur-md border border-outline-variant/10 flex items-center justify-center text-outline-variant hover:text-primary hover:border-primary/30 transition-all active:scale-90 shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="w-6 md:w-8 h-[1px] bg-primary/30" />
               <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-[0.2em] md:tracking-[0.3em]">Editor de Engenharia</span>
             </div>
             <h2 className="text-xl md:text-4xl font-black text-on-surface uppercase tracking-tighter">
               {fichaId ? 'Ficha Técnica' : 'Novo Projeto'}
             </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4">
          {fichaId && canEdit && (
            <button 
              onClick={handleDelete}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error hover:bg-error hover:text-white transition-all active:scale-90 shadow-lg shadow-error/10"
              title="Excluir Ficha Técnica"
            >
              <Trash2 size={18} />
            </button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="border-primary/10"
            onClick={() => exportToExcel({
              ficha: { nome, categoria, rendimento, precoVenda, cmvIdeal },
              ingredientes,
              financeiro: { ...resumo, precoSugerido: resumo.precoSugerido(cmvIdeal) },
              producao: { passos: complementos.observacoes },
              rotulagem: { alergenos: alergenosDetectados, gluten: complementos.contem_gluten ? 'SIM' : 'NÃO', lactose: complementos.contem_lactose ? 'SIM' : 'NÃO', validade: `${complementos.validade_dias} dias`, conservacao: complementos.conservacao }
            })}
          >
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-[#4285F4]/20 text-[#4285F4] hover:bg-[#4285F4]/10 hidden sm:flex"
            icon={<FileSpreadsheet size={16} />}
            onClick={async () => {
              try {
                await syncToGoogleSheets({
                  ficha: { nome, categoria, rendimento, precoVenda, cmvIdeal },
                  ingredientes,
                  financeiro: { ...resumo, precoSugerido: resumo.precoSugerido(cmvIdeal) },
                  producao: { passos: complementos.observacoes },
                  rotulagem: { alergenos: alergenosDetectados, gluten: complementos.contem_gluten ? 'SIM' : 'NÃO', lactose: complementos.contem_lactose ? 'SIM' : 'NÃO', validade: `${complementos.validade_dias} dias`, conservacao: complementos.conservacao }
                });
                showAlert('Sucesso', 'Planilha sincronizada com seu Google Drive!');
              } catch (err: any) {
                showAlert('Erro no Sheets', err.message);
              }
            }}
          >
            Sheets
          </Button>
          {canEdit && (
            <Button 
              variant="primary" 
              size="sm"
              icon={<Save size={16} />} 
              loading={isSaving} 
              onClick={handleSave}
              className="shadow-2xl shadow-primary/20 flex-1 sm:flex-none"
            >
              Salvar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 pb-40">
        <div className="lg:col-span-9 space-y-6 md:space-y-10">
          {/* Dados Primários */}
          <div className="bg-surface-container/40 backdrop-blur-md rounded-2xl md:rounded-[40px] border border-outline-variant/10 overflow-hidden shadow-2xl">
            <div className="bg-surface-container-low/50 p-4 md:p-10 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-10">
               <div className="md:col-span-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 mb-3 block">Designação da Receita</label>
                 <input 
                  type="text" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  disabled={!canEdit}
                  placeholder="EX: RISOTTO AL FUNGHI PORCINI..." 
                  className={`w-full bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 text-base font-black text-on-surface outline-none transition-all uppercase placeholder:text-outline-variant/30 ${!canEdit && 'cursor-not-allowed opacity-80'}`} 
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 mb-3 block">Categoria</label>
                 <div className="relative group">
                   <select 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)} 
                    disabled={!canEdit}
                    className={`w-full appearance-none bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 pr-12 text-sm font-black text-on-surface outline-none uppercase cursor-pointer ${!canEdit && 'cursor-not-allowed opacity-80'}`}
                   >
                     {['Entrada', 'Prato Principal', 'Sobremesa', 'Bebida', 'Base / Molho'].map(cat => (
                       <option key={cat} value={cat} className="bg-surface-container-highest text-on-surface font-black uppercase">{cat}</option>
                     ))}
                   </select>
                   <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none group-focus-within:text-primary transition-colors" />
                 </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 mb-3 block">Rendimento Total</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={rendimento} 
                      onChange={e => setRendimento(parseFloat(e.target.value))} 
                      disabled={!canEdit}
                      className={`w-full bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 text-base font-black text-on-surface outline-none transition-all ${!canEdit && 'cursor-not-allowed opacity-80'}`} 
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-outline-variant/40 uppercase">KG / UN</span>
                  </div>
               </div>
            </div>

            <div className="bg-surface-container-low/30 px-4 md:px-10 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 border-b border-outline-variant/5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 mb-3 block">Praça Responsável</label>
                <div className="relative group">
                  <select 
                   value={pracaId} 
                   onChange={e => setPracaId(e.target.value)} 
                   disabled={!canEdit}
                   className={`w-full appearance-none bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 pr-12 text-sm font-black text-on-surface outline-none uppercase cursor-pointer ${!canEdit && 'cursor-not-allowed opacity-80'}`}
                  >
                    <option value="" className="bg-surface-container-highest text-on-surface font-black uppercase">Selecionar Praça...</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id} className="bg-surface-container-highest text-on-surface font-black uppercase">{s.display_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 mb-3 block">Foto de Montagem (Interna)</label>
                <div className="flex gap-4">
                  <div className="flex-1 relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={!canEdit}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className={`w-full flex items-center justify-between bg-surface-container-highest/30 border-2 border-dashed border-outline-variant/20 hover:border-primary/40 rounded-[20px] p-5 text-xs font-black text-outline-variant cursor-pointer transition-all ${!canEdit && 'cursor-not-allowed opacity-50'}`}
                    >
                      <span>{imagemBase64 ? 'ALTERAR IMAGEM' : 'CARREGAR IMAGEM'}</span>
                      <Maximize2 size={16} />
                    </label>
                  </div>
                  {(imagemBase64 || imagemUrl) && (
                    <div className="w-16 h-16 rounded-[16px] overflow-hidden border-2 border-primary/20 bg-black/20">
                      <img src={imagemBase64 || imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela de Insumos */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-highest/10">
                    <th className="pl-10 pr-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 border-r border-outline-variant/5">Insumo Técnico</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 border-r border-outline-variant/5 text-center">Qtde / Unid</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 border-r border-outline-variant/5 text-center">Aproveitamento</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 border-r border-outline-variant/5 text-center">Peso Líquido</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 text-center">Custo Real</th>
                    <th className="pr-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {ingredientes.map((ing) => {
                    const insumoData = insumos.find(i => i.id === ing.insumo_id);
                    const aproveitamento = ing.fc && ing.fc > 0 ? (1 / ing.fc) * 100 : 100;
                    const plFinal = calcularPLFinal(ing.pb_gramas || 0, { fc: ing.fc || 1, ir: ing.ir || 1, ia: ing.ia || 1, icd: ing.icd || 1 });
                    const custoBase = (ing.pb_gramas || 0) * (insumoData?.preco_unitario_base || 0);
                    const custo = ing.fc && ing.fc > 0 ? custoBase * ing.fc : custoBase;

                    return (
                      <tr key={ing.id} className="group hover:bg-primary/[0.02] transition-colors duration-300">
                        <td className="pl-10 pr-4 py-4 border-r border-outline-variant/5 min-w-[280px]">
                           <div className="relative group/select">
                             <select 
                              value={ing.insumo_id} 
                              onChange={e => handleUpdateIngrediente(ing.id!, 'insumo_id', e.target.value)}
                              disabled={!canEdit}
                              className={`w-full appearance-none bg-transparent border-none p-3 pl-0 text-sm font-black text-on-surface outline-none cursor-pointer group-hover/select:text-primary transition-colors uppercase ${!canEdit && 'cursor-not-allowed'}`}
                             >
                               <option value="" className="bg-surface-container-highest">SELECIONAR INSUMO...</option>
                               {insumos.map(i => <option key={i.id} value={i.id} className="bg-surface-container-highest">{i.nome}</option>)}
                             </select>
                             <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-outline-variant/40 group-hover/select:text-primary transition-colors pointer-events-none" />
                           </div>
                        </td>
                        <td className="px-4 py-4 border-r border-outline-variant/5 w-32">
                           <div className="relative">
                             <input 
                               type="number" step="0.001" 
                               value={(() => {
                                 const isLarge = insumoData?.unidade_compra?.toUpperCase() === 'KG' || insumoData?.unidade_compra?.toUpperCase() === 'L';
                                 return isLarge ? (ing.pb_gramas || 0) / 1000 : ing.pb_gramas;
                               })()} 
                               onChange={e => {
                                 const val = parseFloat(e.target.value) || 0;
                                 const isLarge = insumoData?.unidade_compra?.toUpperCase() === 'KG' || insumoData?.unidade_compra?.toUpperCase() === 'L';
                                 handleUpdateIngrediente(ing.id!, 'pb_gramas', isLarge ? val * 1000 : val);
                               }} 
                               disabled={!canEdit}
                               className={`w-full bg-surface-container-highest/20 rounded-xl p-3 text-center text-sm font-black text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!canEdit && 'cursor-not-allowed'}`} 
                             />
                             <span className="absolute right-2 bottom-1 text-[7px] font-black text-outline-variant/40 uppercase">
                               {insumoData?.unidade_compra || insumoData?.unidade_base || 'G'}
                             </span>
                           </div>
                        </td>
                        <td className="px-2 py-4 border-r border-outline-variant/5 w-28">
                           <div className="relative">
                             <input 
                               type="number" step="1" min="1" max="100"
                               value={Math.round(aproveitamento)}
                               onChange={e => {
                                 const pct = parseFloat(e.target.value) || 100;
                                 const newFc = pct > 0 ? 100 / pct : 1;
                                 handleUpdateIngrediente(ing.id!, 'fc', parseFloat(newFc.toFixed(4)));
                               }}
                               disabled={!canEdit}
                               className={`w-full bg-surface-container-highest/20 rounded-xl p-3 pr-8 text-center text-sm font-black outline-none focus:ring-1 focus:ring-primary/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${aproveitamento < 70 ? 'text-warning' : aproveitamento < 50 ? 'text-error' : 'text-on-surface'} ${!canEdit && 'cursor-not-allowed'}`}
                             />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline-variant/40">%</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 border-r border-outline-variant/5 w-32 bg-primary/[0.01] text-center">
                           <div className="flex flex-col">
                             <span className="text-sm font-black text-on-surface/40 leading-none">
                               {(() => {
                                 const isLarge = insumoData?.unidade_compra?.toUpperCase() === 'KG' || insumoData?.unidade_compra?.toUpperCase() === 'L';
                                 const val = isLarge ? plFinal / 1000 : plFinal;
                                 return val >= 1 ? val.toFixed(2) : val.toFixed(3);
                               })()}
                             </span>
                             <span className="text-[9px] font-black text-outline-variant/30 uppercase mt-1">
                               {insumoData?.unidade_compra || insumoData?.unidade_base || 'G'}
                             </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 w-40 bg-primary/[0.03] text-center">
                           <span className="text-sm font-black text-primary tracking-tight">R$ {custo.toFixed(2)}</span>
                        </td>
                        <td className="pr-10 text-right w-16">
                          {canEdit && (
                            <button 
                              onClick={() => handleRemoveIngrediente(ing.id!)} 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-outline-variant hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {canEdit && (
                <button 
                  onClick={handleAddIngrediente} 
                  className="w-full p-8 text-[11px] font-black uppercase tracking-[0.3em] text-outline-variant hover:text-primary hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-3 border-t border-outline-variant/5 group"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" /> 
                  Adicionar Novo Insumo Técnico
                </button>
              )}
            </div>
          </div>

          {/* Preparo e Rotulagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-surface-container/40 backdrop-blur-md rounded-[40px] p-10 border border-outline-variant/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Utensils size={18} />
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Instruções de Produção</h4>
                </div>
                <textarea 
                  placeholder="DESCREVA O PASSO A PASSO DA EXECUÇÃO, TEMPOS E TEMPERATURAS..." 
                  value={complementos.observacoes} 
                  onChange={e => setComplementos({...complementos, observacoes: e.target.value})}
                  disabled={!canEdit}
                  className={`w-full bg-surface-container-low/40 rounded-3xl p-8 text-sm font-medium text-on-surface min-h-[350px] outline-none border-2 border-transparent focus:border-primary/20 transition-all shadow-inner leading-relaxed placeholder:text-outline-variant/20 ${!canEdit && 'cursor-not-allowed opacity-80'}`}
                />
             </div>

             <div className="bg-surface-container/40 backdrop-blur-md rounded-[40px] p-10 border border-outline-variant/10 shadow-2xl flex flex-col">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldAlert size={18} />
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Conformidade RDC 429 & RDC 26</h4>
                </div>
                
                {/* Alertas ANVISA Premium */}
                <div className="space-y-6 flex-1">
                  {(alertasAnvisa.altoAcucar || alertasAnvisa.altoSodio || alertasAnvisa.altoGordura || alergenosDetectados.length > 0) ? (
                    <div className="space-y-4">
                      {alertasAnvisa.altoAcucar && (
                        <div className="bg-black text-white p-6 rounded-[24px] flex items-center gap-6 border border-white/10 shadow-2xl animate-pulse-subtle">
                          <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-white text-black rounded-2xl font-black text-2xl shadow-xl">!</div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">ALERTA RDC 429</div>
                            <div className="text-xl font-black uppercase tracking-tight">ALTO EM AÇÚCAR</div>
                          </div>
                        </div>
                      )}
                      {alertasAnvisa.altoSodio && (
                        <div className="bg-black text-white p-6 rounded-[24px] flex items-center gap-6 border border-white/10 shadow-2xl animate-pulse-subtle">
                          <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-white text-black rounded-2xl font-black text-2xl shadow-xl">!</div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">ALERTA RDC 429</div>
                            <div className="text-xl font-black uppercase tracking-tight">ALTO EM SÓDIO</div>
                          </div>
                        </div>
                      )}
                      {alertasAnvisa.altoGordura && (
                        <div className="bg-black text-white p-6 rounded-[24px] flex items-center gap-6 border border-white/10 shadow-2xl animate-pulse-subtle">
                          <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-white text-black rounded-2xl font-black text-2xl shadow-xl">!</div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">ALERTA RDC 429</div>
                            <div className="text-xl font-black uppercase tracking-tight">ALTO EM GORDURA SAT.</div>
                          </div>
                        </div>
                      )}
                      {alergenosDetectados.length > 0 && (
                        <div className="bg-error/10 text-error p-6 rounded-[24px] flex items-start gap-6 border border-error/20 shadow-2xl">
                          <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-error text-white rounded-2xl font-black text-2xl shadow-xl"><AlertTriangle size={24} /></div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">ALERTA RDC 26 (ALÉRGICOS)</div>
                            <div className="text-sm font-black uppercase tracking-tight mb-2">CONTÉM:</div>
                            <div className="flex flex-wrap gap-2">
                              {alergenosDetectados.map(a => (
                                <span key={a} className="px-3 py-1 bg-error/20 rounded-lg text-xs font-bold">{a}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-[32px] p-10 text-center group">
                      <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-500">
                        <CheckCircle2 className="text-primary" size={48} />
                      </div>
                      <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-2">Selagem Técnica Limpa</span>
                      <p className="text-[10px] font-medium text-outline-variant uppercase">Livre de alertas RDC 429 e Alérgenos principais</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 mt-10 pt-10 border-t border-outline-variant/10">
                   <div className="p-6 bg-surface-container-low/60 rounded-3xl border border-outline-variant/5">
                      <span className="text-[9px] font-black text-outline-variant/60 uppercase block mb-2 tracking-widest">Açúcar / 100g</span>
                      <span className="text-2xl font-black text-on-surface tracking-tighter">{alertasAnvisa.valoresPor100.acucarPor100.toFixed(1)}<small className="text-sm">g</small></span>
                   </div>
                   <div className="p-6 bg-surface-container-low/60 rounded-3xl border border-outline-variant/5">
                      <span className="text-[9px] font-black text-outline-variant/60 uppercase block mb-2 tracking-widest">Sódio / 100g</span>
                      <span className="text-2xl font-black text-on-surface tracking-tighter">{alertasAnvisa.valoresPor100.sodioPor100.toFixed(0)}<small className="text-sm">mg</small></span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Financeira Premium */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-surface-container/60 backdrop-blur-xl rounded-[40px] p-10 border border-outline-variant/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] sticky top-10 overflow-hidden group">
             {isCmvCritical && <div className="absolute top-0 left-0 w-full h-2 bg-error animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]" />}
             
             <div className="flex items-center gap-3 mb-12">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <Calculator size={18} />
               </div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface">Engenharia CMV</h4>
             </div>
             
             <div className="space-y-12">
                <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 block mb-3">Custo da Receita</span>
                   <div className="text-5xl font-black text-on-surface tracking-tighter leading-none group-hover:text-primary transition-colors duration-500">
                     <small className="text-lg opacity-40 mr-1">R$</small>
                     {resumo.custoTotal.toFixed(2)}
                   </div>
                </div>

                <div className="p-8 rounded-[32px] bg-surface-container-low/80 border border-outline-variant/5 shadow-inner">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60">Preço Venda</span>
                      <div className="flex items-center gap-3 bg-primary/10 p-2 px-3 rounded-2xl border border-primary/20">
                        <span className="text-[9px] font-black text-primary uppercase">Meta</span>
                        <input 
                          type="number" 
                          value={cmvIdeal} 
                          onChange={e => setCmvIdeal(parseFloat(e.target.value))} 
                          className="w-8 bg-transparent text-xs font-black text-primary text-right outline-none" 
                        />
                        <span className="text-xs font-black text-primary">%</span>
                      </div>
                   </div>
                   <div className="relative group/price">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-outline-variant/30 group-focus-within/price:text-primary transition-colors">R$</span>
                      <input 
                        type="number" 
                        step="0.50" 
                        value={precoVenda} 
                        onChange={e => setPrecoVenda(parseFloat(e.target.value))} 
                        disabled={!canEdit}
                        className={`w-full bg-surface-container-highest/40 border-2 rounded-[24px] py-6 pl-16 pr-6 text-2xl font-black outline-none transition-all ${isCmvCritical ? 'border-error/30 text-error focus:border-error' : 'border-transparent text-on-surface focus:border-primary/40'} ${!canEdit && 'cursor-not-allowed opacity-80'}`} 
                      />
                   </div>
                   <div className="mt-5 flex items-center justify-between">
                     <span className="text-[9px] font-black text-outline-variant/40 uppercase tracking-widest">Preço Sugerido</span>
                     <span className="text-sm font-black text-primary">R$ {resumo.precoSugerido(cmvIdeal).toFixed(2)}</span>
                   </div>
                </div>

                <div className={`p-10 rounded-[40px] border-2 transition-all duration-700 shadow-2xl relative overflow-hidden ${isCmvCritical ? 'bg-error/10 border-error/40' : isCmvWarning ? 'bg-warning/10 border-warning/40' : 'bg-primary/5 border-primary/40'}`}>
                   <div className="flex justify-between items-center mb-4 relative z-10">
                     <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${isCmvCritical ? 'text-error' : 'text-primary'}`}>Margem CMV</span>
                     {isCmvCritical ? <ShieldAlert className="text-error animate-pulse-subtle" size={28} /> : <TrendingUp className={`text-primary ${!isCmvCritical && !isCmvWarning && 'animate-bounce'}`} size={28} />}
                   </div>
                   <div className={`text-6xl font-black tracking-tighter relative z-10 ${isCmvCritical ? 'text-error' : isCmvWarning ? 'text-warning' : 'text-primary'}`}>
                     {resumo.cmv.toFixed(1)}<small className="text-2xl">%</small>
                   </div>
                   
                   <div className="w-full h-3 bg-black/10 rounded-full mt-10 overflow-hidden relative z-10 border border-white/5 shadow-inner">
                      <div className={`h-full transition-all duration-[1.5s] ease-out shadow-[0_0_15px_rgba(var(--primary),0.6)] ${isCmvCritical ? 'bg-error shadow-error/50' : isCmvWarning ? 'bg-warning shadow-warning/50' : 'bg-primary shadow-primary/50'}`} style={{ width: `${Math.min(resumo.cmv, 100)}%` }} />
                   </div>
                   
                   {isCmvCritical && (
                     <div className="mt-8 p-4 bg-error text-white rounded-2xl relative z-10 shadow-lg animate-view">
                        <p className="text-[10px] font-black uppercase text-center leading-tight tracking-widest">Operação no Vermelho!</p>
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
