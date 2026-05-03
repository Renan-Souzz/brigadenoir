import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Layers,
  ChefHat,
  BarChart,
  ClipboardList,
  Info,
  ExternalLink,
  Loader2
} from 'lucide-react';
import PageLayout from './shared/PageLayout';
import PageHeader from './shared/PageHeader';
import Button from './shared/Button';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Document Components ──────────────────────────────────────────────────────

const DocumentCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onDownload, 
  loading 
}: { 
  title: string, 
  description: string, 
  icon: any, 
  onDownload: () => void,
  loading: boolean
}) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-surface-container border border-outline-variant/10 rounded-3xl p-8 flex flex-col h-full group"
  >
    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-3">{title}</h3>
    <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-8">
      {description}
    </p>
    <Button 
      variant="secondary" 
      onClick={onDownload} 
      className="w-full gap-3 py-7 rounded-2xl group/btn overflow-hidden relative"
      loading={loading}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-white/5 to-secondary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
      <Download size={20} className="group-hover/btn:scale-110 transition-transform" /> 
      <span className="font-black tracking-[0.2em] text-[11px]">GERAR PDF PROFISSIONAL</span>
    </Button>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Documentation() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Refs for off-screen rendering
  const presentationRef = useRef<HTMLDivElement>(null);
  const employeeManualRef = useRef<HTMLDivElement>(null);
  const leaderManualRef = useRef<HTMLDivElement>(null);

  const generatePDF = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    setGenerating(filename);
    
    try {
      // Temporarily show the element for capturing
      const el = ref.current;
      el.style.display = 'block';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.style.width = '800px'; // Standard width for capture

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0c0c0c' // Match theme
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is longer than one page, we could loop, 
      // but for these manuals we'll stick to a long scroll or split.
      // For simplicity and quality, we'll fit it to the width and let it flow.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
      
      el.style.display = 'none';
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader 
        leftContent={<h2 className="text-xl font-bold tracking-tighter text-on-surface">Documentação</h2>}
        stationLabel={profile?.station || 'Suporte'}
        avatarSeed={profile?.full_name || 'chef'}
      />

      <div className="mt-12 mb-16">
        <div className="max-w-3xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.4em] text-secondary uppercase mb-3 block">
            Central de Inteligência
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-on-surface tracking-tighter leading-[0.9] uppercase mb-6">
            Recursos & <br /> <span className="text-primary">Diretrizes</span>
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Acesse materiais profissionais de apresentação do sistema e manuais de operação detalhados para garantir a máxima eficiência da sua brigada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <DocumentCard 
          title="Apresentação Executiva"
          description="Visão estratégica do Brigade Noir. Ideal para investidores, proprietários e conselhos de administração. Foca em ROI, eficiência e conformidade técnica."
          icon={TrendingUp}
          loading={generating === 'Apresentacao_Brigade_Noir'}
          onDownload={() => generatePDF(presentationRef, 'Apresentacao_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual do Funcionário"
          description="Guia prático focado na operação diária. Checklists, estoque de praça, modos de preparo e consulta de escala. Linguagem direta e operacional."
          icon={ChefHat}
          loading={generating === 'Manual_Funcionario_Brigade_Noir'}
          onDownload={() => generatePDF(employeeManualRef, 'Manual_Funcionario_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual da Liderança"
          description="Guia de gestão para Chefs e Gerentes. Análise de CMV, gestão de brigada, engenharia de cardápio e configuração avançada do ecossistema."
          icon={Briefcase}
          loading={generating === 'Manual_Lideranca_Brigade_Noir'}
          onDownload={() => generatePDF(leaderManualRef, 'Manual_Lideranca_Brigade_Noir')}
        />
      </div>

      <div className="bg-surface-container-high rounded-[2.5rem] p-10 md:p-16 border border-outline-variant/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldCheck size={200} />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black text-on-surface uppercase tracking-tight mb-6">Por que Brigade Noir?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary"><CheckCircle2 size={20} /></div>
                <div>
                  <h4 className="font-bold text-on-surface uppercase text-sm tracking-wide">Controle de CMV Real</h4>
                  <p className="text-on-surface-variant text-sm mt-1">Integração direta entre compras, rendimento e venda para margens precisas.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary"><CheckCircle2 size={20} /></div>
                <div>
                  <h4 className="font-bold text-on-surface uppercase text-sm tracking-wide">Conformidade RDC 429/2020</h4>
                  <p className="text-on-surface-variant text-sm mt-1">Cálculo automático de tabela nutricional e alertas de alérgenos.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary"><CheckCircle2 size={20} /></div>
                <div>
                  <h4 className="font-bold text-on-surface uppercase text-sm tracking-wide">Redução de Desperdício</h4>
                  <p className="text-on-surface-variant text-sm mt-1">Gestão de quebras e controle de estoque por praça em tempo real.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/5">
              <BarChart className="text-primary mb-4" />
              <h5 className="font-black text-2xl text-on-surface">+25%</h5>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Eficiência Operacional</p>
            </div>
            <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/5">
              <Layers className="text-secondary mb-4" />
              <h5 className="font-black text-2xl text-on-surface">100%</h5>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Padronização Técnica</p>
            </div>
            <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/5 col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-black text-xl text-on-surface uppercase tracking-tight">CMV Monitorado</h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Ajuste fino de lucro</p>
                </div>
                <TrendingUp className="text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── HIDDEN PDF TEMPLATES (Used for Capture) ──────────────────────────── */}
      
      <div style={{ display: 'none' }}>
        {/* PRESENTATION TEMPLATE */}
        <div ref={presentationRef} className="p-20 bg-[#0c0c0c] text-white font-sans w-[800px]">
           <div className="mb-20">
             <div className="flex items-center gap-4 mb-10">
               <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-3xl">BN</div>
               <h1 className="text-4xl font-black tracking-tighter uppercase">Brigade Noir <span className="text-primary">Executive</span></h1>
             </div>
             <h2 className="text-6xl font-black tracking-tighter leading-none uppercase mb-10">
               A Inteligência de Dados <br /> na <span className="text-primary">Alta Gastronomia</span>
             </h2>
             <p className="text-xl text-gray-400 max-w-xl">
               O ecossistema definitivo para transformar cozinhas operacionais em centros de excelência técnica e alta rentabilidade.
             </p>
           </div>

           <div className="grid grid-cols-2 gap-10 mb-20">
             <div className="bg-[#1a1a1a] p-10 rounded-3xl border border-white/5">
                <h3 className="text-primary font-black text-xl uppercase mb-4">O Problema</h3>
                <ul className="space-y-3 text-gray-400 text-sm">
                  <li>• Falta de controle real de CMV (Custo de Mercadoria Vendida)</li>
                  <li>• Desperdício oculto em rendimentos mal calculados</li>
                  <li>• Inconsistência em fichas técnicas e padronização</li>
                  <li>• Dificuldade crítica em cumprir a nova RDC 429/2020</li>
                  <li>• Gestão de escala reativa e pouco eficiente</li>
                </ul>
             </div>
             <div className="bg-[#1a1a1a] p-10 rounded-3xl border border-white/5">
                <h3 className="text-secondary font-black text-xl uppercase mb-4">A Solução</h3>
                <ul className="space-y-3 text-gray-400 text-sm">
                  <li>• Gestão 360º de Insumos com rastreabilidade total</li>
                  <li>• Automação de Custos, Nutrição e Alérgenos</li>
                  <li>• Inteligência de Escala com foco em produtividade</li>
                  <li>• Dashboards de Gestão com BI (Business Intelligence)</li>
                  <li>• Padronização via Checklists Digitais Invioláveis</li>
                </ul>
             </div>
           </div>

           <div className="mb-20">
             <h3 className="text-2xl font-black uppercase mb-10 border-b border-white/10 pb-4">Diferenciais Competitivos</h3>
             <div className="space-y-10">
                <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-black">01</div>
                  <div>
                    <h4 className="text-xl font-bold uppercase tracking-tight">Ficha Técnica 4.0 & Compliance</h4>
                    <p className="text-gray-400 mt-2">Cálculos automáticos de fator de correção (FC) e índice de cocção (IC). Geração instantânea de tabelas nutricionais e declaração de alérgenos, garantindo 100% de conformidade com a ANVISA.</p>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-black">02</div>
                  <div>
                    <h4 className="text-xl font-bold uppercase tracking-tight">Engenharia de Rendimento (Yield Management)</h4>
                    <p className="text-gray-400 mt-2">Módulo exclusivo para testes de rendimento de proteínas e vegetais. Ajuste o CMV real baseado no aproveitamento efetivo, eliminando o lucro que 'escorre pelo ralo' no pré-preparo.</p>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-black">03</div>
                  <div>
                    <h4 className="text-xl font-bold uppercase tracking-tight">Operação Data-Driven (Baseada em Dados)</h4>
                    <p className="text-gray-400 mt-2">Visibilidade total sobre porções disponíveis, quebras registradas e performance da brigada. Decisões estratégicas baseadas em números, não em suposições.</p>
                  </div>
                </div>
             </div>
           </div>

           <div className="p-10 bg-primary/10 rounded-3xl border border-primary/20 text-center">
             <p className="text-primary font-black uppercase tracking-[0.2em] mb-2 text-xs">Visão de Futuro</p>
             <h4 className="text-3xl font-black uppercase tracking-tight">Gestão Digital, <br /> Resultado Real.</h4>
           </div>
        </div>

        {/* EMPLOYEE MANUAL TEMPLATE */}
        <div ref={employeeManualRef} className="p-20 bg-white text-black font-sans w-[800px]">
           <div className="flex justify-between items-start mb-20 border-b-4 border-black pb-10">
             <div>
               <h1 className="text-4xl font-black uppercase tracking-tighter">Manual Operacional</h1>
               <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Guia do Funcionário | Brigade Noir</p>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black uppercase">Versão 1.0</p>
               <p className="text-[10px] font-black uppercase">Maio 2026</p>
             </div>
           </div>

           <div className="mb-12">
             <h2 className="text-2xl font-black uppercase mb-6 bg-black text-white px-4 py-2 inline-block">1. Gestão de Praça (Estoque)</h2>
             <p className="mb-4">O sistema Brigade Noir permite que você monitore as porções disponíveis em tempo real. Siga as diretrizes:</p>
             <ul className="space-y-4">
               <li className="flex gap-4">
                 <div className="font-black text-xl">01.</div>
                 <div>
                   <h4 className="font-bold uppercase">Entrada de Insumos</h4>
                   <p className="text-gray-600 text-sm">Sempre que receber insumos no almoxarifado, registre no módulo "Entradas" com a nota fiscal ou romaneio.</p>
                 </div>
               </li>
               <li className="flex gap-4">
                 <div className="font-black text-xl">02.</div>
                 <div>
                   <h4 className="font-bold uppercase">Movimentação Diária</h4>
                   <p className="text-gray-600 text-sm">Registre saídas de insumos para sua praça para que o estoque central esteja sempre correto.</p>
                 </div>
               </li>
               <li className="flex gap-4">
                 <div className="font-black text-xl">03.</div>
                 <div>
                   <h4 className="font-bold uppercase">Registro de Quebras</h4>
                   <p className="text-gray-600 text-sm">Qualquer desperdício ou erro de preparo deve ser registrado no módulo "Quebra" para ajuste de custo.</p>
                 </div>
               </li>
               <li className="flex gap-4">
                 <div className="font-black text-xl">04.</div>
                 <div>
                   <h4 className="font-bold uppercase">RDC 429 & Alérgenos</h4>
                   <p className="text-gray-600 text-sm">Fique atento aos badges de alérgenos no cardápio. Caso haja alteração de marca de algum insumo, notifique a liderança para atualização da ficha.</p>
                 </div>
               </li>
             </ul>
           </div>

           <div className="mb-12">
             <h2 className="text-2xl font-black uppercase mb-6 bg-black text-white px-4 py-2 inline-block">2. Padronização e Qualidade</h2>
             <p className="mb-4">O uso dos Checklists Digitais é fundamental para a segurança alimentar e consistência:</p>
             <div className="p-6 border-2 border-black rounded-2xl bg-gray-50">
               <p className="text-sm font-bold">• Check de Abertura: Validação de temperaturas e validade de mise-en-place.</p>
               <p className="text-sm font-bold mt-2">• Check de Preparo: Conferência de pesos e montagem padrão.</p>
               <p className="text-sm font-bold mt-2">• Check de Fechamento: Registro de sobras aproveitáveis e limpeza profunda.</p>
             </div>
           </div>

           <div className="mb-12">
             <h2 className="text-2xl font-black uppercase mb-6 bg-black text-white px-4 py-2 inline-block">3. Biblioteca de Preparo</h2>
             <p className="mb-4">Nunca improvise. O módulo "Modo de Preparo" contém o DNA da nossa cozinha:</p>
             <ul className="text-sm space-y-2 text-gray-600">
               <li>• Visualize fotos reais da montagem final.</li>
               <li>• Siga a ordem exata de adição dos ingredientes.</li>
               <li>• Utilize os cronômetros e temperaturas indicadas.</li>
             </ul>
           </div>

           <div className="mt-20 pt-10 border-t border-gray-200 text-center">
             <p className="text-[10px] font-bold uppercase tracking-widest">Disciplina é a alma da alta gastronomia.</p>
           </div>
        </div>

        {/* LEADER MANUAL TEMPLATE */}
        <div ref={leaderManualRef} className="p-20 bg-[#0c0c0c] text-white font-sans w-[800px]">
           <div className="flex justify-between items-start mb-20 border-b border-white/20 pb-10">
             <div>
               <h1 className="text-4xl font-black uppercase tracking-tighter">Manual de Gestão</h1>
               <p className="text-sm font-bold uppercase tracking-widest text-primary">Diretrizes para Liderança | Brigade Noir</p>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black uppercase">Confidencial</p>
               <p className="text-[10px] font-black uppercase text-primary">Executivo</p>
             </div>
           </div>

           <div className="grid grid-cols-1 gap-12">
             <section>
               <h2 className="text-xl font-black uppercase text-primary mb-4 flex items-center gap-3">
                 <div className="w-8 h-1 bg-primary"></div> GESTÃO FINANCEIRA (CMV)
               </h2>
               <p className="text-gray-400 text-sm mb-4">Como líder, seu foco é a saúde financeira da operação. Utilize o módulo "Inteligência & CMV" para:</p>
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                   <h4 className="font-bold text-xs uppercase mb-1 text-white">Análise de Margens</h4>
                   <p className="text-[10px] text-gray-400">Identifique pratos com margem baixa e revise fornecedores ou gramaturas.</p>
                 </div>
                 <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                   <h4 className="font-bold text-xs uppercase mb-1 text-white">Controle de Insumos Críticos</h4>
                   <p className="text-[10px] text-gray-400">Monitore itens de alto valor para evitar desvios ou desperdícios.</p>
                 </div>
               </div>
             </section>

             <section>
               <h2 className="text-xl font-black uppercase text-primary mb-4 flex items-center gap-3">
                 <div className="w-8 h-1 bg-primary"></div> ENGENHARIA DE CARDÁPIO
               </h2>
               <p className="text-gray-400 text-sm mb-4">O módulo de "Ficha Técnica" deve ser mantido 100% atualizado. Qualquer mudança de preço de insumo deve ser refletida imediatamente.</p>
               <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                 <li>Sempre valide os testes de rendimento (Yield) antes de fixar uma ficha.</li>
                 <li>Certifique-se de que todos os alérgenos estão marcados corretamente para segurança do cliente.</li>
                 <li>Acompanhe a tabela nutricional para conformidade com a RDC 429.</li>
               </ul>
             </section>

             <section>
               <h2 className="text-xl font-black uppercase text-primary mb-4 flex items-center gap-3">
                 <div className="w-8 h-1 bg-primary"></div> GESTÃO DA BRIGADA
               </h2>
               <p className="text-gray-400 text-sm mb-4">Utilize os perfis da brigada para identificar talentos e gerir a escala de forma inteligente, evitando horas extras excessivas e garantindo o descanso da equipe.</p>
             </section>
           </div>

           <div className="mt-20 p-8 border border-white/10 bg-white/5 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Suporte Prioritário</p>
                <p className="text-sm font-black uppercase">Acesso à Equipe de Desenvolvimento</p>
              </div>
              <div className="text-primary"><ShieldCheck size={32} /></div>
           </div>
        </div>
      </div>
    </PageLayout>
  );
}
