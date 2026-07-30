// Rótulos, ícones e cores (trio: fundo pastel + texto escuro + borda) para
// tipo/status de reunião — compartilhado entre os componentes da Agenda.
import { CalendarCheck2, CalendarClock, Handshake, RefreshCcw, Users2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StatusReuniao, TipoReuniao } from '@/hooks/cs';

export const TIPO_LABEL: Record<TipoReuniao, string> = {
  kickoff: 'Kickoff',
  semanal: 'Semanal',
  mensal: 'Mensal',
  sob_demanda: 'Sob Demanda',
  tatica_grupo: 'Tática em Grupo',
};

export const TIPO_ICON: Record<TipoReuniao, LucideIcon> = {
  kickoff: Handshake,
  semanal: RefreshCcw,
  mensal: CalendarCheck2,
  sob_demanda: CalendarClock,
  tatica_grupo: Users2,
};

export const STATUS_LABEL: Record<StatusReuniao, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

export const STATUS_CLASSES: Record<StatusReuniao, string> = {
  agendada: 'bg-blue-50 text-blue-700 border-blue-200/60',
  realizada: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  cancelada: 'bg-muted/50 text-muted-foreground border-border/40',
};

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Próxima segunda-feira às 8h — cadência fixa da sessão tática em grupo
 * (05-operacoes-e-cs/sistema/ritos/05-sessao-tatica-grupo.md). */
export function proximaSegundaAs8h(): string {
  const d = new Date();
  const diasAteSegunda = (8 - d.getDay()) % 7 || 7; // getDay(): 0=Dom..6=Sáb
  d.setDate(d.getDate() + diasAteSegunda);
  d.setHours(8, 0, 0, 0);
  return toLocalInputValue(d);
}
