// Detalhe de uma reunião — remarcar, cancelar, marcar como realizada, e
// salvar pauta/notas. Redesign 2026-07-30: sem badge colorido de status/tipo
// (texto puro), sem vermelho no cancelamento (peso de fonte no lugar de
// cor). Ganhou o pedido explícito da tarefa: a nota da reunião pode virar
// uma entrada de continuidade do cliente — ao marcar como realizada com
// notas escritas, a entrada nasce automaticamente (linkada por
// `reuniaoId`); para reuniões já realizadas antes, um botão separado faz o
// mesmo a qualquer momento. Sessão tática em grupo (sem organization_id) não
// tem cliente único — a opção não aparece nesse caso.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { STATUS_LABEL, TIPO_LABEL, toLocalInputValue } from './reuniaoMeta';
import { getRoteiroReuniaoMensal } from '@/content/cs';

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
                  <button
                    type="button"
                    onClick={() => setRemarcando(true)}
                    className="text-[11px] font-medium text-foreground underline underline-offset-2 hover:no-underline shrink-0"
                  >
                    Remarcar
                  </button>
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
                  <Button
                    variant="outline"
                    onClick={() => setRemarcando(false)}
                    className="h-8 rounded-lg text-[11px] font-medium border-border/60"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleRemarcar}
                    disabled={remarcar.isPending}
                    className="h-8 rounded-lg text-[11px] font-semibold bg-foreground text-background hover:bg-foreground/90"
                  >
                    Salvar nova data
                  </Button>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notas — o que foi conversado
            </label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Registro da reunião" rows={4} />

            {temCliente && podeAgir && (
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground pt-0.5">
                <input type="checkbox" checked={virarContinuidade} onChange={(e) => setVirarContinuidade(e.target.checked)} />
                Ao marcar como realizada, registrar esta nota no histórico do cliente
              </label>
            )}

            <div className="flex justify-end gap-2">
              {temCliente && !podeAgir && (
                <button
                  type="button"
                  onClick={handleVirarContinuidadeAgora}
                  disabled={!notas.trim() || registrarContinuidade.isPending}
                  className="text-[11px] font-medium text-foreground underline underline-offset-2 hover:no-underline disabled:opacity-40 disabled:no-underline"
                >
                  Registrar no histórico do cliente
                </button>
              )}
              <Button
                variant="outline"
                onClick={handleSalvarNotas}
                disabled={salvarNotas.isPending}
                className="h-8 rounded-lg text-[11px] font-medium border-border/60"
              >
                Salvar notas
              </Button>
            </div>
          </div>
        </div>

        {podeAgir && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!confirmandoCancelamento ? (
              <Button
                variant="outline"
                onClick={() => setConfirmandoCancelamento(true)}
                className="h-9 rounded-lg text-[11px] font-medium border-border/60 w-full sm:w-auto"
              >
                Cancelar reunião
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setConfirmandoCancelamento(false)}
                  className="h-9 rounded-lg text-[11px] font-medium border-border/60 flex-1"
                >
                  Manter
                </Button>
                <Button
                  onClick={handleCancelar}
                  disabled={cancelar.isPending}
                  className="h-9 rounded-lg text-[11px] font-semibold bg-foreground text-background hover:bg-foreground/90 flex-1"
                >
                  Confirmar cancelamento
                </Button>
              </div>
            )}
            <Button
              onClick={handleMarcarRealizada}
              disabled={marcarRealizada.isPending}
              className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5 w-full sm:w-auto"
            >
              Marcar como realizada
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
