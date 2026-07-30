// PLACEHOLDER — rota "/" do app de CS.
// Esqueleto mínimo seguindo a "receita de página nova" do design system
// (05-operacoes-e-cs/sistema/design-system-plataforma.md §6). Conteúdo real
// (lista da carteira PCA, puxada via get_cs_clients / get_cs_crm_metrics) é
// de outro agente — ver src/hooks/cs/.
import { Briefcase, Loader2, Inbox } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatInt } from '@/lib/format';

export default function Carteira() {
  const isLoading = false;
  const dados = { total: 0, atencao: 0, emDia: 0 };
  const lista: any[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-carteira-header"
        icon={Briefcase}
        title="Carteira"
        titleAccent="PCA"
        subtitle="Os 7 clientes PCA, o elo-restrição de cada um e por onde começar hoje."
      />

      <StatCardGrid cols={3}>
        <StatCard label="Clientes" value={isLoading ? '—' : formatInt(dados.total)} />
        <StatCard label="Em atenção" value={isLoading ? '—' : formatInt(dados.atencao)} />
        <StatCard label="Em dia" value={isLoading ? '—' : formatInt(dados.emDia)} />
      </StatCardGrid>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">CLIENTES PCA</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Ordenados por prioridade de ação</p>
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
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que a carteira for carregada, ela aparece aqui.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
