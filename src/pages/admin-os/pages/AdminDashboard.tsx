import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, BookOpen, Bot, BrainCircuit, Activity, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, ChevronRight, Loader2,
  AlertCircle, Info, CheckSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────────
interface PlatformUser {
  id: string;
  clinic_name: string | null;
  plan: string | null;
  cerebro_complete: boolean | null;
  onboarding_complete: boolean | null;
  updated_at: string | null;
}

interface ActivityItem {
  id: string;
  tipo: 'modulo' | 'ia' | 'cerebro';
  descricao: string;
  created_at: string;
  cliente: string;
}

interface AdminTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  client_id: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-500',
  media: 'bg-yellow-500',
  baixa: 'bg-blue-400',
};

const IA_LABEL: Record<string, string> = {
  preattendance: 'Pré-Atendimento',
  objections: 'Objeções',
  remarketing: 'Remarketing',
  analysis: 'Análise',
  copywriter: 'Copywriter',
  scripts: 'Scripts',
  strategy: 'Estratégia',
  reporting: 'Relatórios',
  followup: 'Follow-up',
};

// ── Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Dados
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [progressAvg, setProgressAvg] = useState(0);
  const [iaToday, setIaToday] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<AdminTask[]>([]);
  const [modulesLast7, setModulesLast7] = useState(0);

  useEffect(() => {
    document.title = 'Dashboard · Admin OS | Descompliquei';
    async function load() {
      try {
        // 1. Usuários da plataforma
        const { data: usersData } = await supabase
          .from('platform_users')
          .select('id, clinic_name, plan, cerebro_complete, onboarding_complete, updated_at')
          .order('updated_at', { ascending: false });

        const usersList: PlatformUser[] = (usersData || []) as PlatformUser[];
        setUsers(usersList);

        // 2. Total de módulos ativos (denominador real do progresso)
        const { count: totalModulesCount } = await supabase
          .from('platform_modules')
          .select('id', { count: 'exact', head: true })
          .eq('active', true);
        const totalModules = totalModulesCount || 1;

        // 3. Progresso médio real (módulos completados / total de módulos ativos, por usuário)
        const { data: progressData } = await supabase
          .from('platform_progress')
          .select('user_id, completed');

        if (usersList.length > 0) {
          const completedByUser: Record<string, number> = {};
          (progressData || []).forEach((p: any) => {
            if (p.completed) {
              completedByUser[p.user_id] = (completedByUser[p.user_id] || 0) + 1;
            }
          });
          const perUserPcts = usersList.map(u => {
            const done = completedByUser[u.id] || 0;
            return Math.round((done / totalModules) * 100);
          });
          const avg = Math.round(perUserPcts.reduce((a, b) => a + b, 0) / perUserPcts.length);
          setProgressAvg(avg);
        }

        // 4. IAs usadas hoje
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: iaCount } = await supabase
          .from('platform_ia_history')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString());
        setIaToday(iaCount || 0);

        // 5. Módulos concluídos últimos 7 dias
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { count: modCount } = await supabase
          .from('platform_progress')
          .select('id', { count: 'exact', head: true })
          .eq('completed', true)
          .gte('completed_at', sevenDaysAgo);
        setModulesLast7(modCount || 0);

        // 6. Timeline de atividade (últimas 20) — com nomes reais dos módulos
        const userMap: Record<string, string> = {};
        usersList.forEach(u => { userMap[u.id] = u.clinic_name || 'Cliente'; });

        const [{ data: progActs }, { data: iaActs }, { data: modulesData }] = await Promise.all([
          supabase
            .from('platform_progress')
            .select('id, user_id, module_id, completed_at')
            .eq('completed', true)
            .order('completed_at', { ascending: false })
            .limit(10),
          supabase
            .from('platform_ia_history')
            .select('id, user_id, ia_type, created_at')
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('platform_modules')
            .select('id, title'),
        ]);

        const moduleMap: Record<string, string> = {};
        (modulesData || []).forEach((m: any) => { moduleMap[m.id] = m.title; });

        const progItems: ActivityItem[] = (progActs || [])
          .filter((p: any) => p.completed_at)
          .map((p: any) => ({
            id: p.id,
            tipo: 'modulo' as const,
            descricao: `concluiu "${moduleMap[p.module_id] || `Módulo ${p.module_id}`}"`,
            created_at: p.completed_at,
            cliente: userMap[p.user_id] || 'Cliente',
          }));

        const iaItems: ActivityItem[] = (iaActs || []).map((a: any) => ({
          id: a.id,
          tipo: 'ia' as const,
          descricao: `usou a IA de ${IA_LABEL[a.ia_type] || a.ia_type}`,
          created_at: a.created_at,
          cliente: userMap[a.user_id] || 'Cliente',
        }));

        const all = [...progItems, ...iaItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 20);
        setActivity(all);

        // 7. Tarefas do dia (range de data, não timestamp exato)
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: tasksData } = await supabase
          .from('admin_tasks')
          .select('id, title, status, priority, due_date, client_id')
          .gte('due_date', todayStr + 'T00:00:00+00:00')
          .lt('due_date', todayStr + 'T23:59:59.999+00:00')
          .neq('status', 'concluida')
          .order('priority')
          .limit(5);
        setTodayTasks((tasksData || []) as AdminTask[]);

      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Métricas computadas ─────────────────────────────────────────────
  const totalUsers = users.length;
  const comAtividade = users.filter(u => daysSince(u.updated_at) < 7).length;
  const cerebrosConfig = users.filter(u => u.cerebro_complete).length;
  const semAtividade7 = users.filter(u => daysSince(u.updated_at) >= 7).length;
  const semAtividade14 = users.filter(u => daysSince(u.updated_at) >= 14);
  const semAtividade7a13 = users.filter(u => daysSince(u.updated_at) >= 7 && daysSince(u.updated_at) < 14);
  const cerebroVazio = users.filter(u => !u.cerebro_complete);

  const visibleActivity = showAllActivity ? activity : activity.slice(0, 8);

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[100px] w-full rounded-xl" />
          <Skeleton className="h-[100px] w-full rounded-xl" />
          <Skeleton className="h-[100px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
          Dashboard Operacional
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral da Descompliquei e do Hub de Gestão Comercial
        </p>
      </div>

      {/* ── FAIXA 1 — 4 MÉTRICAS PRINCIPAIS ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="border-l-4 border-l-[#E85D24]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-4xl font-black text-foreground">{totalUsers}</div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">{comAtividade} ativos (7d)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Progresso Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-4xl font-black text-foreground">{progressAvg}%</div>
            <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressAvg}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Média da Trilha C.L.A.R.O.</p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> IAs Usadas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-4xl font-black text-foreground">{iaToday}</div>
            <p className="text-[10px] text-muted-foreground mt-2">consultas realizadas hoje</p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" /> Cérebros Config.
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-4xl font-black text-emerald-600">{cerebrosConfig}</div>
            <p className="text-[10px] text-muted-foreground mt-2">
              de {totalUsers} clientes ({totalUsers > 0 ? Math.round((cerebrosConfig / totalUsers) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── FAIXA 2 — MÉTRICAS DE ENGAJAMENTO ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${semAtividade7 > 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'}`}>
              <AlertTriangle className={`h-5 w-5 ${semAtividade7 > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{semAtividade7}</div>
              <p className="text-xs text-muted-foreground">Sem atividade há 7+ dias</p>
              {semAtividade7 > 0 && (
                <Badge className="mt-1 text-[10px] bg-red-500 text-white px-1.5 py-0">risco de churn</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{modulesLast7}</div>
              <p className="text-xs text-muted-foreground">Módulos concluídos (7 dias)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{todayTasks.length}</div>
              <p className="text-xs text-muted-foreground">Tarefas para hoje</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SEÇÃO PRINCIPAL: ATIVIDADE + ALERTAS ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ATIVIDADE RECENTE — 60% */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#E85D24]" /> Atividade Recente
            </h2>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {activity.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma atividade registrada ainda.
                </div>
              ) : (
                <>
                  {visibleActivity.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                      {/* Avatar inicial */}
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${item.tipo === 'modulo' ? 'bg-blue-500' : item.tipo === 'ia' ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                        {item.cliente.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          <span className="font-medium">{item.cliente}</span>{' '}
                          <span className="text-muted-foreground">{item.descricao}</span>
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  ))}
                  {activity.length > 8 && (
                    <div className="p-3 text-center">
                      <button
                        onClick={() => setShowAllActivity(v => !v)}
                        className="text-xs text-[#E85D24] font-medium hover:underline flex items-center gap-1 mx-auto"
                      >
                        {showAllActivity ? 'Ver menos' : `Ver todos (${activity.length})`}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ALERTAS — 40% */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" /> Alertas do Sistema
          </h2>
          <div className="space-y-2">
            {/* Crítico */}
            {semAtividade14.length > 0 && (
              <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                <span className="text-lg leading-none">🔴</span>
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">CRÍTICO — Risco de Churn</p>
                  <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                    {semAtividade14.length} cliente{semAtividade14.length > 1 ? 's' : ''} sem atividade há 14+ dias:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {semAtividade14.slice(0, 3).map(u => (
                      <Badge key={u.id} className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30">
                        {u.clinic_name || 'Cliente'}
                      </Badge>
                    ))}
                    {semAtividade14.length > 3 && (
                      <Badge className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">+{semAtividade14.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Atenção */}
            {semAtividade7a13.length > 0 && (
              <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
                <span className="text-lg leading-none">🟡</span>
                <div>
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">ATENÇÃO — Inatividade</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400/80 mt-0.5">
                    {semAtividade7a13.length} cliente{semAtividade7a13.length > 1 ? 's' : ''} sem atividade entre 7–13 dias.
                  </p>
                </div>
              </div>
            )}

            {/* Cérebro Vazio */}
            {cerebroVazio.length > 0 && (
              <div className="flex gap-3 p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg">
                <span className="text-lg leading-none">🟠</span>
                <div>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-400">AVISO — Cérebro Vazio</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400/80 mt-0.5">
                    {cerebroVazio.length} cliente{cerebroVazio.length > 1 ? 's' : ''} com Cérebro Central não configurado.
                  </p>
                </div>
              </div>
            )}

            {/* OK */}
            {semAtividade14.length === 0 && semAtividade7a13.length === 0 && cerebroVazio.length === 0 && (
              <div className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                <span className="text-lg leading-none">🟢</span>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">OK — Tudo em ordem</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-0.5">Nenhum alerta crítico no momento.</p>
                </div>
              </div>
            )}

            {/* Resumo */}
            <Card className="bg-muted/40">
              <CardContent className="p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Resumo de Saúde</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Clientes ativos', value: totalUsers, color: 'text-foreground' },
                    { label: 'Onboarding completo', value: users.filter(u => u.onboarding_complete).length, color: 'text-emerald-600' },
                    { label: 'Cérebro configurado', value: cerebrosConfig, color: 'text-blue-600' },
                    { label: 'Em risco de churn', value: semAtividade14.length, color: semAtividade14.length > 0 ? 'text-red-500' : 'text-emerald-600' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: TAREFAS DO DIA ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[#E85D24]" /> Tarefas de Hoje
          </h2>
        </div>
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {todayTasks.length === 0 ? (
              <div className="p-6 flex items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="text-sm">Nenhuma tarefa pendente para hoje. 🎉</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLOR[task.priority] || 'bg-muted'}`} />
                  <p className="text-sm text-foreground flex-1">{task.title}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{task.priority}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
