// Detalhe de uma reunião — remarcar, cancelar, marcar como realizada, e
// salvar pauta/notas. Reunião já realizada/cancelada só permite editar notas
// (registro pós-reunião), sem ações de remarcar/cancelar/concluir.
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCancelarReuniao,
  useMarcarReuniaoRealizada,
  useRemarcarReuniao,
  useSalvarNotasReuniao,
} from '@/hooks/cs';
import type { CSReuniao } from '@/hooks/cs';
import { STATUS_CLASSES, STATUS_LABEL, TIPO_LABEL, toLocalInputValue } from './reuniaoMeta';

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

  const remarcar = useRemarcarReuniao();
  const cancelar = useCancelarReuniao();
  const marcarRealizada = useMarcarReuniaoRealizada();
  const salvarNotas = useSalvarNotasReuniao();

  useEffect(() => {
    if (reuniao) {
      setNotas(reuniao.notas ?? '');
      setNovaData(toLocalInputValue(new Date(reuniao.data_hora)));
      setRemarcando(false);
      setConfirmandoCancelamento(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniao?.id]);

  if (!reuniao) return null;

  const podeAgir = reuniao.status === 'agendada';

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
      if (notas.trim() && notas.trim() !== (reuniao.notas ?? '')) {
        await salvarNotas.mutateAsync({ id: reuniao.id, notas: notas.trim() });
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

  return (
    <Dialog open={!!reuniao} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
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
          <DialogTitle className="font-display text-base">
            {reuniao.organization_id ? clienteNome ?? 'Cliente' : 'Sessão Tática (Grupo)'}
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
                    className="text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 shrink-0"
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Registro da reunião"
              rows={4}
            />
            <div className="flex justify-end">
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
                className="h-9 rounded-lg text-[11px] font-medium border-border/60 text-red-600 hover:text-red-700 w-full sm:w-auto"
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
                  className="h-9 rounded-lg text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 flex-1"
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
