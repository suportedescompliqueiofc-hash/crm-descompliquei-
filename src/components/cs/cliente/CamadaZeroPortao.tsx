// Camada 0 — Adoção — o PORTÃO do diagnóstico (05-operacoes-e-cs/sistema/01-a-cadeia.md
// e 02-diagnostico.md, passo 1). Não é um card de checklist qualquer: enquanto a
// Camada 0 não passa, o diagnóstico dos 8 elos abaixo NÃO é confiável — e esta tela
// precisa dizer isso de forma inequívoca, com peso visual real, antes de qualquer
// número de elo.
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Wifi,
  Bot,
  BellRing,
  CalendarCheck2,
  ShoppingBag,
  Target,
  Repeat,
  HelpCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClienteAdocaoItem } from '@/hooks/cs';

function iconeParaItem(item: string): LucideIcon {
  const s = item.toLowerCase();
  if (s.includes('whatsapp')) return Wifi;
  if (s.includes('ia') || s.includes('recep')) return Bot;
  if (s.includes('follow')) return Repeat;
  if (s.includes('confirma') || s.includes('lembrete')) return BellRing;
  if (s.includes('agendamento') || s.includes('consulta') || s.includes('desfecho')) return CalendarCheck2;
  if (s.includes('venda')) return ShoppingBag;
  if (s.includes('meta')) return Target;
  return HelpCircle;
}

interface CamadaZeroPortaoProps {
  items: ClienteAdocaoItem[];
  isLoading: boolean;
  /** Veredito autoritativo vindo de `cs_carteira.camada_0_ok`. `null` = ainda sem dado. */
  passa: boolean | null;
}

export function CamadaZeroPortao({ items, isLoading, passa }: CamadaZeroPortaoProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-center py-14">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const itensDesligados = items.filter((i) => !i.ligado);

  return (
    <div
      className={cn(
        'rounded-2xl border-2 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        passa === false && 'border-red-300 bg-red-50/60',
        passa === true && 'border-emerald-200/70 bg-card',
        passa === null && 'border-border/60 bg-card',
      )}
    >
      {/* ─── Faixa de veredito — o "portão" propriamente dito ─── */}
      <div
        className={cn(
          'px-6 py-5 flex items-start gap-4',
          passa === false && 'bg-red-100/70 border-b border-red-200',
          passa === true && 'bg-emerald-50/60 border-b border-emerald-200/50',
          passa === null && 'bg-muted/[0.03] border-b border-border/40',
        )}
      >
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            passa === false && 'bg-red-600 text-white',
            passa === true && 'bg-emerald-100 text-emerald-700',
            passa === null && 'bg-muted text-muted-foreground',
          )}
        >
          {passa === false ? (
            <ShieldAlert className="h-6 w-6" />
          ) : passa === true ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              'text-[11px] font-bold uppercase tracking-widest',
              passa === false && 'text-red-700',
              passa === true && 'text-emerald-700',
              passa === null && 'text-muted-foreground',
            )}
          >
            Camada 0 — Adoção da plataforma
          </p>
          <h2
            className={cn(
              'font-display font-bold mt-1 leading-snug',
              passa === false ? 'text-lg sm:text-xl text-red-800' : 'text-base text-foreground',
            )}
          >
            {passa === false
              ? 'A Camada 0 não passou — o diagnóstico dos elos abaixo NÃO é confiável'
              : passa === true
                ? 'Camada 0 aprovada — diagnóstico dos elos abaixo é confiável'
                : 'Sem dado suficiente para avaliar a Camada 0'}
          </h2>
          <p
            className={cn(
              'text-[12px] mt-1 max-w-2xl leading-relaxed',
              passa === false ? 'text-red-700/90' : 'text-muted-foreground',
            )}
          >
            {passa === false
              ? `A base que sustenta o cálculo dos elos pode estar incompleta por falta de uso da plataforma, não por resultado real da clínica. ${itensDesligados.length} ${itensDesligados.length === 1 ? 'item está' : 'itens estão'} desligado${itensDesligados.length === 1 ? '' : 's'} abaixo — enquanto isso não for corrigido, tratar a Camada 0 como o trabalho do mês, não calcular elo-restrição sobre dado que não existe.`
              : passa === true
                ? 'A clínica está configurada e registrando o que faz na plataforma — as taxas dos 8 elos abaixo refletem a realidade do negócio.'
                : 'Não foi possível carregar o checklist de adoção deste cliente.'}
          </p>
        </div>
      </div>

      {/* ─── Checklist item a item, com evidência ─── */}
      <div className="p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <HelpCircle className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Checklist de adoção não disponível</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">O hook não retornou itens para este cliente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {items.map((item) => {
              const Icon = iconeParaItem(item.item);
              return (
                <div
                  key={item.item}
                  className={cn(
                    'flex items-start gap-2.5 px-3.5 py-3 rounded-xl border',
                    item.ligado ? 'border-emerald-200/60 bg-emerald-50/40' : 'border-red-200/60 bg-red-50/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md mt-0.5',
                      item.ligado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-[12px] font-semibold leading-tight', item.ligado ? 'text-foreground' : 'text-red-800')}>
                        {item.item}
                      </p>
                      {item.ligado ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {item.evidencia ?? (item.ligado ? 'Ligado' : 'Desligado')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
