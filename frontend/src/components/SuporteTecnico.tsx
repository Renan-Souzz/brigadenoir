import React from 'react';
import * as Icons from 'lucide-react';
import PageLayout from './shared/PageLayout';
import PageHeader from './shared/PageHeader';

export default function SuporteTecnico() {
  return (
    <PageLayout>
      <PageHeader />
      
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="max-w-2xl w-full">
          <div className="bg-surface-container-low/40 backdrop-blur-2xl border border-outline-variant/10 rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] -ml-32 -mb-32" />

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-container rounded-3xl mb-10 shadow-xl border border-outline-variant/10">
                <Icons.Wrench size={40} className="text-primary animate-pulse" />
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-on-surface tracking-tighter uppercase mb-8 leading-tight">
                🚧 Bem-vindo à <br/> <span className="text-primary italic">Versão Beta</span>! 🚧
              </h2>

              <div className="space-y-6 text-on-surface-variant font-medium leading-relaxed">
                <p className="text-lg">
                  Se você está vendo isso… parabéns 😄 <br/>
                  Você faz parte do grupo seleto (e corajoso) que está usando o sistema antes de todo mundo — basicamente um testador de elite.
                </p>

                <p className="bg-surface-container-highest/30 p-6 rounded-2xl border border-outline-variant/5 text-sm italic">
                  "Aqui entre nós: pode ser que você encontre um bug, um comportamento estranho ou algo que claramente “não era pra acontecer” 👀 Se isso rolar, não se assuste — só me avisa!"
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <a 
                    href="https://wa.me/5521969490459" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 p-5 rounded-2xl transition-all group/item"
                  >
                    <Icons.MessageCircle size={24} className="text-[#25D366]" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black tracking-widest text-outline-variant">WhatsApp</p>
                      <p className="text-sm font-black text-on-surface">(21) 96949-0459</p>
                    </div>
                  </a>

                  <a 
                    href="mailto:renan.souzz.dev@gmail.com"
                    className="flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 p-5 rounded-2xl transition-all group/item"
                  >
                    <Icons.Mail size={24} className="text-primary" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black tracking-widest text-outline-variant">E-mail</p>
                      <p className="text-sm font-black text-on-surface truncate">renan.souzz.dev@...</p>
                    </div>
                  </a>
                </div>

                <div className="pt-8 space-y-4">
                  <p className="text-sm">
                    Sua ajuda é essencial pra deixar tudo redondinho. <br/>
                    E olha… quando isso aqui estiver gigante, você vai poder dizer:
                  </p>
                  <p className="text-2xl font-black text-on-surface italic tracking-tighter uppercase">
                    “eu usei antes de ficar famoso” 😎
                  </p>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-outline-variant/10">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-outline-variant">
                  Valeu por estar junto nessa!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
