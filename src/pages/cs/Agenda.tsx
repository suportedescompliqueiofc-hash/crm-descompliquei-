// PLACEHOLDER — rota "/agenda" do app de CS.
// Esqueleto mínimo seguindo a "receita de página nova" do design system.
// Conteúdo real (agenda dos ritos de CS — onboarding, fechamentos mensais,
// fim de ciclo) é de outro agente.
import { CalendarDays, Loader2, Inbox } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export default function Agenda() {
  const isLoading = false;
  const lista: any[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-agenda-header"
        icon={CalendarDays}
        title="Agenda"
        subtitle="Os ritos de CS agendados — onboardings, fechamentos mensais, fim de ciclo."
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">PRÓXIMOS RITOS</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Ordenados por data</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-xl bg-muted/40 mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nada por aqui ainda</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que houver ritos agendados, eles aparecem aqui.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
