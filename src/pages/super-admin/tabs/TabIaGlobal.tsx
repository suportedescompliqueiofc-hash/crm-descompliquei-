import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DEFAULT_PROMPT_BASE from '../../../../.prompt_base_descompliquei.txt?raw';

type ConfigResponse = {
  ok: boolean;
  config?: {
    prompt_base_agente?: string;
    prompt_base_agente_default?: string;
    descricao?: string | null;
    atualizado_em?: string | null;
  };
  error?: string;
};

function formatDateTimeBR(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).format(date).replace(', ', ' às ');
}

function formatTimeOnlyBR(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

async function invokeConfigAction(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-system-ai-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'x-client-info': 'supabase-js',
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: ConfigResponse | null = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || raw || `HTTP ${response.status}`);
  }

  return data;
}

export default function TabIaGlobal({ toast }: { toast: any }) {
  const [promptBase, setPromptBase] = useState('');
  const [defaultPromptBase, setDefaultPromptBase] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [descricao, setDescricao] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const charCount = useMemo(() => promptBase.length, [promptBase]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await invokeConfigAction({ action: 'get' });
      if (!data?.ok) throw new Error(data?.error || 'Falha ao carregar a configuração global da IA.');

      const currentPrompt = data.config?.prompt_base_agente ?? '';
      const defaultPrompt = data.config?.prompt_base_agente_default ?? '';
      setDefaultPromptBase(defaultPrompt);

      if (!currentPrompt.trim() && !defaultPrompt.trim()) {
        const bootstrapData = await invokeConfigAction({ action: 'save', valor: DEFAULT_PROMPT_BASE, seedDefault: true });
        if (!bootstrapData?.ok) throw new Error(bootstrapData?.error || 'Falha ao inicializar o prompt base padrão.');

        const bootstrappedAt = bootstrapData.config?.atualizado_em ?? new Date().toISOString();
        setPromptBase(bootstrapData.config?.prompt_base_agente ?? DEFAULT_PROMPT_BASE);
        setDefaultPromptBase(DEFAULT_PROMPT_BASE);
        setDescricao(data.config?.descricao ?? '');
        setLastUpdated(bootstrappedAt);
        setStatusMessage(`Salvo em ${formatTimeOnlyBR(bootstrappedAt)}. Cache da edge function expira em até 5 minutos.`);
        toast({ title: 'IA Global inicializada', description: 'O prompt padrão foi salvo no banco a partir do backup local.' });
        return;
      }

      setPromptBase(currentPrompt || defaultPrompt || DEFAULT_PROMPT_BASE);
      setDescricao(data.config?.descricao ?? '');
      setLastUpdated(data.config?.atualizado_em ?? null);
      setStatusMessage('');
    } catch (err: any) {
      toast({ title: 'Erro ao carregar IA Global', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const handleSave = async () => {
    if (!promptBase.trim()) {
      toast({ title: 'Prompt vazio', description: 'O prompt base não pode ficar vazio.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const data = await invokeConfigAction({ action: 'save', valor: promptBase });
      if (!data?.ok) throw new Error(data?.error || 'Falha ao salvar o prompt base.');

      const updatedAt = data.config?.atualizado_em ?? new Date().toISOString();
      setPromptBase(data.config?.prompt_base_agente ?? promptBase);
      setLastUpdated(updatedAt);
      setSaveSuccess(true);
      setStatusMessage(`Salvo em ${formatTimeOnlyBR(updatedAt)}. Cache da edge function expira em até 5 minutos.`);
      toast({ title: 'Sucesso', description: 'Prompt base salvo com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const hasStoredDefault = defaultPromptBase.trim().length > 0;
      const data = await invokeConfigAction(
        hasStoredDefault
          ? { action: 'reset' }
          : { action: 'save', valor: DEFAULT_PROMPT_BASE, seedDefault: true },
      );
      if (!data?.ok) throw new Error(data?.error || 'Falha ao resetar o prompt base.');

      const updatedAt = data.config?.atualizado_em ?? new Date().toISOString();
      setPromptBase(data.config?.prompt_base_agente ?? '');
      if (!hasStoredDefault) {
        setDefaultPromptBase(DEFAULT_PROMPT_BASE);
      }
      setLastUpdated(updatedAt);
      setSaveSuccess(true);
      setStatusMessage(`Salvo em ${formatTimeOnlyBR(updatedAt)}. Cache da edge function expira em até 5 minutos.`);
      toast({ title: 'Prompt restaurado', description: 'O prompt base voltou ao padrão da Descompliquei.' });
    } catch (err: any) {
      toast({ title: 'Erro ao resetar', description: err.message, variant: 'destructive' });
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-[#E85D24]">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Prompt Base do Agente de Pre-Atendimento</CardTitle>
            <CardDescription className="max-w-3xl">
              Este prompt define o comportamento global da IA para todos os clientes. Alterações entram em vigor na próxima mensagem processada (cache de 5 min).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>Última atualização: {formatDateTimeBR(lastUpdated)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#E85D24]" />
              Carregando configuração global...
            </div>
          </div>
        ) : (
          <>
            {descricao ? (
              <p className="text-xs text-muted-foreground">
                {descricao}
              </p>
            ) : null}

            <div className="relative">
              <Textarea
                value={promptBase}
                onChange={(e) => setPromptBase(e.target.value)}
                className="min-h-[400px] font-mono text-sm leading-6 resize-y pr-20"
                placeholder="Edite aqui o prompt base global da IA..."
              />
              <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
                {charCount.toLocaleString('pt-BR')} caracteres
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSave} disabled={saving || loading} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Prompt Base
                </Button>

                <Button variant="outline" onClick={() => setShowResetDialog(true)} disabled={resetting || loading}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resetar para padrão
                </Button>

                <Button variant="ghost" size="sm" onClick={loadConfig} disabled={loading || saving || resetting} className="text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recarregar
                </Button>
              </div>

              <div className="min-h-5 text-sm">
                {saveSuccess ? (
                  <span className="inline-flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {statusMessage}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{statusMessage || 'As alterações são aplicadas na próxima mensagem processada.'}</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar para padrão</DialogTitle>
            <DialogDescription>
              Tem certeza? Isso substituirá o prompt atual pelo prompt padrão da Descompliquei.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={resetting} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90">
              {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Resetar para padrão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
