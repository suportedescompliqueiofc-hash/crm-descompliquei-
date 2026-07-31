// O que foi prometido na venda — segunda peça do dossiê, logo depois de
// "quem é o cliente". Hoje `promessa_venda` está vazio nos 7 clientes (ver
// 05-operacoes-e-cs/CLAUDE.md, pendência b) — a tela precisa mostrar isso
// como lacuna explícita e importante, não esconder um campo vazio.
//
// Redesign 2026-07-31 (rodada "Console"): bloco da coluna lateral (sticky).
// A ausência de promessa vira `<EmptyState>` (a regra "vazio aparece
// dizendo que está vazio" vale aqui tanto quanto numa lista) em vez de um
// parágrafo indistinguível de texto normal. Os fatos soltos (quem atende,
// quem vende, equipe, modelo) que antes eram uma frase com "·" viram linhas
// `<KeyValue>` — mais fácil de escanear um por um.
import type { ClienteContexto } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, KeyValue, LoadingState, EmptyState } from '@/components/cs/ui';

interface ContextoNegocioProps {
  contexto: ClienteContexto | null | undefined;
  isLoading: boolean;
}

export function ContextoNegocio({ contexto, isLoading }: ContextoNegocioProps) {
  return (
    <Panel>
      <PanelHeader title="O que foi prometido na venda" />
      <PanelBody>
        {isLoading ? (
          <LoadingState rows={2} label="Carregando…" />
        ) : (
          <>
            {contexto?.promessa_venda ? (
              <p className="text-sm text-foreground leading-relaxed">{contexto.promessa_venda}</p>
            ) : (
              <EmptyState
                title="Nenhuma promessa de venda registrada"
                description="Sem isso não dá pra checar se o que estamos entregando bate com o que foi vendido — lacuna real do processo, não da tela."
              />
            )}

            {(contexto?.quem_atende || contexto?.quem_vende || contexto?.tem_equipe || contexto?.convenio_particular) && (
              <div className="mt-3">
                {contexto?.quem_atende && <KeyValue label="Quem atende" value={contexto.quem_atende} />}
                {contexto?.quem_vende && <KeyValue label="Quem vende" value={contexto.quem_vende} />}
                {contexto?.tem_equipe && <KeyValue label="Equipe" value={contexto.tem_equipe} />}
                {contexto?.convenio_particular && <KeyValue label="Modelo" value={contexto.convenio_particular} />}
              </div>
            )}

            {contexto?.restricoes_conhecidas && (
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">
                Restrições conhecidas: {contexto.restricoes_conhecidas}
              </p>
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
