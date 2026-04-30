import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, Search, LayoutGrid, List, Loader2,
  BrainCircuit, BookOpen, Clock, TrendingUp, ChevronRight, Mail
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────────
interface ClientRow {
  id: string;              // organization_id (platform_tenants)
  platform_user_id: string | null; // platform_users.id (se existir)
  clinic_name: string | null;
  plan: string | null;
  product_name: string | null;
  has_trilha: boolean;
  cerebro_complete: boolean | null;
  status: string | null;
  trial_ends_at: string | null;
  updated_at: string | null;
  // from perfis
  email: string | null;
  nome_completo: string | null;
  org_name: string | null;
  // computed
  progress?: number;
  lastHealth?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function daysSince(d: string | null) {
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function timeAgo(d: string | null): string {
  if (!d) return 'nunca';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

function healthColor(score: number | undefined) {
  if (!score) return 'bg-muted text-muted-foreground';
  if (score >= 70) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (score >= 40) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  return 'bg-red-500/20 text-red-700 dark:text-red-400';
}

function activityStatus(d: string | null) {
  const days = daysSince(d);
  if (days < 7) return { label: 'Ativo', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' };
  if (days < 14) return { label: 'Inativo', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' };
  return { label: 'Crítico', color: 'bg-red-500/20 text-red-700 dark:text-red-400' };
}

// ── Component ─────────────────────────────────────────────────────────────
export default function AdminClientes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterActivity, setFilterActivity] = useState('todos');
  const [filterCerebro, setFilterCerebro] = useState('todos');

  useEffect(() => {
    document.title = 'Clientes · Admin OS | Descompliquei';
    async function load() {
      setLoading(true);
      try {
        // Identificar orgs que pertencem EXCLUSIVAMENTE a superadmins (sem nenhum admin/atendente real)
        const { data: superadminPapeis } = await supabase
          .from('usuarios_papeis')
          .select('usuario_id')
          .eq('papel', 'superadmin');
        const superadminUserIds = new Set((superadminPapeis || []).map((p: any) => p.usuario_id));

        // Orgs onde ALGUM perfil é superadmin
        const { data: superadminPerfis } = superadminUserIds.size > 0
          ? await supabase.from('perfis').select('id, organization_id').in('id', [...superadminUserIds])
          : { data: [] };

        // Todos os perfis (reutilizados depois para perfilByOrg)
        const { data: todosPerfis } = await supabase
          .from('perfis')
          .select('id, organization_id, nome_completo, email');

        // Orgs com superadmin
        const orgsComSuperadmin = new Set((superadminPerfis || []).map((p: any) => p.organization_id).filter(Boolean));
        // Orgs com usuário que NÃO é superadmin
        const orgsComUsuarioReal = new Set(
          (todosPerfis || [])
            .filter((p: any) => p.organization_id && !superadminUserIds.has(p.id))
            .map((p: any) => p.organization_id)
        );
        // Excluir apenas orgs que têm superadmin mas NÃO têm nenhum usuário real
        const superadminOrgIds = new Set(
          [...orgsComSuperadmin].filter(orgId => !orgsComUsuarioReal.has(orgId))
        );

        // Base: TODOS os tenants (fonte de verdade dos clientes cadastrados), exceto orgs exclusivas de superadmin
        const { data: tenantsRaw } = await supabase
          .from('platform_tenants')
          .select('organization_id, status, trial_ends_at, product_id, organizations(name)')
          .order('created_at', { ascending: false });

        const tenants = (tenantsRaw || []).filter((t: any) => !superadminOrgIds.has(t.organization_id));

        // Produtos para mapear nome
        const { data: prods } = await supabase
          .from('platform_products')
          .select('id, nome, pilares_liberados');
        const prodMap: Record<string, { nome: string; has_trilha: boolean }> = {};
        (prods || []).forEach((p: any) => {
          prodMap[p.id] = { nome: p.nome, has_trilha: Array.isArray(p.pilares_liberados) && p.pilares_liberados.length > 0 };
        });

        // Perfis por organization_id (email e nome real) — prefere não-superadmin, reutiliza query anterior
        const perfilByOrg: Record<string, { id: string; nome_completo: string | null; email: string | null }> = {};
        (todosPerfis || []).forEach((p: any) => {
          if (!p.organization_id) return;
          const existing = perfilByOrg[p.organization_id];
          // Substituir apenas se atual é superadmin e o novo não é, ou se não há registro ainda
          if (!existing || (superadminUserIds.has(existing.id) && !superadminUserIds.has(p.id))) {
            perfilByOrg[p.organization_id] = p;
          }
        });

        // Platform users por crm_user_id (enriquecimento opcional)
        const { data: platformUsers } = await supabase
          .from('platform_users')
          .select('id, crm_user_id, clinic_name, cerebro_complete, updated_at');
        const puByCrmUser: Record<string, any> = {};
        (platformUsers || []).forEach((pu: any) => {
          if (pu.crm_user_id) puByCrmUser[pu.crm_user_id] = pu;
        });

        // Progresso por platform_user.id
        const { data: progress } = await supabase
          .from('platform_progress')
          .select('user_id, completed');
        const progressMap: Record<string, { total: number; done: number }> = {};
        (progress || []).forEach((p: any) => {
          if (!progressMap[p.user_id]) progressMap[p.user_id] = { total: 0, done: 0 };
          progressMap[p.user_id].total++;
          if (p.completed) progressMap[p.user_id].done++;
        });

        // Health scores mais recentes por platform_user.id
        const { data: health } = await supabase
          .from('admin_client_health')
          .select('client_id, score, created_at')
          .order('created_at', { ascending: false });
        const healthMap: Record<string, number> = {};
        (health || []).forEach((h: any) => {
          if (!healthMap[h.client_id] && h.score != null) healthMap[h.client_id] = h.score;
        });

        const enriched: ClientRow[] = (tenants || []).map((t: any) => {
          const perfil = perfilByOrg[t.organization_id];
          const pu = perfil?.id ? puByCrmUser[perfil.id] : null;
          const progData = pu ? progressMap[pu.id] : null;
          const prog = progData && progData.total > 0 ? Math.round((progData.done / progData.total) * 100) : 0;

          return {
            id: t.organization_id,
            platform_user_id: pu?.id ?? null,
            clinic_name: pu?.clinic_name ?? (t.organizations as any)?.name ?? null,
            plan: null, // removido — usar produto no lugar
            product_name: t.product_id ? (prodMap[t.product_id]?.nome ?? null) : null,
            has_trilha: t.product_id ? (prodMap[t.product_id]?.has_trilha ?? false) : false,
            cerebro_complete: pu?.cerebro_complete ?? null,
            status: t.status ?? null,
            trial_ends_at: t.trial_ends_at ?? null,
            updated_at: pu?.updated_at ?? null,
            email: perfil?.email ?? null,
            nome_completo: perfil?.nome_completo ?? null,
            org_name: (t.organizations as any)?.name ?? null,
            progress: prog,
            lastHealth: pu ? healthMap[pu.id] : undefined,
          };
        });

        setClients(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Filtros aplicados ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return clients.filter(c => {
      const name = (c.clinic_name || c.org_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const nomeCompleto = (c.nome_completo || '').toLowerCase();
      const q = search.toLowerCase();
      if (search && !name.includes(q) && !email.includes(q) && !nomeCompleto.includes(q)) return false;
      if (filterStatus !== 'todos' && (c.status ?? 'ativo') !== filterStatus) return false;
      if (filterActivity !== 'todos') {
        const days = daysSince(c.updated_at);
        if (filterActivity === 'ativos' && days >= 7) return false;
        if (filterActivity === 'inativos' && (days < 7 || days >= 14)) return false;
        if (filterActivity === 'criticos' && days < 14) return false;
      }
      if (filterCerebro !== 'todos') {
        if (filterCerebro === 'configurado' && !c.cerebro_complete) return false;
        if (filterCerebro === 'vazio' && c.cerebro_complete) return false;
      }
      return true;
    });
  }, [clients, search, filterStatus, filterActivity, filterCerebro]);

  // ── Métricas ────────────────────────────────────────────────────────
  const totalAtivos = clients.filter(c => (c.status ?? 'ativo') === 'ativo').length;
  const totalComProduto = clients.filter(c => c.product_name).length;
  const avgProgress = clients.filter(c => c.platform_user_id).length > 0
    ? Math.round(clients.filter(c => c.platform_user_id).reduce((s, c) => s + (c.progress || 0), 0) / clients.filter(c => c.platform_user_id).length)
    : 0;
  const withCerebro = clients.filter(c => c.cerebro_complete).length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
          Clientes da Plataforma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie e monitore todos os clientes do Hub de Gestão Comercial.
        </p>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: clients.length, icon: Users, color: 'text-foreground' },
          { label: 'Ativos', value: totalAtivos, icon: TrendingUp, color: 'text-[#E85D24]' },
          { label: 'Com Produto', value: totalComProduto, icon: Users, color: 'text-blue-600' },
          { label: 'Progresso Médio', value: `${avgProgress}%`, icon: BookOpen, color: 'text-purple-600' },
          { label: 'Com Cérebro', value: withCerebro, icon: BrainCircuit, color: 'text-emerald-600' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <m.icon className={`h-4 w-4 shrink-0 ${m.color}`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou clínica..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {[
          { label: 'Status', state: filterStatus, set: setFilterStatus, opts: [['todos','Todos'],['ativo','Ativo'],['bloqueado','Bloqueado'],['trial','Trial']] },
          { label: 'Atividade', state: filterActivity, set: setFilterActivity, opts: [['todos','Todos'],['ativos','Ativos (7d)'],['inativos','Inativos (7-14d)'],['criticos','Críticos (14d+)']] },
          { label: 'Cérebro', state: filterCerebro, set: setFilterCerebro, opts: [['todos','Todos'],['configurado','Configurado'],['vazio','Vazio']] },
        ].map(f => (
          <select
            key={f.label}
            value={f.state}
            onChange={e => f.set(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-36"
          >
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {/* Toggle view */}
        <div className="flex gap-1 bg-muted p-1 rounded-md ml-auto">
          <button onClick={() => setView('cards')} className={`p-1.5 rounded ${view === 'cards' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded ${view === 'table' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* RESULTADO */}
      <p className="text-xs text-muted-foreground">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/10">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground">Não há clientes correspondentes aos filtros atuais ou nenhum cliente cadastrado.</p>
        </div>
      ) : view === 'cards' ? (
        /* ── CARDS ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => {
            const activity = c.updated_at ? activityStatus(c.updated_at) : null;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  {/* Header do card */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#E85D24]/10 border border-[#E85D24]/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#E85D24]">
                        {(c.nome_completo || c.clinic_name || c.org_name || 'C').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{c.nome_completo || c.clinic_name || c.org_name || 'Sem nome'}</p>
                      {(c.clinic_name || c.org_name) && c.nome_completo && (
                        <p className="text-xs text-muted-foreground truncate">{c.clinic_name || c.org_name}</p>
                      )}
                      {c.email && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" /> {c.email}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-[10px] px-2 shrink-0 ${c.status === 'bloqueado' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(c.status ?? 'ativo').charAt(0).toUpperCase() + (c.status ?? 'ativo').slice(1)}
                    </Badge>
                  </div>

                  {/* Produto */}
                  {c.product_name && (
                    <p className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate">
                      📦 {c.product_name}
                    </p>
                  )}

                  {/* Progresso (só se tiver plataforma e acesso à trilha) */}
                  {c.platform_user_id && c.has_trilha && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Trilha C.L.A.R.O.</span>
                        <span className="font-bold text-foreground">{c.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#E85D24] rounded-full transition-all" style={{ width: `${c.progress ?? 0}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Badges de status */}
                  <div className="flex flex-wrap gap-1.5">
                    {activity && (
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 ${activity.color}`}>
                        {activity.label}
                      </Badge>
                    )}
                    {c.platform_user_id && (
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 ${c.cerebro_complete ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        <BrainCircuit className="h-2.5 w-2.5 mr-1 inline" />
                        {c.cerebro_complete ? 'Cérebro OK' : 'Cérebro vazio'}
                      </Badge>
                    )}
                    {c.lastHealth != null && (
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 ${healthColor(c.lastHealth)}`}>
                        Health {c.lastHealth}
                      </Badge>
                    )}
                  </div>

                  {/* Rodapé */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {c.updated_at ? timeAgo(c.updated_at) : 'Sem acesso ainda'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-[#E85D24]/40 text-[#E85D24] hover:bg-[#E85D24]/10"
                      onClick={() => navigate(`/admin/clientes/${c.id}`)}
                    >
                      Ver perfil <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── TABELA ── */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Cliente','Email','Produto','Progresso','Cérebro','Último Acesso','Ações'].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => {
                  const activity = c.updated_at ? activityStatus(c.updated_at) : null;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#E85D24]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#E85D24]">{(c.nome_completo || c.clinic_name || c.org_name || 'C').charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{c.nome_completo || c.clinic_name || c.org_name || '—'}</p>
                            {(c.clinic_name || c.org_name) && c.nome_completo && (
                              <p className="text-xs text-muted-foreground">{c.clinic_name || c.org_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">{c.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">{c.product_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {c.platform_user_id && c.has_trilha ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#E85D24] rounded-full" style={{ width: `${c.progress ?? 0}%` }} />
                            </div>
                            <span className="text-xs font-bold">{c.progress ?? 0}%</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.platform_user_id ? (
                          <Badge className={`text-[10px] border-0 ${c.cerebro_complete ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            {c.cerebro_complete ? '✓ Config.' : '— Vazio'}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {activity ? (
                          <Badge className={`text-[10px] border-0 ${activity.color}`}>{activity.label}</Badge>
                        ) : <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">Sem acesso</Badge>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.updated_at ? timeAgo(c.updated_at) : '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-[#E85D24]"
                          onClick={() => navigate(`/admin/clientes/${c.id}`)}>
                          Ver perfil →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
