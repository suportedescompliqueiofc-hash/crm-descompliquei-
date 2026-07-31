// Ponto de integração da publicação de plano (bloco 3 da Ficha) — ligado a
// `usePublicarJornada` (RPC `cs_publicar_jornada`), disponibilizado pelo
// Executor de Dados/Hooks em 2026-07-31. Antes disso, `handlePublicar` em
// `PlanoEmbutido.tsx` era um toast stub marcado como "ponto de integração".
//
// DECISÃO DELIBERADA (relatada, não decidida por conta própria): hoje NÃO
// existe nenhuma tela de composição de plano — nenhum lugar onde alguém
// monta os estágios/passos/dono antes de publicar. `cs_publicar_jornada`
// recebe o plano INTEIRO como parâmetro (não lê um rascunho já salvo no
// banco) — ou seja, "publicar" e "compor o plano" são o mesmo ato nesta
// função. Construir esse compositor (adicionar semana, adicionar passo,
// escolher dono por passo, reordenar) é claramente um "formulário completo"
// — o maestro pediu explicitamente para NÃO construir isso nesta rodada sem
// aprovação prévia. Por isso este componente aceita `planoComposto` como
// `null` (o estado real hoje, sempre) e nesse caso só explica o mecanismo,
// sem nenhum campo de entrada — zero composição. Se um dia outro fluxo
// (ex.: a skill /cs-mes, ou uma tela de composição futura) passar um
// `PublicarJornadaInput` já pronto, o mesmo dialog já sabe mostrar o resumo
// e confirmar a publicação de verdade — só falta essa fonte de dado, que
// está fora desta fatia.
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePublicarJornada } from '@/hooks/cs';
import type { PublicarJornadaInput } from '@/hooks/cs';

interface PublicarPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Sempre `null` nesta rodada — não há hoje nenhuma fonte de plano já
   * montado para publicar (ver comentário do arquivo). Deixado tipado para
   * quando essa fonte existir.
   */
  planoComposto: PublicarJornadaInput | null;
}

export function PublicarPlanoDialog({ open, onOpenChange, planoComposto }: PublicarPlanoDialogProps) {
  const publicar = usePublicarJornada();
  const [confirmando, setConfirmando] = useState(false);

  async function handleConfirmar() {
    if (!planoComposto) return;
    setConfirmando(true);
    try {
      await publicar.mutateAsync(planoComposto);
      toast.success('Plano publicado — o cliente já vê os passos dele na plataforma.');
      onOpenChange(false);
    } catch (err: any) {
      const msg = (err?.message as string) ?? '';
      if (msg.includes('Já existe uma jornada mensal ativa')) {
        // Recusa de duplicata — proteção do banco, não falha da ação. O
        // texto exato vem de cs_publicar_jornada (confirmado ao vivo,
        // 2026-07-31): "Já existe uma jornada mensal ativa para esta
        // organização em {mes} — feche (status=concluida) o plano vigente
        // antes de publicar um novo, não duplique."
        toast.info(
          'Este cliente já tem um plano ativo neste mês — publicar de novo criaria duplicata. Feche o plano vigente (fechamento mensal) antes de publicar um novo. Isso é uma proteção do sistema, não um erro.',
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

        {!planoComposto ? (
          <div className="space-y-3 py-1">
            <p className="text-sm text-foreground leading-relaxed">
              Ainda não há um plano montado para publicar aqui. O plano nasce no fechamento mensal — em conversa,
              não nesta tela — e só depois de aprovado é que esta ação publica exatamente o que foi combinado: o
              cliente passa a ver os passos dele na plataforma dele, e as suas ações viram tarefas suas.
            </p>
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
              Publicar escreve na plataforma real do cliente — por isso esta ação sempre pede confirmação, mesmo
              quando já houver um plano pronto para enviar.
            </p>
            <DialogFooter className="pt-1">
              <Button
                type="button"
                className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5"
                onClick={() => onOpenChange(false)}
              >
                Entendi
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <p className="text-sm text-foreground leading-relaxed">
              Isso vai publicar <span className="font-medium">{planoComposto.titulo || 'este plano'}</span> para o
              cliente agora — ele passa a ver os passos dele na plataforma dele.
            </p>
            <div className="text-[13px] text-muted-foreground leading-relaxed space-y-1 rounded-lg border border-border/60 px-3 py-2.5">
              <p>
                Ataca <span className="text-foreground font-medium">{planoComposto.eloAlvo}</span>. Critério de
                sucesso: {planoComposto.criterioSucesso}.
              </p>
              <p>
                {planoComposto.estagios.length}{' '}
                {planoComposto.estagios.length === 1 ? 'semana' : 'semanas'} ·{' '}
                {planoComposto.estagios.reduce((n, e) => n + e.passos.length, 0)} passos ao todo —{' '}
                {planoComposto.estagios.reduce(
                  (n, e) => n + e.passos.filter((p) => p.dono === 'joao').length,
                  0,
                )}{' '}
                suas, o resto do cliente.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
              Se já existir um plano mensal ativo para este cliente neste período, a publicação é recusada — feche o
              plano vigente antes.
            </p>
            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg text-[11px] font-medium border-border/60 px-3"
                onClick={() => onOpenChange(false)}
                disabled={confirmando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmar}
                disabled={confirmando}
                className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5"
              >
                {confirmando ? 'Publicando…' : 'Confirmar publicação'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
