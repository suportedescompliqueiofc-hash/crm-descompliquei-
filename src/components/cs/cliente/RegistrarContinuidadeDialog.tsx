// Registrar uma entrada de continuidade — o ato mínimo de qualquer sessão de
// CS (P3 do sistema: "se não foi registrado, não aconteceu"). Usado na Ficha
// do Cliente (histórico) e reaproveitado na Agenda para virar a nota de uma
// reunião realizada em entrada de continuidade — por isso aceita valores
// iniciais e um `reuniaoId` opcional.
//
// Alinhamento visual ao Console (2026-07-31): botões viraram <Action> —
// lógica de registro e validação (`oQueAconteceu` obrigatório) intactas.
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Action } from '@/components/cs/ui';
import { useRegistrarContinuidade } from '@/hooks/cs';
import type { TipoContinuidade } from '@/hooks/cs';

const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60';

const TIPO_LABEL: Record<TipoContinuidade, string> = {
  conversa: 'Conversa',
  decisao: 'Decisão',
  entrega: 'Entrega',
  observacao: 'Observação',
  divergencia: 'Divergência',
  fechamento: 'Fechamento do mês',
};

interface RegistrarContinuidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** Valores iniciais — usado quando a nota vem de uma reunião realizada. */
  initial?: {
    dataEvento?: string;
    tipo?: TipoContinuidade;
    oQueAconteceu?: string;
    reuniaoId?: string | null;
  };
  onRegistrado?: () => void;
}

export function RegistrarContinuidadeDialog({
  open,
  onOpenChange,
  organizationId,
  initial,
  onRegistrado,
}: RegistrarContinuidadeDialogProps) {
  const registrar = useRegistrarContinuidade();

  const [dataEvento, setDataEvento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tipo, setTipo] = useState<TipoContinuidade>('conversa');
  const [oQueAconteceu, setOQueAconteceu] = useState('');
  const [ficouCombinado, setFicouCombinado] = useState('');
  const [combinadoCom, setCombinadoCom] = useState('');

  useEffect(() => {
    if (!open) return;
    setDataEvento(initial?.dataEvento ?? format(new Date(), 'yyyy-MM-dd'));
    setTipo(initial?.tipo ?? 'conversa');
    setOQueAconteceu(initial?.oQueAconteceu ?? '');
    setFicouCombinado('');
    setCombinadoCom('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!oQueAconteceu.trim()) {
      toast.error('Descreve o que aconteceu.');
      return;
    }
    try {
      await registrar.mutateAsync({
        organizationId,
        dataEvento,
        tipo,
        oQueAconteceu: oQueAconteceu.trim(),
        ficouCombinado: ficouCombinado.trim() || null,
        combinadoCom: combinadoCom.trim() || null,
        reuniaoId: initial?.reuniaoId ?? null,
      });
      toast.success('Registrado.');
      onOpenChange(false);
      onRegistrado?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra registrar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar continuidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Data</label>
              <Input
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
                className="h-10 text-sm rounded-lg border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Tipo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoContinuidade)}>
                <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABEL) as TipoContinuidade[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>O que aconteceu</label>
            <Textarea
              autoFocus
              value={oQueAconteceu}
              onChange={(e) => setOQueAconteceu(e.target.value)}
              placeholder="O fato — conversa, decisão, entrega, observação"
              rows={3}
              className="text-sm rounded-lg border-border/60 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Ficou combinado (opcional)</label>
            <Textarea
              value={ficouCombinado}
              onChange={(e) => setFicouCombinado(e.target.value)}
              placeholder="O que foi combinado, se houve"
              rows={2}
              className="text-sm rounded-lg border-border/60 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Com quem (opcional)</label>
            <Input
              value={combinadoCom}
              onChange={(e) => setCombinadoCom(e.target.value)}
              placeholder="Nome de quem participou"
              className="h-10 text-sm rounded-lg border-border/60"
            />
          </div>

          <DialogFooter className="pt-2">
            <Action type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Action>
            <Action type="submit" variant="solid" disabled={registrar.isPending}>
              {registrar.isPending ? 'Registrando…' : 'Registrar'}
            </Action>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
