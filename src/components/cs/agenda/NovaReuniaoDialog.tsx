// Agendar reunião — kickoff/semanal/mensal/sob_demanda/tatica_grupo. A tática
// em grupo não pertence a um cliente (organization_id nulo) e sugere a
// cadência fixa (segunda-feira, 8h) ao ser selecionada.
//
// Alinhamento visual ao Console (2026-07-31): título em font-display
// (herdado), rótulo de campo na caixa alta/tracking do PanelHeader, botões
// viraram <Action> — lógica de agendamento intacta.
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAgendarReuniao } from '@/hooks/cs';
import type { ClienteCarteira, TipoReuniao } from '@/hooks/cs';
import { Action } from '@/components/cs/ui';
import { TIPO_LABEL, proximaSegundaAs8h, toLocalInputValue } from './reuniaoMeta';

const LABEL_CLASS = 'text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70';
const TIPOS: TipoReuniao[] = ['kickoff', 'semanal', 'mensal', 'sob_demanda', 'tatica_grupo'];

interface NovaReuniaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: ClienteCarteira[];
  defaultOrgId?: string | null;
}

export function NovaReuniaoDialog({ open, onOpenChange, clientes, defaultOrgId }: NovaReuniaoDialogProps) {
  const [tipo, setTipo] = useState<TipoReuniao>('mensal');
  const [orgId, setOrgId] = useState<string>(defaultOrgId ?? '');
  const [dataHora, setDataHora] = useState<string>(() => toLocalInputValue(new Date()));
  const [pauta, setPauta] = useState('');

  const agendar = useAgendarReuniao();
  const isGrupo = tipo === 'tatica_grupo';

  // Reabrir o modal (ex.: clicou em "agendar" a partir de um cliente atrasado)
  // sempre parte de um estado limpo, com o cliente sugerido pré-selecionado.
  useEffect(() => {
    if (open) {
      setTipo('mensal');
      setOrgId(defaultOrgId ?? '');
      setDataHora(toLocalInputValue(new Date()));
      setPauta('');
    }
  }, [open, defaultOrgId]);

  function handleTipoChange(novoTipo: TipoReuniao) {
    setTipo(novoTipo);
    if (novoTipo === 'tatica_grupo') {
      setOrgId('');
      setDataHora(proximaSegundaAs8h());
    }
  }

  async function handleSubmit() {
    if (!isGrupo && !orgId) {
      toast.error('Selecione o cliente da reunião.');
      return;
    }
    if (!dataHora) {
      toast.error('Defina a data e o horário.');
      return;
    }
    try {
      await agendar.mutateAsync({
        organizationId: isGrupo ? null : orgId,
        tipo,
        dataHora: new Date(dataHora).toISOString(),
        pauta: pauta.trim() || null,
      });
      toast.success('Reunião agendada.');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível agendar a reunião.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Agendar reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Tipo</label>
            <Select value={tipo} onValueChange={(v) => handleTipoChange(v as TipoReuniao)}>
              <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Cliente</label>
            {isGrupo ? (
              <p className="text-[13px] text-muted-foreground bg-muted/30 rounded-lg border border-border/60 px-3 py-2.5">
                Sessão tática — carteira inteira convidada, sem cliente único.
              </p>
            ) : (
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.organization_id} value={c.organization_id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Data e horário</label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="h-10 text-sm rounded-lg border border-border/60 px-3 w-full bg-background"
            />
            {isGrupo && (
              <p className="text-[10px] text-muted-foreground/60">
                Sugerido: segunda-feira às 8h — cadência fixa da sessão tática em grupo.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Pauta</label>
            <Textarea
              value={pauta}
              onChange={(e) => setPauta(e.target.value)}
              placeholder="O que será tratado nesta reunião"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Action variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Action>
          <Action variant="solid" onClick={handleSubmit} disabled={agendar.isPending}>
            {agendar.isPending ? 'Agendando…' : 'Agendar'}
          </Action>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
