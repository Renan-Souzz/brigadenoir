import React from 'react';
import { 
  Star, 
  Clock, 
  Utensils, 
  Printer, 
  Share2, 
  PlayCircle,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from './shared/PageLayout';
import Button from './shared/Button';

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecipeCard({ title, refId, time, pax, active, starred }: any) {
  return (
    <div className={`group cursor-pointer bg-surface-container hover:bg-surface-container-high transition-all duration-300 rounded-xl p-5 border-l-4 ${active ? 'border-primary' : 'border-transparent'}`}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-lg font-bold text-on-surface leading-tight">
          {title} <br />
          <span className="text-xs font-normal text-outline">{refId}</span>
        </h4>
        {starred && <Star size={18} className="text-primary fill-primary" />}
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1 text-on-surface-variant">
          <Clock size={14} />
          <span className="text-[10px] font-bold tracking-tighter uppercase">{time}</span>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant">
          <Utensils size={14} />
          <span className="text-[10px] font-bold tracking-tighter uppercase">{pax}</span>
        </div>
      </div>
    </div>
  );
}

function IngredientItem({ name, qty }: any) {
  return (
    <li className="flex justify-between items-end border-b border-outline-variant/10 pb-1">
      <span className="text-sm font-semibold text-on-surface">{name}</span>
      <span className="text-[10px] font-bold text-outline">{qty}</span>
    </li>
  );
}

function PrepStep({ step, title, desc }: any) {
  return (
    <div className="flex gap-6">
      <span className="text-4xl font-black text-primary-container leading-none">{step}</span>
      <div>
        <h6 className="text-sm font-bold text-on-surface mb-2">{title}</h6>
        <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModoDePreparo() {
  const { profile } = useAuth();
  const stationName = profile?.station ? profile.station.charAt(0).toUpperCase() + profile.station.slice(1) : 'Geral';

  return (
    <PageLayout>
      <header className="flex justify-between items-center mb-12 w-full">
        <div>
          <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-secondary mb-2 block font-bold">ATELIÊ DE PRODUÇÃO</span>
          <h2 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter -ml-1 uppercase">Modo de Preparo</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className="text-sm font-semibold text-on-surface">{profile?.full_name || 'Chef'}</p>
            <p className="text-[10px] text-outline uppercase tracking-widest">Praça {stationName}</p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-primary-container bg-surface-container-highest flex items-center justify-center text-primary">
            <Utensils size={24} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recipe Selector */}
        <section className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-outline-variant uppercase tracking-widest">Ordens de Serviço</h3>
            <span className="bg-primary-container text-primary text-[10px] px-2 py-1 rounded-full font-bold">04 NOVAS</span>
          </div>
          <div className="space-y-4">
            <RecipeCard 
              title="Canard à l'Orange" 
              refId="#MP-882" 
              time="45 MIN" 
              pax="04 PAX" 
              active 
              starred 
            />
            <RecipeCard 
              title="Risotto de Trufas" 
              refId="#MP-910" 
              time="25 MIN" 
              pax="02 PAX" 
            />
            <RecipeCard 
              title="Soufflé au Chocolat" 
              refId="#MP-745" 
              time="35 MIN" 
              pax="06 PAX" 
            />
          </div>
        </section>

        {/* Right: Detailed View */}
        <section className="lg:col-span-8 bg-surface-container-high rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/10">
          <div className="p-8 md:p-12">
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">PRAÇA: {stationName.toUpperCase()}</span>
              </div>
              <h3 className="text-5xl font-black tracking-tighter text-on-surface uppercase">Canard à l'Orange</h3>
              <p className="text-outline-variant uppercase tracking-[0.3em] text-[10px] font-bold mt-2">Especificação Técnica de Prato</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="md:col-span-1">
                <h5 className="text-[0.6875rem] font-black text-secondary uppercase tracking-[0.2em] mb-6">Mise en Place</h5>
                <ul className="space-y-4">
                  <IngredientItem name="Peito de Pato" qty="2 UNID." />
                  <IngredientItem name="Laranjas Bahia" qty="4 UNID." />
                  <IngredientItem name="Licor Grand Marnier" qty="50 ML" />
                  <IngredientItem name="Caldo de Pato" qty="200 ML" />
                  <IngredientItem name="Mel de Acácia" qty="30 G" />
                </ul>
              </div>

              <div className="md:col-span-2 space-y-10">
                <h5 className="text-[0.6875rem] font-black text-secondary uppercase tracking-[0.2em]">Procedimentos de Caldeira</h5>
                <PrepStep step="01" title="Preparação da Proteína" desc="Incise a gordura do peito de pato em losangos, sem atingir a carne. Tempere com sal e pimenta-do-reino moída na hora." />
                <PrepStep step="02" title="Selagem & Cocção" desc="Inicie a selagem em frigideira fria, com a gordura para baixo. Aumente o fogo gradualmente para extrair a gordura até que fique crocante e dourada." />
                <PrepStep step="03" title="Deglaçagem & Molho" desc="Retire o excesso de gordura, adicione o mel e deglace com o Grand Marnier. Adicione o suco de laranja e reduza à metade antes de incorporar o caldo de pato." />

                <div className="bg-surface-container p-6 rounded-2xl border-l-4 border-secondary">
                  <div className="flex items-center gap-3 mb-2 text-secondary">
                    <Lightbulb size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dica do Chef</span>
                  </div>
                  <p className="text-sm italic text-on-surface-variant leading-relaxed">
                    "O descanso da carne é mandatório por 5 minutos antes do fatiamento para garantir a suculência e o ponto rosé perfeito."
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex gap-4">
                <Button variant="outline" size="md" icon={<Printer size={16} />}>
                  Imprimir
                </Button>
                <Button variant="outline" size="md" icon={<Share2 size={16} />}>
                  Exportar
                </Button>
              </div>
              <Button variant="secondary" size="lg" icon={<PlayCircle size={18} />}>
                Iniciar Produção
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
