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
  Loader2,
  Package,
  BookOpen,
  FileSpreadsheet,
  UtensilsCrossed,
  Warehouse,
  Calendar,
  AlertTriangle,
  Zap,
  Target,
  PieChart,
  Activity,
  Award,
  Clock,
  Map,
  ShoppingBag,
  Heart,
  Star,
  Search,
  Settings,
  Lock,
  Globe,
  Truck
} from 'lucide-react';
import PageLayout from './shared/PageLayout';
import PageHeader from './shared/PageHeader';
import Button from './shared/Button';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

// ─── Helper Components ────────────────────────────────────────────────────────

const BenefitCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="bg-surface-container/50 border border-outline-variant/10 p-6 rounded-3xl hover:border-primary/30 transition-colors group">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h4 className="font-bold text-on-surface uppercase text-xs tracking-widest mb-2">{title}</h4>
    <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
  </div>
);

const RoleSection = ({ icon: Icon, title, items, colorClass }: { icon: any, title: string, items: string[], colorClass: string }) => (
  <div className="p-8 rounded-[2.5rem] bg-surface-container border border-outline-variant/10 relative overflow-hidden">
    <div className={`absolute top-0 right-0 p-8 opacity-5 ${colorClass}`}>
      <Icon size={120} />
    </div>
    <h3 className={`text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3 ${colorClass}`}>
      <Icon size={28} /> {title}
    </h3>
    <ul className="space-y-4 relative z-10">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 text-on-surface-variant text-sm leading-relaxed">
          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${colorClass.replace('text-', 'bg-')}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

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
    className="bg-surface-container-high border border-outline-variant/10 rounded-[2.5rem] p-10 flex flex-col h-full group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-8 opacity-5 text-on-surface group-hover:scale-125 transition-transform duration-500">
      <Icon size={100} />
    </div>
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
      <Icon size={32} />
    </div>
    <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight mb-4">{title}</h3>
    <p className="text-on-surface-variant text-base leading-relaxed flex-1 mb-10">
      {description}
    </p>
    <Button 
      variant="primary" 
      size="xl"
      onClick={onDownload} 
      className="w-full"
      loading={loading}
      icon={<Download size={18} />}
    >
      GERAR PDF PROFISSIONAL
    </Button>
  </motion.div>
);

/**
 * A standard A4 page component for PDF generation.
 * A4 dimensions in pixels at 96 DPI: 794 x 1123
 */
const PDFPage = React.forwardRef<HTMLDivElement, { children: React.ReactNode, bgColor?: string, textColor?: string }>(
  ({ children, bgColor = "bg-white", textColor = "text-black" }, ref) => (
    <div 
      ref={ref}
      className={`w-[794px] h-[1123px] ${bgColor} ${textColor} p-16 flex flex-col relative overflow-hidden shrink-0 border-b border-gray-100 last:border-b-0`}
    >
      {children}
    </div>
  )
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Documentation() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Refs for the page containers
  const presentationRef = useRef<HTMLDivElement>(null);
  const employeeManualRef = useRef<HTMLDivElement>(null);
  const leaderManualRef = useRef<HTMLDivElement>(null);

  const generatePDF = async (containerRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!containerRef.current) {
      alert('Erro: Template não encontrado.');
      return;
    }
    setGenerating(filename);
    
    try {
      const container = containerRef.current;
      const pages = Array.from(container.children) as HTMLDivElement[];
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Add a new page to PDF if it's not the first page
        if (i > 0) pdf.addPage();
        
        const dataUrl = await toJpeg(page, {
          quality: 0.95,
          pixelRatio: 2, // Higher quality for text
          backgroundColor: page.classList.contains('bg-[#0c0c0c]') ? '#0c0c0c' : '#ffffff',
          cacheBust: true,
        });

        pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('O processamento falhou. Certifique-se de que o navegador permite downloads.');
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

      <div className="mt-12 mb-20">
        <div className="max-w-4xl">
          <span className="text-[0.6875rem] font-bold tracking-[0.4em] text-primary uppercase mb-3 block text-gradient-primary">
            Central de Conhecimento Brigade Noir
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-on-surface tracking-tighter leading-[0.85] uppercase mb-10">
            Inteligência <br /> que gera <span className="text-primary text-gradient-primary">Lucro</span>
          </h1>
          <p className="text-2xl text-on-surface-variant leading-relaxed font-medium mb-12">
            O Brigade Noir é o sistema operacional para cozinhas que buscam a perfeição técnica. Digitalize processos, elimine desperdícios invisíveis e garanta conformidade total.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <BenefitCard icon={Target} title="Precisão CMV" description="Cálculo real baseado em rendimento e quebras registradas." />
            <BenefitCard icon={Zap} title="Agilidade" description="Modos de preparo interativos com pesagens exatas." />
            <BenefitCard icon={ShieldCheck} title="Compliance" description="RDC 429/2020 automatizada para segurança jurídica." />
            <BenefitCard icon={Award} title="Performance" description="Transformação da brigada em uma unidade de alta performance." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        <DocumentCard 
          title="Apresentação Executiva"
          description="Visão estratégica completa para investidores e conselhos. Foco em ROI, diferenciais tecnológicos e escalabilidade operacional."
          icon={TrendingUp}
          loading={generating === 'Apresentacao_Executiva_Brigade_Noir'}
          onDownload={() => generatePDF(presentationRef, 'Apresentacao_Executiva_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual do Funcionário"
          description="Guia operacional de 6 páginas. Protocolos de praça, registro de quebras, checklists e boas práticas de produção digitalizada."
          icon={ChefHat}
          loading={generating === 'Manual_Operacional_Brigade_Noir'}
          onDownload={() => generatePDF(employeeManualRef, 'Manual_Operacional_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual da Liderança"
          description="Estratégia de 6 páginas para gestão de custos, auditoria de estoque e BI. O cérebro estratégico para Chefs e Gerentes."
          icon={Briefcase}
          loading={generating === 'Manual_Gestao_Lideranca_Brigade_Noir'}
          onDownload={() => generatePDF(leaderManualRef, 'Manual_Gestao_Lideranca_Brigade_Noir')}
        />
      </div>

      {/* ─── HIDDEN PDF TEMPLATES (Page-by-Page) ──────────────────────────────── */}
      
      <div className="fixed -left-[9999px] top-0 z-[-1] pointer-events-none flex flex-col bg-gray-200">
        
        {/* PRESENTATION TEMPLATE (5 PAGES) */}
        <div ref={presentationRef} className="flex flex-col">
          {/* Page 1: Cover */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <div className="h-full flex flex-col justify-between border-l-[12px] border-primary pl-12">
              <div>
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-[#0c0c0c] font-black text-4xl mb-12">BN</div>
                <h1 className="text-[100px] font-black tracking-tighter leading-[0.8] uppercase mb-8">
                  Brigade <br /> <span className="text-primary">Noir</span>
                </h1>
                <p className="text-2xl font-bold tracking-[0.3em] uppercase text-gray-500 mb-16 text-gradient-primary">Executive Presentation</p>
                <div className="w-32 h-1 bg-primary mb-12"></div>
                <h2 className="text-4xl font-black uppercase tracking-tight max-w-lg leading-tight">
                  A Revolução da Engenharia de Cozinha Digital
                </h2>
              </div>
              <div className="pb-10">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Confidencial • Estratégico • 2026</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 2: Problem & Vision */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-12 flex items-center gap-4">
              <span className="w-10 h-1 bg-primary"></span> 01. O Cenário Atual
            </h3>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-8">
                <p className="text-xl text-gray-400 leading-relaxed">As perdas invisíveis na cozinha tradicional podem representar até 25% do faturamento bruto. A falta de dados em tempo real impede a correção rápida de desvios.</p>
                <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                  <h4 className="font-bold text-lg uppercase mb-4 text-white">Ineficiências Comuns</h4>
                  <ul className="space-y-3 text-sm text-gray-500">
                    <li>• CMV calculado sobre compras, não sobre uso real.</li>
                    <li>• Desperdício de rendimento em proteínas (Yield).</li>
                    <li>• Inconsistência técnica entre turnos e brigadas.</li>
                    <li>• Falta de compliance regulatório automatizado.</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-10 bg-primary/5 rounded-[3rem] border border-primary/20">
                <TrendingUp size={80} className="text-primary mb-6" />
                <div className="text-6xl font-black text-primary">22%</div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-4">Redução Média de Perda <br /> no Primeiro Semestre</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 3: Technology & Features */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-12 flex items-center gap-4">
              <span className="w-10 h-1 bg-primary"></span> 02. Solução Tecnológica
            </h3>
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="font-black text-primary uppercase text-sm mb-4">Ficha Técnica 4.0</h4>
                <p className="text-sm text-gray-400">Motor de cálculo financeiro integrado a testes de rendimento (Yield). Gere tabelas nutricionais e alertas de alérgenos automaticamente.</p>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="font-black text-primary uppercase text-sm mb-4">Inteligência de Almoxarifado</h4>
                <p className="text-sm text-gray-400">Rastreabilidade completa de cada grama de insumo. Registro de quebras por motivo, permitindo auditorias precisas.</p>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="font-black text-primary uppercase text-sm mb-4">Dashboard de BI</h4>
                <p className="text-sm text-gray-400">Visão executiva do CMV real vs teórico. Análise de margem de contribuição por prato e por estação.</p>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="font-black text-primary uppercase text-sm mb-4">Escala Inteligente</h4>
                <p className="text-sm text-gray-400">Planejamento de pessoal baseado na demanda operacional, reduzindo custos de horas extras desnecessárias.</p>
              </div>
            </div>
            <div className="p-10 bg-white text-black rounded-[2rem] text-center">
              <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Ecossistema Conectado</h4>
              <p className="text-sm font-medium">Insumo → Produção → Venda → Lucro</p>
            </div>
          </PDFPage>
          {/* Page 4: Operational Flow */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-12 flex items-center gap-4">
              <span className="w-10 h-1 bg-primary"></span> 03. Fluxo de Valor
            </h3>
            <div className="relative">
              <div className="absolute left-10 top-0 bottom-0 w-1 bg-primary/20"></div>
              <div className="space-y-12">
                {[
                  { title: "Entrada & Recebimento", desc: "Auditoria de insumos Curva A com registro de peso e qualidade." },
                  { title: "Mise-en-place & Yield", desc: "Testes de rendimento que alimentam o custo real das fichas técnicas." },
                  { title: "Produção Digitalizada", desc: "Uso de modos de preparo interativos para garantir o padrão técnico." },
                  { title: "Controle de Quebra", desc: "Registro instantâneo de perdas para ajuste fino de compras e CMV." }
                ].map((item, idx) => (
                  <div key={idx} className="relative pl-24">
                    <div className="absolute left-6 top-1 w-10 h-10 rounded-full bg-primary flex items-center justify-center font-black text-[#0c0c0c] z-10">{idx+1}</div>
                    <h4 className="text-xl font-bold uppercase mb-2">{item.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </PDFPage>
          {/* Page 5: ROI & Conclusion */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <div className="flex-1 flex flex-col justify-center items-center text-center px-12">
              <Award size={80} className="text-primary mb-8" />
              <h3 className="text-5xl font-black uppercase tracking-tighter mb-6">Retorno sobre Investimento</h3>
              <p className="text-2xl text-gray-400 mb-12 leading-relaxed">Implementação completa em 15 dias, com retorno mensurável através da redução de CMV no primeiro mês.</p>
              <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                <div className="p-8 border border-white/10 rounded-3xl">
                  <div className="text-4xl font-black text-primary mb-2">15%</div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Média ROI Inicial</p>
                </div>
                <div className="p-8 border border-white/10 rounded-3xl">
                  <div className="text-4xl font-black text-primary mb-2">100%</div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Compliance Técnico</p>
                </div>
              </div>
            </div>
            <div className="pt-20 border-t border-white/10 text-center">
              <h4 className="text-xl font-black uppercase text-primary">Brigade Noir: Gestão que WOW.</h4>
            </div>
          </PDFPage>
        </div>

        {/* EMPLOYEE MANUAL (6 PAGES) */}
        <div ref={employeeManualRef} className="flex flex-col">
          {/* Page 1: Cover */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <div className="h-full flex flex-col justify-between border-b-[16px] border-black pb-12">
              <div>
                <h1 className="text-6xl font-black uppercase tracking-tighter mb-4">Manual do <br /> Funcionário</h1>
                <p className="text-xl font-bold uppercase tracking-[0.3em] text-gray-400 mb-20 text-gradient-primary">Operação & Eficiência de Praça</p>
                <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center text-white font-black text-5xl mb-12">BN</div>
                <p className="text-xl text-gray-600 max-w-sm leading-relaxed">Seu guia definitivo para operar o sistema Brigade Noir e elevar o padrão da nossa cozinha.</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Unidade / Estação</p>
                  <div className="w-64 h-10 border-b-2 border-black"></div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase">Versão 2.0 • 2026</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 2: Inventory & Stocks */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <h3 className="text-3xl font-black uppercase mb-10 border-l-8 border-black pl-6">01. Gestão de Insumos</h3>
            <div className="space-y-10">
              <section>
                <h4 className="text-xl font-bold uppercase mb-4 flex items-center gap-3">
                  <Package className="text-primary" /> Recebimento e Pesagem
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">Todo insumo recebido deve passar pela balança. Registre a entrada no módulo <strong>Almoxarifado</strong> imediatamente. Divergências de peso entre a NF e o real devem ser notificadas ao Chef.</p>
              </section>
              <section>
                <h4 className="text-xl font-bold uppercase mb-4 flex items-center gap-3">
                  <Truck className="text-primary" /> Armazenamento & Etiquetas
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">O sistema gera etiquetas de validade automaticamente. Nunca armazene itens sem a etiqueta BN, que contém data de entrada, lote e validade calculada conforme PVPS (Primeiro que Vence, Primeiro que Sai).</p>
              </section>
              <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Importante</p>
                <p className="text-sm font-medium italic">"O estoque é o dinheiro do restaurante em forma de alimento. Cuide dele com precisão."</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 3: Production & Waste */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <h3 className="text-3xl font-black uppercase mb-10 border-l-8 border-black pl-6">02. Produção & Quebras</h3>
            <div className="grid grid-cols-1 gap-12">
              <section>
                <h4 className="text-xl font-bold uppercase mb-4">Registro de Quebras (Obrigatório)</h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">A quebra deve ser registrada no momento em que ocorre. Não acumule registros para o final do turno.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-2xl">
                    <p className="font-bold text-red-600 uppercase text-[10px] mb-1">Motivo: Erro de Manipulação</p>
                    <p className="text-xs text-red-400 leading-tight">Quando um corte ou processo técnico falha.</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl">
                    <p className="font-bold text-orange-600 uppercase text-[10px] mb-1">Motivo: Vencimento</p>
                    <p className="text-xs text-orange-400 leading-tight">Produto que não foi utilizado no prazo.</p>
                  </div>
                </div>
              </section>
              <section>
                <h4 className="text-xl font-bold uppercase mb-4">Yield (Rendimento de Insumo)</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Sempre que processar uma proteína Curva A (Filé, Camarão, etc), realize o teste de rendimento no sistema. Pesagem bruta vs pesagem limpa. Isso ajusta o CMV automaticamente.</p>
              </section>
            </div>
          </PDFPage>
          {/* Page 4: Quality & Preparation */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <h3 className="text-3xl font-black uppercase mb-10 border-l-8 border-black pl-6">03. Modo de Preparo</h3>
            <div className="space-y-8">
              <div className="p-8 bg-black text-white rounded-[2.5rem]">
                <h4 className="text-primary font-bold uppercase text-lg mb-4">Siga a Ficha Técnica</h4>
                <p className="text-sm text-gray-400 leading-relaxed">Nenhuma alteração de peso ou substituição de ingrediente é permitida sem autorização do Chef Executivo. O sistema monitora a saída por praça e detecta desvios de gramatura.</p>
              </div>
              <div className="flex gap-8 items-start">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center font-black shrink-0 text-2xl">A</div>
                <div>
                  <h5 className="font-bold uppercase mb-2">Fotos de Empratamento</h5>
                  <p className="text-gray-500 text-xs leading-relaxed">Consulte sempre a foto de referência no sistema antes de liberar o prato. O padrão visual é tão importante quanto o sabor.</p>
                </div>
              </div>
              <div className="flex gap-8 items-start">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center font-black shrink-0 text-2xl">B</div>
                <div>
                  <h5 className="font-bold uppercase mb-2">Sequência de Montagem</h5>
                  <p className="text-gray-500 text-xs leading-relaxed">Respeite a ordem dos insumos listada na ficha técnica para garantir a textura e a temperatura ideais.</p>
                </div>
              </div>
            </div>
          </PDFPage>
          {/* Page 5: Checklists & Safety */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <h3 className="text-3xl font-black uppercase mb-10 border-l-8 border-black pl-6">04. Checklists & RDC 429</h3>
            <div className="grid grid-cols-1 gap-8">
              <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-200">
                <h4 className="font-bold uppercase text-lg mb-6 flex items-center gap-3">
                  <ClipboardList className="text-primary" /> Protocolos Obrigatórios
                </h4>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-center">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <span className="text-sm text-gray-600 font-medium">Checklist de Abertura: Equipamentos e Mise-en-place.</span>
                  </li>
                  <li className="flex gap-4 items-center">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <span className="text-sm text-gray-600 font-medium">Controle de Temperatura: A cada 4 horas.</span>
                  </li>
                  <li className="flex gap-4 items-center">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <span className="text-sm text-gray-600 font-medium">Checklist de Fechamento: Limpeza e Organização.</span>
                  </li>
                </ul>
              </div>
              <div className="p-10 border-2 border-black rounded-[3rem]">
                <h4 className="font-black uppercase text-lg mb-4">Informação Nutricional</h4>
                <p className="text-gray-600 text-sm leading-relaxed">O Brigade Noir garante que o cliente receba informações precisas sobre alérgenos. Substituições de insumos sem registro invalidam essa segurança.</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 6: Administration & Scale */}
          <PDFPage bgColor="bg-white" textColor="text-black">
            <h3 className="text-3xl font-black uppercase mb-10 border-l-8 border-black pl-6">05. Horários e Escala</h3>
            <div className="space-y-8 flex-1">
              <p className="text-gray-600 leading-relaxed">Consulte sua escala mensal pelo sistema. Mudanças de turno ou folgas só podem ser solicitadas via sistema com aprovação da liderança.</p>
              <div className="p-8 bg-black text-white rounded-3xl flex items-center justify-between">
                <div>
                  <h5 className="font-black text-xl mb-1 uppercase tracking-tight">Escala Digital</h5>
                  <p className="text-[10px] uppercase text-gray-500">Consulte seu horário a qualquer momento.</p>
                </div>
                <Calendar size={40} className="text-primary" />
              </div>
            </div>
            <div className="pt-10 border-t border-gray-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Propriedade Intelectual Brigade Noir • 2026</p>
            </div>
          </PDFPage>
        </div>

        {/* LEADERSHIP MANUAL (6 PAGES) */}
        <div ref={leaderManualRef} className="flex flex-col">
          {/* Page 1: Cover */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <div className="h-full flex flex-col justify-between border-l-[16px] border-primary pl-12">
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter mb-4 leading-none">Manual de <br /> <span className="text-primary">Liderança</span></h1>
                <p className="text-xl font-bold uppercase tracking-[0.3em] text-gray-500 mb-20 text-gradient-primary">Gestão Estratégica & BI</p>
                <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-[#0c0c0c] font-black text-5xl mb-12">BN</div>
                <p className="text-2xl text-gray-400 max-w-sm leading-relaxed font-medium">Controle total sobre custos, processos e pessoas através da inteligência de dados.</p>
              </div>
              <div className="pb-10 border-t border-white/10 pt-10">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Confidencial • Nível Executivo</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 2: Financial Intelligence */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-10 flex items-center gap-4">
               01. Gestão Financeira & CMV
            </h3>
            <div className="space-y-10">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="text-white font-bold uppercase text-lg mb-4">Auditoria de CMV Real</h4>
                <p className="text-gray-500 text-sm leading-relaxed">Utilize o módulo <strong>Relatório</strong> para auditar o CMV a cada 7 dias. O sistema compara o estoque inicial, as compras do período e as vendas para detectar desvios operacionais ou desvios físicos.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h5 className="font-bold uppercase text-xs text-primary mb-2">Curva ABC de Venda</h5>
                  <p className="text-[10px] text-gray-500">Foque na margem dos 10 itens que mais vendem. O Brigade Noir mostra onde o lucro está concentrado.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h5 className="font-bold uppercase text-xs text-secondary mb-2">Gestão de Compras</h5>
                  <p className="text-[10px] text-gray-500">O sistema sugere compras baseado no estoque mínimo e no consumo projetado.</p>
                </div>
              </div>
            </div>
          </PDFPage>
          {/* Page 3: Technical Auditing */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-10 flex items-center gap-4">
               02. Auditoria Técnica
            </h3>
            <div className="space-y-12">
              <section>
                <h4 className="text-xl font-bold uppercase mb-4 text-white">Engenharia de Yield (Rendimento)</h4>
                <p className="text-gray-500 text-sm leading-relaxed">Audite os testes de rendimento feitos pela brigada. Se o Fator de Correção (FC) estiver acima do padrão cadastrado, identifique se o problema é o fornecedor ou a técnica de limpeza do funcionário.</p>
              </section>
              <section>
                <h4 className="text-xl font-bold uppercase mb-4 text-white">Monitoramento de Quebras</h4>
                <p className="text-gray-500 text-sm leading-relaxed">Anote padrões nos registros de quebras. Muitos registros por "erro de preparo" indicam necessidade de treinamento técnico. Muitos registros por "vencimento" indicam falha no planejamento de compras.</p>
              </section>
              <div className="p-8 bg-primary/10 rounded-[2.5rem] border border-primary/20 flex items-center justify-between">
                <div className="max-w-[70%]">
                   <h5 className="font-black uppercase text-sm mb-1 text-primary text-gradient-primary">Padrão Inviolável</h5>
                   <p className="text-[10px] text-gray-400">O custo real só é garantido se a ficha técnica for seguida sem desvios de gramatura.</p>
                </div>
                <ShieldCheck size={40} className="text-primary" />
              </div>
            </div>
          </PDFPage>
          {/* Page 4: People & Performance */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-10 flex items-center gap-4">
               03. Gestão de Brigada
            </h3>
            <div className="grid grid-cols-1 gap-8">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="text-white font-bold uppercase text-lg mb-4 flex items-center gap-3"><Users /> Performance por Estação</h4>
                <p className="text-gray-500 text-sm leading-relaxed">Acompanhe quem está preenchendo os checklists e quem está registrando quebras. A disciplina no sistema reflete a disciplina na cozinha. Utilize o módulo <strong>Brigada</strong> para gerenciar perfis e competências.</p>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                <h4 className="text-white font-bold uppercase text-lg mb-4 flex items-center gap-3"><Clock /> Otimização de Escala</h4>
                <p className="text-gray-500 text-sm leading-relaxed">A escala deve ser planejada para evitar horas extras. O Brigade Noir projeta o custo da folha baseado nos turnos cadastrados, permitindo ajustes preventivos.</p>
              </div>
            </div>
          </PDFPage>
          {/* Page 5: Compliance & BI */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <h3 className="text-3xl font-black uppercase text-primary mb-10 flex items-center gap-4">
               04. Compliance & BI
            </h3>
            <div className="space-y-8">
              <p className="text-gray-400 leading-relaxed">A nova RDC 429/2020 exige precisão total nas informações nutricionais. Como líder, você é o responsável pela veracidade dos dados nas fichas técnicas.</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <PieChart size={40} className="mx-auto text-primary mb-4" />
                  <h5 className="font-bold uppercase text-xs mb-2">BI Analítico</h5>
                  <p className="text-[9px] text-gray-500 uppercase">Visão estratégica de tendências e sazonalidade.</p>
                </div>
                <div className="p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <Activity size={40} className="mx-auto text-secondary mb-4" />
                  <h5 className="font-bold uppercase text-xs mb-2">Real-Time Ops</h5>
                  <p className="text-[9px] text-gray-500 uppercase">Acompanhamento do estoque crítico em tempo real.</p>
                </div>
              </div>
            </div>
          </PDFPage>
          {/* Page 6: System Strategy */}
          <PDFPage bgColor="bg-[#0c0c0c]" textColor="text-white">
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="text-4xl font-black uppercase tracking-tighter mb-8 leading-tight">O Brigade Noir é o <br /> seu <span className="text-primary">Diferencial Competitivo</span></h4>
              <p className="text-xl text-gray-500 leading-relaxed mb-12">Utilize as ferramentas de inteligência para sair do operacional e focar no estratégico. Uma cozinha gerenciada por dados é uma cozinha escalável e lucrativa.</p>
              <div className="w-20 h-1 bg-primary mb-8"></div>
            </div>
            <div className="pt-10 border-t border-white/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Brigade Noir Strategic Intelligence Guide • 2026</p>
            </div>
          </PDFPage>
        </div>

      </div>
    </PageLayout>
  );
}
