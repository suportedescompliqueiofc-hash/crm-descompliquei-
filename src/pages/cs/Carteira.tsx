// Rota "/" do app de CS — a carteira PCA inteira, ordenada por risco.
// É a primeira tela que o João vê ao abrir o sistema: responde "com quem eu
// preciso me preocupar agora". Segue a "receita de página nova" do design
// system (05-operacoes-e-cs/sistema/design-system-plataforma.md §6).
//
// Fonte de dado: exclusivamente `useCarteira()` (src/hooks/cs/useCarteira.ts),
// que já chama a RPC `cs_carteira` e devolve a lista ordenada por `ordem_fila`
// (a régua de risco — 05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md).
import { useEffect, useMemo } from 'react';
import { Briefcase, Loader2, Inbox, Users, AlertTriangle, ShieldAlert, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { PageHero } from '@/components/PageHero';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatInt, formatPct } from '@/lib/format';
import { useCarteira } from '@/hooks/cs';
import { CarteiraListHeader } from '@/components/cs/carteira/CarteiraListHeader';
import { CarteiraRow } from '@/components/cs/carteira/CarteiraRow';

export default function Carteira() {
  const { data: carteira, isLoading, isError } = useCarteira();
  const lista = carteira ?? [];

  useEffect(() => {
    if (isError) {
      toast.error('Não foi possível carregar a carteira. Tente novamente em instantes.');
    }
  }, [isError]);

  const resumo = useMemo(() => {
    const total = lista.length;
    const criticos = lista.filter((c) => c.nivel_risco === 'critico').length;
    const semCamada0 = lista.filter((c) => !c.camada_0_ok).length;
    const comAderencia = lista.filter((c) => c.aderencia_pct != null);
    const aderenciaMedia =
      comAderencia.length > 0
        ? comAderencia.reduce((soma, c) => soma + (c.aderencia_pct ?? 0), 0) / comAderencia.length
        : null;
    return { total, criticos, semCamada0, aderenciaMedia };
  }, [lista]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-carteira-header"
        icon={Briefcase}
        title="Carteira"
        titleAccent="PCA"
        subtitle="Os clientes PCA, ordenados por risco — com quem eu preciso me preocupar agora."
      />

      <StatCardGrid cols={4}>
        <StatCard
          label="Clientes na carteira"
          value={isLoading ? '—' : formatInt(resumo.total)}
          icon={Users}
        />
        <StatCard
          label="Em crítico"
          value={isLoading ? '—' : formatInt(resumo.criticos)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Sem Camada 0"
          value={isLoading ? '—' : formatInt(resumo.semCamada0)}
          icon={ShieldAlert}
        />
        <StatCard
          label="Aderência média"
          value={isLoading || resumo.aderenciaMedia == null ? '—' : formatPct(resumo.aderenciaMedia, 0)}
          icon={Gauge}
        />
      </StatCardGrid>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">CLIENTES PCA</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Ordenados pela régua de risco — nível, depois desempate por relógio do contrato, contato, resultado e aderência
              </p>
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
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                Assim que a carteira for carregada, ela aparece aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <CarteiraListHeader />
              <div className="space-y-2">
                {lista.map((cliente) => (
                  <CarteiraRow key={cliente.organization_id} cliente={cliente} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
