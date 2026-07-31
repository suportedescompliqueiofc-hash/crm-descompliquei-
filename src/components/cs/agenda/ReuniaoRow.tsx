// Uma linha de reunião — densa: hora e cliente/tipo no corpo, estado em
// Chip no trailing.
//
// Decisão de leiaute: a hora NÃO foi encaixada no `mark` do ListRow. A calha
// de 20px do `mark` é pensada para índice de fila/checkbox/ponto de status
// (ver ListRow.tsx) — um valor como "qua, 14/08 às 09:00" não cabe ali sem
// estourar a calha e desalinhar a coluna com as outras listas do console.
// Em vez disso, a hora abre o corpo da linha como <Metric size="sm"> numa
// coluna de largura fixa (120px): continua sendo o primeiro dado lido,
// escaneável verticalmente, sem quebrar a moldura do ListRow.
//
// Reuniões mensais ainda agendadas ganham uma segunda linha discreta de
// prontidão para o fechamento (ProntidaoMensal).
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABEL, TIPO_LABEL } from './reuniaoMeta';
import { ProntidaoMensal } from './ProntidaoMensal';
import type { CSReuniao, StatusReuniao } from '@/hooks/cs';
import { ListRow, Metric, Chip } from '@/components/cs/ui';

interface ReuniaoRowProps {
  reuniao: CSReuniao;
  clienteNome: string | null;
  onClick: () => void;
}

// Chip de estado: agendada usa tom "signal" (é o método em andamento — a
// reunião está no calendário); realizada/cancelada são só rótulo neutro,
// sem carga de "bom/ruim" (isso baniria o semáforo pela porta dos fundos).
const STATUS_CHIP_TONE: Record<StatusReuniao, 'neutral' | 'signal'> = {
  agendada: 'signal',
  realizada: 'neutral',
  cancelada: 'neutral',
};

export function ReuniaoRow({ reuniao, clienteNome, onClick }: ReuniaoRowProps) {
  const data = new Date(reuniao.data_hora);
  const mostrarProntidao = reuniao.tipo === 'mensal' && reuniao.status === 'agendada' && !!reuniao.organization_id;

  return (
    <ListRow
      onClick={onClick}
      trailing={<Chip tone={STATUS_CHIP_TONE[reuniao.status]}>{STATUS_LABEL[reuniao.status]}</Chip>}
    >
      <div className="flex items-start gap-4">
        <div className="w-[112px] shrink-0">
          <Metric size="sm" tone="muted" value={format(data, "dd/MM 'às' HH:mm")} />
          <p className="text-[10.5px] text-muted-foreground/55 capitalize mt-0.5">
            {format(data, 'EEEE', { locale: ptBR })}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-foreground">
            <span className="font-medium">
              {reuniao.organization_id ? clienteNome ?? 'Cliente' : 'Sessão Tática (grupo inteiro)'}
            </span>{' '}
            <span className="text-muted-foreground">— {TIPO_LABEL[reuniao.tipo].toLowerCase()}</span>
          </p>
          {mostrarProntidao && (
            <ProntidaoMensal organizationId={reuniao.organization_id as string} dataHora={reuniao.data_hora} />
          )}
        </div>
      </div>
    </ListRow>
  );
}
