import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Users, Building2, Wifi, WifiOff, Plus, RefreshCw,
  TrendingUp, ShieldCheck, MoreVertical, Eye, LogIn, Key, Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TenantRow {
  organization_id: string;
  plan: string;
  status: string;
  monthly_fee: number;
  max_leads: number;
  created_at: string;
  organizations: { name: string } | null;
}

interface TenantWithExtra extends TenantRow {
  wp_status?: string | null;
  lead_count?: number;
  admin_name?: string;
  admin_email?: string;
}

const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  trial: 'bg-amber-100 text-amber-700',
};

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantWithExtra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    org_name: '', admin_email: '', admin_password: '', admin_full_name: '',
    brand_name: '',
  });
  
  const [selectedTenant, setSelectedTenant] = useState<TenantWithExtra | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('platform_tenants')
        .select(`
          organization_id, plan, status, monthly_fee, max_leads, created_at,
          organizations ( name )
        `)
        .order('created_at', { ascending: false });

      if (!data) { setIsLoading(false); return; }

      // Enriquecer com status do WhatsApp e info admin
      const enriched: TenantWithExtra[] = await Promise.all(
        data.map(async (t: any) => {
          const { data: wp } = await supabase
            .from('whatsapp_connections')
            .select('status')
            .eq('organization_id', t.organization_id)
            .maybeSingle();

          const { count } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', t.organization_id);

          const { data: adminProfile } = await supabase
            .from('perfis')
            .select('nome_completo, id, email')
            .eq('organization_id', t.organization_id)
            .limit(1)
            .maybeSingle();

          return { 
            ...t, 
            wp_status: wp?.status || null, 
            lead_count: count || 0,
            admin_name: adminProfile?.nome_completo || 'Desconhecido',
            admin_email: adminProfile?.email || 'Nenhum e-mail',
          };
        })
      );
      setTenants(enriched);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar clientes', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const handleCreate = async () => {
    if (!createForm.org_name || !createForm.admin_email || !createForm.admin_password || !createForm.admin_full_name) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: result, error } = await supabase.functions.invoke('super-admin-create-tenant', {
        body: {
          ...createForm,
          plan: 'basic', // Enviamos o baseline sempre
          monthly_fee: 0, // Fee gratuito default (sem controle financeiro aqui)
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) {
        // Tentar extrair a mensagem de erro real vinda do edge function (FunctionsHttpError)
        if (error.context && typeof error.context.json === 'function') {
           const errBody = await error.context.json().catch(() => null);
           if (errBody?.error) throw new Error(errBody.error);
        }
        throw new Error(error.message);
      }
      if (result?.error) throw new Error(result.error);

      toast({ title: '✅ Cliente criado!', description: result.message });
      setShowCreateModal(false);
      setCreateForm({ org_name: '', admin_email: '', admin_password: '', admin_full_name: '', brand_name: '' });
      await loadTenants();
    } catch (e: any) {
      toast({ title: 'Erro ao criar cliente', description: e.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleImpersonate = async (targetOrgId: string) => {
    if (!user) return;
    setIsImpersonating(true);
    try {
      // 1. Atualiza organizacao no perfil atual para agir com RLS daquele cliente
      if (user.organization_id) {
        localStorage.setItem('original_master_org_id', user.organization_id);
      }
      
      const { error } = await supabase
        .from('perfis')
        .update({ organization_id: targetOrgId as any })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({ title: 'Acesso Rápido Iniciado', description: 'Abrindo o CRM deste cliente...' });
      
      // 2. Recarrega a aplicação com novo RLS na query
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (err: any) {
      toast({ title: 'Falha ao acessar CRM', description: err.message, variant: 'destructive' });
      setIsImpersonating(false);
    }
  };

  const handleViewDetails = (t: TenantWithExtra) => {
    setSelectedTenant(t);
    setShowDetailsModal(true);
  };

  const totalLeads = tenants.reduce((sum, t) => sum + (t.lead_count || 0), 0);
  const activeCount = tenants.filter(t => t.status === 'active').length;
  const connectedCount = tenants.filter(t => t.wp_status === 'connected').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Painel de controle operacional de clientes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTenants} disabled={isLoading || isImpersonating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={isImpersonating} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Métricas Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Total Clientes', value: tenants.length, color: 'text-blue-600' },
          { icon: Users, label: 'Ativos', value: activeCount, color: 'text-green-600' },
          { icon: Wifi, label: 'WhatsApp OK', value: connectedCount, color: 'text-emerald-600' },
          { icon: TrendingUp, label: 'Leads Processados', value: totalLeads, color: 'text-primary' },
        ].map(m => (
          <Card key={m.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <m.icon className={`h-5 w-5 ${m.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold">{m.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de Tenants */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-lg">Clientes e Instâncias Conectadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeiro cliente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead className="text-right">Volume Leads</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(t => (
                    <TableRow key={t.organization_id}>
                      <TableCell className="font-medium">{(t.organizations as any)?.name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{t.admin_name}</span>
                          <span className="text-xs text-muted-foreground">{t.admin_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                          {t.status === 'active' ? 'Ativo' : t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.wp_status === 'connected' ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs"><Wifi className="h-3 w-3" /> Conectado</div>
                        ) : t.wp_status ? (
                          <div className="flex items-center gap-1 text-red-500 text-xs"><WifiOff className="h-3 w-3" /> {t.wp_status}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{t.lead_count ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(t)}>
                              <Eye className="mr-2 h-4 w-4" /> Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleImpersonate(t.organization_id)}>
                              <LogIn className="mr-2 h-4 w-4" /> Acessar CRM
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal criar tenant */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cria a organização, o usuário admin e o branding inicial do CRM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { key: 'org_name', label: 'Nome do Negócio *', placeholder: 'Clínica Xpto', icon: Building2 },
              { key: 'admin_full_name', label: 'Nome do Responsável *', placeholder: 'Dr. João Silva', icon: Users },
              { key: 'admin_email', label: 'E-mail de Login *', placeholder: 'admin@clinicaxpto.com', type: 'email', icon: Mail },
              { key: 'admin_password', label: 'Senha inicial *', placeholder: 'Senha123!', type: 'password', icon: Key },
              { key: 'brand_name', label: 'Nome na Plataforma (Opcional)', placeholder: 'CRM Xpto', icon: Building2 },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-semibold">{f.label}</Label>
                <div className="relative">
                  {f.icon && <f.icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  <Input
                    type={f.type || 'text'}
                    className={f.icon ? "pl-9" : ""}
                    value={(createForm as any)[f.key]}
                    onChange={e => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={isCreating || isImpersonating}>
              {isCreating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {isCreating ? 'Aguarde...' : 'Criar Ambiente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Ver Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações operacionais do ambiente: {(selectedTenant?.organizations as any)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Admin Principal</span>
                  <p className="font-medium text-sm">{selectedTenant.admin_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Status Banco</span>
                  <Badge className={`${STATUS_COLORS[selectedTenant.status] || 'bg-gray-100'} border-0 text-xs`}>
                    {selectedTenant.status === 'active' ? 'Ativo' : selectedTenant.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">WhatsApp Engine</span>
                  <div className="flex items-center gap-1 text-sm">
                    {selectedTenant.wp_status === 'connected' ? (
                      <><Wifi className="h-3 w-3 text-green-600" /> Conectado</>
                    ) : (
                      <><WifiOff className="h-3 w-3 text-red-500" /> {selectedTenant.wp_status || 'Não configurado'}</>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Volume de Leads</span>
                  <p className="font-medium text-sm">{selectedTenant.lead_count} gerados</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Data de Adesão</span>
                  <p className="font-medium text-sm">
                    {format(new Date(selectedTenant.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">ID Organização (Ref)</span>
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">
                    {selectedTenant.organization_id.substring(0, 13)}...
                  </code>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Fechar</Button>
            <Button 
              className="bg-primary" 
              onClick={() => {
                if (selectedTenant?.organization_id) {
                  setShowDetailsModal(false);
                  handleImpersonate(selectedTenant.organization_id);
                }
              }}
              disabled={isImpersonating}
            >
              <LogIn className="h-4 w-4 mr-2" /> Acessar CRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
