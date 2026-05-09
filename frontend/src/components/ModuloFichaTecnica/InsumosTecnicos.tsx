import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, Droplets, FileSpreadsheet, Upload, Loader2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import PageLayout from '../shared/PageLayout';
import PageHeader from '../shared/PageHeader';
import Button from '../shared/Button';
import { useFTInsumos, FTInsumo } from '../../hooks/useFTInsumos';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { converterParaBase } from '../../utils/engineFT';

const UNIDADES = [
  { value: 'g', label: 'Gramas', short: 'G' },
  { value: 'kg', label: 'Quilos', short: 'KG' },
  { value: 'ml', label: 'Mililitros', short: 'ML' },
  { value: 'l', label: 'Litros', short: 'L' },
  { value: 'un', label: 'Unidade', short: 'UN' },
] as const;

function deriveBase(unit: string): 'g' | 'ml' | 'un' {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'l' || unit === 'ml') return 'ml';
  return 'un';
}

function formatQty(qty: number, unit: string): string {
  if (qty === 0) return `0 ${unit}`;
  if (Number.isInteger(qty)) return `${qty} ${unit}`;
  return `${qty} ${unit}`;
}

export default function InsumosTecnicos() {
  const { canEditTechnical } = useAuth();
  const { insumos, isLoading, createInsumo, updateInsumo, deleteInsumo, deleteAllInsumos } = useFTInsumos();
  const { showConfirm, showAlert } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<FTInsumo | null>(null);

  // Form State — simplified
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('kg');
  const [isLiquid, setIsLiquid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredInsumos = insumos.filter(i =>
    i.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => ({
    total: insumos.length,
    expensive: insumos.filter(i => i.preco_unitario_base > 1).length,
  }), [insumos]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pCompra = parseFloat(preco) || 0;
      const qCompra = parseFloat(quantidade) || 1;
      const unidadeBase = deriveBase(unidade);
      const volumeBase = converterParaBase(qCompra, unidade);
      const precoUnitarioBase = volumeBase > 0 ? pCompra / volumeBase : 0;

      const payload = {
        nome: nome.toUpperCase(),
        unidade_base: unidadeBase,
        preco_compra: pCompra,
        quantidade_compra: qCompra,
        unidade_compra: unidade,
        preco_unitario_base: precoUnitarioBase,
        is_liquid: isLiquid,
        alergenicos: [] as string[],
      };

      if (editingInsumo) {
        await updateInsumo({ ...payload, id: editingInsumo.id });
      } else {
        await createInsumo({
          ...payload,
          acucares_adicionados_g: 0,
          sodio_mg: 0,
          gordura_saturada_g: 0,
        });
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      showAlert('Erro', err.message);
    }
  };

  const handleEdit = (insumo: FTInsumo) => {
    setEditingInsumo(insumo);
    setNome(insumo.nome);
    setPreco(insumo.preco_compra.toString());
    setQuantidade(insumo.quantidade_compra.toString());
    setUnidade(insumo.unidade_compra);
    setIsLiquid(insumo.is_liquid);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingInsumo(null);
    setNome('');
    setPreco('');
    setQuantidade('');
    setUnidade('kg');
    setIsLiquid(false);
  };

  const handleDelete = async (id: string, nome: string) => {
    const confirmed = await showConfirm('Excluir Insumo', `Deseja remover "${nome}"? Isso pode afetar fichas existentes.`);
    if (confirmed) await deleteInsumo(id);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const buffer = await file.arrayBuffer();

      let wb: any;

      if (isCSV) {
        // CSV: decodifica o texto com encoding correto antes de passar para o xlsx
        // Excel brasileiro salva CSV em Windows-1252, não UTF-8
        let text: string;
        try {
          // Tenta UTF-8 primeiro (falha se tiver caracteres inválidos)
          text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          // Fallback para Windows-1252 (encoding padrão do Excel BR)
          text = new TextDecoder('windows-1252').decode(buffer);
        }
        wb = XLSX.read(text, { type: 'string' });
      } else {
        // Excel (.xlsx, .xlsm): lê com raw:false para pegar o texto formatado das células
        wb = XLSX.read(buffer, { type: 'array', raw: false, cellText: true, cellNF: true });
      }

      let successCount = 0;
      let errorCount = 0;

      // Para Excel: lê o texto formatado da célula (preserva "7,90" em vez de retornar 790)
      const getCellText = (ws: any, row: number, col: number): string => {
        if (col < 0) return '';
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddr];
        if (!cell) return '';
        if (cell.w) return cell.w;
        if (cell.v !== undefined) return cell.v.toString();
        return '';
      };

      // Parser de número que entende formatos BR (7,90) e EN (7.90) e milhar (1.234,56)
      const parseNumber = (val: any): number => {
        if (!val && val !== 0) return 0;
        if (typeof val === 'number') return val;
        const s = val.toString().trim()
          .replace(/R\$\s*/g, '')  // remove símbolo de moeda
          .replace(/\s/g, '');     // remove espaços
        // Formato BR com milhar: 1.234,56
        if (s.includes(',') && s.includes('.')) {
          return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
        }
        // Só vírgula (decimal BR): 7,90
        if (s.includes(',')) {
          return parseFloat(s.replace(',', '.')) || 0;
        }
        return parseFloat(s) || 0;
      };

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        // raw:false → retorna o texto formatado da célula (como aparece no Excel/CSV)
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as string[][];

        let headerRowIndex = -1;
        let colMapping: Record<string, number> = {};

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !Array.isArray(row)) continue;

          const normalizedRow = row.map(cell =>
            (cell || '').toString().toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
          );

          if (normalizedRow.includes('ingrediente')) {
            headerRowIndex = i;
            normalizedRow.forEach((val, idx) => {
              if (val === 'ingrediente' || val === 'item' || val === 'nome') colMapping.nome = idx;
              if (val === 'medida' || val === 'unidade' || val === 'und') colMapping.medida = idx;
              if (val === 'custo' || val === 'preco' || val === 'valor') colMapping.custo = idx;
              if (val === 'quantidade' || val === 'qtde' || val === 'qty') colMapping.quantidade = idx;
              if (val === 'liquido') colMapping.liquido = idx;
            });
            break;
          }
        }

        if (headerRowIndex === -1 || colMapping.nome === undefined) continue;

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          try {
            const nomeRaw = row[colMapping.nome];
            if (!nomeRaw || !nomeRaw.toString().trim()) continue;

            const nomeInsumo = nomeRaw.toString().trim();

            // Para Excel: usa getCellText para pegar o valor formatado da célula
            // Para CSV: o valor já vem como texto correto via TextDecoder
            const custoRaw = isCSV
              ? row[colMapping.custo]
              : (getCellText(ws, i, colMapping.custo ?? -1) || row[colMapping.custo]);
            const precoCompra = parseNumber(custoRaw);

            const medidaRaw = (row[colMapping.medida] ?? 'kg').toString().trim();

            const medidaMatch = medidaRaw.match(/^(\d+[\.,]?\d*)\s*(kg|g|ml|l|un|litro|litros|quilo|quilos|grama|gramas|unidade|unidades)$/i);
            let qtyCompra: number;
            let unidCompra: string;

            if (medidaMatch) {
              qtyCompra = parseNumber(medidaMatch[1]);
              unidCompra = medidaMatch[2].toLowerCase();
            } else {
              const plainNumber = parseNumber(medidaRaw);
              if (plainNumber > 0) {
                qtyCompra = plainNumber;
                unidCompra = 'kg';
              } else {
                qtyCompra = 1;
                unidCompra = medidaRaw.toLowerCase().replace(/[^a-z]/g, '') || 'kg';
              }
            }

            if (colMapping.quantidade !== undefined && row[colMapping.quantidade]) {
              const q = parseNumber(row[colMapping.quantidade]);
              if (q > 0) qtyCompra = q;
            }

            if (unidCompra === 'litro' || unidCompra === 'litros') unidCompra = 'l';
            if (unidCompra === 'quilo' || unidCompra === 'quilos') unidCompra = 'kg';
            if (unidCompra === 'grama' || unidCompra === 'gramas') unidCompra = 'g';
            if (unidCompra === 'unidade' || unidCompra === 'unidades') unidCompra = 'un';
            if (!['kg', 'g', 'ml', 'l', 'un'].includes(unidCompra)) unidCompra = 'kg';

            const isLiq = unidCompra === 'ml' || unidCompra === 'l' ||
              (colMapping.liquido !== undefined && ['s', 'sim', 'y', 'yes'].includes(
                (row[colMapping.liquido] || 'n').toString().toLowerCase().trim()
              ));

            const unidadeBase = deriveBase(unidCompra);
            const volumeBase = converterParaBase(qtyCompra, unidCompra);
            const precoUnitarioBase = volumeBase > 0 ? precoCompra / volumeBase : 0;

            await createInsumo({
              nome: nomeInsumo.toUpperCase(),
              unidade_base: unidadeBase,
              preco_compra: precoCompra,
              quantidade_compra: qtyCompra,
              unidade_compra: unidCompra,
              preco_unitario_base: precoUnitarioBase,
              is_liquid: isLiq,
              acucares_adicionados_g: 0,
              sodio_mg: 0,
              gordura_saturada_g: 0,
              alergenicos: []
            });
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      showAlert(
        'Importação Concluída',
        `${successCount} insumos importados com sucesso.${errorCount > 0 ? ` ${errorCount} linhas ignoradas.` : ''}`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showAlert('Erro na Importação', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await showConfirm(
      'EXCLUSÃO TOTAL',
      'Tem certeza que deseja excluir TODOS os insumos técnicos? Esta ação não pode ser desfeita e afetará todas as fichas técnicas.'
    );
    
    if (confirmed) {
      try {
        await deleteAllInsumos();
        showAlert('Sucesso', 'Todos os insumos foram removidos da base técnica.');
      } catch (err: any) {
        showAlert('Erro', 'Falha ao processar exclusão: ' + err.message);
      }
    }
  };

  return (
    <PageLayout maxWidth="full">
      <PageHeader
        showSearch
        onSearchChange={setSearchTerm}
        searchPlaceholder="FILTRAR BASE DE DADOS TÉCNICA..."
      />

      {/* Header + Stats */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16 mt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-[2px] bg-primary/30" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Engenharia de Suprimentos</span>
          </div>
          <h3 className="text-5xl lg:text-7xl font-black text-on-surface tracking-tighter uppercase leading-[0.8]">Base de Insumos</h3>
          <p className="text-xs font-medium text-outline-variant max-w-sm uppercase tracking-widest leading-relaxed">Gestão centralizada de custos unitários e conversões técnicas para produção.</p>
        </div>

        <div className="flex items-center flex-wrap gap-6">
          <div className="bg-surface-container/40 backdrop-blur-md rounded-3xl p-6 px-10 border border-outline-variant/10 text-center hover:border-primary/20 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-outline-variant block mb-2">Insumos Ativos</span>
            <span className="text-4xl font-black text-on-surface leading-none">{stats.total}</span>
          </div>
          <div className="bg-primary/5 backdrop-blur-md rounded-3xl p-6 px-10 border border-primary/20 text-center hover:bg-primary/10 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Criticos ($)</span>
            <span className="text-4xl font-black text-primary leading-none">{stats.expensive}</span>
          </div>
          {canEditTechnical && (
            <div className="flex gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              {insumos.length > 0 && (
                <Button
                  variant="outline"
                  size="xl"
                  icon={<Trash2 size={24} />}
                  onClick={handleDeleteAll}
                  className="border-error/20 text-error hover:bg-error/5"
                >
                  Excluir Todos
                </Button>
              )}
              <Button
                variant="outline"
                size="xl"
                icon={isImporting ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                onClick={handleImportClick}
                disabled={isImporting}
                className="border-primary/20 text-primary hover:bg-primary/5"
              >
                {isImporting ? 'Importando...' : 'Importar CSV'}
              </Button>
              <Button
                variant="primary"
                size="xl"
                icon={<Plus size={24} />}
                onClick={() => setIsFormOpen(true)}
                className="shadow-2xl shadow-primary/30"
              >
                Novo Cadastro
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container/40 backdrop-blur-md rounded-[40px] border border-outline-variant/10 overflow-hidden shadow-2xl mb-32">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-highest/10">
              <th className="pl-12 pr-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60">Designação do Insumo</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60">Parâmetros de Compra</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60">Última Revisão</th>
              <th className="pr-12 py-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {filteredInsumos.map(i => (
              <tr key={i.id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                <td className="pl-12 pr-6 py-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-base font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">{i.nome}</span>
                    <div className="flex gap-2">
                      {i.alergenicos?.map(a => (
                        <span key={a} className="text-[9px] bg-error/10 text-error px-2 py-1 rounded-lg font-black uppercase tracking-tighter border border-error/5">contém {a}</span>
                      ))}
                      {i.is_liquid && <span className="text-[9px] bg-primary/10 text-primary px-2 py-1 rounded-lg font-black uppercase tracking-tighter border border-primary/5">líquido</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-on-surface tracking-tight">R$ {(i.preco_compra || 0).toFixed(2)}</span>
                    <span className="text-[10px] font-black text-outline-variant/60 uppercase mt-1">por {formatQty(i.quantidade_compra, i.unidade_compra)}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <span className="text-[11px] font-black text-outline-variant/60 uppercase tracking-widest">{new Date(i.data_atualizacao).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="pr-12 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    {canEditTechnical ? (
                      <>
                        <button onClick={() => handleEdit(i)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-outline-variant hover:text-primary hover:bg-primary/10 transition-all duration-300">
                          <Edit2 size={20} />
                        </button>
                        <button onClick={() => handleDelete(i.id, i.nome)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-outline-variant hover:text-error hover:bg-error/10 transition-all duration-300">
                          <Trash2 size={20} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-outline-variant/40 py-4">Visualização</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInsumos.length === 0 && (
          <div className="py-32 text-center text-outline-variant uppercase font-black tracking-widest text-xs opacity-50 flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
              <Search size={40} />
            </div>
            Nenhum insumo técnico encontrado
          </div>
        )}
      </div>

      {/* ── Modal de Cadastro Simplificado ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => { setIsFormOpen(false); resetForm(); }} />
          <div className="relative bg-surface-container/60 backdrop-blur-3xl w-full max-w-xl rounded-[40px] border border-outline-variant/20 shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

            <div className="p-10 lg:p-12">
              {/* Header */}
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-[1px] bg-primary/30" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Gestão de Suprimentos</span>
                  </div>
                  <h4 className="text-3xl lg:text-4xl font-black text-on-surface uppercase tracking-tighter">
                    {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
                  </h4>
                </div>
                <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                {/* 1. Nome */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 block px-2">Nome do Insumo</label>
                  <input
                    required
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="EX: MANTEIGA, FARINHA DE TRIGO..."
                    className="w-full bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 text-base font-black text-on-surface outline-none transition-all uppercase placeholder:text-outline-variant/20 shadow-inner"
                  />
                </div>

                {/* 2. Preço + Quantidade lado a lado */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 block px-2">Preço Pago</label>
                    <div className="relative group/price">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-outline-variant/40 group-focus-within/price:text-primary transition-colors">R$</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={preco}
                        onChange={e => setPreco(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 pl-12 text-lg font-black text-on-surface outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 block px-2">Quantidade</label>
                    <div className="relative group/qty">
                      <input
                        type="number"
                        step="0.001"
                        value={quantidade}
                        onChange={e => setQuantidade(e.target.value)}
                        placeholder="1"
                        className="w-full bg-surface-container-highest/30 border-2 border-transparent focus:border-primary/20 rounded-[20px] p-5 text-lg font-black text-on-surface outline-none transition-all shadow-inner"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline-variant/40 uppercase group-focus-within/qty:text-primary transition-colors">{unidade}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Seletor de Unidade — único e visual */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant/60 block px-2">Unidade de Medida</label>
                  <div className="flex gap-2 bg-surface-container-highest/20 p-2 rounded-[20px] border border-outline-variant/10 shadow-inner">
                    {UNIDADES.map(u => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => {
                          setUnidade(u.value);
                          // Auto-set liquid when ml/L
                          if (u.value === 'ml' || u.value === 'l') setIsLiquid(true);
                          if (u.value === 'g' || u.value === 'kg' || u.value === 'un') setIsLiquid(false);
                        }}
                        className={`flex-1 py-3.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${unidade === u.value
                          ? 'bg-primary text-on-primary shadow-xl shadow-primary/20'
                          : 'text-outline-variant hover:text-on-surface'
                        }`}
                      >
                        {u.short}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-outline-variant/50 uppercase px-2 mt-1">
                    {unidade === 'g' && 'Itens pesados em gramas (ex: 500g de açúcar)'}
                    {unidade === 'kg' && 'Itens pesados em quilos (ex: 1kg de farinha)'}
                    {unidade === 'ml' && 'Líquidos em mililitros (ex: 200ml de essência)'}
                    {unidade === 'l' && 'Líquidos em litros (ex: 1L de leite)'}
                    {unidade === 'un' && 'Itens vendidos por unidade (ex: 12 ovos)'}
                  </p>
                </div>

                {/* 4. Toggle líquido — só aparece para g/kg/un pois ml/L já é auto */}
                {(unidade === 'g' || unidade === 'kg' || unidade === 'un') && (
                  <div className="flex items-center gap-4 px-2">
                    <button
                      type="button"
                      onClick={() => setIsLiquid(!isLiquid)}
                      className={`w-12 h-6 rounded-full transition-all duration-500 relative flex-shrink-0 ${isLiquid ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-surface-container-highest shadow-inner'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-md ${isLiquid ? 'left-6' : 'left-0.5'}`} />
                    </button>
                    <div className="flex items-center gap-2">
                      <Droplets size={14} className={`${isLiquid ? 'text-primary' : 'text-outline-variant/40'} transition-colors`} />
                      <span className="text-[10px] font-black uppercase text-outline-variant tracking-widest">Insumo Líquido</span>
                    </div>
                  </div>
                )}

                {/* 5. Botões */}
                <div className="flex items-center justify-end gap-4 pt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    size="xl"
                    onClick={() => { setIsFormOpen(false); resetForm(); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    size="xl"
                    className="shadow-2xl shadow-primary/20"
                  >
                    {editingInsumo ? 'Salvar Alterações' : 'Cadastrar Insumo'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
