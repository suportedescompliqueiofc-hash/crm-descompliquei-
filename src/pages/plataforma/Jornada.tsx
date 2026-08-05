import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Route, CheckCircle2, ChevronRight,
  Loader2, Crosshair, History, ClipboardList, Target, FileText, Paperclip,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { formatBRL } from '@/lib/format';
import { FormattedText } from '@/components/FormattedText';
import {
  useJornadas, getJornadaProgress, getEstagioProgress,
  type Jornada, type JornadaEstagio,
} from '@/hooks/useJornada';

function jornadaLabel(j: Jornada): string {
  if (j.tipo === 'onboarding') return 'Onboarding';
  if (j.tipo === 'mensal' && j.periodo_ref) return format(parseISO(j.periodo_ref), "MMMM 'de' yyyy", { locale: ptBR });
  return j.titulo;
}

// Preview em texto puro (o card resumo não renderiza markdown, só um trecho)
function plainPreview(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*>]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Estágio (card que abre a página da etapa) ──────────────────────────────────

function EstagioCard({ estagio, index }: { estagio: JornadaEstagio; index: number }) {
  const navigate = useNavigate();
  const { total, done, pct } = getEstagioProgress(estagio);
  const isDone = total > 0 && done === total;

  return (
    <button
      onClick={() => navigate(`/plataforma/jornada/estagio/${estagio.id}`)}
      className="group w-full text-left overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-border hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all"
    >
      <div className={cn('h-[3px] w-full', isDone ? 'bg-emerald-500' : 'bg-foreground/80')} />
      <div className="px-5 py-4 flex items-center gap-4">
        <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold', isDone ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
          {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold leading-snug font-display text-foreground">{estagio.titulo}</h3>
          {estagio.descricao && <p className="text-[12px] text-muted-foreground/60 mt-0.5 line-clamp-2">{plainPreview(estagio.descricao)}</p>}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground/60 mt-1.5">
            <span className="font-display tabular-nums">{done}/{total} tarefas · {pct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', isDone ? 'bg-emerald-500' : 'bg-foreground/70')} style={{ width: `${Math.max(pct, total > 0 ? 2 : 0)}%` }} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </button>
  );
}

// ─── Diagnóstico do mês ─────────────────────────────────────────────────────────

function DiagnosticoDoMes({ jornada }: { jornada: Jornada }) {
  if (!jornada.diagnostico_md) return null;
  return (
    <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted"><ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Diagnóstico do mês</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Por que este é o foco agora</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <FormattedText content={jornada.diagnostico_md} />
      </div>
    </div>
  );
}

// ─── Meta do mês (mini-card, reaproveita a lógica de níveis de Metas.tsx) ───────

function MetaDoMes({ orgId }: { orgId: string | undefined }) {
  const { data: meta } = useQuery({
    queryKey: ['meta-do-mes-jornada', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vw_meta_acompanhamento')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('ativo', true)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  if (!meta) return null;

  const tipoMeta = meta.tipo_meta || 'simples';
  const receitaT = Number(meta.receita_total) || 0;
  const receitaPiso = Number(meta.meta_receita_piso) || 0;
  const receitaAlvo = Number(meta.meta_receita) || 0;
  const receitaSuper = Number(meta.meta_receita_super) || 0;
  const nivelAtingido: 'none' | 'piso' | 'alvo' | 'super' =
    tipoMeta !== 'niveis' ? 'none'
      : receitaT >= receitaSuper && receitaSuper > 0 ? 'super'
        : receitaT >= receitaAlvo && receitaAlvo > 0 ? 'alvo'
          : receitaT >= receitaPiso && receitaPiso > 0 ? 'piso'
            : 'none';
  const nivelBadgeColor = { super: 'bg-violet-50 text-violet-700 border-violet-200', alvo: 'bg-emerald-50 text-emerald-700 border-emerald-200', piso: 'bg-amber-50 text-amber-700 border-amber-200', none: '' }[nivelAtingido];
  const nivelLabel = { super: 'Super Meta', alvo: 'Alvo', piso: 'Piso', none: '' }[nivelAtingido];
  const temNiveis = tipoMeta === 'niveis' && receitaSuper > 0;
  const fill = temNiveis ? Math.min((receitaT / receitaSuper) * 100, 100) : (receitaAlvo > 0 ? Math.min((receitaT / receitaAlvo) * 100, 100) : 0);
  const pisoPct = temNiveis ? (receitaPiso / receitaSuper) * 100 : 0;
  const alvoPct = temNiveis ? (receitaAlvo / receitaSuper) * 100 : 0;
  const barColor = nivelAtingido === 'super' ? '#8b5cf6' : nivelAtingido === 'alvo' ? '#10b981' : nivelAtingido === 'piso' ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted"><Target className="h-3.5 w-3.5 text-muted-foreground" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Meta do mês</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate max-w-[180px]">{meta.nome}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-foreground font-display tabular-nums">{formatBRL(receitaT)}</p>
          {temNiveis && nivelAtingido !== 'none' && (
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md border font-display tabular-nums shrink-0', nivelBadgeColor)}>{nivelLabel} atingida</span>
          )}
        </div>
        {temNiveis ? (
          <div className="mt-3 space-y-2">
            <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fill}%`, backgroundColor: barColor }} />
              <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: `${pisoPct}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: `${alvoPct}%` }} />
            </div>
            <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground/50 flex-wrap">
              <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />Piso {formatBRL(receitaPiso)}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />Alvo {formatBRL(receitaAlvo)}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />Super {formatBRL(receitaSuper)}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1 font-display tabular-nums">de {formatBRL(receitaAlvo)}</p>
        )}
      </div>
    </div>
  );
}

// ─── Material acoplado ───────────────────────────────────────────────────────

function MaterialAcopladoCard({ jornada }: { jornada: Jornada }) {
  const navigate = useNavigate();
  const materiais = (jornada.jornada_materiais ?? []).filter(m => m.meus_materiais);
  if (materiais.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted"><Paperclip className="h-3.5 w-3.5 text-muted-foreground" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Material acoplado</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Materiais produzidos junto com este plano</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 divide-y divide-border/30">
        {materiais.map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/crm/materiais?abrir=${m.meus_materiais!.id}`)}
            className="flex items-center gap-3 w-full text-left py-2.5 group"
          >
            <span className="p-1.5 rounded-lg bg-muted shrink-0"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></span>
            <span className="flex-1 text-[13px] font-medium text-foreground group-hover:text-foreground/80 transition-colors">{m.meus_materiais!.titulo}</span>
            <span className="text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground shrink-0">Abrir</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="mb-6 p-4 rounded-2xl bg-muted/40"><Route className="h-8 w-8 text-muted-foreground/30" /></div>
      <h2 className="text-xl font-bold text-foreground font-display mb-2">Seu plano de ação está sendo preparado</h2>
      <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed">Seu especialista está montando seu plano de ação personalizado. Em breve você terá suas tarefas aqui.</p>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Jornada() {
  const { profile } = useProfile();
  const { data: jornadas, isLoading } = useJornadas();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const jornada = useMemo(() => {
    if (!jornadas || jornadas.length === 0) return null;
    return jornadas.find(j => j.id === selectedId) ?? jornadas[0];
  }, [jornadas, selectedId]);

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!jornada) return <EmptyState />;

  const { total, done, pct } = getJornadaProgress(jornada);
  const estagios = jornada.jornada_estagios ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Hero */}
      <div data-tutorial="jornada-header" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0e06] via-[#1f1208] to-[#1a0e06] px-8 py-10 sm:px-12 sm:py-12">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-55 blur-[100px]" style={{ background: 'radial-gradient(circle, #ea580c, transparent 65%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] w-fit"><Crosshair className="h-5 w-5 text-white/80" /></div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display leading-[1.15]">{jornada.titulo}</h1>
            <p className="text-[13px] text-white/40 max-w-sm leading-relaxed capitalize">{jornadaLabel(jornada)} · {total} {total === 1 ? 'tarefa' : 'tarefas'}</p>
          </div>
          <div className="flex items-center gap-5 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/[0.06] self-start sm:self-auto shrink-0">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="url(#jg)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                <defs><linearGradient id="jg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-base font-bold text-white font-display tabular-nums">{pct}%</span></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-display tabular-nums leading-none">{done}<span className="text-white/30 text-base font-normal">/{total}</span></p>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mt-1">concluídas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnóstico do mês + Meta do mês + Material acoplado */}
      {(jornada.diagnostico_md || jornada.tipo === 'mensal') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <DiagnosticoDoMes jornada={jornada} />
          <div className="lg:col-span-1 space-y-4">
            <MetaDoMes orgId={profile?.organization_id} />
            <MaterialAcopladoCard jornada={jornada} />
          </div>
        </div>
      )}

      {/* Histórico de planos de ação */}
      {jornadas && jornadas.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mr-1"><History className="h-3 w-3" /> Histórico</span>
          {jornadas.map(j => (
            <button key={j.id} onClick={() => setSelectedId(j.id)}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors',
                j.id === jornada.id ? 'bg-foreground text-background shadow-sm' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}>
              {jornadaLabel(j)}
            </button>
          ))}
        </div>
      )}

      {/* Etapas */}
      {estagios.length > 0 ? (
        <div className="space-y-3">
          {estagios.map((e, i) => <EstagioCard key={e.id} estagio={e} index={i} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/60">
          <div className="p-3 rounded-xl bg-muted/40 mb-3"><Route className="h-6 w-6 text-muted-foreground/40" /></div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa neste plano de ação</p>
        </div>
      )}
    </div>
  );
}
