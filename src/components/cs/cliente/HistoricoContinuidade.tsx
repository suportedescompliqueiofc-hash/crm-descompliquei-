// O histórico do cliente, em ordem cronológica — hoje não aparecia em lugar
// nenhum do app e era, segundo o CEO, a maior falta ("aqui não tem histórico
// de nada do cliente"). Terceira peça do dossiê, logo após o que foi
// prometido na venda. Fonte: useContinuidade() — nunca sobrescreve, só
// cresce (P3 do sistema).
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ContinuidadeItem } from '@/hooks/cs';
import { Section, EmptyState, LoadingState } from '@/components/cs/ui';
import { RegistrarContinuidadeDialog } from './RegistrarContinuidadeDialog';

const TIPO_LABEL: Record<string, string> = {
  conversa: 'Conversa',
  decisao: 'Decisão',
  entrega: 'Entrega',
  observacao: 'Observação',
  divergencia: 'Divergência',
  fechamento: 'Fechamento do mês',
};

interface HistoricoContinuidadeProps {
  organizationId: string;
  itens: ContinuidadeItem[];
  isLoading: boolean;
}

export function HistoricoContinuidade({ organizationId, itens, isLoading }: HistoricoContinuidadeProps) {
  const [dialogAberto, setDialogAberto] = useState(false);

  return (
    <Section
      title="Histórico"
      description="Tudo que já aconteceu com este cliente, mais recente primeiro."
    >
      <button
        type="button"
        onClick={() => setDialogAberto(true)}
        className="text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline mb-3"
      >
        Registrar conversa
      </button>

      {isLoading ? (
        <LoadingState label="Carregando o histórico…" />
      ) : itens.length === 0 ? (
        <EmptyState
          title="Nenhuma entrada registrada ainda"
          description="Toda conversa, decisão ou fato relevante deste cliente aparece aqui a partir de agora."
        />
      ) : (
        <div className="divide-y divide-border/40">
          {itens.map((item) => (
            <div key={item.id} className="py-3 first:pt-0">
              <p className="text-[12px] text-muted-foreground/70">
                {format(parseISO(item.data_evento), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {' · '}
                {TIPO_LABEL[item.tipo] ?? item.tipo}
                {item.combinado_com && ` · com ${item.combinado_com}`}
              </p>
              <p className="text-sm text-foreground leading-relaxed mt-0.5">{item.o_que_aconteceu}</p>
              {item.ficou_combinado && (
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                  Ficou combinado: {item.ficou_combinado}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <RegistrarContinuidadeDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        organizationId={organizationId}
      />
    </Section>
  );
}
