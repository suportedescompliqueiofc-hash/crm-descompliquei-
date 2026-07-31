// Bloco 6 da Ficha (arquitetura-app-cs.md, seção B.6, domínio novo
// especificado na seção E) — "Materiais". Domínio que não existia: o que foi
// produzido pelo Claude para este cliente, para qual elo, em qual canal,
// entregue ou não. Fonte: useMateriaisCliente() (RPC cs_materiais_cliente).
//
// Leitura, sem edição de conteúdo aqui — "o app de CS não é o lugar onde o
// material é escrito" (seção E). A única ação nesta tela é pedir material
// novo (`PedirMaterialDialog`), que fecha o loop com a tela Tarefas (bloco
// 4) e a tela Semana (filtro dono=Claude).
//
// Confirmado ao vivo em 2026-07-31: `cs_materiais` está 100% vazia hoje (0
// linhas na base inteira) — o estado vazio abaixo é o estado REAL para
// Derek Gonçalves, Jhonatan Dutra e Anna Clara (e para qualquer outro
// cliente), não um bug de carregamento.
//
// Redesign 2026-07-31 (rodada "Console"): cada material vira uma
// `<ListRow>` dentro de `<PanelRows>`, com o status como `<Chip>` à direita
// (petróleo só para "Entregue" — o método completou o ciclo; neutro para os
// demais estados, nunca laranja/vermelho de progresso).
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMateriaisCliente } from '@/hooks/cs';
import type { CSMaterial, EloMaterial } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, PanelRows, ListRow, Chip, Action, LoadingState, EmptyState } from '@/components/cs/ui';
import { PedirMaterialDialog } from './PedirMaterialDialog';

const TIPO_LABEL: Record<CSMaterial['tipo'], string> = {
  operacional: 'Operacional',
  estrategico: 'Estratégico',
};

const STATUS_LABEL: Record<CSMaterial['status'], string> = {
  solicitado: 'Solicitado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
};

const CANAL_LABEL: Record<CSMaterial['canal_entrega'], string> = {
  nenhuma: 'sem canal definido ainda',
  nota: 'Nota',
  html: 'HTML premium',
  ambos: 'Nota + HTML premium',
};

const FATIA_INICIAL = 5;

function dataEntrega(m: CSMaterial): string | null {
  const datas = [m.entregue_nota_em, m.entregue_html_em].filter((d): d is string => !!d);
  if (datas.length === 0) return null;
  const ordenadas = datas.sort();
  const maisRecente = ordenadas[ordenadas.length - 1];
  return format(new Date(maisRecente), "d 'de' MMM", { locale: ptBR });
}

interface MateriaisClienteProps {
  orgId: string;
  eloSugerido?: EloMaterial | null;
  jornadaIdAtual?: string | null;
}

export function MateriaisCliente({ orgId, eloSugerido, jornadaIdAtual }: MateriaisClienteProps) {
  const { data: materiais = [], isLoading } = useMateriaisCliente(orgId);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const visiveis = mostrarTodos ? materiais : materiais.slice(0, FATIA_INICIAL);

  return (
    <Panel>
      <PanelHeader
        title="Materiais"
        action={
          <>
            <Chip>{materiais.length}</Chip>
            <Action size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Pedir material
            </Action>
          </>
        }
      />
      <PanelBody flush={!isLoading && materiais.length > 0}>
        {isLoading ? (
          <LoadingState label="Carregando os materiais…" />
        ) : materiais.length === 0 ? (
          <EmptyState
            title="Nenhum material registrado ainda para este cliente"
            description="Pedir material aqui cria o registro e já entra na fila de produção do Claude (tela Semana, dono Claude)."
          />
        ) : (
          <>
            <PanelRows>
              {visiveis.map((m) => {
                const entrega = dataEntrega(m);
                return (
                  <ListRow
                    key={m.id}
                    trailing={<Chip tone={m.status === 'entregue' ? 'signal' : 'neutral'}>{STATUS_LABEL[m.status]}</Chip>}
                  >
                    <p className="text-sm text-foreground">{m.titulo}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {m.elo} · {TIPO_LABEL[m.tipo]} · {CANAL_LABEL[m.canal_entrega]}
                      {entrega && ` · entregue em ${entrega}`}
                    </p>
                  </ListRow>
                );
              })}
            </PanelRows>

            {!mostrarTodos && materiais.length > FATIA_INICIAL && (
              <div className="px-4 py-3 border-t border-border/70">
                <Action size="sm" variant="outline" onClick={() => setMostrarTodos(true)}>
                  Ver todos os materiais ({materiais.length})
                </Action>
              </div>
            )}
          </>
        )}
      </PanelBody>

      <PedirMaterialDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        organizationId={orgId}
        eloSugerido={eloSugerido}
        jornadaIdAtual={jornadaIdAtual}
      />
    </Panel>
  );
}
