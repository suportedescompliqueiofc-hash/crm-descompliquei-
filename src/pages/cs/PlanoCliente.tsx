// PLACEHOLDER — rota "/plano/:orgId" do app de CS.
// Esqueleto mínimo (PageHero + estado vazio canônico). Conteúdo real (plano
// de 4 semanas do mês em curso, gerado pela skill /cs-mes e publicado em
// jornadas/jornada_estagios/jornada_passos) é de outro agente.
import { useParams } from 'react-router-dom';
import { ListChecks, Inbox } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export default function PlanoCliente() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-plano-header"
        icon={ListChecks}
        title="Plano do mês"
        subtitle={`Plano de 4 semanas em curso (org ${orgId ?? '—'}).`}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">PLANO EM CURSO</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Semanas, dono e critério de sucesso de cada passo</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nada por aqui ainda</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que o plano do mês for publicado, ele aparece aqui.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
