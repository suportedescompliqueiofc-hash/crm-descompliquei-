import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, Loader2, Brain, FileText } from 'lucide-react';

type StepName = 'aprenda' | 'construa' | 'valide' | 'finalize';

interface ProgressRow {
  module_id: string;
  completed: boolean;
  completed_at: string | null;
}

interface ProgressDetailRow {
  module_id: string;
  step: StepName;
  completed?: boolean | null;
}

interface ModuleRow {
  id: string;
  title: string;
  pillar: number | null;
  pilar_id: string | null;
  order_index: number | null;
}

interface BlockRow {
  id: string;
  tipo: string;
  titulo: string;
  config: Record<string, any> | null;
  ordem_index: number | null;
  salvar_no_cerebro: boolean | null;
}

interface ResponseRow {
  id: string;
  block_id: string;
  module_id: string;
  response: any;
  completed: boolean | null;
  updated_at: string | null;
}

interface LoadedResponses {
  loading: boolean;
  rows: Array<ResponseRow & { block?: BlockRow }>;
}

interface Props {
  clientId: string;
  progressData: ProgressRow[];
  progressDetails: ProgressDetailRow[];
}

const STEP_LABELS: Record<StepName, string> = {
  aprenda: 'Aprenda',
  construa: 'Construa',
  valide: 'Valide',
  finalize: 'Finalize',
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  texto_guiado: 'Texto Guiado',
  matriz_tabela: 'Matriz / Tabela',
  script_atendimento: 'Script',
  selecao_estrategica: 'Selecao Estrategica',
  calculadora: 'Calculadora',
  criacao_oferta: 'Criacao de Oferta',
  mapa_icp: 'Mapa de ICP',
  checklist_acao: 'Checklist',
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hasValue(value: any) {
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasValue);
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function keyFromLabel(label: string, index: number, prefix: string) {
  return `${slugify(label || `${prefix}_${index + 1}`) || `${prefix}_${index + 1}`}_${index}`;
}

function renderSimpleValue(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, inner]) => hasValue(inner))
      .map(([key, inner]) => `${key.replace(/_/g, ' ')}: ${typeof inner === 'object' ? renderSimpleValue(inner) : String(inner)}`)
      .join(' | ');
  }
  return String(value ?? '');
}

function renderBlockResponse(row: ResponseRow & { block?: BlockRow }) {
  const block = row.block;
  const response = row.response || {};
  const config = block?.config || {};

  if (!hasValue(response)) {
    return <p className="text-xs text-muted-foreground">Resposta vazia.</p>;
  }

  switch (block?.tipo) {
    case 'texto_guiado':
      return <p className="whitespace-pre-wrap text-sm text-foreground">{response.texto || renderSimpleValue(response)}</p>;

    case 'matriz_tabela': {
      const rows = Array.isArray(response.rows) ? response.rows : [];
      const columns = Array.isArray(config.colunas) ? config.colunas : [];
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-xs">
            <thead className="bg-muted/40">
              <tr>
                {columns.map((column: any, index: number) => (
                  <th key={`${column.label || index}`} className="px-3 py-2 text-left font-bold text-muted-foreground">
                    {column.label || `Coluna ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.filter(hasValue).map((item: Record<string, any>, rowIndex: number) => (
                <tr key={rowIndex}>
                  {columns.map((column: any, columnIndex: number) => {
                    const key = slugify(column.label || `coluna_${columnIndex + 1}`) || `coluna_${columnIndex + 1}`;
                    return <td key={key} className="px-3 py-2 text-foreground">{item[key] || '-'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'script_atendimento': {
      const stages = Array.isArray(config.etapas) ? config.etapas : [];
      const answers = response.answers || {};
      return (
        <div className="space-y-3">
          {stages.map((stage: any, index: number) => {
            const key = stage.id || keyFromLabel(stage.nome, index, 'etapa');
            return (
              <div key={key} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stage.nome || `Etapa ${index + 1}`}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{answers[key] || '-'}</p>
              </div>
            );
          })}
        </div>
      );
    }

    case 'selecao_estrategica': {
      const selected = Array.isArray(response.selected) ? response.selected : response.selected ? [response.selected] : [];
      const options = Array.isArray(config.opcoes) ? config.opcoes : [];
      const labels = selected.map((value: string) => options.find((option: any) => option.valor === value)?.label || value);
      return <p className="text-sm font-medium text-foreground">{labels.join(', ') || '-'}</p>;
    }

    case 'calculadora': {
      const inputs = response.inputs || {};
      const results = Array.isArray(config.campos_resultado) ? config.campos_resultado : [];
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Campos</p>
            {Object.entries(inputs).map(([key, value]) => (
              <p key={key} className="text-sm text-foreground">{key.replace(/_/g, ' ')}: {String(value)}</p>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultados configurados</p>
            {results.length === 0 ? <p className="text-sm text-muted-foreground">Sem resultados configurados.</p> : results.map((item: any, index: number) => (
              <p key={index} className="text-sm text-foreground">{item.resultado_label || item.label}: {item.formula || '-'}</p>
            ))}
          </div>
        </div>
      );
    }

    case 'criacao_oferta': {
      const values = response.values || {};
      return (
        <div className="rounded-lg border border-[#E85D24]/20 bg-[#E85D24]/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#E85D24]">Resumo da oferta</p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(values).filter(([, value]) => hasValue(value)).map(([key, value]) => (
              <div key={key}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'mapa_icp': {
      const sections = response.sections || {};
      return (
        <div className="space-y-3">
          {Object.entries(sections).filter(([, value]) => hasValue(value)).map(([sectionKey, fields]: [string, any]) => (
            <div key={sectionKey} className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{sectionKey.replace(/_/g, ' ')}</p>
              {Object.entries(fields || {}).filter(([, value]) => hasValue(value)).map(([fieldKey, value]) => (
                <p key={fieldKey} className="mt-1 text-sm text-foreground">{fieldKey.replace(/_/g, ' ')}: {String(value)}</p>
              ))}
            </div>
          ))}
        </div>
      );
    }

    case 'checklist_acao': {
      const items = response.items || {};
      const configuredItems = Array.isArray(config.itens) ? config.itens : [];
      return (
        <div className="space-y-2">
          {configuredItems.map((item: any, index: number) => {
            const key = item.id || keyFromLabel(item.texto, index, 'item');
            const state = items[key] || {};
            return (
              <div key={key} className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
                {state.checked ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/50" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{item.texto || `Item ${index + 1}`}</p>
                  {state.resposta && <p className="mt-1 text-xs text-muted-foreground">{state.resposta}</p>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    default:
      return <p className="text-sm text-foreground">{renderSimpleValue(response)}</p>;
  }
}

function ModuleStepIndicator({ completedCount }: { completedCount: number }) {
  if (completedCount >= 4) {
    return <CheckCircle2 className="h-4 w-4 text-[#E85D24]" />;
  }

  if (completedCount > 0) {
    return (
      <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-[#E85D24]/50">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[#E85D24]" />
      </div>
    );
  }

  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function getNormalizedStepState(steps: Set<StepName>, moduleCompleted: boolean) {
  return {
    aprenda: steps.has('aprenda') || steps.has('construa') || steps.has('valide') || steps.has('finalize') || moduleCompleted,
    construa: steps.has('construa') || steps.has('valide') || steps.has('finalize') || moduleCompleted,
    valide: steps.has('valide') || steps.has('finalize') || moduleCompleted,
    finalize: moduleCompleted,
  } satisfies Record<StepName, boolean>;
}

export default function AbaProgresso({ clientId, progressData, progressDetails }: Props) {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [responsesByModule, setResponsesByModule] = useState<Record<string, LoadedResponses>>({});

  useEffect(() => {
    async function loadModules() {
      const { data } = await supabase
        .from('platform_modules')
        .select('id, title, pillar, pilar_id, order_index')
        .order('pillar', { ascending: true })
        .order('order_index', { ascending: true });
      setModules((data || []) as ModuleRow[]);
    }

    void loadModules();
  }, []);

  const progressByModule = useMemo(() => {
    return progressData.reduce<Record<string, ProgressRow>>((acc, item) => {
      acc[item.module_id] = item;
      return acc;
    }, {});
  }, [progressData]);

  const detailByModule = useMemo(() => {
    return progressDetails.reduce<Record<string, Set<StepName>>>((acc, item) => {
      if (!acc[item.module_id]) acc[item.module_id] = new Set();
      if (item.completed === true) acc[item.module_id].add(item.step);
      return acc;
    }, {});
  }, [progressDetails]);

  const visibleModules = useMemo(() => {
    const startedIds = new Set([
      ...progressData.map((item) => item.module_id),
      ...progressDetails.map((item) => item.module_id),
    ]);
    return modules.filter((moduleItem) => startedIds.has(moduleItem.id));
  }, [modules, progressData, progressDetails]);

  const loadResponses = async (moduleId: string) => {
    if (responsesByModule[moduleId]?.rows) return;

    setResponsesByModule((prev) => ({ ...prev, [moduleId]: { loading: true, rows: [] } }));

    const [responsesRes, blocksRes] = await Promise.all([
      supabase
        .from('platform_block_responses')
        .select('id, block_id, module_id, response, completed, updated_at')
        .eq('user_id', clientId)
        .eq('module_id', moduleId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('platform_module_blocks')
        .select('id, tipo, titulo, config, ordem_index, salvar_no_cerebro')
        .eq('module_id', moduleId)
        .order('ordem_index', { ascending: true }),
    ]);

    const blockMap = ((blocksRes.data || []) as BlockRow[]).reduce<Record<string, BlockRow>>((acc, block) => {
      acc[block.id] = block;
      return acc;
    }, {});

    const rows = ((responsesRes.data || []) as ResponseRow[])
      .map((response) => ({ ...response, block: blockMap[response.block_id] }))
      .sort((a, b) => (a.block?.ordem_index || 0) - (b.block?.ordem_index || 0));

    setResponsesByModule((prev) => ({ ...prev, [moduleId]: { loading: false, rows } }));
  };

  const toggleModule = (moduleId: string) => {
    const next = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(next);
    if (next) void loadResponses(next);
  };

  if (visibleModules.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
          Este cliente ainda nao iniciou nenhum modulo.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visibleModules.map((moduleItem) => {
        const progress = progressByModule[moduleItem.id];
        const steps = detailByModule[moduleItem.id] || new Set<StepName>();
        const normalizedSteps = getNormalizedStepState(steps, !!progress?.completed);
        const completedCount = Object.values(normalizedSteps).filter(Boolean).length;
        const completed = completedCount === 4;
        const expanded = expandedModuleId === moduleItem.id;
        const responseState = responsesByModule[moduleItem.id];

        return (
          <Card key={moduleItem.id} className={`border ${completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ModuleStepIndicator completedCount={completedCount} />
                    <p className="truncate text-sm font-bold text-foreground">
                      Modulo {moduleItem.id} - {moduleItem.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {completed && progress?.completed_at
                      ? `Concluido em ${formatDate(progress.completed_at)}`
                      : completedCount > 0
                        ? `${Math.round((completedCount / 4) * 100)}% concluído`
                        : 'Nenhuma etapa iniciada'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(['aprenda', 'construa', 'valide', 'finalize'] as StepName[]).map((step) => {
                      const stepDone = normalizedSteps[step];
                      return (
                        <Badge key={step} className={`border text-[10px] ${stepDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}`}>
                          {stepDone ? `✓ ${STEP_LABELS[step]}` : STEP_LABELS[step]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 border-[#E85D24]/40 text-xs text-[#E85D24] hover:bg-[#E85D24]/10"
                  onClick={() => toggleModule(moduleItem.id)}
                >
                  {expanded ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
                  Ver respostas do Construa
                </Button>
              </div>

              {expanded && (
                <div className="mt-4 border-t border-border pt-4">
                  {responseState?.loading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#E85D24]" />
                      Carregando respostas...
                    </div>
                  ) : !responseState || responseState.rows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma resposta do Construa registrada neste modulo.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {responseState.rows.map((row) => (
                        <div key={row.id} className="rounded-xl border border-border bg-background p-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <FileText className="h-4 w-4 text-[#E85D24]" />
                                <p className="font-semibold text-foreground">{row.block?.titulo || 'Bloco sem titulo'}</p>
                                <Badge variant="outline" className="text-[10px]">
                                  {BLOCK_TYPE_LABELS[row.block?.tipo || ''] || row.block?.tipo || 'Bloco'}
                                </Badge>
                                {row.block?.salvar_no_cerebro && (
                                  <Badge className="border-0 bg-sky-500/15 text-[10px] text-sky-700">
                                    <Brain className="mr-1 h-3 w-3" />
                                    🧠 Sincronizado com Cerebro
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">Atualizado em {formatDate(row.updated_at)}</p>
                            </div>
                            {row.completed && <Badge className="border-0 bg-emerald-500/20 text-[10px] text-emerald-700">Completo</Badge>}
                          </div>
                          {renderBlockResponse(row)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
