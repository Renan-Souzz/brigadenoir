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
      variant="primary" 
      size="xl"
      onClick={onDownload} 
      className="w-full mt-auto"
      loading={loading}
      icon={<Download size={18} />}
    >
      GERAR PDF PROFISSIONAL
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
    if (!ref.current) {
      alert('Erro: Template não encontrado.');
      return;
    }
    setGenerating(filename);
    
    try {
      const el = ref.current;
      
      // Captura com parâmetros otimizados para estabilidade
      const canvas = await html2canvas(el, {
        scale: 1.5, // Reduzido ligeiramente para evitar crash em dispositivos com menos memória
        useCORS: true,
        logging: true, // Habilitado para debug se o usuário abrir o console
        backgroundColor: el.classList.contains('bg-white') ? '#ffffff' : '#0c0c0c',
        windowWidth: 1024, // Garante largura consistente na captura
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG é mais leve que PNG
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeightMM = (imgProps.height * pageWidth) / imgProps.width;
      
      let heightLeft = imgHeightMM;
      let position = 0;

      // Página 1
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeightMM);
      heightLeft -= pageHeight;

      // Páginas Adicionais
      while (heightLeft > 0) {
        position = heightLeft - imgHeightMM;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeightMM);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
      console.log(`PDF ${filename} gerado com sucesso.`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Falha ao gerar PDF. Certifique-se de que seu navegador permite downloads e que não há bloqueadores de script ativos.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <PageLayout maxWidth="7xl">
      <PageHeader 
        leftContent={<h2 className="text-xl font-bold tracking-tighter text-on-surface">Inteligência & Manuais</h2>}
        stationLabel={profile?.station || 'Administração'}
        avatarSeed={profile?.full_name || 'chef'}
      />

      <div className="mt-12 mb-16">
        <div className="max-w-4xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.4em] text-primary uppercase mb-3 block">
            Análise Técnica do Ecossistema
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-on-surface tracking-tighter leading-[0.9] uppercase mb-8">
            Operação em <br /> <span className="text-primary">Escala Profissional</span>
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed font-medium">
            O Brigade Noir é um sistema de gestão gastronômica de ponta, projetado para eliminar as ineficiências que corroem a margem de lucro de cozinhas profissionais. Do controle de CMV real à conformidade regulatória RDC 429, cada funcionalidade foi desenvolvida para trazer precisão cirúrgica à operação.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        <DocumentCard 
          title="Apresentação Executiva"
          description="Visão estratégica completa. ROI, inteligência de dados, análise de competitividade e diferenciais técnicos que transformam a gestão."
          icon={TrendingUp}
          loading={generating === 'Apresentacao_Executiva_Brigade_Noir'}
          onDownload={() => generatePDF(presentationRef, 'Apresentacao_Executiva_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual do Funcionário"
          description="Instruções operacionais detalhadas para a brigada de praça. Como registrar quebras, entradas, movimentações e utilizar o modo de preparo."
          icon={ChefHat}
          loading={generating === 'Manual_Operacional_Brigade_Noir'}
          onDownload={() => generatePDF(employeeManualRef, 'Manual_Operacional_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual da Liderança"
          description="Gestão de alto nível para Chefs e Gerentes. Configurações de sistema, análise de BI, gestão de custos e controle de brigada."
          icon={Briefcase}
          loading={generating === 'Manual_Gestao_Lideranca_Brigade_Noir'}
          onDownload={() => generatePDF(leaderManualRef, 'Manual_Gestao_Lideranca_Brigade_Noir')}
        />
      </div>

      {/* ─── HIDDEN PDF TEMPLATES (Used for Capture) ──────────────────────────── */}
      
      <div className="fixed -left-[9999px] top-0 z-[-1] pointer-events-none">
        {/* PRESENTATION TEMPLATE */}
        <div ref={presentationRef} className="p-24 bg-[#0c0c0c] text-white font-sans w-[1000px]">
           <div className="mb-24 border-l-8 border-primary pl-10">
             <div className="flex items-center gap-6 mb-12">
               <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-[#0c0c0c] font-black text-4xl">BN</div>
               <div>
                 <h1 className="text-5xl font-black tracking-tighter uppercase">Brigade Noir</h1>
                 <p className="text-primary font-bold tracking-[0.3em] uppercase text-xs">Inteligência Gastronômica de Alta Performance</p>
               </div>
             </div>
             <h2 className="text-7xl font-black tracking-tighter leading-none uppercase mb-12">
               A Revolução na Gestão <br /> do <span className="text-primary">Lucro Gastronômico</span>
             </h2>
             <p className="text-2xl text-gray-400 max-w-3xl leading-relaxed">
               Análise técnica das funcionalidades, benefícios e o impacto operacional de um sistema projetado para a excelência em cozinhas reais.
             </p>
           </div>

           <div className="grid grid-cols-1 gap-12 mb-24">
             <div className="p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <h3 className="text-primary font-black text-3xl uppercase mb-8">1. Análise de Funcionalidades Chave</h3>
                <div className="grid grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-white font-bold text-xl mb-4 uppercase">Ficha Técnica 4.0</h4>
                    <p className="text-gray-400 text-lg leading-relaxed">Não é apenas uma receita. É um motor de cálculo financeiro que processa Fator de Correção (FC), Índice de Cocção (IC) e gera automaticamente tabelas nutricionais RDC 429 e alertas de alérgenos.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xl mb-4 uppercase">Gestão de Rendimentos (Yield)</h4>
                    <p className="text-gray-400 text-lg leading-relaxed">Módulo de testes de rendimento para proteínas e vegetais. Permite ajustar o custo real baseado no aproveitamento efetivo da matéria-prima, eliminando perdas invisíveis.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xl mb-4 uppercase">Controle de Almoxarifado Inteligente</h4>
                    <p className="text-gray-400 text-lg leading-relaxed">Rastreabilidade total de entradas e saídas. Registro de quebras por motivo (vencimento, erro de preparo, manipulação), gerando dados para ações corretivas imediatas.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xl mb-4 uppercase">Engenharia de Menu em Tempo Real</h4>
                    <p className="text-gray-400 text-lg leading-relaxed">Monitoramento de porções disponíveis por praça. Evita vendas sem estoque e garante que a brigada saiba exatamente o que pode ser servido a cada minuto.</p>
                  </div>
                </div>
             </div>

             <div className="p-12 bg-primary/5 rounded-[3rem] border border-primary/20">
                <h3 className="text-primary font-black text-3xl uppercase mb-8">2. Benefícios Reais & ROI</h3>
                <div className="space-y-8">
                  <div className="flex gap-8 items-start">
                    <div className="text-primary font-black text-5xl">25%</div>
                    <div>
                      <h4 className="text-white font-bold text-xl uppercase mb-2">Redução Média de Desperdício</h4>
                      <p className="text-gray-400 text-lg">Através do controle rigoroso de quebras e conscientização da brigada via dados, cozinhas Brigade Noir reduzem perdas operacionais significativamente.</p>
                    </div>
                  </div>
                  <div className="flex gap-8 items-start">
                    <div className="text-primary font-black text-5xl">100%</div>
                    <div>
                      <h4 className="text-white font-bold text-xl uppercase mb-2">Conformidade Regulatória</h4>
                      <p className="text-gray-400 text-lg">Geração instantânea de informações nutricionais e alérgenos, protegendo o estabelecimento contra multas e garantindo a segurança dos clientes.</p>
                    </div>
                  </div>
                  <div className="flex gap-8 items-start">
                    <div className="text-primary font-black text-5xl">0%</div>
                    <div>
                      <h4 className="text-white font-bold text-xl uppercase mb-2">Suposições Financeiras</h4>
                      <p className="text-gray-400 text-lg">CMV calculado sobre o uso real, não teórico. Visibilidade total sobre qual prato é verdadeiramente rentável.</p>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div className="p-16 bg-white text-[#0c0c0c] rounded-[3rem] text-center">
             <h4 className="text-4xl font-black uppercase tracking-tighter mb-4">Brigade Noir: O Sistema Operacional da Cozinha Moderna</h4>
             <p className="text-xl font-medium">Transformando complexidade operacional em lucro e precisão técnica.</p>
           </div>
        </div>

        {/* EMPLOYEE MANUAL TEMPLATE */}
        <div ref={employeeManualRef} className="p-24 bg-white text-black font-sans w-[1000px]">
           <div className="flex justify-between items-start mb-24 border-b-8 border-black pb-12">
             <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter">Manual do Funcionário</h1>
               <p className="text-xl font-bold uppercase tracking-[0.3em] text-gray-500">Operação de Praça & Eficiência | Brigade Noir</p>
             </div>
             <div className="text-right">
               <p className="text-xs font-black uppercase">Documento Operacional</p>
               <p className="text-xs font-black uppercase text-gray-400">Versão 2.0 - 2026</p>
             </div>
           </div>

           <div className="space-y-16">
             <section>
               <h2 className="text-3xl font-black uppercase mb-8 border-l-4 border-black pl-6">1. Registro de Insumos & Almoxarifado</h2>
               <div className="grid grid-cols-1 gap-8 text-lg">
                 <div className="p-8 bg-gray-50 rounded-3xl">
                   <h4 className="font-bold uppercase mb-4 text-xl">Recebimento de Mercadorias</h4>
                   <p className="text-gray-700 leading-relaxed">Ao receber insumos, utilize o módulo "Entradas". Verifique se o peso/quantidade condiz com a nota fiscal e registre imediatamente para atualizar o estoque central.</p>
                 </div>
                 <div className="p-8 bg-gray-50 rounded-3xl">
                   <h4 className="font-bold uppercase mb-4 text-xl">Movimentação para a Praça</h4>
                   <p className="text-gray-700 leading-relaxed">Sempre que retirar um insumo do estoque central para sua praça de trabalho, registre a "Saída". Isso garante que a liderança saiba onde está cada item.</p>
                 </div>
               </div>
             </section>

             <section>
               <h2 className="text-3xl font-black uppercase mb-8 border-l-4 border-black pl-6">2. Gestão de Desperdício (Quebra)</h2>
               <p className="text-lg mb-6 leading-relaxed">O registro de quebras é a ferramenta mais importante para o ajuste de custos. Registre toda e qualquer perda, seja por:</p>
               <div className="grid grid-cols-3 gap-6">
                 <div className="p-6 border-2 border-black rounded-2xl text-center">
                   <p className="font-black uppercase text-sm">Vencimento</p>
                 </div>
                 <div className="p-6 border-2 border-black rounded-2xl text-center">
                   <p className="font-black uppercase text-sm">Erro de Preparo</p>
                 </div>
                 <div className="p-6 border-2 border-black rounded-2xl text-center">
                   <p className="font-black uppercase text-sm">Queda/Dano</p>
                 </div>
               </div>
               <p className="mt-6 text-gray-500 italic text-sm">* Não punimos o erro registrado, punimos a perda não informada.</p>
             </section>

             <section>
               <h2 className="text-3xl font-black uppercase mb-8 border-l-4 border-black pl-6">3. Execução Padrão (Modo de Preparo)</h2>
               <div className="flex gap-10">
                 <div className="flex-1">
                   <p className="text-lg leading-relaxed">Utilize o tablet de praça para acessar o "Modo de Preparo". Lá você encontrará:</p>
                   <ul className="mt-4 space-y-3 list-disc pl-6 text-gray-700">
                     <li>Pesos exatos de cada ingrediente.</li>
                     <li>Fotos de referência para empratamento.</li>
                     <li>Passo a passo técnico da cocção.</li>
                     <li>Alertas de alérgenos para informar o salão.</li>
                   </ul>
                 </div>
               </div>
             </section>
           </div>
        </div>

        {/* LEADER MANUAL TEMPLATE */}
        <div ref={leaderManualRef} className="p-24 bg-[#0c0c0c] text-white font-sans w-[1000px]">
           <div className="flex justify-between items-start mb-24 border-b border-white/20 pb-12">
             <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter">Manual da Liderança</h1>
               <p className="text-xl font-bold uppercase tracking-[0.3em] text-primary">Gestão Estratégica & BI | Brigade Noir</p>
             </div>
             <div className="text-right">
               <p className="text-xs font-black uppercase">Executivo / Confidencial</p>
               <p className="text-xs font-black uppercase text-primary">Controle Total</p>
             </div>
           </div>

           <div className="space-y-16">
             <section>
               <h2 className="text-2xl font-black uppercase text-primary mb-8 flex items-center gap-4">
                 <div className="w-12 h-1.5 bg-primary"></div> ANÁLISE DE CMV & RESULTADOS
               </h2>
               <div className="grid grid-cols-2 gap-8">
                 <div className="p-10 bg-white/5 rounded-3xl border border-white/10">
                   <h4 className="text-white font-bold text-xl uppercase mb-4">Relatórios de Inteligência</h4>
                   <p className="text-gray-400 text-lg leading-relaxed">Monitore o CMV diariamente. Identifique desvios entre o custo teórico e o custo real baseando-se no registro de entradas vs. vendas integradas.</p>
                 </div>
                 <div className="p-10 bg-white/5 rounded-3xl border border-white/10">
                   <h4 className="text-white font-bold text-xl uppercase mb-4">Engenharia de Rendimento</h4>
                   <p className="text-gray-400 text-lg leading-relaxed">Utilize os dados de "Rendimento" para renegociar com fornecedores. Se um lote de carne está rendendo 10% a menos que o padrão, os dados do sistema são sua maior arma na negociação.</p>
                 </div>
               </div>
             </section>

             <section>
               <h2 className="text-2xl font-black uppercase text-primary mb-8 flex items-center gap-4">
                 <div className="w-12 h-1.5 bg-primary"></div> GESTÃO DA BRIGADA & ESCALA
               </h2>
               <p className="text-xl text-gray-300 leading-relaxed mb-8">A otimização da mão de obra é o segundo maior custo de uma cozinha. Use a "Escala Inteligente" para:</p>
               <ul className="space-y-4 text-lg text-gray-400">
                 <li>• Evitar o acúmulo desnecessário de horas extras através do planejamento visual.</li>
                 <li>• Balancear a brigada por praça (Saucier, Garde Manger, Patisserie) conforme o volume de vendas projetado.</li>
                 <li>• Monitorar o engajamento da equipe através do preenchimento correto dos checklists e registros de estoque.</li>
               </ul>
             </section>

             <div className="mt-24 p-12 bg-primary/10 rounded-[3rem] border border-primary/20 flex items-center justify-between">
                <div className="max-w-xl">
                  <h4 className="text-2xl font-black uppercase mb-2">Suporte & Evolução</h4>
                  <p className="text-gray-400">Este ecossistema está em constante evolução. Utilize o canal de "Suporte Técnico" para sugerir novas funcionalidades baseadas na sua realidade operacional.</p>
                </div>
                <div className="text-primary"><ShieldCheck size={60} /></div>
             </div>
           </div>
        </div>
      </div>
    </PageLayout>
  );
}
