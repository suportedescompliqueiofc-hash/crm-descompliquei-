// A percepção do João sobre o cliente — o outro lado do sistema, ao lado do
// dado (05-operacoes-e-cs/CLAUDE.md: "duas verdades, nunca misturadas").
// Quando uma percepção diverge do que o número mostra, isso é o sinal mais
// valioso do sistema — destacado aqui por peso de fonte e um filete à
// esquerda (`border-l`), nunca por cor (nem laranja: divergência não é
// "exige ação", é "vale a pena olhar duas vezes").
//
// Redesign 2026-07-31 (rodada "Console"): bloco da coluna lateral (sticky).
// Vira `<Panel>` com a ação "Registrar" no cabeçalho; a lista de percepções
// vira `<PanelRows>`/`<ListRow>` (o filete de divergência é aplicado direto
// na `<ListRow>`, sem mudar de cor). O formulário do diálogo é inalterado —
// fora do escopo visual desta rodada.
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { PercepcaoRecente } from '@/hooks/cs';
import { useRegistrarPercepcao } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, PanelRows, ListRow, Action, EmptyState } from '@/components/cs/ui';

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

interface PercepcaoCeoProps {
  organizationId: string;
  percepcoes: PercepcaoRecente[];
  isLoading: boolean;
}

export function PercepcaoCeo({ organizationId, percepcoes, isLoading }: PercepcaoCeoProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [diverge, setDiverge] = useState(false);
  const [notaDivergencia, setNotaDivergencia] = useState('');
  const registrar = useRegistrarPercepcao();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) {
      toast.error('Escreve a percepção.');
      return;
    }
    try {
      await registrar.mutateAsync({
        organizationId,
        texto: texto.trim(),
        divergeDoDado: diverge,
        divergenciaNota: diverge ? notaDivergencia.trim() || null : null,
      });
      toast.success('Percepção registrada.');
      setDialogAberto(false);
      setTexto('');
      setDiverge(false);
      setNotaDivergencia('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra registrar.');
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Percepção"
        hint="O que o João observa, além do número"
        action={
          <Action size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
            Registrar
          </Action>
        }
      />
      <PanelBody flush={!isLoading && percepcoes.length > 0}>
        {isLoading ? null : percepcoes.length === 0 ? (
          <EmptyState title="Nenhuma percepção registrada ainda" />
        ) : (
          <PanelRows>
            {percepcoes.map((p) => (
              <ListRow key={p.id} className={p.diverge_do_dado ? 'border-l-2 border-foreground/25' : undefined}>
                <p
                  className={
                    p.diverge_do_dado
                      ? 'text-sm font-medium text-foreground leading-relaxed'
                      : 'text-sm text-foreground leading-relaxed'
                  }
                >
                  {p.texto}
                </p>
                <p className="text-[12px] text-muted-foreground/70 mt-0.5">
                  {p.data_percepcao
                    ? format(parseISO(p.data_percepcao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'data aproximada'}
                  {p.diverge_do_dado && ' · diverge do que o número mostra'}
                </p>
                {p.diverge_do_dado && p.divergencia_nota && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{p.divergencia_nota}</p>
                )}
              </ListRow>
            ))}
          </PanelRows>
        )}
      </PanelBody>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Registrar percepção</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>O que você observa</label>
              <Textarea
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="O que você sente ou percebe neste cliente"
                rows={3}
                className="text-sm rounded-lg border-border/60 resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={diverge} onChange={(e) => setDiverge(e.target.checked)} />
              Isso diverge do que os números mostram
            </label>
            {diverge && (
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Em que diverge (opcional)</label>
                <Input
                  value={notaDivergencia}
                  onChange={(e) => setNotaDivergencia(e.target.value)}
                  placeholder="O número diz X, mas..."
                  className="h-10 text-sm rounded-lg border-border/60"
                />
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg text-[11px] font-medium border-border/60 px-3"
                onClick={() => setDialogAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={registrar.isPending}
                className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5"
              >
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
