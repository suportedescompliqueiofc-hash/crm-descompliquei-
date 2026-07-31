// Uma linha de reunião, em frase — redesign 2026-07-30: sem ícone por tipo,
// sem badge colorido de status. "Cliente — tipo, quando, status" corrido.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABEL, TIPO_LABEL } from './reuniaoMeta';
import type { CSReuniao } from '@/hooks/cs';
import { ListRow } from '@/components/cs/ui';

interface ReuniaoRowProps {
  reuniao: CSReuniao;
  clienteNome: string | null;
  onClick: () => void;
}

export function ReuniaoRow({ reuniao, clienteNome, onClick }: ReuniaoRowProps) {
  const data = new Date(reuniao.data_hora);

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
    </ListRow>
  );
}
