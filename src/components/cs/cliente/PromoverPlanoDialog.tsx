// Publicar um rascunho que JÁ EXISTE no banco (estágios/passos já montados —
// hoje, na prática, inseridos por mim direto no banco numa conversa de CS).
// Distinto de PublicarPlanoDialog: aquele compõe um plano do zero a partir de
// um payload (`cs_publicar_jornada`); este só promove `status='rascunho'` →
// `'ativa'` de uma jornada que já tem conteúdo (`cs_promover_jornada_rascunho`,
// via `usePromoverJornada`) — não recebe nem reconstrói estágios/passos.
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Action, Metric } from '@/components/cs/ui';
import { usePromoverJornada } from '@/hooks/cs';

interface PromoverPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jornadaId: string;
  organizationId: string;
  titulo: string;
  totalEstagios: number;
  totalPassos: number;
}

export function PromoverPlanoDialog({
  open,
  onOpenChange,
  jornadaId,
  organizationId,
  titulo,
  totalEstagios,
  totalPassos,
}: PromoverPlanoDialogProps) {
  const promover = usePromoverJornada();
  const [confirmando, setConfirmando] = useState(false);

  async function handleConfirmar() {
    setConfirmando(true);
    try {
      await promover.mutateAsync({ jornadaId, organizationId });
      toast.success('Plano publicado — o cliente já vê os passos dele na plataforma.');
      onOpenChange(false);
    } catch (err: any) {
      const msg = (err?.message as string) ?? '';
      if (msg.includes('Já existe uma jornada mensal ativa')) {
        toast.info(
          'Este cliente já tem um plano ativo neste mês — publicar de novo criaria duplicata. Feche o plano vigente (fechamento mensal) antes de publicar um novo.',
        );
      } else {
        toast.error(msg || 'Não foi possível publicar o plano.');
      }
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Publicar plano</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-foreground leading-relaxed">
            Isso vai publicar <span className="font-medium">{titulo || 'este plano'}</span> para o cliente agora —
            ele passa a ver os passos dele na plataforma dele.
          </p>
          <div className="text-[13px] text-muted-foreground leading-relaxed rounded-lg border border-border/60 px-3 py-2.5">
            <p className="flex flex-wrap items-baseline gap-x-1">
              <Metric size="sm" value={totalEstagios} /> {totalEstagios === 1 ? 'semana' : 'semanas'} ·{' '}
              <Metric size="sm" value={totalPassos} /> passos ao todo.
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
            Se já existir um plano mensal ativo para este cliente neste período, a publicação é recusada — feche o
            plano vigente antes.
          </p>
          <DialogFooter className="pt-1">
            <Action type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
              Cancelar
            </Action>
            <Action type="button" variant="solid" onClick={handleConfirmar} disabled={confirmando}>
              {confirmando ? 'Publicando…' : 'Confirmar publicação'}
            </Action>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
