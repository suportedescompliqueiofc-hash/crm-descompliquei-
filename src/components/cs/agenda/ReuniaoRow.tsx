// Uma linha de reunião — usada tanto na lista de próximas quanto no histórico.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { STATUS_CLASSES, STATUS_LABEL, TIPO_ICON, TIPO_LABEL } from './reuniaoMeta';
import type { CSReuniao } from '@/hooks/cs';

interface ReuniaoRowProps {
  reuniao: CSReuniao;
  clienteNome: string | null;
  onClick: () => void;
}

export function ReuniaoRow({ reuniao, clienteNome, onClick }: ReuniaoRowProps) {
  const Icon = TIPO_ICON[reuniao.tipo];
  const data = new Date(reuniao.data_hora);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors text-left"
    >
      <span className="p-2 rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate">
          {reuniao.organization_id ? clienteNome ?? 'Cliente' : 'Sessão Tática (Grupo)'}
        </p>
        <p className="text-[11px] text-muted-foreground/60 font-display tabular-nums">
          {format(data, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border/40">
          {TIPO_LABEL[reuniao.tipo]}
        </span>
        <span
          className={cn(
            'inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border',
            STATUS_CLASSES[reuniao.status],
          )}
        >
          {STATUS_LABEL[reuniao.status]}
        </span>
      </div>
    </button>
  );
}
