// Formulário de "pedir material" — seção E da especificação. O rascunho da
// especificação previa um formulário mínimo (elo + descrição livre
// opcional), mas o contrato REAL da RPC `cs_registrar_material` (confirmado
// ao vivo em 2026-07-31, pg_get_functiondef + CHECK constraints de
// `cs_materiais`) exige `titulo`, `elo`, `tipo` e `analise_previa` —
// `analise_previa` é obrigatória e o banco lança exceção se vier vazia
// (`AnalisePreviaObrigatoriaError`). O formulário abaixo segue o contrato
// real, não o rascunho da seção E — divergência relatada pelo agente.
//
// Fecha o loop com Tarefas (bloco 4) e a tela Semana: ao registrar o
// material, também cria uma tarefa `dono='claude'` referenciando o pedido —
// a MESMA lógica que a especificação descreve, só que composta no cliente
// (duas mutations em sequência) em vez de uma transação única no banco,
// porque `cs_registrar_material` não cria essa tarefa sozinha (confirmado
// lendo a função: só faz INSERT em `cs_materiais`). Reportado como ponto de
// atenção — o ideal, no futuro, é uma única RPC fazendo as duas escritas.
//
// Alinhamento visual ao Console (2026-07-31): botões viraram <Action>, o
// seletor de tipo (operacional/estratégico) virou o mesmo par de <Action>
// solid/ghost usado no seletor de dono de TarefaFormDialog — lógica de
// formulário e a regra de negócio (`analise_previa` obrigatória) intactas.
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Action } from '@/components/cs/ui';
import { useCriarTarefa, useRegistrarMaterial } from '@/hooks/cs';
import type { EloMaterial, TipoMaterial } from '@/hooks/cs';

const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60';

const ELOS_MATERIAL: EloMaterial[] = [
  'Adoção (Camada 0)',
  'Demanda',
  'Agendamento',
  'Resgate de Lead Frio',
  'Comparecimento',
  'Fechamento',
  'Ticket',
  'Ciclo de Venda',
  'Recompra',
];

interface PedirMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** Pré-seleciona o elo com o elo-restrição atual do cliente (bloco 1/2), quando é um valor válido do catálogo. */
  eloSugerido?: EloMaterial | null;
  /** Jornada do mês corrente, se houver — vincula o material ao plano em curso. */
  jornadaIdAtual?: string | null;
}

export function PedirMaterialDialog({
  open,
  onOpenChange,
  organizationId,
  eloSugerido,
  jornadaIdAtual,
}: PedirMaterialDialogProps) {
  const registrarMaterial = useRegistrarMaterial();
  const criarTarefa = useCriarTarefa();

  const [titulo, setTitulo] = useState('');
  const [elo, setElo] = useState<EloMaterial>(eloSugerido ?? 'Fechamento');
  const [tipo, setTipo] = useState<TipoMaterial>('operacional');
  const [analisePrevia, setAnalisePrevia] = useState('');
  const [observacao, setObservacao] = useState('');

  const isPending = registrarMaterial.isPending || criarTarefa.isPending;

  function resetar() {
    setTitulo('');
    setElo(eloSugerido ?? 'Fechamento');
    setTipo('operacional');
    setAnalisePrevia('');
    setObservacao('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Dá um título pro material.');
      return;
    }
    if (!analisePrevia.trim()) {
      toast.error('Descreve a análise prévia do atendimento real do cliente — nenhum material nasce sem ela.');
      return;
    }
    try {
      await registrarMaterial.mutateAsync({
        organizationId,
        titulo: titulo.trim(),
        elo,
        tipo,
        analisePrevia: analisePrevia.trim(),
        conteudo: observacao.trim() || null,
        jornadaId: jornadaIdAtual ?? null,
      });
      await criarTarefa.mutateAsync({
        organizationId,
        titulo: `Produzir material: ${titulo.trim()}`,
        descricao: analisePrevia.trim(),
        dono: 'claude',
        origem: 'manual',
        jornadaId: jornadaIdAtual ?? null,
      });
      toast.success('Material pedido — a tarefa de produção já está na fila do Claude.');
      onOpenChange(false);
      resetar();
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra pedir o material.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Pedir material</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Título</label>
            <Input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Roteiro de consulta para orçamento"
              className="h-10 text-sm rounded-lg border-border/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Elo alvo</label>
              <Select value={elo} onValueChange={(v) => setElo(v as EloMaterial)}>
                <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELOS_MATERIAL.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Tipo</label>
              <div className="flex bg-muted/50 rounded-lg p-1 gap-0.5 h-10 items-center">
                {(['operacional', 'estrategico'] as TipoMaterial[]).map((t) => (
                  <Action
                    key={t}
                    type="button"
                    variant={tipo === t ? 'solid' : 'ghost'}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => setTipo(t)}
                  >
                    {t === 'operacional' ? 'Operacional' : 'Estratégico'}
                  </Action>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Análise prévia (obrigatória)</label>
            <Textarea
              value={analisePrevia}
              onChange={(e) => setAnalisePrevia(e.target.value)}
              placeholder="O que no atendimento real deste cliente motiva este material"
              rows={3}
              className="text-sm rounded-lg border-border/60 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Observação (opcional)</label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Algum detalhe a mais para quem for produzir"
              rows={2}
              className="text-sm rounded-lg border-border/60 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Action type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Action>
            <Action type="submit" variant="solid" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Pedir material'}
            </Action>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
