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
  Heart
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Documentation() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  
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
      
      // html-to-image is significantly more stable for React
      const dataUrl = await toJpeg(el, {
        quality: 0.95,
        pixelRatio: 1.5,
        backgroundColor: el.classList.contains('bg-white') ? '#ffffff' : '#0c0c0c',
        cacheBust: true,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeightMM = (imgProps.height * pageWidth) / imgProps.width;
      
      let heightLeft = imgHeightMM;
      let position = 0;

      // Page 1
      pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, imgHeightMM);
      heightLeft -= pageHeight;

      // Additional Pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeightMM;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, imgHeightMM);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('O processamento falhou. Tente novamente ou verifique se o navegador permite downloads.');
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
          <span className="text-[0.6875rem] font-bold tracking-[0.4em] text-primary uppercase mb-3 block">
            Central de Conhecimento Brigade Noir
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-on-surface tracking-tighter leading-[0.85] uppercase mb-10">
            Inteligência <br /> que gera <span className="text-primary">Lucro</span>
          </h1>
          <p className="text-2xl text-on-surface-variant leading-relaxed font-medium mb-12">
            Transformamos a complexidade operacional em dados acionáveis. Do controle de estoque cirúrgico à conformidade regulatória RDC 429/2020, o Brigade Noir é o sistema operacional para cozinhas que buscam a perfeição técnica.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <BenefitCard 
              icon={Target} 
              title="Precisão de CMV" 
              description="Cálculo real baseado em rendimento e quebras registradas." 
            />
            <BenefitCard 
              icon={Zap} 
              title="Agilidade de Praça" 
              description="Modos de preparo interativos com pesagens exatas." 
            />
            <BenefitCard 
              icon={ShieldCheck} 
              title="Compliance Total" 
              description="RDC 429/2020 automatizada para segurança jurídica." 
            />
            <BenefitCard 
              icon={Award} 
              title="Cultura de Dados" 
              description="Transformação da brigada em uma unidade de alta performance." 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
        <RoleSection 
          icon={ChefHat}
          title="Para a Brigada"
          colorClass="text-primary"
          items={[
            "Registro instantâneo de Quebras para ajuste de estoque.",
            "Consulta de Modo de Preparo com referências visuais de empratamento.",
            "Checklists operacionais para garantia de segurança alimentar.",
            "Controle de insumos críticos por praça de trabalho.",
            "Consulta de escala e horas trabalhadas em tempo real."
          ]}
        />
        <RoleSection 
          icon={Briefcase}
          title="Para a Liderança"
          colorClass="text-secondary"
          items={[
            "Dashboard de BI com análise de margem de contribuição por prato.",
            "Gestão de custos via Engenharia de Cardápio e Yield Tests.",
            "Monitoramento de desvios de estoque e auditoria de compras.",
            "Otimização de escala para redução de horas extras.",
            "Configuração de parâmetros técnicos e conformidade ANVISA."
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        <DocumentCard 
          title="Apresentação Executiva"
          description="O pitch deck completo do Brigade Noir. Ideal para apresentar a investidores e conselhos, focando em ROI, tecnologia e escalabilidade."
          icon={TrendingUp}
          loading={generating === 'Apresentacao_Executiva_Brigade_Noir'}
          onDownload={() => generatePDF(presentationRef, 'Apresentacao_Executiva_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual do Funcionário"
          description="Guia prático de 12 páginas sobre rotinas, boas práticas e uso correto do sistema nas praças. Foco em disciplina e eficiência."
          icon={ChefHat}
          loading={generating === 'Manual_Operacional_Brigade_Noir'}
          onDownload={() => generatePDF(employeeManualRef, 'Manual_Operacional_Brigade_Noir')}
        />
        <DocumentCard 
          title="Manual da Liderança"
          description="Guia estratégico de 15 páginas para gestão de custos, pessoas e inteligência de dados. O cérebro da operação gastronômica."
          icon={Briefcase}
          loading={generating === 'Manual_Gestao_Lideranca_Brigade_Noir'}
          onDownload={() => generatePDF(leaderManualRef, 'Manual_Gestao_Lideranca_Brigade_Noir')}
        />
      </div>

      {/* ─── HIDDEN PDF TEMPLATES (Exhaustive Content) ────────────────────────── */}
      
      <div className="fixed -left-[9999px] top-0 z-[-1] pointer-events-none">
        
        {/* PRESENTATION TEMPLATE */}
        <div ref={presentationRef} className="p-24 bg-[#0c0c0c] text-white font-sans w-[1000px]">
          {/* Cover Page */}
          <div className="h-[1400px] flex flex-col justify-between border-l-[16px] border-primary pl-16">
            <div>
              <div className="flex items-center gap-6 mb-20">
                <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-[#0c0c0c] font-black text-5xl">BN</div>
                <div>
                  <h1 className="text-6xl font-black tracking-tighter uppercase">Brigade Noir</h1>
                  <p className="text-primary font-bold tracking-[0.4em] uppercase text-sm">Strategic Intelligence System</p>
                </div>
              </div>
              <h2 className="text-[120px] font-black tracking-tighter leading-[0.8] uppercase mb-16">
                A Revolução da <br /> <span className="text-primary">Engenharia de Cozinha</span>
              </h2>
              <div className="w-40 h-2 bg-primary mb-16"></div>
              <p className="text-3xl text-gray-400 max-w-3xl leading-relaxed">
                Transformando ineficiências em lucro líquido através de tecnologia, dados e conformidade técnica rigorosa.
              </p>
            </div>
            <div className="pb-20">
              <p className="text-xl font-bold uppercase tracking-widest text-gray-500">Apresentação Executiva 2026</p>
              <p className="text-sm font-medium text-gray-600 mt-2">© Brigade Noir Systems - All Rights Reserved</p>
            </div>
          </div>

          {/* Analysis & Benefits Page */}
          <div className="py-32 border-t border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">01. O Cenário Gastronômico Atual</h3>
            <div className="grid grid-cols-2 gap-16 mb-24">
              <div>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Cozinhas tradicionais perdem entre 15% e 25% de seu faturamento por falta de controle técnico. Perdas em rendimento de proteínas, quebras não registradas e fichas técnicas desatualizadas são os principais vilões.
                </p>
                <div className="mt-12 p-10 bg-white/5 rounded-[3rem] border border-white/10">
                  <h4 className="text-white font-black text-xl uppercase mb-6 flex items-center gap-3">
                    <AlertTriangle className="text-red-400" /> Pontos de Fricção
                  </h4>
                  <ul className="space-y-4 text-gray-500">
                    <li>• Inconsistência de sabor e gramatura.</li>
                    <li>• CMV teórico vs real com desvio acima de 5%.</li>
                    <li>• Risco jurídico por falta de tabela nutricional.</li>
                    <li>• Escala de funcionários sem otimização de custo.</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-80 h-80">
                  <div className="absolute inset-0 rounded-full border-8 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent -rotate-45"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <span className="text-6xl font-black text-primary">22%</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2">Média de Perda Operacional</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technology Page */}
          <div className="py-32 border-t border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">02. A Solução Brigade Noir</h3>
            <div className="grid grid-cols-3 gap-8">
              <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10">
                <Zap className="text-primary mb-6" size={48} />
                <h4 className="font-bold text-xl uppercase mb-4">Eficiência de Fluxo</h4>
                <p className="text-gray-500 text-sm">Digitalização total do fluxo de insumos, desde o recebimento até a saída final.</p>
              </div>
              <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10">
                <Activity className="text-secondary mb-6" size={48} />
                <h4 className="font-bold text-xl uppercase mb-4">Dados em Real-Time</h4>
                <p className="text-gray-500 text-sm">Dashboard inteligente que monitora CMV e vendas integradas a cada minuto.</p>
              </div>
              <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10">
                <ShieldCheck className="text-primary mb-6" size={48} />
                <h4 className="font-bold text-xl uppercase mb-4">Compliance ANVISA</h4>
                <p className="text-gray-500 text-sm">Geração automática de rotulagem nutricional RDC 429/2020.</p>
              </div>
            </div>
            
            <div className="mt-20 p-16 bg-primary/5 rounded-[4rem] border border-primary/20">
              <h4 className="text-2xl font-black uppercase mb-10 text-center">Integração Vertical do Sistema</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-black text-primary mb-2">Insumo</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Entrada & Yield</div>
                </div>
                <div className="flex items-center justify-center text-gray-700">→</div>
                <div>
                  <div className="text-3xl font-black text-white mb-2">FT 4.0</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Engenharia de Custo</div>
                </div>
                <div className="flex items-center justify-center text-gray-700">→</div>
                <div>
                  <div className="text-3xl font-black text-secondary mb-2">Venda</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Baixa de Estoque</div>
                </div>
                <div className="flex items-center justify-center text-gray-700">→</div>
                <div>
                  <div className="text-3xl font-black text-primary mb-2">Relatório</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Lucro Real</div>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Impact Page */}
          <div className="py-32 border-t border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">03. Impacto Operacional & ROI</h3>
            <div className="space-y-12">
              <div className="flex gap-12 items-center p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <div className="text-8xl font-black text-primary opacity-20">01</div>
                <div>
                  <h4 className="text-2xl font-black uppercase mb-4">Redução de Desperdício de Insumos</h4>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Com o registro obrigatório de quebras e controle de aproveitamento (FC/IC), cozinhas profissionais reduzem o desperdício de proteínas em até 12% no primeiro trimestre.
                  </p>
                </div>
              </div>
              <div className="flex gap-12 items-center p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <div className="text-8xl font-black text-secondary opacity-20">02</div>
                <div>
                  <h4 className="text-2xl font-black uppercase mb-4">Otimização de Escala (Labor Cost)</h4>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    O módulo de escala inteligente permite visualizar a densidade de funcionários por praça, evitando excesso de horas extras e otimizando a folha de pagamento.
                  </p>
                </div>
              </div>
              <div className="flex gap-12 items-center p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <div className="text-8xl font-black text-primary opacity-20">03</div>
                <div>
                  <h4 className="text-2xl font-black uppercase mb-4">Segurança Alimentar Digital</h4>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Checklists digitais garantem que os protocolos de abertura e fechamento sejam seguidos, reduzindo riscos de contaminação e multas sanitárias.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EMPLOYEE MANUAL TEMPLATE (Extensive 10+ Page Style Content) */}
        <div ref={employeeManualRef} className="p-24 bg-white text-black font-sans w-[1000px]">
          {/* Cover */}
          <div className="h-[1400px] flex flex-col justify-between border-b-[20px] border-black pb-24 mb-24">
            <div>
              <div className="flex justify-between items-start mb-32">
                <div>
                  <h1 className="text-6xl font-black uppercase tracking-tighter">Manual do <br /> Funcionário</h1>
                  <p className="text-xl font-bold uppercase tracking-[0.4em] text-gray-400 mt-4">Eficiência & Disciplina Operacional</p>
                </div>
                <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white font-black text-4xl">BN</div>
              </div>
              <div className="max-w-2xl">
                <h2 className="text-4xl font-black uppercase leading-tight mb-8">Bem-vindo à Cozinha do Futuro</h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Este guia contém os protocolos essenciais para garantir que sua praça opere com máxima precisão técnica e eficiência. O Brigade Noir é sua principal ferramenta de trabalho.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-16">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Propriedade de</p>
                <div className="h-12 border-b border-black"></div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Unidade / Restaurante</p>
                <div className="h-12 border-b border-black"></div>
              </div>
            </div>
          </div>

          {/* Intro to Workflow */}
          <div className="py-24 border-b border-gray-100">
            <h3 className="text-3xl font-black uppercase mb-12">01. Sua Rotina Diária</h3>
            <div className="space-y-12">
              <div className="flex gap-10">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center font-black text-2xl shrink-0">1</div>
                <div>
                  <h4 className="text-xl font-bold uppercase mb-2">Abertura de Praça</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Acesse o módulo de <strong>Checklist</strong>. Verifique temperaturas de balcões refrigerados, datas de validade de mise-en-place e organização de ferramentas. O registro deve ser feito nos primeiros 15 minutos do turno.
                  </p>
                </div>
              </div>
              <div className="flex gap-10">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center font-black text-2xl shrink-0">2</div>
                <div>
                  <h4 className="text-xl font-bold uppercase mb-2">Recebimento de Insumos</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Sempre verifique o peso e a qualidade de tudo que entra na cozinha. Use o módulo <strong>Almoxarifado</strong> para registrar a entrada de insumos e atualizar o estoque. Um erro de pesagem aqui altera todo o CMV do mês.
                  </p>
                </div>
              </div>
              <div className="flex gap-10">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center font-black text-2xl shrink-0">3</div>
                <div>
                  <h4 className="text-xl font-bold uppercase mb-2">Produção & Yield</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Durante o pré-preparo, utilize o módulo <strong>Insumos</strong> para registrar testes de rendimento. Se uma proteína rendeu menos que o previsto, a liderança deve ser notificada para ajuste da Ficha Técnica.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Waste & Quality Page */}
          <div className="py-24 border-b border-gray-100">
            <h3 className="text-3xl font-black uppercase mb-12">02. Gestão de Quebra & Desperdício</h3>
            <p className="text-xl text-gray-500 mb-12 leading-relaxed">
              O desperdício é o maior inimigo da lucratividade. No Brigade Noir, toda "Quebra" deve ser registrada com o motivo correto.
            </p>
            <div className="grid grid-cols-2 gap-8 mb-16">
              <div className="p-8 bg-gray-50 rounded-3xl">
                <h4 className="font-bold uppercase text-sm mb-4">Motivos Aceitáveis</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>• <strong>Erro de Manipulação:</strong> Corte errado ou erro no processo.</li>
                  <li>• <strong>Erro de Cocção:</strong> Ponto errado ou queima do produto.</li>
                  <li>• <strong>Vencimento:</strong> Itens que ultrapassaram a data de validade.</li>
                  <li>• <strong>Dano Físico:</strong> Produto que caiu ou foi contaminado acidentalmente.</li>
                </ul>
              </div>
              <div className="p-8 bg-black text-white rounded-3xl">
                <h4 className="font-bold uppercase text-sm mb-4 text-primary">Regra de Ouro</h4>
                <p className="text-lg font-medium leading-relaxed">
                  "Um erro registrado é um dado para melhoria. Um erro escondido é um prejuízo financeiro."
                </p>
                <p className="text-sm mt-4 text-gray-400 italic">
                  Todos os funcionários têm autonomia para registrar quebras no sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Execution Page */}
          <div className="py-24 border-b border-gray-100">
            <h3 className="text-3xl font-black uppercase mb-12">03. Execução Técnica (Modo de Preparo)</h3>
            <div className="grid grid-cols-1 gap-12">
              <div className="border-l-4 border-primary pl-8 py-4">
                <h4 className="text-xl font-bold uppercase mb-4">Uso dos Tablets de Praça</h4>
                <p className="text-gray-600">
                  Antes de iniciar qualquer produção em larga escala, consulte o <strong>Modo de Preparo</strong>. O sistema mostrará a gramatura exata para o número de porções desejado, ajustando automaticamente os insumos necessários.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 border border-gray-200 rounded-2xl text-center">
                  <div className="font-black text-3xl mb-2">Peso</div>
                  <p className="text-xs uppercase text-gray-400">Sempre use balança</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-2xl text-center">
                  <div className="font-black text-3xl mb-2">Cor</div>
                  <p className="text-xs uppercase text-gray-400">Verifique a referência</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-2xl text-center">
                  <div className="font-black text-3xl mb-2">Temp</div>
                  <p className="text-xs uppercase text-gray-400">Respeite o termômetro</p>
                </div>
              </div>
            </div>
          </div>

          {/* RDC 429 Page */}
          <div className="py-24">
            <h3 className="text-3xl font-black uppercase mb-12">04. Segurança & RDC 429/2020</h3>
            <div className="bg-gray-100 p-12 rounded-[3rem]">
              <h4 className="text-xl font-bold uppercase mb-6 flex items-center gap-3">
                <Heart className="text-red-500" /> Cuidado com o Cliente
              </h4>
              <p className="text-gray-600 leading-relaxed mb-8">
                O Brigade Noir gera as tabelas nutricionais e alertas de alérgenos baseando-se nas fichas técnicas. <strong>Qualquer alteração de ingrediente ou marca</strong> deve ser reportada imediatamente ao Chef, pois altera as informações de saúde do produto final.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <p className="text-xs font-black uppercase text-gray-400 mb-2">Check de Alérgenos</p>
                  <p className="font-bold">Glúten, Lactose, Crustáceos e Oleaginosas.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <p className="text-xs font-black uppercase text-gray-400 mb-2">Sódio & Açúcar</p>
                  <p className="font-bold">Monitoramento conforme rotulagem frontal.</p>
                </div>
              </div>
            </div>
            <div className="mt-24 pt-24 border-t border-gray-200 text-center">
              <p className="text-sm font-black uppercase tracking-[0.5em] text-gray-300">Brigade Noir Operational Guide v2026.01</p>
            </div>
          </div>
        </div>

        {/* LEADER MANUAL TEMPLATE (Extensive Strategy Content) */}
        <div ref={leaderManualRef} className="p-24 bg-[#0c0c0c] text-white font-sans w-[1000px]">
          {/* Cover */}
          <div className="h-[1400px] flex flex-col justify-between border-b-[20px] border-primary pb-24 mb-24">
            <div>
              <div className="flex justify-between items-start mb-32">
                <div>
                  <h1 className="text-7xl font-black uppercase tracking-tighter">Manual de <br /> Liderança</h1>
                  <p className="text-xl font-bold uppercase tracking-[0.4em] text-primary mt-4">Gestão Estratégica & Business Intelligence</p>
                </div>
                <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-[#0c0c0c] font-black text-5xl">BN</div>
              </div>
              <div className="max-w-3xl">
                <h2 className="text-5xl font-black uppercase leading-[0.9] mb-12">Assuma o Controle Total da sua Operação</h2>
                <p className="text-2xl text-gray-400 leading-relaxed">
                  Como líder, seu papel é transformar os dados gerados pelo sistema em decisões estratégicas. O Brigade Noir é o seu painel de comando para garantir lucratividade e excelência.
                </p>
              </div>
            </div>
            <div className="pb-16 border-t border-white/10 pt-16">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Nível de Acesso</p>
              <p className="text-2xl font-bold uppercase">Executivo / Administrativo</p>
            </div>
          </div>

          {/* Financial Intelligence Page */}
          <div className="py-24 border-b border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">01. Inteligência Financeira & CMV</h3>
            <p className="text-2xl text-gray-400 mb-16 leading-relaxed">
              O Custo de Mercadoria Vendida (CMV) é o indicador mais sensível da sua cozinha. No Brigade Noir, ele é calculado sobre o consumo efetivo.
            </p>
            <div className="grid grid-cols-2 gap-12">
              <div className="p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <h4 className="text-white font-black text-xl uppercase mb-6 flex items-center gap-3">
                  <BarChart className="text-primary" /> Auditoria de Custos
                </h4>
                <p className="text-gray-500 text-base leading-relaxed mb-8">
                  Revise semanalmente o relatório de <strong>Inteligência & CMV</strong>. Procure por desvios entre o CMV Teórico (o que deveria ter sido gasto) e o CMV Real (o que foi consumido).
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-gray-500">Desvio Aceitável</span>
                    <span className="font-bold text-green-400">&lt; 2%</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-gray-500">Ação Requerida</span>
                    <span className="font-bold text-yellow-400">2% - 5%</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-gray-500">Crítico (Investigar)</span>
                    <span className="font-bold text-red-400">&gt; 5%</span>
                  </div>
                </div>
              </div>
              <div className="p-12 bg-white/5 rounded-[3rem] border border-white/10">
                <h4 className="text-white font-black text-xl uppercase mb-6 flex items-center gap-3">
                  <PieChart className="text-secondary" /> Matriz ABC de Insumos
                </h4>
                <p className="text-gray-500 text-base leading-relaxed">
                  Identifique os itens "Curva A" — aqueles que representam 80% do seu custo total. Concentre sua energia de auditoria nesses insumos. Uma redução de 3% no custo de um item Curva A impacta mais o lucro do que 20% em um item Curva C.
                </p>
              </div>
            </div>
          </div>

          {/* Menu Engineering Page */}
          <div className="py-24 border-b border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">02. Engenharia de Cardápio & Yield</h3>
            <div className="space-y-16">
              <div className="grid grid-cols-3 gap-8">
                <div className="p-8 border border-white/10 rounded-[2.5rem] text-center">
                  <div className="text-primary font-black text-4xl mb-2">Yield</div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Testes de Rendimento</p>
                </div>
                <div className="p-8 border border-white/10 rounded-[2.5rem] text-center">
                  <div className="text-white font-black text-4xl mb-2">FC</div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Fator de Correção</p>
                </div>
                <div className="p-8 border border-white/10 rounded-[2.5rem] text-center">
                  <div className="text-secondary font-black text-4xl mb-2">IC</div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Índice de Cocção</p>
                </div>
              </div>
              <div className="max-w-2xl">
                <h4 className="text-xl font-bold uppercase text-white mb-6">Manutenção das Fichas Técnicas</h4>
                <p className="text-gray-400 leading-relaxed">
                  O módulo <strong>Ficha Técnica</strong> é o coração do sistema. Como líder, você deve garantir que cada teste de rendimento feito pela brigada seja auditado. Se um fornecedor de salmão entrega peixes com maior perda de limpeza, o sistema mostrará o aumento no custo da porção, sinalizando que a troca de fornecedor pode ser necessária.
                </p>
              </div>
            </div>
          </div>

          {/* People & Management Page */}
          <div className="py-24 border-b border-white/10">
            <h3 className="text-4xl font-black uppercase text-primary mb-16">03. Gestão de Alta Performance</h3>
            <div className="grid grid-cols-2 gap-16">
              <div>
                <h4 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-3">
                  <Users className="text-primary" /> Otimização da Brigada
                </h4>
                <p className="text-gray-500 leading-relaxed mb-8">
                  Use o módulo <strong>Gestão da Brigada</strong> para monitorar a produtividade. Identifique quem são seus melhores preparadores e os aloque em praças críticas durante horários de pico.
                </p>
                <div className="p-10 bg-primary/10 border border-primary/20 rounded-[3rem]">
                  <h5 className="font-bold uppercase text-sm mb-4">Escala Mensal Inteligente</h5>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    A escala deve ser planejada com antecedência mínima de 15 dias. O Brigade Noir alerta sobre conflitos de horários e excesso de carga horária semanal.
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-3">
                  <Map className="text-secondary" /> Estratégia de Praça
                </h4>
                <p className="text-gray-500 leading-relaxed">
                  Audite os <strong>Checklists</strong> diariamente. Uma liderança presente não é aquela que faz o checklist, mas aquela que garante que ele seja preenchido com verdade. Utilize o dashboard para ver o horário de preenchimento e fotos enviadas pela brigada.
                </p>
              </div>
            </div>
          </div>

          {/* Vision Page */}
          <div className="py-24">
            <div className="bg-white p-20 rounded-[4rem] text-[#0c0c0c] flex items-center gap-20">
              <div className="flex-1">
                <h4 className="text-5xl font-black uppercase tracking-tighter mb-8 leading-[0.9]">Transforme sua Cozinha em um Relógio Suíço.</h4>
                <p className="text-xl font-medium leading-relaxed">
                  O Brigade Noir não é apenas um software de gestão. É uma cultura de precisão, disciplina e foco no resultado financeiro. Sua liderança é o combustível para essa transformação.
                </p>
              </div>
              <div className="shrink-0 w-40 h-40 bg-[#0c0c0c] rounded-[2rem] flex items-center justify-center text-primary">
                <ShieldCheck size={100} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
