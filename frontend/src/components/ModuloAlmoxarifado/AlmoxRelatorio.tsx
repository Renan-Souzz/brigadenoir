import React, { useState } from 'react';
import {
  FileText, Download, Image as ImageIcon, Loader2,
  PackageOpen, TrendingUp, Weight, Hash, Calendar, Printer
} from 'lucide-react';
import { useAlmoxMovimentacoes, AlmoxTipoMov } from '../../hooks/useAlmoxMovimentacoes';
import { useWaste } from '../../hooks/useWaste';
import { useModal } from '../../contexts/ModalContext';
import { formatLocalDate } from '../../lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TIPO_LABELS: Record<AlmoxTipoMov, { label: string; color: string }> = {
  chegada:        { label: 'Chegada',           color: '#22c55e' },
  subida_cozinha: { label: 'Envio p/ Cozinha',  color: '#eab308' },
  teste_quebra:   { label: 'Teste de Quebra',   color: '#ef4444' },
  retorno_almox:  { label: 'Retorno ao Almox',  color: '#3b82f6' },
  requisicao:     { label: 'Requisição',        color: '#a855f7' },
};

export default function AlmoxRelatorio() {
  const { movimentacoes, getLotes, getStats } = useAlmoxMovimentacoes();
  const { showAlert } = useModal();

  const today = formatLocalDate();
  const weekAgo = formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [exporting, setExporting] = useState(false);

  const stats = getStats(startDate, endDate);
  const lotes = getLotes();
  
  // Calculate days between dates for waste query
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 7;
  
  const { wasteLogs, isLoading: wasteLoading } = useWaste(daysDiff);

  // Filter movimentacoes by date range
  const filteredMovs = movimentacoes.filter(m => {
    const d = m.data_movimentacao.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  // ─── Build PDF with jsPDF directly (no html2canvas) ──────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const fmtDate = (d: string) => {
        const [yr, mo, dy] = d.split('-');
        return `${dy}/${mo}/${yr}`;
      };

      // Header
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BRIGADE NOIR - RELATÓRIO ALMOX', 15, 25);
      doc.setFontSize(10);
      doc.text(`Período: ${fmtDate(startDate)} — ${fmtDate(endDate)} | Gerado em: ${new Date().toLocaleDateString()}`, 15, 33);

      // Section 1: Métricas do Período
      doc.setTextColor(26, 26, 26);
      doc.setFontSize(16);
      doc.text('1. MÉTRICAS DO PERÍODO', 15, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [['Métrica', 'Valor', 'Detalhes']],
        body: [
          ['Total Recebido', `${stats.totalRecebidoKg.toFixed(1)} Kg`, `${stats.numChegadas} chegadas`],
          ['Total Líquido', `${stats.totalLiquidoKg.toFixed(1)} Kg`, `Perda: ${stats.totalPerdaKg.toFixed(1)}Kg`],
          ['Aproveitamento', `${stats.mediaAproveitamento.toFixed(1)}%`, `${stats.numQuebras} testes`],
          ['Porções Geradas', String(stats.totalPorcoes), `${stats.totalRequisitadas} requisitadas`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255] }
      });

      // Section 2: Detalhamento por Lote
      doc.setFontSize(16);
      doc.text('2. MOVIMENTAÇÕES POR LOTE', 15, (doc as any).lastAutoTable.finalY + 15);
      
      const loteData: any[][] = [];
      lotes.forEach(lote => {
        const loteMoves = lote.movimentacoes.filter(m => {
          const d = m.data_movimentacao.split('T')[0];
          return d >= startDate && d <= endDate;
        });
        
        if (loteMoves.length > 0) {
          loteData.push([{ content: lote.produto_nome.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
          loteMoves.forEach(m => {
            const cfg = TIPO_LABELS[m.tipo];
            const [yr, mo, dy] = m.data_movimentacao.split('T')[0].split('-');
            
            let detail = '';
            if (m.tipo === 'chegada') detail = `${m.peso_bruto_kg?.toFixed(1)}Kg bruto`;
            if (m.tipo === 'subida_cozinha') detail = `${m.quantidade_enviada?.toFixed(1)}Kg enviado`;
            if (m.tipo === 'teste_quebra') detail = `${m.peso_liquido_kg?.toFixed(1)}Kg líq · ${m.num_porcoes} pcs`;
            if (m.tipo === 'retorno_almox') detail = `${m.porcoes_retornadas} pcs retorno`;
            if (m.tipo === 'requisicao') detail = `${m.porcoes_solicitadas} pcs req`;

            loteData.push([
              `${dy}/${mo}`,
              cfg.label.toUpperCase(),
              detail,
              m.tipo === 'teste_quebra' ? `${m.percentual_aproveitamento?.toFixed(1)}%` : '—'
            ]);
          });
        }
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Data', 'Operação', 'Detalhes', 'Aproveit.']],
        body: loteData,
        theme: 'grid',
        headStyles: { fillColor: [166, 204, 227], textColor: [26, 26, 26] },
        styles: { fontSize: 8 }
      });


      // Section 3: Desperdício (Waste)
      const wasteData = wasteLogs
        .filter(w => {
          const d = w.created_at.split('T')[0];
          return d >= startDate && d <= endDate;
        })
        .map(w => [
          new Date(w.created_at).toLocaleDateString('pt-BR'),
          w.product_name.toUpperCase(),
          w.station.toUpperCase(),
          `${w.quantity} ${w.unit}`,
          `R$ ${w.cost_impact.toFixed(2)}`
        ]);

      if (wasteData.length > 0) {
        doc.addPage();
        doc.setFillColor(26, 26, 26);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('3. RELATÓRIO DE DESPERDÍCIOS (WASTE)', 15, 13);
        
        autoTable(doc, {
          startY: 25,
          head: [['Data', 'Produto', 'Praça', 'Qtd', 'Impacto Financeiro']],
          body: wasteData,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
          styles: { fontSize: 8 }
        });

        const totalWaste = wasteLogs.reduce((acc, w) => acc + w.cost_impact, 0);
        doc.setFontSize(10);
        doc.setTextColor(239, 68, 68);
        doc.text(`Impacto Financeiro Total no Período: R$ ${totalWaste.toFixed(2)}`, 15, (doc as any).lastAutoTable.finalY + 10);
      }

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${totalPages} | Brigade Noir System - Inteligência de Almoxarifado`,
          pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }
        );
      }

      doc.save(`Relatorio_Almoxarifado_${startDate}_${endDate}.pdf`);
      showAlert('✅ Sucesso', 'O relatório profissional foi gerado!');
    } catch (err: any) {
      console.error('PDF export failed:', err);
      showAlert('Erro no PDF', `Falha: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ─── Standardized Print (now uses the professional PDF template) ────────
  const handlePrint = () => {
    handleExportPDF();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} className="text-primary" /> Relatório Almoxarifado
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-outline-variant">De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-surface-container-highest p-2 rounded-lg border border-outline-variant/20 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Até</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-surface-container-highest p-2 rounded-lg border border-outline-variant/20 text-xs"
            />
          </div>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-black uppercase hover:bg-blue-500/20 transition-all"
          >
            <Printer size={12} /> Imprimir / Salvar
          </button>
        </div>
      </div>

      {/* Report Content (visual) */}
      <div className="bg-surface-container rounded-3xl border border-outline-variant/10 p-8 space-y-8" id="almox-report-content">
        {/* Header */}
        <div className="text-center pb-6 border-b border-outline-variant/10">
          <h2 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Brigade Noir</h2>
          <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.3em] mt-1">Relatório de Almoxarifado</p>
          <p className="text-xs font-bold text-primary mt-2 flex items-center justify-center gap-2">
            <Calendar size={12} />
            {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Metrics */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-4">Métricas do Período</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<PackageOpen size={18} />} label="Total Recebido" value={`${stats.totalRecebidoKg.toFixed(1)} Kg`} color="green" subtext={`${stats.numChegadas} chegadas`} />
            <MetricCard icon={<Weight size={18} />} label="Total Líquido" value={`${stats.totalLiquidoKg.toFixed(1)} Kg`} color="blue" subtext={`Perda: ${stats.totalPerdaKg.toFixed(1)}Kg`} />
            <MetricCard icon={<TrendingUp size={18} />} label="Aproveitamento" value={`${stats.mediaAproveitamento.toFixed(1)}%`} color={stats.mediaAproveitamento >= 70 ? 'green' : stats.mediaAproveitamento >= 50 ? 'yellow' : 'red'} subtext={`${stats.numQuebras} testes`} />
            <MetricCard icon={<Hash size={18} />} label="Porções" value={`${stats.totalPorcoes}`} color="primary" subtext={`${stats.totalRequisitadas} requisitadas`} />
          </div>
        </div>

        {/* Detailed Timeline per Product */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-4">Detalhamento por Lote</h4>
          {lotes.length === 0 ? (
            <p className="text-outline-variant text-xs text-center py-8">Nenhum dado no período selecionado.</p>
          ) : (
            <div className="space-y-4">
              {lotes.map(lote => {
                const loteMoves = lote.movimentacoes.filter(m => {
                  const d = m.data_movimentacao.split('T')[0];
                  return d >= startDate && d <= endDate;
                });
                if (loteMoves.length === 0) return null;

                return (
                  <div key={lote.lote_id} style={{ backgroundColor: '#242532' }} className="rounded-2xl p-5 border border-outline-variant/5">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-black text-on-surface uppercase">{lote.produto_nome}</h5>
                      <span className="text-[10px] font-black" style={{ color: '#a6cce3', backgroundColor: 'rgba(166,204,227,0.1)', padding: '2px 12px', borderRadius: '8px' }}>
                        Saldo: {lote.saldo_porcoes} porções
                      </span>
                    </div>

                    <div className="space-y-2">
                      {loteMoves.map(mov => {
                        const cfg = TIPO_LABELS[mov.tipo];
                        return (
                          <div key={mov.id} className="flex items-center gap-3 py-2 border-b border-outline-variant/5 last:border-b-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            <span className="text-[10px] font-bold shrink-0 w-16" style={{ color: '#aaa9bb' }}>
                              {(() => {
                                const [yr, m, d] = mov.data_movimentacao.split('T')[0].split('-');
                                return `${d}/${m}`;
                              })()}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider shrink-0 w-32" style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-bold flex-1" style={{ color: '#aaa9bb' }}>
                              {mov.tipo === 'chegada' && `${mov.peso_bruto_kg?.toFixed(1)}Kg bruto`}
                              {mov.tipo === 'subida_cozinha' && `${mov.quantidade_enviada?.toFixed(1)}Kg enviado`}
                              {mov.tipo === 'teste_quebra' && `${mov.peso_liquido_kg?.toFixed(1)}Kg líq · ${mov.percentual_aproveitamento?.toFixed(1)}% · ${mov.num_porcoes} porções`}
                              {mov.tipo === 'retorno_almox' && `${mov.porcoes_retornadas} porções retornadas`}
                              {mov.tipo === 'requisicao' && `${mov.porcoes_solicitadas} porções requisitadas`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Table */}
        {filteredMovs.length > 0 && (
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant mb-4">Tabela Resumida</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="py-2 px-3 text-left font-black uppercase tracking-widest text-outline-variant">Data</th>
                    <th className="py-2 px-3 text-left font-black uppercase tracking-widest text-outline-variant">Produto</th>
                    <th className="py-2 px-3 text-left font-black uppercase tracking-widest text-outline-variant">Tipo</th>
                    <th className="py-2 px-3 text-right font-black uppercase tracking-widest text-outline-variant">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovs.map(mov => {
                    const cfg = TIPO_LABELS[mov.tipo];
                    return (
                      <tr key={mov.id} className="border-b border-outline-variant/5">
                        <td className="py-2 px-3 font-bold" style={{ color: '#aaa9bb' }}>
                          {(() => {
                            const [yr, m, d] = mov.data_movimentacao.split('T')[0].split('-');
                            return `${d}/${m}/${yr}`;
                          })()}
                        </td>
                        <td className="py-2 px-3 font-black text-on-surface uppercase">{mov.produto_nome}</td>
                        <td className="py-2 px-3 font-black uppercase" style={{ color: cfg.color }}>{cfg.label}</td>
                        <td className="py-2 px-3 text-right font-bold" style={{ color: '#aaa9bb' }}>
                          {mov.peso_bruto_kg ? `${mov.peso_bruto_kg.toFixed(1)}Kg` : ''}
                          {mov.num_porcoes ? `${mov.num_porcoes} pcs` : ''}
                          {mov.porcoes_solicitadas ? `${mov.porcoes_solicitadas} pcs` : ''}
                          {mov.porcoes_retornadas ? `${mov.porcoes_retornadas} pcs` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Waste Section */}
        <div className="pt-8 border-t border-outline-variant/10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-error mb-4">Registro de Desperdícios</h4>
          {wasteLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-error" /></div>
          ) : wasteLogs.length === 0 ? (
            <p className="text-outline-variant text-xs text-center py-4">Nenhum desperdício registrado no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border border-error/10 rounded-2xl overflow-hidden">
                <thead className="bg-error/5">
                  <tr>
                    <th className="py-3 px-4 text-left font-black uppercase tracking-widest text-error">Data</th>
                    <th className="py-3 px-4 text-left font-black uppercase tracking-widest text-error">Produto</th>
                    <th className="py-3 px-4 text-left font-black uppercase tracking-widest text-error">Praça</th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-error">Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteLogs
                    .filter(w => {
                      const d = w.created_at.split('T')[0];
                      return d >= startDate && d <= endDate;
                    })
                    .map(w => (
                    <tr key={w.id} className="border-b border-error/5 last:border-0 hover:bg-error/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-outline-variant">{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4 font-black text-on-surface uppercase">{w.product_name}</td>
                      <td className="py-3 px-4 font-black text-on-surface-variant uppercase">{w.station}</td>
                      <td className="py-3 px-4 text-right font-black text-error">R$ {w.cost_impact.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-outline-variant/10">
          <p className="text-[8px] font-bold uppercase tracking-[0.3em]" style={{ color: '#747484' }}>
            Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Brigade Noir System
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card ────────────────────
function MetricCard({ icon, label, value, color, subtext }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtext: string;
}) {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    green:   { text: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
    blue:    { text: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
    red:     { text: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
    yellow:  { text: '#facc15', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.2)' },
    primary: { text: '#a6cce3', bg: 'rgba(166,204,227,0.1)',border: 'rgba(166,204,227,0.2)' },
    purple:  { text: '#c084fc', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div style={{ backgroundColor: c.bg, borderColor: c.border, borderWidth: '1px', borderStyle: 'solid' }} className="p-4 rounded-2xl">
      <div style={{ color: c.text }} className="mb-2">{icon}</div>
      <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: '#aaa9bb' }}>{label}</p>
      <p className="text-xl font-black" style={{ color: c.text }}>{value}</p>
      <p className="text-[8px] font-bold mt-1" style={{ color: '#747484' }}>{subtext}</p>
    </div>
  );
}

// ─── Util ────────────────────────────
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}
