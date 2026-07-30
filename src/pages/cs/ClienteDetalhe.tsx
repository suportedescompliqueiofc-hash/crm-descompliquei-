// PLACEHOLDER — rota "/cliente/:orgId" do app de CS.
// Esqueleto mínimo (PageHero + estado vazio canônico). Conteúdo real (série
// histórica, cadeia dos 5 elos, aderência do plano — via get_cs_client_crm_detail
// / get_cs_client_crm_trend / get_cs_client_crm_period) é de outro agente.
import { useParams } from 'react-router-dom';
import { Stethoscope, Inbox } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export default function ClienteDetalhe() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-cliente-header"
        icon={Stethoscope}
        title="Cliente"
        subtitle={`Mesa de trabalho do cliente (org ${orgId ?? '—'}).`}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">CADEIA E CONTINUIDADE</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Os 5 elos, o elo-restrição e a continuidade do cliente</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nada por aqui ainda</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que os dados do cliente forem carregados, eles aparecem aqui.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
