import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCriarTarefa, useEditarTarefa } from '@/hooks/cs';
import type { CSTarefa, ClienteCarteira, DonoTarefa } from '@/hooks/cs';
import { DONO_CONFIG, PRIORIDADE_OPTIONS } from './constants';

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const NENHUM_CLIENTE = '__nenhum__';

interface TarefaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = modo edição. Ausente/null = modo criação. */
  tarefa?: CSTarefa | null;
  clientes: ClienteCarteira[];
  /** Pré-seleciona o cliente ao abrir em modo criação (ex.: veio da seção "sem plano"). */
  organizationIdInicial?: string | null;
}

/**
 * Formulário curto de tarefa — criação e edição na mesma peça. Sem fricção:
 * só "título" é obrigatório, o resto tem default sensato (dono = João,
 * prioridade = normal, sem cliente = tarefa interna).
 *
 * Cliente é editável tanto na criação quanto na edição (`EditarTarefaInput`
 * aceita `organization_id` desde 2026-07-30 — corrigido na revisão do squad).
 */
export function TarefaFormDialog({
  open,
  onOpenChange,
  tarefa,
  clientes,
  organizationIdInicial = null,
}: TarefaFormDialogProps) {
  const isEdit = !!tarefa;
  const criarTarefa = useCriarTarefa();
  const editarTarefa = useEditarTarefa();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [prazo, setPrazo] = useState('');
  const [prioridade, setPrioridade] = useState(0);
  const [dono, setDono] = useState<DonoTarefa>('joao');

  useEffect(() => {
    if (!open) return;
    if (tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao ?? '');
      setOrganizationId(tarefa.organization_id);
      setPrazo(tarefa.prazo ?? '');
      setPrioridade(tarefa.prioridade ?? 0);
      setDono(tarefa.dono);
    } else {
      setTitulo('');
      setDescricao('');
      setOrganizationId(organizationIdInicial);
      setPrazo('');
      setPrioridade(0);
      setDono('joao');
    }
  }, [open, tarefa, organizationIdInicial]);

  const isPending = criarTarefa.isPending || editarTarefa.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Dá um título pra tarefa.');
      return;
    }
    try {
      if (isEdit && tarefa) {
        await editarTarefa.mutateAsync({
          id: tarefa.id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          organization_id: organizationId,
          prazo: prazo || null,
          prioridade,
          dono,
        });
        toast.success('Tarefa atualizada.');
      } else {
        await criarTarefa.mutateAsync({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          organizationId,
          prazo: prazo || null,
          prioridade,
          dono,
          origem: 'manual',
        });
        toast.success('Tarefa criada.');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra salvar a tarefa.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground">
            {isEdit ? 'Ajusta o que precisar — o resto da fila continua igual.' : 'Rápido: só o título é obrigatório.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Título</label>
            <Input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="O que precisa ser feito"
              className="h-10 text-sm rounded-lg border-border/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Descrição (opcional)</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhe, se precisar"
              rows={2}
              className="text-sm rounded-lg border-border/60 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Cliente</label>
              <Select
                value={organizationId ?? NENHUM_CLIENTE}
                onValueChange={(v) => setOrganizationId(v === NENHUM_CLIENTE ? null : v)}
              >
                <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                  <SelectValue placeholder="Sem cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM_CLIENTE}>Tarefa interna</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.organization_id} value={c.organization_id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Prazo</label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="h-10 text-sm rounded-lg border-border/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Prioridade</label>
              <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Dono</label>
              <div className="flex bg-muted/40 rounded-xl p-1 gap-0.5 h-10 items-center">
                {(Object.keys(DONO_CONFIG) as DonoTarefa[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDono(d)}
                    className={cn(
                      'flex-1 h-full px-2 text-[11px] font-medium rounded-lg transition-all',
                      dono === d ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {DONO_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg text-[11px] font-medium border-border/60 gap-1.5 px-3"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5 gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
