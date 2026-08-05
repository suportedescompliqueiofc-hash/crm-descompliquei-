import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormattedText } from '@/components/FormattedText';
import { buildMaterialDeepLink, type JornadaPasso } from '@/hooks/useJornada';
import { categoriaLabel, prioridadeLabel, PRIORIDADE_BADGE, PRIORIDADE_DOT } from '@/lib/planoAcaoTaxonomia';

export const MATERIAL_LABELS: Record<string, string> = {
  script_atendimento: 'Script de atendimento', estrutura_processo: 'Estrutura de processo',
  quebra_objecao: 'Quebra de objeções', oferta: 'Oferta',
  followup_reativacao: 'Follow-up / reativação', otimizacao_comercial: 'Otimização comercial',
};

// ─── Subtarefa ────────────────────────────────────────────────────────────────

export function SubtarefaRow({ sub, onToggle }: { sub: JornadaPasso['jornada_subtarefas'][number]; onToggle: (id: string, v: boolean) => void }) {
  return (
    <button onClick={() => onToggle(sub.id, !sub.concluido)} className="flex items-center gap-2 w-full text-left group/sub py-1">
      {sub.concluido
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        : <Circle className="h-4 w-4 text-muted-foreground/30 group-hover/sub:text-muted-foreground/60 shrink-0" />}
      <span className={cn('text-[12px]', sub.concluido ? 'text-muted-foreground/60 line-through' : 'text-foreground/80')}>{sub.titulo}</span>
    </button>
  );
}

// ─── Tarefa ───────────────────────────────────────────────────────────────────

export function TarefaCard({ passo, onToggle, onToggleSub, defaultOpen = false }: {
  passo: JornadaPasso;
  onToggle: (id: string, v: boolean) => void;
  onToggleSub: (id: string, v: boolean) => void;
  defaultOpen?: boolean;
}) {
  const navigate = useNavigate();
  const hasDetails = !!passo.conteudo_md || !!passo.motivo || !!passo.evidencia || passo.jornada_subtarefas.length > 0 || passo.tipo === 'material';
  const [open, setOpen] = useState(defaultOpen);
  const subsDone = passo.jornada_subtarefas.filter(s => s.concluido).length;

  return (
    <div className={cn('rounded-xl border transition-all', passo.concluido ? 'bg-emerald-500/[0.04] border-emerald-500/15' : 'bg-card border-border/50')}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button onClick={() => onToggle(passo.id, !passo.concluido)} className="mt-0.5 shrink-0 focus:outline-none">
          {passo.concluido ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => hasDetails && setOpen(o => !o)} className={cn('flex items-center gap-2 flex-wrap w-full text-left', hasDetails && 'cursor-pointer')}>
            <p className={cn('text-[13px] font-medium leading-snug', passo.concluido ? 'text-muted-foreground line-through' : 'text-foreground')}>{passo.titulo}</p>
            {passo.prioridade && (
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border', PRIORIDADE_BADGE[passo.prioridade])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', PRIORIDADE_DOT[passo.prioridade])} />
                {prioridadeLabel(passo.prioridade)}
              </span>
            )}
            {passo.categoria && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {categoriaLabel(passo.categoria)}
              </span>
            )}
            {passo.tipo === 'material' && <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600"><Sparkles className="h-2.5 w-2.5" /> Material</span>}
            {passo.jornada_subtarefas.length > 0 && <span className="text-[11px] text-muted-foreground/50 font-display tabular-nums">{subsDone}/{passo.jornada_subtarefas.length}</span>}
            {hasDetails && (open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto" />)}
          </button>

          {open && (
            <div className="mt-2.5 space-y-3">
              {(passo.motivo || passo.evidencia) ? (
                <div className="rounded-lg border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {passo.motivo && (
                    <div className="px-3.5 py-2.5 bg-muted/[0.04]">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Por que existe</p>
                      <p className="text-[12.5px] text-foreground/80 leading-relaxed">{passo.motivo}</p>
                    </div>
                  )}
                  {passo.evidencia && (
                    <div className="px-3.5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Como se sabe que foi feita</p>
                      <p className="text-[12.5px] text-foreground/80 leading-relaxed">{passo.evidencia}</p>
                    </div>
                  )}
                </div>
              ) : passo.conteudo_md && (
                <div className="rounded-lg bg-muted/[0.04] border border-border/40 px-3.5 py-3">
                  <FormattedText content={passo.conteudo_md} />
                </div>
              )}
              {passo.jornada_subtarefas.length > 0 && (
                <div className="space-y-0.5">
                  {passo.jornada_subtarefas.map(s => <SubtarefaRow key={s.id} sub={s} onToggle={onToggleSub} />)}
                </div>
              )}
              {passo.tipo === 'material' && (
                passo.material_id && passo.meus_materiais ? (
                  <Button variant="outline" size="sm" onClick={() => navigate('/plataforma/materiais')} className="h-8 rounded-lg text-[11px] font-medium border-border/60 gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Abrir material
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => navigate(buildMaterialDeepLink(passo))} className="h-8 rounded-lg text-[11px] font-semibold bg-foreground text-background hover:bg-foreground/90 gap-1.5 px-4">
                    <Sparkles className="h-3.5 w-3.5" /> Construir com o Athos
                    {passo.material_categoria && <span className="opacity-60">· {MATERIAL_LABELS[passo.material_categoria] ?? ''}</span>}
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tabela de tarefas (plano de ação mensal — espelha o layout do .md) ────────

export function TarefaTableRow({ passo, onToggle }: {
  passo: JornadaPasso;
  onToggle: (id: string, v: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className={cn(
      'grid grid-cols-[minmax(220px,1.2fr)_110px_110px_minmax(200px,1.3fr)_minmax(180px,1.2fr)] gap-x-5 px-5 py-4 transition-colors',
      passo.concluido ? 'bg-emerald-500/[0.03]' : 'hover:bg-muted/[0.03]'
    )}>
      <div className="flex items-start gap-2.5 min-w-0">
        <button onClick={() => onToggle(passo.id, !passo.concluido)} className="mt-0.5 shrink-0 focus:outline-none">
          {passo.concluido ? <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" /> : <Circle className="h-[18px] w-[18px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />}
        </button>
        <div className="min-w-0">
          <p className={cn('text-[13px] font-medium leading-snug', passo.concluido ? 'text-muted-foreground line-through' : 'text-foreground')}>{passo.titulo}</p>
          {passo.tipo === 'material' && (
            passo.material_id && passo.meus_materiais ? (
              <button onClick={() => navigate('/crm/materiais')} className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-600 hover:text-violet-700">
                <FileText className="h-3 w-3" /> Abrir material
              </button>
            ) : (
              <button onClick={() => navigate(buildMaterialDeepLink(passo))} className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-foreground hover:text-foreground/70">
                <Sparkles className="h-3 w-3" /> Construir com o Athos
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-start">
        {passo.categoria && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {categoriaLabel(passo.categoria)}
          </span>
        )}
      </div>

      <div className="flex items-start">
        {passo.prioridade && (
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border', PRIORIDADE_BADGE[passo.prioridade])}>
            <span className={cn('w-1.5 h-1.5 rounded-full', PRIORIDADE_DOT[passo.prioridade])} />
            {prioridadeLabel(passo.prioridade)}
          </span>
        )}
      </div>

      <p className="text-[12px] text-foreground/75 leading-relaxed">{passo.motivo ?? '—'}</p>
      <p className="text-[12px] text-foreground/75 leading-relaxed italic">{passo.evidencia ?? '—'}</p>
    </div>
  );
}

export function TarefaTable({ passos, onToggle }: {
  passos: JornadaPasso[];
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(220px,1.2fr)_110px_110px_minmax(200px,1.3fr)_minmax(180px,1.2fr)] gap-x-5 px-5 py-2.5 bg-muted/[0.04] border-b border-border/40">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Ação</p>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Categoria</p>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Prioridade</p>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Por que existe</p>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Como se sabe que foi feita</p>
          </div>
          <div className="divide-y divide-border/30">
            {passos.map(p => <TarefaTableRow key={p.id} passo={p} onToggle={onToggle} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
