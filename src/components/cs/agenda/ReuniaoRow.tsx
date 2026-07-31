// Uma linha de reunião, em frase — redesign 2026-07-30: sem ícone por tipo,
// sem badge colorido de status. "Cliente — tipo, quando, status" corrido.
// Reuniões mensais ainda agendadas ganham uma segunda linha discreta de
// prontidão para o fechamento (ProntidaoMensal — arquitetura-app-cs.md,
// seção D "Agenda").
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABEL, TIPO_LABEL } from './reuniaoMeta';
import { ProntidaoMensal } from './ProntidaoMensal';
import type { CSReuniao } from '@/hooks/cs';
import { ListRow } from '@/components/cs/ui';

interface ReuniaoRowProps {
  reuniao: CSReuniao;
  clienteNome: string | null;
  onClick: () => void;
}

export function ReuniaoRow({ reuniao, clienteNome, onClick }: ReuniaoRowProps) {
  const data = new Date(reuniao.data_hora);
  const mostrarProntidao = reuniao.tipo === 'mensal' && reuniao.status === 'agendada' && !!reuniao.organization_id;

  return (
    <ListRow onClick={onClick}>
      <p className="text-sm text-foreground">
        <span className="font-medium">
          {reuniao.organization_id ? clienteNome ?? 'Cliente' : 'Sessão Tática (grupo inteiro)'}
        </span>{' '}
        — {TIPO_LABEL[reuniao.tipo].toLowerCase()},{' '}
        <span className="font-display tabular-nums">
          {format(data, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </span>
        . {STATUS_LABEL[reuniao.status]}.
      </p>
      {mostrarProntidao && <ProntidaoMensal organizationId={reuniao.organization_id as string} dataHora={reuniao.data_hora} />}
    </ListRow>
  );
}
