// Bloco 7 da Ficha (arquitetura-app-cs.md, seção B.7) — "Próxima reunião".
// Quando a próxima é a mensal de fechamento, mostra a checklist de
// prontidão que hoje só existe na cabeça do João (o manual proíbe uma
// reunião mensal despreparada — ritos/04-reuniao-mensal.md) — número
// pronto, aderência pronta, plano do mês seguinte pronto, material pronto.
//
// Dois dos quatro itens NÃO são computáveis com os hooks disponíveis hoje —
// declarado explicitamente, não simulado:
// - "Plano do mês seguinte pronto" exigiria saber se existe uma jornada
//   `rascunho` de tipo mensal para o próximo período. Nenhum hook exposto em
//   `src/hooks/cs` devolve isso — `usePlanoConteudo`/`cs_plano_conteudo` só
//   enxerga jornadas `ativa`/`concluida` (confirmado ao vivo em 2026-07-31,
//   pg_get_functiondef da função). Reportado como gap.
// - "Material pronto para o elo do próximo plano" não dá pra calcular de
//   verdade porque o elo do próximo plano só é decidido no fechamento
//   mensal seguinte — aqui é usada uma aproximação deliberada (material
//   ENTREGUE para o elo-restrição ATUAL), declarada na própria tela.
//
// Redesign 2026-07-31 (rodada "Console"): bloco da coluna lateral (sticky).
// A checklist de prontidão reaproveita o mesmo `<Checkline>` da Camada 0 (A
// cadeia, bloco 2) em vez de um checkbox HTML cru — mesma forma mínima para
// todo estado binário verificável no sistema inteiro.
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMateriaisCliente, useReunioes } from '@/hooks/cs';
import type { Aderencia, ClienteCarteira, EloMaterial } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, Checkline, Action, LoadingState, EmptyState } from '@/components/cs/ui';
import { NovaReuniaoDialog } from '@/components/cs/agenda/NovaReuniaoDialog';
import { TIPO_LABEL } from '@/components/cs/agenda/reuniaoMeta';

const ELOS_MATERIAL_VALIDOS: EloMaterial[] = [
  'Adoção (Camada 0)',
  'Demanda',
  'Agendamento',
  'Resgate de Lead Frio',
  'Comparecimento',
  'Fechamento',
  'Ticket',
  'Ciclo de Venda',
  'Recompra',
];

interface ItemProntidao {
  label: string;
  estado: 'ok' | 'pendente' | 'indisponivel';
  nota?: string;
}

/** `estado` (3 valores, vocabulário do domínio) → `checked` do `<Checkline>`
 * (`true`/`false`/`null`) — indisponível vira `null` ("ainda não se sabe"),
 * nunca uma cor de risco própria. */
function estadoParaChecked(estado: ItemProntidao['estado']): boolean | null {
  if (estado === 'ok') return true;
  if (estado === 'pendente') return false;
  return null;
}

interface ProximaReuniaoProps {
  orgId: string;
  clientes: ClienteCarteira[];
  aderencia: Aderencia | undefined;
  aderenciaLoading: boolean;
  eloAtual: string | null;
}

export function ProximaReuniao({ orgId, clientes, aderencia, aderenciaLoading, eloAtual }: ProximaReuniaoProps) {
  const { data: reunioes = [], isLoading: reunioesLoading } = useReunioes({ organizationId: orgId });
  const { data: materiais = [], isLoading: materiaisLoading } = useMateriaisCliente(orgId);
  const [dialogAberto, setDialogAberto] = useState(false);

  const proxima = useMemo(() => {
    const agora = new Date();
    return reunioes
      .filter((r) => r.status === 'agendada' && new Date(r.data_hora) >= agora)
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0];
  }, [reunioes]);

  const isLoading = reunioesLoading || materiaisLoading;
  const ehMensal = proxima?.tipo === 'mensal';

  const eloValido = ELOS_MATERIAL_VALIDOS.includes(eloAtual as EloMaterial) ? (eloAtual as EloMaterial) : null;
  const materialEntregueParaElo = eloValido
    ? materiais.some((m) => m.elo === eloValido && m.status === 'entregue')
    : false;

  const itens: ItemProntidao[] = ehMensal
    ? [
        { label: 'Número do mês pronto', estado: aderenciaLoading ? 'indisponivel' : 'ok', nota: 'ao vivo, sempre disponível' },
        {
          label: 'Aderência pronta',
          estado: aderenciaLoading || !aderencia ? 'indisponivel' : 'ok',
          nota: aderencia ? undefined : 'sem plano no mês corrente para medir',
        },
        {
          label: 'Plano do mês seguinte pronto',
          estado: 'indisponivel',
          nota: 'não verificável com os hooks de hoje — nenhum expõe jornada em rascunho (gap relatado)',
        },
        {
          label: 'Material pronto',
          estado: eloValido ? (materialEntregueParaElo ? 'ok' : 'pendente') : 'indisponivel',
          nota: eloValido
            ? `aproximação: material entregue para o elo atual (${eloValido})`
            : 'sem elo-restrição válido para checar',
        },
      ]
    : [];

  return (
    <Panel>
      <PanelHeader
        title="Próxima reunião"
        action={
          <Action size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
            Agendar
          </Action>
        }
      />
      <PanelBody>
        {isLoading ? (
          <LoadingState label="Carregando…" />
        ) : !proxima ? (
          <EmptyState title="Nenhuma reunião marcada" description="Agende a próxima reunião com este cliente." />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              {TIPO_LABEL[proxima.tipo]} —{' '}
              <span className="font-display tabular-nums">
                {format(new Date(proxima.data_hora), "d 'de' MMMM", { locale: ptBR })}
              </span>
              , <span className="font-display tabular-nums">{format(new Date(proxima.data_hora), 'HH:mm')}</span>.
            </p>

            {ehMensal && (
              <div>
                {itens.map((item) => (
                  <Checkline
                    key={item.label}
                    checked={estadoParaChecked(item.estado)}
                    label={
                      item.nota ? (
                        <>
                          {item.label} <span className="text-muted-foreground font-normal">— {item.nota}</span>
                        </>
                      ) : (
                        item.label
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </PanelBody>

      <NovaReuniaoDialog open={dialogAberto} onOpenChange={setDialogAberto} clientes={clientes} defaultOrgId={orgId} />
    </Panel>
  );
}
