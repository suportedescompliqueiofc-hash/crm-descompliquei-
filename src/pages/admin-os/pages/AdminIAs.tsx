import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Play, Edit3, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';

const MODEL_OPTIONS = [
  { group: 'xAI (Grok)', items: [
    { value: 'grok-4-1-fast-reasoning', label: 'Grok 4.1 Fast Reasoning' },
    { value: 'grok-4-1-fast-non-reasoning', label: 'Grok 4.1 Fast' },
    { value: 'grok-3', label: 'Grok 3' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
  ]},
  { group: 'OpenAI', items: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ]},
  { group: 'OpenRouter', items: [
    { value: 'openrouter/anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'openrouter/anthropic/claude-sonnet-4-6-20250514', label: 'Claude Sonnet 4.6' },
    { value: 'openrouter/google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash' },
    { value: 'openrouter/deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { value: 'openrouter/meta-llama/llama-4-scout', label: 'Llama 4 Scout' },
    { value: 'openrouter/x-ai/grok-4-1-fast', label: 'Grok 4.1 Fast (via OR)' },
  ]},
];

interface IAConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  min_plan: string;
  active: boolean;
}

interface IAHistory {
  id: string;
  user_id: string;
  ia_id: string;
  prompt: string;
  created_at: string;
  platform_users?: { clinic_name: string };
}

export default function AdminIAs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ias, setIas] = useState<IAConfig[]>([]);
  const [history, setHistory] = useState<IAHistory[]>([]);
  
  // Edit Modal
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<IAConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Model suggestions dropdown
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  // Test Modal
  const [showTest, setShowTest] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    document.title = 'IAs · Admin OS | Descompliquei';
    loadData();
  }, []);

  async function loadData() {
    try {
      const [iasRes, histRes] = await Promise.all([
        supabase.from('platform_ia_config').select('*').order('id'),
        supabase.from('platform_ia_history').select(`
          id, ia_id, prompt, created_at,
          platform_users(clinic_name)
        `).order('created_at', { ascending: false }).limit(50),
      ]);

      setIas(iasRes.data as IAConfig[] || []);
      setHistory(histRes.data as any[] || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase.from('platform_ia_config')
        .update({ active: !currentActive }).eq('id', id);
      if (error) throw error;
      setIas(prev => prev.map(ia => ia.id === id ? { ...ia, active: !currentActive } : ia));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  }

  async function saveIA() {
    if (!editData) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('platform_ia_config')
        .update({
          name: editData.name,
          description: editData.description,
          model: editData.model,
          system_prompt: editData.system_prompt
        }).eq('id', editData.id);
      if (error) throw error;
      
      setIas(prev => prev.map(ia => ia.id === editData.id ? editData : ia));
      setShowEdit(false);
      toast({ title: 'Sucesso', description: 'IA atualizada!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function testIA() {
    if (!testInput || !editData) return;
    setTesting(true);
    setTestOutput('');
    try {
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          messages: [
            { role: 'system', content: editData.system_prompt },
            { role: 'user', content: testInput }
          ],
          model: editData.model
        }
      });
      if (error) throw error;
      setTestOutput(data.choices?.[0]?.message?.content || 'Sem resposta');
    } catch (err: any) {
      setTestOutput(`Erro: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  const hojeCount = history.filter(h => new Date(h.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Stack de IA Comercial — Gerenciamento</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure prompts e modelos para as IAs da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Consultas Hoje</p><p className="text-2xl font-bold">{hojeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Consultas esta Semana</p><p className="text-2xl font-bold">{history.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total de IAs</p><p className="text-2xl font-bold text-[#E85D24]">{ias.length}</p></CardContent></Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Codinome</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Nome Exibido</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Modelo</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-right font-bold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#E85D24]"/></td></tr> :
               ias.map(ia => (
                <tr key={ia.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{ia.id}</td>
                  <td className="px-4 py-3">{ia.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1">
                      <span className="text-[10px]">
                        {ia.model?.startsWith('openrouter/') ? '🌐' : ia.model?.startsWith('gpt-') ? '🟢' : '⚡'}
                      </span>
                      {ia.model?.startsWith('openrouter/') ? ia.model.split('/').pop() : ia.model}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={ia.active} onCheckedChange={() => toggleActive(ia.id, ia.active)} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditData(ia); setShowTest(true); }}>
                      <Play className="h-3.5 w-3.5 mr-1"/> Testar
                    </Button>
                    <Button size="sm" onClick={() => { setEditData(ia); setShowEdit(true); }}>
                      <Edit3 className="h-3.5 w-3.5 mr-1"/> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="pt-6">
        <h2 className="text-lg font-bold text-foreground uppercase flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-[#E85D24]"/> Últimas 50 Consultas
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">IA</th>
                  <th className="px-4 py-3 text-left">Input</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(h.created_at), 'dd/MM/yy HH:mm')}</td>
                    <td className="px-4 py-3 font-medium">{h.platform_users?.clinic_name || 'Desconhecido'}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{h.ia_id}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[300px]">{h.prompt.length > 60 ? h.prompt.substring(0,60)+'...' : h.prompt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Editar IA: {editData?.id}</DialogTitle></DialogHeader>
          {editData && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2"><label className="text-sm font-medium">Nome Exibido</label><Input value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} /></div>
                <div className="space-y-1.5 col-span-2"><label className="text-sm font-medium">Descrição</label><Input value={editData.description || ''} onChange={e => setEditData({...editData, description: e.target.value})} /></div>
                <div className="space-y-1.5 col-span-2 relative">
                  <label className="text-sm font-medium">Modelo LLM</label>
                  <Input
                    value={editData.model || ''}
                    onChange={e => setEditData({...editData, model: e.target.value})}
                    onFocus={() => setShowModelSuggestions(true)}
                    placeholder="Digite ou selecione um modelo..."
                  />
                  {showModelSuggestions && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[280px] overflow-y-auto">
                      {MODEL_OPTIONS.map(group => (
                        <div key={group.group}>
                          <p className="px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider bg-muted/50 sticky top-0">{group.group}</p>
                          {group.items
                            .filter(item => !editData.model || item.value.toLowerCase().includes(editData.model.toLowerCase()) || item.label.toLowerCase().includes(editData.model.toLowerCase()))
                            .map(item => (
                            <button key={item.value} type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex justify-between items-center"
                              onClick={() => { setEditData({...editData, model: item.value}); setShowModelSuggestions(false); }}>
                              <span>{item.label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{item.value.length > 30 ? '...' + item.value.slice(-25) : item.value}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      <button type="button" className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 border-t border-border"
                        onClick={() => setShowModelSuggestions(false)}>
                        Fechar sugestões
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {editData.model?.startsWith('openrouter/') ? '🌐 Via OpenRouter' :
                     editData.model?.startsWith('gpt-') || editData.model?.startsWith('o1-') || editData.model?.startsWith('o3-') || editData.model?.startsWith('o4-') ? '🟢 Via OpenAI' :
                     '⚡ Via xAI (Grok)'} — pode digitar qualquer modelo válido
                  </p>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium flex justify-between">
                    System Prompt
                    <span className="text-muted-foreground">{editData.system_prompt.length} chars</span>
                  </label>
                  <Textarea className="min-h-[400px] font-mono text-sm" value={editData.system_prompt} onChange={e => setEditData({...editData, system_prompt: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={saveIA} disabled={saving} className="bg-[#E85D24] text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TEST MODAL */}
      <Dialog open={showTest} onOpenChange={setShowTest}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Testar IA: {editData?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Input de Teste</label>
              <Textarea rows={4} placeholder="O que deseja perguntar para a IA?" value={testInput} onChange={e => setTestInput(e.target.value)} />
            </div>
            <Button onClick={testIA} disabled={testing || !testInput} className="w-full bg-[#E85D24] text-white">
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>} Gerar resposta de teste
            </Button>
            {testOutput && (
              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium">Resposta</label>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap font-mono border border-border max-h-[300px] overflow-y-auto">
                  {testOutput}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
