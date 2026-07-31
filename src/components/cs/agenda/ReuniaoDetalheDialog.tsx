// Detalhe de uma reunião — remarcar, cancelar, marcar como realizada, e
// salvar pauta/notas. Sem badge colorido de status/tipo (texto puro), sem
// vermelho no cancelamento (peso de fonte no lugar de cor — o vermelho do
// console é reservado a erro técnico, ver ErrorState). A nota da reunião
// pode virar uma entrada de continuidade do cliente — ao marcar como
// realizada com notas escritas, a entrada nasce automaticamente (linkada por
// `reuniaoId`); para reuniões já realizadas antes, um botão separado faz o
// mesmo a qualquer momento. Sessão tática em grupo (sem organization_id) não
// tem cliente único — a opção não aparece nesse caso.
//
// Alinhamento visual ao Console (2026-07-31): botões e links de ação viraram
// <Action> (ghost para navegação leve, outline para secundárias, solid para
// a ação principal do bloco, danger só para confirmar cancelamento de
// verdade) — lógica de mutação intacta.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useCancelarReuniao,
  useMarcarReuniaoRealizada,
  useRegistrarContinuidade,
  useRemarcarReuniao,
  useSalvarNotasReuniao,
} from '@/hooks/cs';
import type { CSReuniao } from '@/hooks/cs';
import { Action } from '@/components/cs/ui';
import { STATUS_LABEL, TIPO_LABEL, toLocalInputValue } from './reuniaoMeta';
import { getRoteiroReuniaoMensal } from '@/content/cs';

const LABEL_CLASS = 'text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70';

interface ReuniaoDetalheDialogProps {
  reuniao: CSReuniao | null;
  clienteNome: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ReuniaoDetalheDialog({ reuniao, clienteNome, onOpenChange }: ReuniaoDetalheDialogProps) {
  const [remarcando, setRemarcando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [notas, setNotas] = useState('');
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [virarContinuidade, setVirarContinuidade] = useState(true);

  const remarcar = useRemarcarReuniao();
  const cancelar = useCancelarReuniao();
  const marcarRealizada = useMarcarReuniaoRealizada();
  const salvarNotas = useSalvarNotasReuniao();
  const registrarContinuidade = useRegistrarContinuidade();

  useEffect(() => {
    if (reuniao) {
      setNotas(reuniao.notas ?? '');
      setNovaData(toLocalInputValue(new Date(reuniao.data_hora)));
      setRemarcando(false);
      setConfirmandoCancelamento(false);
      setVirarContinuidade(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniao?.id]);

  if (!reuniao) return null;

  const podeAgir = reuniao.status === 'agendada';
  const temCliente = !!reuniao.organization_id;

  async function handleRemarcar() {
    if (!reuniao) return;
    try {
      await remarcar.mutateAsync({ id: reuniao.id, dataHora: new Date(novaData).toISOString() });
      toast.success('Reunião remarcada.');
      setRemarcando(false);
    } catch {
      toast.error('Não foi possível remarcar a reunião.');
    }
  }

  async function handleCancelar() {
    if (!reuniao) return;
    try {
      await cancelar.mutateAsync(reuniao.id);
      toast.success('Reunião cancelada.');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível cancelar a reunião.');
    }
  }

  async function handleMarcarRealizada() {
    if (!reuniao) return;
    try {
      await marcarRealizada.mutateAsync(reuniao.id);
      const notaMudou = notas.trim() && notas.trim() !== (reuniao.notas ?? '');
      if (notaMudou) {
        await salvarNotas.mutateAsync({ id: reuniao.id, notas: notas.trim() });
      }
      if (temCliente && virarContinuidade && notas.trim() && reuniao.organization_id) {
        await registrarContinuidade.mutateAsync({
          organizationId: reuniao.organization_id,
          dataEvento: format(new Date(reuniao.data_hora), 'yyyy-MM-dd'),
          tipo: 'conversa',
          oQueAconteceu: notas.trim(),
          reuniaoId: reuniao.id,
        });
      }
      toast.success('Reunião marcada como realizada.');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível marcar a reunião como realizada.');
    }
  }

  async function handleSalvarNotas() {
    if (!reuniao) return;
    try {
      await salvarNotas.mutateAsync({ id: reuniao.id, notas: notas.trim() });
      toast.success('Notas salvas.');
    } catch {
      toast.error('Não foi possível salvar as notas.');
    }
  }

  async function handleVirarContinuidadeAgora() {
    if (!reuniao || !reuniao.organization_id || !notas.trim()) return;
    try {
      await registrarContinuidade.mutateAsync({
        organizationId: reuniao.organization_id,
        dataEvento: format(new Date(reuniao.data_hora), 'yyyy-MM-dd'),
        tipo: 'conversa',
        oQueAconteceu: notas.trim(),
        reuniaoId: reuniao.id,
      });
      toast.success('Registrado no histórico do cliente.');
    } catch {
      toast.error('Não foi possível registrar no histórico do cliente.');
    }
  }

  return (
    <Dialog open={!!reuniao} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-[11px] text-muted-foreground/70 mb-1">
            {TIPO_LABEL[reuniao.tipo]} · {STATUS_LABEL[reuniao.status]}
          </p>
          <DialogTitle className="font-display text-base">
            {reuniao.organization_id ? clienteNome ?? 'Cliente' : 'Sessão Tática (grupo inteiro)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="bg-muted/30 rounded-xl border border-border/60 px-4 py-3">
            {!remarcando ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-foreground font-display tabular-nums">
                  {format(new Date(reuniao.data_hora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
                {podeAgir && (
                  <Action variant="ghost" size="sm" onClick={() => setRemarcando(true)}>
                    Remarcar
                  </Action>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="h-10 text-sm rounded-lg border border-border/60 px-3 w-full bg-background"
                />
                <div className="flex gap-2 justify-end">
                  <Action variant="outline" size="sm" onClick={() => setRemarcando(false)}>
                    Voltar
                  </Action>
                  <Action variant="solid" size="sm" onClick={handleRemarcar} disabled={remarcar.isPending}>
                    Salvar nova data
                  </Action>
                </div>
              </div>
            )}
          </div>

          {reuniao.pauta && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Pauta</p>
              <p className="text-[13px] text-foreground whitespace-pre-wrap">{reuniao.pauta}</p>
            </div>
          )}

          {reuniao.tipo === 'mensal' && podeAgir && (
            <details className="text-[13px]">
              <summary className="cursor-pointer text-foreground font-medium">
                Roteiro da reunião mensal — preparação
              </summary>
              <ol className="mt-2 space-y-1 text-muted-foreground list-decimal pl-4">
                {getRoteiroReuniaoMensal().blocos.map((b) => (
                  <li key={b.numero}>
                    {b.titulo} <span className="text-muted-foreground/60">({b.duracao})</span>
                  </li>
                ))}
              </ol>
              <Link
                to="/metodo?secao=ritos"
                className="mt-2 inline-block text-[12px] font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Ver o roteiro completo, com as conversas difíceis, no Método
              </Link>
            </details>
          )}

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Notas — o que foi conversado</label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Registro da reunião" rows={4} />

            {temCliente && podeAgir && (
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground pt-0.5">
                <input type="checkbox" checked={virarContinuidade} onChange={(e) => setVirarContinuidade(e.target.checked)} />
                Ao marcar como realizada, registrar esta nota no histórico do cliente
              </label>
            )}

            <div className="flex justify-end items-center gap-1">
              {temCliente && !podeAgir && (
                <Action
                  variant="ghost"
                  size="sm"
                  onClick={handleVirarContinuidadeAgora}
                  disabled={!notas.trim() || registrarContinuidade.isPending}
                >
                  Registrar no histórico do cliente
                </Action>
              )}
              <Action variant="outline" size="sm" onClick={handleSalvarNotas} disabled={salvarNotas.isPending}>
                Salvar notas
              </Action>
            </div>
          </div>
        </div>

        {podeAgir && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!confirmandoCancelamento ? (
              <Action variant="outline" onClick={() => setConfirmandoCancelamento(true)} className="w-full sm:w-auto">
                Cancelar reunião
              </Action>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Action variant="outline" onClick={() => setConfirmandoCancelamento(false)} className="flex-1">
                  Manter
                </Action>
                <Action variant="danger" onClick={handleCancelar} disabled={cancelar.isPending} className="flex-1">
                  Confirmar cancelamento
                </Action>
              </div>
            )}
            <Action variant="solid" onClick={handleMarcarRealizada} disabled={marcarRealizada.isPending} className="w-full sm:w-auto">
              Marcar como realizada
            </Action>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
