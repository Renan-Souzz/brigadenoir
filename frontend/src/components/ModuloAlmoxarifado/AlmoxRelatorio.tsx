import React, { useState } from 'react';
import {
  FileText, Download, Image as ImageIcon, Loader2,
  PackageOpen, TrendingUp, Weight, Hash, Calendar, Printer
} from 'lucide-react';
import { useAlmoxMovimentacoes, AlmoxTipoMov } from '../../hooks/useAlmoxMovimentacoes';
import { useModal } from '../../contexts/ModalContext';
import { formatLocalDate } from '../../lib/dateUtils';
import { jsPDF } from 'jspdf';

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

  // Filter movimentacoes by date range
  const filteredMovs = movimentacoes.filter(m => {
    const d = m.data_movimentacao.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  // ─── Build PDF with jsPDF directly (no html2canvas) ──────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      let y = 20;

      const fmtDate = (d: string) => {
        const [yr, mo, dy] = d.split('-');
        return `${dy}/${mo}/${yr}`;
      };

      // ── Header ──
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BRIGADE NOIR', pw / 2, y, { align: 'center' });
      y += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120);
      pdf.text('RELATÓRIO DE ALMOXARIFADO', pw / 2, y, { align: 'center' });
      y += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(80);
      pdf.text(`${fmtDate(startDate)} — ${fmtDate(endDate)}`, pw / 2, y, { align: 'center' });
      y += 4;

      // ── Separator ──
      pdf.setDrawColor(200);
      pdf.line(15, y, pw - 15, y);
      y += 8;

      // ── Metrics ──
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100);
      pdf.text('MÉTRICAS DO PERÍODO', 15, y);
      y += 6;

      const metrics = [
        { label: 'Total Recebido', value: `${stats.totalRecebidoKg.toFixed(1)} Kg`, sub: `${stats.numChegadas} chegadas` },
        { label: 'Total Líquido', value: `${stats.totalLiquidoKg.toFixed(1)} Kg`, sub: `Perda: ${stats.totalPerdaKg.toFixed(1)}Kg` },
        { label: 'Aproveitamento', value: `${stats.mediaAproveitamento.toFixed(1)}%`, sub: `${stats.numQuebras} testes` },
        { label: 'Porções', value: `${stats.totalPorcoes}`, sub: `${stats.totalRequisitadas} requisitadas` },
      ];
      const colW = (pw - 30) / 4;

      metrics.forEach((m, i) => {
        const x = 15 + i * colW;
        // Box
        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(x, y, colW - 3, 22, 2, 2, 'F');
        // Label
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(130);
        pdf.text(m.label.toUpperCase(), x + 4, y + 6);
        // Value
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40);
        pdf.text(m.value, x + 4, y + 14);
        // Subtext
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150);
        pdf.text(m.sub, x + 4, y + 19);
      });
      y += 30;

      // ── Separator ──
      pdf.setDrawColor(220);
      pdf.line(15, y, pw - 15, y);
      y += 8;

      // ── Detalhamento por Lote ──
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100);
      pdf.text('DETALHAMENTO POR LOTE', 15, y);
      y += 6;

      for (const lote of lotes) {
        const loteMoves = lote.movimentacoes.filter(m => {
          const d = m.data_movimentacao.split('T')[0];
          return d >= startDate && d <= endDate;
        });
        if (loteMoves.length === 0) continue;

        // Check page break
        if (y > 260) {
          pdf.addPage();
          y = 20;
        }

        // Lote header
        pdf.setFillColor(240, 240, 240);
        pdf.roundedRect(15, y - 3, pw - 30, 8, 2, 2, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30);
        pdf.text(lote.produto_nome.toUpperCase(), 18, y + 2);
        pdf.setFontSize(7);
        pdf.setTextColor(100);
        pdf.text(`Saldo: ${lote.saldo_porcoes} porções`, pw - 18, y + 2, { align: 'right' });
        y += 10;

        // Movements
        for (const mov of loteMoves) {
          if (y > 275) {
            pdf.addPage();
            y = 20;
          }
          const cfg = TIPO_LABELS[mov.tipo];
          const [yr, mo, dy] = mov.data_movimentacao.split('T')[0].split('-');
          const dateStr = `${dy}/${mo}`;

          // Color dot
          const rgb = hexToRgb(cfg.color);
          pdf.setFillColor(rgb.r, rgb.g, rgb.b);
          pdf.circle(20, y - 1, 1.5, 'F');

          // Date
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(140);
          pdf.text(dateStr, 25, y);

          // Tipo
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text(cfg.label.toUpperCase(), 40, y);

          // Details
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(80);
          let detail = '';
          if (mov.tipo === 'chegada') detail = `${mov.peso_bruto_kg?.toFixed(1)}Kg bruto`;
          if (mov.tipo === 'subida_cozinha') detail = `${mov.quantidade_enviada?.toFixed(1)}Kg enviado`;
          if (mov.tipo === 'teste_quebra') detail = `${mov.peso_liquido_kg?.toFixed(1)}Kg líq · ${mov.percentual_aproveitamento?.toFixed(1)}% · ${mov.num_porcoes} porções`;
          if (mov.tipo === 'retorno_almox') detail = `${mov.porcoes_retornadas} porções retornadas`;
          if (mov.tipo === 'requisicao') detail = `${mov.porcoes_solicitadas} porções requisitadas`;
          pdf.text(detail, 80, y);

          y += 5;
        }
        y += 4;
      }

      // ── Table ──
      if (filteredMovs.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }

        pdf.setDrawColor(220);
        pdf.line(15, y, pw - 15, y);
        y += 8;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100);
        pdf.text('TABELA RESUMIDA', 15, y);
        y += 6;

        // Table headers
        pdf.setFillColor(235, 235, 235);
        pdf.rect(15, y - 3, pw - 30, 7, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100);
        pdf.text('DATA', 18, y + 1);
        pdf.text('PRODUTO', 45, y + 1);
        pdf.text('TIPO', 100, y + 1);
        pdf.text('DETALHES', pw - 18, y + 1, { align: 'right' });
        y += 7;

        for (const mov of filteredMovs) {
          if (y > 280) { pdf.addPage(); y = 20; }

          const cfg = TIPO_LABELS[mov.tipo];
          const [yr, mo, dy] = mov.data_movimentacao.split('T')[0].split('-');
          const rgb = hexToRgb(cfg.color);

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(80);
          pdf.text(`${dy}/${mo}/${yr}`, 18, y);

          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(40);
          pdf.text(mov.produto_nome.toUpperCase(), 45, y);

          pdf.setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text(cfg.label, 100, y);

          pdf.setTextColor(80);
          pdf.setFont('helvetica', 'normal');
          let detail = '';
          if (mov.peso_bruto_kg) detail = `${mov.peso_bruto_kg.toFixed(1)}Kg`;
          if (mov.num_porcoes) detail = `${mov.num_porcoes} pcs`;
          if (mov.porcoes_solicitadas) detail = `${mov.porcoes_solicitadas} pcs`;
          if (mov.porcoes_retornadas) detail = `${mov.porcoes_retornadas} pcs`;
          pdf.text(detail, pw - 18, y, { align: 'right' });

          // Row line
          pdf.setDrawColor(240);
          pdf.line(15, y + 2, pw - 15, y + 2);
          y += 6;
        }
      }

      // ── Footer ──
      y += 8;
      if (y > 280) { pdf.addPage(); y = 20; }
      pdf.setDrawColor(200);
      pdf.line(15, y, pw - 15, y);
      y += 6;
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(160);
      const now = new Date();
      pdf.text(
        `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Brigade Noir System`,
        pw / 2, y, { align: 'center' }
      );

      pdf.save(`Relatorio_Almoxarifado_${startDate}_${endDate}.pdf`);
      showAlert('✅ Sucesso', 'O PDF do relatório foi baixado!');
    } catch (err: any) {
      console.error('PDF export failed:', err);
      showAlert('Erro no PDF', `Falha: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setExporting(false);
    }
  };

  // ─── Print (native browser) for image-quality export ──────────────────────
  const handlePrint = () => {
    window.print();
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
