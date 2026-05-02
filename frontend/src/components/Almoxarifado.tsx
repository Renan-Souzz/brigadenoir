import React, { useState, useMemo } from 'react';
import {
  PackageOpen, Scissors, GitCommitHorizontal, FileText,
  BarChart3, ShieldAlert, RefreshCcw, Loader2, AlertTriangle, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useModal } from '../contexts/ModalContext';
import PageHeader from './shared/PageHeader';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';

import { useAlmoxMovimentacoes } from '../hooks/useAlmoxMovimentacoes';

// Tab components
import AlmoxChegadas from './ModuloAlmoxarifado/AlmoxChegadas';
import AlmoxQuebraTab from './ModuloAlmoxarifado/AlmoxQuebraTab';
import AlmoxMovimentacoes from './ModuloAlmoxarifado/AlmoxMovimentacoes';
import AlmoxRelatorio from './ModuloAlmoxarifado/AlmoxRelatorio';

// ─── Tab Config ────────────────────────────────────────────────────────────────

type AlmoxTab = 'chegadas' | 'quebra' | 'movimentacoes' | 'relatorio';

const TABS: Array<{ id: AlmoxTab; label: string; icon: React.ReactNode; color: string }> = [
  { id: 'chegadas',       label: 'Chegadas',    icon: <PackageOpen size={14} />,          color: 'text-green-400' },
  { id: 'quebra',         label: 'Quebra',       icon: <Scissors size={14} />,              color: 'text-red-400' },
  { id: 'movimentacoes', label: 'Moviment.',    icon: <GitCommitHorizontal size={14} />,   color: 'text-blue-400' },
  { id: 'relatorio',     label: 'Relatório',    icon: <FileText size={14} />,              color: 'text-purple-400' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Almoxarifado() {
  const { profile, isManagement } = useAuth();
  const { searchFilter, setSearchFilter } = useNavigation();

  const {
    isLoading, refetch,
    getLotesPendentes, getLotesNaCozinha, getLotesComEstoque, getStats,
    movimentacoes
  } = useAlmoxMovimentacoes();

  const { showAlert } = useModal();

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BRIGADE NOIR - ALMOXARIFADO CENTRAL', 15, 25);
    doc.setFontSize(10);
    doc.text(`Relatório de Estoque e Movimentação | Data: ${new Date().toLocaleDateString()}`, 15, 33);

    // Section 1: Sumário Executivo
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(16);
    doc.text('1. SUMÁRIO DE ESTOQUE', 15, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total em Estoque (Porções)', String(totalPorcoesEstoque)],
        ['Itens Aguardando Processamento', String(pendentes.length)],
        ['Aproveitamento Médio (Rendimento)', `${stats.mediaAproveitamento.toFixed(1)}%`],
        ['Total Recebido no Período (Kg)', `${stats.totalRecebidoKg.toFixed(2)} kg`],
        ['Total de Requisições Atendidas', String(stats.totalRequisitadas)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255] }
    });

    // Section 2: Detalhamento de Itens em Estoque
    doc.setFontSize(16);
    doc.text('2. ITENS EM ESTOQUE (SALDO ATUAL)', 15, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Produto', 'Categoria', 'Saldo (un)', 'Última Mov.']],
      body: comEstoque.map(l => [
        l.produto_nome,
        l.categoria.toUpperCase(),
        String(l.saldo_porcoes),
        new Date(l.ultima_movimentacao).toLocaleDateString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [166, 204, 227], textColor: [26, 26, 26] }
    });

    // Section 3: Alertas de Estoque Crítico
    const criticos = comEstoque.filter(l => l.saldo_porcoes <= 5);
    if (criticos.length > 0) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(16);
      doc.text('3. ALERTAS DE ESTOQUE CRÍTICO', 15, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Produto', 'Saldo Atual', 'Status']],
        body: criticos.map(l => [l.produto_nome, String(l.saldo_porcoes), 'REPOSIÇÃO URGENTE']),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] }
      });
    }

    doc.save(`Relatorio_Almox_BrigadeNoir_${new Date().toISOString().split('T')[0]}.pdf`);
    showAlert('PDF Gerado', 'O relatório do almoxarifado foi baixado com sucesso.');
  };

  const [activeTab, setActiveTab] = useState<AlmoxTab>('chegadas');

  // Metrics for sidebar
  const pendentes = getLotesPendentes();
  const naCozinha = getLotesNaCozinha();
  const comEstoque = getLotesComEstoque();
  const stats = getStats();

  const totalPorcoesEstoque = comEstoque.reduce((acc, l) => acc + l.saldo_porcoes, 0);

  // ─── Access Control ────────────────────────────────────────────────
  if (!isManagement) {
    return (
      <PageLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] animate-pulse">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-on-surface uppercase tracking-tighter mb-4">Acesso Restrito</h2>
          <p className="text-on-surface-variant max-w-md leading-relaxed uppercase tracking-widest text-[10px] font-bold">
            Esta área é exclusiva para a Liderança e Gestão Executiva da Brigade Noir.
          </p>
          <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>Voltar ao Dashboard</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader
        leftContent={<h2 className="text-xl font-bold tracking-tighter text-on-surface uppercase">Almoxarifado Central</h2>}
        showSearch
        onSearchChange={setSearchFilter}
        searchPlaceholder="BUSCAR NO ALMOX..."
        avatarSeed={profile?.full_name || 'chef-mgmt'}
      />

      <div className="flex flex-col lg:flex-row gap-8 relative mt-8 pb-32">
        {/* ─── Sidebar ───────────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          {/* Tab Switcher */}
          <div className="bg-surface-container rounded-2xl p-1.5 border border-outline-variant/10 grid grid-cols-4 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all text-center ${
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                {tab.icon}
                <span className="text-[8px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Metrics */}
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <BarChart3 size={18} className="text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Visão Geral</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Aguardando" value={pendentes.length} color="text-yellow-400" />
              <MetricBox label="Na Cozinha" value={naCozinha.length} color="text-red-400" />
              <MetricBox label="Em Estoque" value={totalPorcoesEstoque} color="text-green-400" suffix="pcs" />
              <MetricBox label="Aproveit. Médio" value={stats.mediaAproveitamento > 0 ? `${stats.mediaAproveitamento.toFixed(0)}%` : '—'} color="text-primary" />
            </div>

            {/* Low stock warning */}
            {comEstoque.some(l => l.saldo_porcoes <= 5 && l.saldo_porcoes > 0) && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest block mb-1">Estoque Baixo</span>
                  {comEstoque.filter(l => l.saldo_porcoes <= 5 && l.saldo_porcoes > 0).map(l => (
                    <span key={l.lote_id} className="text-[9px] font-bold text-on-surface-variant block">
                      {l.produto_nome}: {l.saldo_porcoes} porções
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF} className="flex-1 gap-2 text-primary border-primary/20 hover:bg-primary/5">
              <Download size={14} /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => refetch()} className="flex-1 gap-2">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Sincronizar
            </Button>
          </div>
        </div>

        {/* ─── Main Content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {activeTab === 'chegadas' && <AlmoxChegadas />}
              {activeTab === 'quebra' && <AlmoxQuebraTab />}
              {activeTab === 'movimentacoes' && <AlmoxMovimentacoes />}
              {activeTab === 'relatorio' && <AlmoxRelatorio />}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

// ─── Metric Box ──────────────────────────────────────────────────────────────

function MetricBox({ label, value, color, suffix }: { label: string; value: number | string; color: string; suffix?: string }) {
  return (
    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
      <p className="text-[8px] font-bold text-outline uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${color}`}>
        {value}
        {suffix && <span className="text-xs text-outline-variant ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
