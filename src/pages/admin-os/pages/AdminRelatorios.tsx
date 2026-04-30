import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Trophy, Bot, BookOpen, Target, Loader2, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, subWeeks, isAfter, subDays, format } from 'date-fns';

export default function AdminRelatorios() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [clients, setClients] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [progressDetails, setProgressDetails] = useState<any[]>([]);
  const [iaHistory, setIaHistory] = useState<any[]>([]);
  const [moduleBlocks, setModuleBlocks] = useState<any[]>([]);
  const [blockResponses, setBlockResponses] = useState<any[]>([]);
  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'clientes' | 'modulos' | 'ias'>((sessionStorage.getItem('admin_relatorios_tab') as any) || 'overview');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedClient, setSelectedClient] = useState('all');

  useEffect(() => {
    document.title = 'Relatórios · Admin OS | Descompliquei';
    loadData();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('admin_relatorios_tab', activeTab);
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch sequentially to prevent Supabase 'AbortError: Lock broken'
      const { data: clientsData } = await supabase.from('platform_users').select('*');
      const { data: modulesData } = await supabase.from('platform_modules').select('id, title, pillar, min_plan');
      const { data: progressData } = await supabase.from('platform_progress').select('*');
      const { data: progressDetailsData } = await supabase.from('platform_module_progress_detail').select('*');
      const { data: iaData } = await supabase.from('platform_ia_history').select('*');
      const { data: blocksData } = await supabase.from('platform_module_blocks').select('*');
      const { data: blockResponsesData } = await supabase.from('platform_block_responses').select('*');

      setClients(clientsData || []);
      setModules(modulesData || []);
      setProgress(progressData || []);
      setProgressDetails(progressDetailsData || []);
      setIaHistory(iaData || []);
      setModuleBlocks(blocksData || []);
      setBlockResponses(blockResponsesData || []);

    } catch (err: any) {
      if (err.name !== 'AbortError' && err.message?.indexOf('AbortError') === -1) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }

  // --- DERIVED METRICS ---

  const completedProgress = useMemo(() => progress.filter(p => p.completed), [progress]);

  // General Stats
  const stats = useMemo(() => {
    // Top Module
    const moduleCounts = completedProgress.reduce((acc, p) => {
      acc[p.module_id] = (acc[p.module_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topModuleId = Object.keys(moduleCounts).sort((a, b) => moduleCounts[b] - moduleCounts[a])[0];
    const topModuleTitle = modules.find(m => m.id === topModuleId)?.title || 'Nenhum';

    // Top IA
    const iaCounts = iaHistory.reduce((acc, h) => {
      acc[h.ia_type] = (acc[h.ia_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topIaType = Object.keys(iaCounts).sort((a, b) => iaCounts[b] - iaCounts[a])[0];

    // GCA vs PCA
    const gcaClients = clients.filter(c => c.plan?.toUpperCase() === 'GCA');
    const pcaClients = clients.filter(c => c.plan?.toUpperCase() === 'PCA');
    const totalModules = modules.length || 1;
    
    const getAvgProgress = (clientList: any[]) => {
      if (!clientList.length) return 0;
      const totalCompletedByGroup = completedProgress.filter(p => clientList.find(c => c.id === p.user_id)).length;
      return Math.round((totalCompletedByGroup / (clientList.length * totalModules)) * 100);
    };

    return {
      totalModulos: completedProgress.length,
      totalConsultas: iaHistory.length,
      moduloTop: topModuleTitle,
      iaTop: topIaType || 'Nenhuma',
      gcaAvg: getAvgProgress(gcaClients),
      pcaAvg: getAvgProgress(pcaClients)
    };
  }, [completedProgress, iaHistory, modules, clients]);

  // Chart 1: Semanas (Semanas passadas)
  const chartSemanas = useMemo(() => {
    const today = new Date();
    const weeks = Array.from({ length: 8 }).map((_, i) => {
      const start = startOfWeek(subWeeks(today, 7 - i));
      return { name: `Sem ${8 - i}`, start, count: 0 };
    });

    completedProgress.forEach(p => {
      if (!p.completed_at) return;
      const d = new Date(p.completed_at);
      const week = weeks.find((w, i) => {
        const nextStart = weeks[i + 1]?.start || new Date();
        return isAfter(d, w.start) && (i === 7 || !isAfter(d, nextStart));
      });
      if (week) week.count++;
    });

    return weeks.map(w => ({ name: w.name, modulos: w.count }));
  }, [completedProgress]);

  // Chart 2: Níveis (Agrupando clientes por quantidade de módulos concluídos)
  const chartFases = useMemo(() => {
    const counts = { 'Iniciante (0)': 0, 'Básico (1-3)': 0, 'Intermediário (4-7)': 0, 'Avançado (8+)': 0 };
    clients.forEach(c => {
      const comp = completedProgress.filter(p => p.user_id === c.id).length;
      if (comp === 0) counts['Iniciante (0)']++;
      else if (comp <= 3) counts['Básico (1-3)']++;
      else if (comp <= 7) counts['Intermediário (4-7)']++;
      else counts['Avançado (8+)']++;
    });
    return Object.entries(counts).map(([name, clientes]) => ({ name, clientes }));
  }, [clients, completedProgress]);

  // Chart 3: IAs 30 dias
  const chartIAs = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentIa = iaHistory.filter(h => isAfter(new Date(h.created_at), thirtyDaysAgo));
    const counts = recentIa.reduce((acc, h) => {
      acc[h.ia_type] = (acc[h.ia_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [iaHistory]);

  // Module Rankings
  const moduleRankings = useMemo(() => {
    return modules.map(m => {
      const started = new Set(progressDetails.filter(p => p.module_id === m.id).map(p => p.user_id)).size;
      const completed = completedProgress.filter(p => p.module_id === m.id).length;
      const rate = started > 0 ? Math.round((completed / started) * 100) : 0;
      const abandono = started > 0 ? Math.round(((started - completed) / started) * 100) : 0;
      return { ...m, started, completed, rate, abandono };
    });
  }, [modules, progressDetails, completedProgress]);

  const topModules = [...moduleRankings].sort((a, b) => b.rate - a.rate).filter(m => m.started > 0).slice(0, 5);
  const abandonoModules = [...moduleRankings].sort((a, b) => b.abandono - a.abandono).filter(m => m.started > 0).slice(0, 5);

  const construaEngagement = useMemo(() => {
    const blockMap = moduleBlocks.reduce((acc, block) => {
      acc[block.id] = block;
      return acc;
    }, {} as Record<string, any>);

    const typeCounts = blockResponses.reduce((acc, response) => {
      const type = blockMap[response.block_id]?.tipo || 'desconhecido';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTypeEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    const blockRankings = moduleBlocks.map(block => {
      const count = blockResponses.filter(response => response.block_id === block.id).length;
      return {
        id: block.id,
        titulo: block.titulo,
        tipo: block.tipo,
        module_id: block.module_id,
        count,
      };
    }).filter(block => block.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);

    const moduleCompletion = modules.map(moduleItem => {
      const moduleBlockIds = moduleBlocks.filter(block => block.module_id === moduleItem.id).map(block => block.id);
      const responsesForModule = blockResponses.filter(response => response.module_id === moduleItem.id);
      const students = Array.from(new Set(responsesForModule.map(response => response.user_id)));
      const completedStudents = students.filter(userId => {
        if (moduleBlockIds.length === 0) return false;
        return moduleBlockIds.every(blockId =>
          responsesForModule.some(response => response.user_id === userId && response.block_id === blockId && response.completed)
        );
      }).length;

      return {
        id: moduleItem.id,
        title: moduleItem.title,
        students: students.length,
        completedStudents,
        rate: students.length > 0 ? Math.round((completedStudents / students.length) * 100) : 0,
      };
    }).filter(moduleItem => moduleItem.students > 0).sort((a, b) => b.rate - a.rate).slice(0, 6);

    const syncedCount = blockResponses.filter(response => blockMap[response.block_id]?.salvar_no_cerebro).length;

    return {
      topType: topTypeEntry ? topTypeEntry[0] : 'Nenhum',
      topTypeCount: topTypeEntry ? topTypeEntry[1] : 0,
      blockRankings,
      moduleCompletion,
      syncedCount,
      totalResponses: blockResponses.length,
    };
  }, [moduleBlocks, blockResponses, modules]);

  // IA Rankings
  const iaRankings = useMemo(() => {
    const types = Array.from(new Set(iaHistory.map(h => h.ia_type)));
    const oneWeekAgo = subDays(new Date(), 7);
    return types.map(type => {
      const history = iaHistory.filter(h => h.ia_type === type);
      const total = history.length;
      const estaSemana = history.filter(h => isAfter(new Date(h.created_at), oneWeekAgo)).length;
      const distinctClients = new Set(history.map(h => h.user_id)).size;
      return { name: type, total, estaSemana, distinctClients };
    }).sort((a, b) => b.total - a.total);
  }, [iaHistory]);

  // Specific Client Stats
  const selectedClientData = useMemo(() => {
    if (selectedClient === 'none') return null;
    const client = clients.find(c => c.id === selectedClient);
    if (!client) return null;

    const comp = completedProgress.filter(p => p.user_id === selectedClient);
    const percGeral = modules.length > 0 ? Math.round((comp.length / modules.length) * 100) : 0;

    const pilarProgress = [1, 2, 3].map(pilar => {
      const pilarMods = modules.filter(m => m.pillar === pilar);
      const compPilar = comp.filter(p => pilarMods.find(m => m.id === p.module_id)).length;
      return { pilar, perc: pilarMods.length > 0 ? Math.round((compPilar / pilarMods.length) * 100) : 0 };
    });

    const clientIa = iaHistory.filter(h => h.user_id === selectedClient);
    const topIasClient = Object.entries(clientIa.reduce((acc, h) => {
      acc[h.ia_type] = (acc[h.ia_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Client Timeline
    const timeline = chartSemanas.map(w => {
      const c = comp.filter(p => {
        if(!p.completed_at) return false;
        const d = new Date(p.completed_at);
        const wStart = w.start;
        const wEnd = addDays(w.start, 7);
        return isAfter(d, wStart) && !isAfter(d, wEnd);
      }).length;
      return { name: w.name, modulos: c };
    });

    return { client, comp: comp.length, percGeral, pilarProgress, topIasClient, timeline };
  }, [selectedClient, clients, completedProgress, modules, iaHistory, chartSemanas]);

  // Helper
  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  } return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Relatórios e Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas estratégicas da plataforma baseadas em dados reais</p>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/40">
          <TabsTrigger value="performance" className="data-[state=active]:bg-[#E85D24] data-[state=active]:text-white uppercase font-bold text-xs tracking-wider">Performance da Plataforma</TabsTrigger>
          <TabsTrigger value="cliente" className="data-[state=active]:bg-[#E85D24] data-[state=active]:text-white uppercase font-bold text-xs tracking-wider">Relatório por Cliente</TabsTrigger>
          <TabsTrigger value="conteudo" className="data-[state=active]:bg-[#E85D24] data-[state=active]:text-white uppercase font-bold text-xs tracking-wider">IAs & Conteúdo</TabsTrigger>
        </TabsList>

        {/* ABA 1: PERFORMANCE */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-[#E85D24]/20 bg-gradient-to-br from-background to-[#E85D24]/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Módulos Concluídos</CardTitle>
                <BookOpen className="h-4 w-4 text-[#E85D24]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalModulos}</div>
                <p className="text-xs text-muted-foreground mt-1">Conclusões na base</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Média GCA vs PCA</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.gcaAvg}% <span className="text-sm font-normal text-muted-foreground">/ {stats.pcaAvg}%</span></div>
                <p className="text-xs text-muted-foreground mt-1">Taxa média de progresso GCA / PCA</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-gradient-to-br from-background to-emerald-500/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Módulo TOP #1</CardTitle>
                <Trophy className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold mt-1 line-clamp-2">{stats.moduloTop}</div>
                <p className="text-xs text-muted-foreground mt-1">Mais concluído na base</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/20 bg-gradient-to-br from-background to-purple-500/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Total Consultas IAs</CardTitle>
                <Bot className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsultas}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium truncate">{stats.iaTop} é a + usada</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Módulos concluídos (8 semanas)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSemanas} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }} />
                    <Line type="monotone" dataKey="modulos" stroke="#E85D24" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Engajamento (Módulos Concluídos)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartFases} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }} width={110} />
                    <RechartsTooltip cursor={{fill: 'currentColor', opacity: 0.05}} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }} />
                    <Bar dataKey="clientes" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartFases.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#E85D24' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Uso das IAs (30 dias)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartIAs} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.8 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                    <RechartsTooltip cursor={{fill: 'currentColor', opacity: 0.05}} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }} />
                    <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: RELATÓRIO CLIENTE */}
        <TabsContent value="cliente">
          <Card className="mb-6 bg-muted/20 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <span className="font-bold uppercase tracking-wider text-sm text-muted-foreground whitespace-nowrap">Selecione um Cliente:</span>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[300px] bg-background"><SelectValue placeholder="Escolher cliente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name || 'Cliente sem nome'}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {!selectedClientData ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
              Selecione um cliente acima para visualizar o analytics individual.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-background">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Progresso Geral</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-[#E85D24]">{selectedClientData.percGeral}%</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2"><div className="bg-[#E85D24] h-2 rounded-full" style={{width: `${selectedClientData.percGeral}%`}}></div></div>
                    <p className="text-xs text-muted-foreground mt-2">{selectedClientData.comp} de {modules.length} módulos concluídos</p>
                  </CardContent>
                </Card>
                <Card className="bg-background">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Cérebro Central</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-500">{selectedClientData.client.cerebro_complete ? '100%' : 'Pendente'}</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: selectedClientData.client.cerebro_complete ? '100%' : '5%'}}></div></div>
                    <p className="text-xs text-muted-foreground mt-2">{selectedClientData.client.cerebro_complete ? 'Perfil totalmente preenchido' : 'Faltam dados essenciais'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-background">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">IAs mais usadas</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="text-sm space-y-1 font-medium">
                      {selectedClientData.topIasClient.length === 0 && <li className="text-muted-foreground font-normal">Nenhuma consulta realizada.</li>}
                      {selectedClientData.topIasClient.map((ia, idx) => (
                        <li key={ia[0]}>{idx + 1}. <span className="text-[#E85D24] truncate max-w-[150px] inline-block align-bottom">{ia[0]}</span> ({ia[1]}x)</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Progresso por Pilar</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {selectedClientData.pilarProgress.map((pilar, idx) => {
                      const colors = ['bg-[#E85D24]', 'bg-blue-500', 'bg-emerald-500'];
                      const textColors = ['text-[#E85D24]', 'text-blue-500', 'text-emerald-500'];
                      const names = ['Fundação Clínica', 'Motor de Demanda', 'Motor Comercial'];
                      return (
                        <div key={pilar.pilar}>
                          <div className="flex justify-between text-sm mb-1 font-bold"><span>{names[idx]}</span> <span className={textColors[idx]}>{pilar.perc}%</span></div>
                          <div className="w-full bg-muted rounded-full h-2"><div className={`${colors[idx]} h-2 rounded-full`} style={{width: `${pilar.perc}%`}}></div></div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Timeline de Atividade</CardTitle></CardHeader>
                  <CardContent className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedClientData.timeline} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} allowDecimals={false} />
                        <Bar dataKey="modulos" fill="#10B981" radius={[2, 2, 0, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ABA 3: RANKINGS E CONTEUDO */}
        <TabsContent value="conteudo">
          <div className="space-y-6">
            <Card className="border-[#E85D24]/20">
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">Engajamento do Construa</CardTitle>
                <CardDescription>Uso real dos blocos dinâmicos preenchidos pelos clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bloco mais preenchido</p>
                    <p className="mt-1 text-lg font-black text-[#E85D24]">{construaEngagement.topType}</p>
                    <p className="text-xs text-muted-foreground">{construaEngagement.topTypeCount} respostas</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Respostas totais</p>
                    <p className="mt-1 text-lg font-black text-foreground">{construaEngagement.totalResponses}</p>
                    <p className="text-xs text-muted-foreground">Blocos respondidos</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sincronizados</p>
                    <p className="mt-1 text-lg font-black text-sky-600">{construaEngagement.syncedCount}</p>
                    <p className="text-xs text-muted-foreground">Dados com Cérebro Central</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Módulos com Construa</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{construaEngagement.moduleCompletion.length}</p>
                    <p className="text-xs text-muted-foreground">Com pelo menos 1 aluno</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      <p className="text-sm font-bold text-foreground">Taxa de conclusão do Construa por módulo</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/20"><th className="text-left py-2 px-4">Módulo</th><th className="text-center py-2 px-4">Alunos</th><th className="text-right py-2 px-4">Taxa</th></tr></thead>
                      <tbody className="divide-y">
                        {construaEngagement.moduleCompletion.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sem respostas do Construa ainda</td></tr>}
                        {construaEngagement.moduleCompletion.map(moduleItem => (
                          <tr key={moduleItem.id}>
                            <td className="py-3 px-4 font-medium text-foreground">{moduleItem.id} · {moduleItem.title}</td>
                            <td className="text-center py-3 px-4">{moduleItem.completedStudents} / {moduleItem.students}</td>
                            <td className="text-right py-3 px-4 font-bold text-[#E85D24]">{moduleItem.rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      <p className="text-sm font-bold text-foreground">Blocos mais populares</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/20"><th className="text-left py-2 px-4">Bloco</th><th className="text-center py-2 px-4">Tipo</th><th className="text-right py-2 px-4">Respostas</th></tr></thead>
                      <tbody className="divide-y">
                        {construaEngagement.blockRankings.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sem blocos respondidos</td></tr>}
                        {construaEngagement.blockRankings.map(block => (
                          <tr key={block.id}>
                            <td className="py-3 px-4 font-medium text-foreground">{block.titulo}</td>
                            <td className="text-center py-3 px-4"><Badge variant="outline" className="text-[10px]">{block.tipo}</Badge></td>
                            <td className="text-right py-3 px-4 font-bold text-emerald-600">{block.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500"/> Ranking de Módulos (Conclusão)</CardTitle>
                <CardDescription>Módulos com maior taxa de sucesso na plataforma</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 border-y"><th className="text-left py-2 px-4">Módulo</th><th className="text-center py-2 px-4">Iniciaram</th><th className="text-center py-2 px-4">Concluíram</th><th className="text-right py-2 px-4">Taxa</th></tr></thead>
                  <tbody className="divide-y">
                    {topModules.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados suficientes</td></tr>}
                    {topModules.map((m, i) => (
                      <tr key={m.id}><td className="py-3 px-4 font-bold text-foreground line-clamp-1">{i + 1}. {m.title}</td><td className="text-center py-3 px-4">{m.started}</td><td className="text-center py-3 px-4">{m.completed}</td><td className="text-right py-3 px-4 font-bold text-emerald-500">{m.rate}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500"/> Maior Abandono</CardTitle>
                <CardDescription>Módulos onde os clientes mais desistem ou travam</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 border-y"><th className="text-left py-2 px-4">Módulo</th><th className="text-center py-2 px-4">Abandono</th><th className="text-right py-2 px-4">Iniciaram / Terminaram</th></tr></thead>
                  <tbody className="divide-y">
                    {abandonoModules.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sem dados suficientes</td></tr>}
                    {abandonoModules.map(m => (
                      <tr key={m.id}><td className="py-3 px-4 font-bold text-foreground line-clamp-1" title={m.title}>{m.title}</td><td className="text-center py-3 px-4 font-bold text-red-500">{m.abandono}%</td><td className="text-right py-3 px-4"><Badge variant="outline">{m.started} / {m.completed}</Badge></td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Bot className="h-4 w-4 text-purple-500"/> Ranking de Uso das IAs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 border-y"><th className="text-left py-3 px-4">Inteligência Artificial</th><th className="text-center py-3 px-4">Total Histórico</th><th className="text-center py-3 px-4">Esta Semana</th><th className="text-right py-3 px-4">Clientes Distintos</th></tr></thead>
                  <tbody className="divide-y">
                    {iaRankings.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados de uso de IA</td></tr>}
                    {iaRankings.map(ia => (
                      <tr key={ia.name}><td className="py-3 px-4 font-bold text-foreground">{ia.name}</td><td className="text-center py-3 px-4 font-bold">{ia.total}</td><td className="text-center py-3 px-4 text-[#E85D24]">+{ia.estaSemana}</td><td className="text-right py-3 px-4">{ia.distinctClients}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
