// Rótulos e datas de reunião — compartilhado entre os componentes da
// Agenda. Redesign 2026-07-30: sem ícone por tipo, sem badge "trio" colorido
// por status — os componentes que consomem isto usam só texto.
import type { StatusReuniao, TipoReuniao } from '@/hooks/cs';

export const TIPO_LABEL: Record<TipoReuniao, string> = {
  kickoff: 'Kickoff',
  semanal: 'Semanal',
  mensal: 'Mensal',
  sob_demanda: 'Sob demanda',
  tatica_grupo: 'Tática em grupo',
};

export const STATUS_LABEL: Record<StatusReuniao, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Próxima segunda-feira às 8h — cadência fixa da sessão tática em grupo
 * (05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md). */
export function proximaSegundaAs8h(): string {
  const d = new Date();
  const diasAteSegunda = (8 - d.getDay()) % 7 || 7; // getDay(): 0=Dom..6=Sáb
  d.setDate(d.getDate() + diasAteSegunda);
  d.setHours(8, 0, 0, 0);
  return toLocalInputValue(d);
}
