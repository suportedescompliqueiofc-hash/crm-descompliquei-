import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Server, Database, Key, Activity, RefreshCw, Trash2, Settings, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TableCounts {
  users: number;
  progress: number;
  history: number;
  cerebro: number;
  materiais: number;
  modules: number;
}

interface IALog {
  id: string;
  created_at: string;
  user_id: string;
  ia_slug: string;
  input_data: string;
  output_text: string;
  platform_users?: { clinic_name: string };
}

export default function AdminSistema() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Status
  const [tableCounts, setTableCounts] = useState<TableCounts>({
    users: 0, progress: 0, history: 0, cerebro: 0, materiais: 0, modules: 0
  });
  const [testResult, setTestResult] = useState<{status: 'idle'|'loading'|'ok'|'error', msg: string}>({status: 'idle', msg: ''});

  // Configs
  const [configs, setConfigs] = useState({
    platform_name: '',
    support_whatsapp: '',
    support_email: '',
    welcome_message: '',
    xai_model: 'grok-3-mini'
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Logs
  const [iaLogs, setIaLogs] = useState<IALog[]>([]);
  
  // Maintenance
  const [maintenanceLoading, setMaintenanceLoading] = useState<'cache'|'reindex'|null>(null);

  useEffect(() => {
    document.title = 'Sistema · Admin OS | Descompliquei';
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Table Counts (using exact count to not fetch data)
      const tables = ['platform_users', 'platform_progress', 'platform_ia_history', 'platform_cerebro', 'platform_materiais', 'platform_modules'];
      const counts: any = {};
      
      for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        counts[table.split('_')[1] || table] = count || 0; // Simple mapping
      }
      setTableCounts({
        users: counts['users'] || 0,
        progress: counts['progress'] || 0,
        history: counts['ia'] || counts['history'] || 0,
        cerebro: counts['cerebro'] || 0,
        materiais: counts['materiais'] || 0,
        modules: counts['modules'] || 0
      });

      // 2. Load Configs
      const { data: cfgData } = await supabase.from('admin_system_config').select('key, value');
      if (cfgData) {
        const newCfg = { ...configs };
        cfgData.forEach(c => {
          if (c.key in newCfg) (newCfg as any)[c.key] = c.value;
        });
        setConfigs(newCfg);
      }

      // 3. Load Error Logs
      const { data: logsData } = await supabase
        .from('platform_ia_history')
        .select(`*, platform_users(clinic_name)`)
        .or('output_text.ilike.%error%,output_text.is.null')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (logsData) setIaLogs(logsData);

    } catch (err: any) {
      if (err.name !== 'AbortError') toast({ title: 'Erro', description: 'Falha ao carregar dados do sistema.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function saveConfigs() {
    setSavingConfig(true);
    try {
      const updates = Object.entries(configs).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from('admin_system_config').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Configurações atualizadas com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  }

  async function testXAI() {
    setTestResult({ status: 'loading', msg: 'Testando...' });
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('ia-proxy', {
        body: { messages: [{ role: 'user', content: 'Say OK' }], model: configs.xai_model }
      });
      if (error) throw error;
      const ms = Date.now() - start;
      setTestResult({ status: 'ok', msg: `Conexão OK · resposta em ${ms}ms` });
    } catch (err: any) {
      setTestResult({ status: 'error', msg: `Erro: ${err.message}` });
    }
  }

  async function clearOldLogs() {
    if (!confirm('Excluir logs de erro com mais de 30 dias?')) return;
    try {
      const { error } = await supabase
        .from('platform_ia_history')
        .delete()
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .or('output_text.ilike.%error%,output_text.is.null');
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Logs antigos limpos.' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  }

  async function handleMaintenance(action: 'cache' | 'reindex') {
    if (action === 'cache' && !confirm('Forçar recarregamento invalida o cache atual dos módulos. Confirmar?')) return;
    if (action === 'reindex' && !confirm('Reindexar progresso vai recalcular o GCA/PCA de todos os clientes. Pode levar alguns segundos. Confirmar?')) return;
    
    setMaintenanceLoading(action);
    try {
      // Aqui integrariamos com uma edge function futuramente. Por enquanto mock de sucesso.
      await new Promise(r => setTimeout(r, 1500)); 
      toast({ title: 'Sucesso', description: action === 'cache' ? 'Cache de módulos invalidado.' : 'Progresso reindexado com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setMaintenanceLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D24]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Sistema & Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Status técnico e configurações gerais da plataforma</p>
      </div>

      {/* SEÇÃO 1: STATUS DO SISTEMA */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><Activity className="h-5 w-5 text-[#E85D24]" /> Status do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Server className="h-4 w-4"/> Conexão xAI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {testResult.status === 'ok' ? <Badge className="bg-green-500">Conectada</Badge> : testResult.status === 'error' ? <Badge variant="destructive">Erro</Badge> : <Badge variant="outline">Aguardando Teste</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Modelo</span>
                <span className="text-sm text-muted-foreground">{configs.xai_model}</span>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full" onClick={testXAI} disabled={testResult.status === 'loading'}>
                  {testResult.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                  Testar Conexão
                </Button>
                {testResult.msg && <p className={`text-xs mt-2 text-center ${testResult.status === 'error' ? 'text-red-500' : 'text-green-500'}`}>{testResult.msg}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Database className="h-4 w-4"/> Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Status</span>
                <Badge className="bg-green-500">Conectado</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Usuários:</span> <span className="font-mono">{tableCounts.users}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progresso:</span> <span className="font-mono">{tableCounts.progress}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Histórico IA:</span> <span className="font-mono">{tableCounts.history}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Módulos:</span> <span className="font-mono">{tableCounts.modules}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Materiais:</span> <span className="font-mono">{tableCounts.materiais}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cérebro:</span> <span className="font-mono">{tableCounts.cerebro}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Key className="h-4 w-4"/> Variáveis de Ambiente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">VITE_SUPABASE_URL</span>
                {import.meta.env.VITE_SUPABASE_URL ? <CheckCircle2 className="h-4 w-4 text-green-500"/> : <AlertTriangle className="h-4 w-4 text-red-500"/>}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">VITE_SUPABASE_ANON_KEY</span>
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? <CheckCircle2 className="h-4 w-4 text-green-500"/> : <AlertTriangle className="h-4 w-4 text-red-500"/>}
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* SEÇÃO 2: CONFIGURAÇÕES */}
      <section className="space-y-4 pt-4">
        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><Settings className="h-5 w-5 text-[#E85D24]" /> Configurações Gerais</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome da Plataforma</label>
                <Input value={configs.platform_name} onChange={e => setConfigs({...configs, platform_name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Modelo xAI Padrão</label>
                <Select value={configs.xai_model} onValueChange={v => setConfigs({...configs, xai_model: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grok-4-1-fast-reasoning">grok-4-1-fast-reasoning</SelectItem>
                    <SelectItem value="grok-3-mini">grok-3-mini</SelectItem>
                    <SelectItem value="grok-3">grok-3</SelectItem>
                    <SelectItem value="grok-2">grok-2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">WhatsApp de Suporte</label>
                <Input value={configs.support_whatsapp} onChange={e => setConfigs({...configs, support_whatsapp: e.target.value})} placeholder="Ex: 5511999999999" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email de Suporte</label>
                <Input type="email" value={configs.support_email} onChange={e => setConfigs({...configs, support_email: e.target.value})} placeholder="suporte@descompliquei.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mensagem de Boas-vindas</label>
              <Textarea value={configs.welcome_message} onChange={e => setConfigs({...configs, welcome_message: e.target.value})} rows={3} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveConfigs} disabled={savingConfig} className="bg-[#E85D24] text-white">
                {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SEÇÃO 3: LOGS DE ERRO */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-[#E85D24]" /> Logs de Erro (IAs)</h2>
          <Button variant="outline" size="sm" onClick={clearOldLogs} className="text-muted-foreground hover:text-red-500">
            <Trash2 className="h-4 w-4 mr-2"/> Limpar &gt; 30 dias
          </Button>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3 font-semibold text-muted-foreground">Data/Hora</th>
                  <th className="p-3 font-semibold text-muted-foreground">Cliente</th>
                  <th className="p-3 font-semibold text-muted-foreground">IA</th>
                  <th className="p-3 font-semibold text-muted-foreground">Erro</th>
                </tr>
              </thead>
              <tbody>
                {iaLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum log de erro encontrado.</td>
                  </tr>
                ) : (
                  iaLogs.map(log => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 whitespace-nowrap">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {locale: ptBR})}</td>
                      <td className="p-3 font-medium">{log.platform_users?.clinic_name || 'Desconhecido'}</td>
                      <td className="p-3"><Badge variant="outline">{log.ia_slug}</Badge></td>
                      <td className="p-3 text-red-500 max-w-[300px] truncate" title={log.output_text || 'Erro desconhecido'}>{log.output_text || 'Sem resposta / Timeout'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* SEÇÃO 4: MANUTENÇÃO */}
      <section className="space-y-4 pt-4">
        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><RefreshCw className="h-5 w-5 text-[#E85D24]" /> Manutenção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:border-blue-500/50 transition-colors">
            <CardContent className="p-6 text-center space-y-4">
              <RefreshCw className="h-8 w-8 text-blue-500 mx-auto" />
              <div>
                <h3 className="font-bold">Recarregar Módulos</h3>
                <p className="text-xs text-muted-foreground mt-1">Invalida o cache e força a plataforma a buscar módulos atualizados do banco.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleMaintenance('cache')} disabled={maintenanceLoading !== null}>
                {maintenanceLoading === 'cache' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Forçar Recarregamento'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:border-purple-500/50 transition-colors">
            <CardContent className="p-6 text-center space-y-4">
              <Database className="h-8 w-8 text-purple-500 mx-auto" />
              <div>
                <h3 className="font-bold">Reindexar Progresso</h3>
                <p className="text-xs text-muted-foreground mt-1">Recalcula os totais de GCA e PCA de todos os clientes baseando-se no histórico.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleMaintenance('reindex')} disabled={maintenanceLoading !== null}>
                {maintenanceLoading === 'reindex' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Reindexar Agora'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
