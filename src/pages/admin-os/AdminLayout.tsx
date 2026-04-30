import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Users, PlayCircle, Zap, Calendar,
  FolderOpen, CalendarDays, CheckSquare, BarChart2, Settings, KeyRound,
  ShieldCheck, ChevronRight, Menu, X, Package, MonitorSmartphone, MessageSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',                 path: '/admin',           exact: true, badgeType: 'none' },
  { icon: Users,           label: 'Clientes',                  path: '/admin/clientes',  badgeType: 'inactive_clients' },
  { icon: KeyRound,        label: 'Gestão de Acessos',         path: '/admin/acessos',   badgeType: 'none' },
  { icon: PlayCircle,      label: 'Trilha & Conteúdo',         path: '/admin/trilha',    badgeType: 'none' },
  { icon: Zap,             label: 'Inteligências Artificiais', path: '/admin/ias',       badgeType: 'none' },
  { icon: Calendar,        label: 'Sessões Táticas',           path: '/admin/sessoes',   badgeType: 'none' },
  { icon: FolderOpen,      label: 'Materiais',                 path: '/admin/materiais', badgeType: 'none' },
  { icon: CalendarDays,    label: 'Calendário',                path: '/admin/calendario',badgeType: 'none' },
  { icon: CheckSquare,     label: 'Tarefas',                   path: '/admin/tarefas',   badgeType: 'delayed_tasks' },
  { icon: BarChart2,       label: 'Relatórios',                path: '/admin/relatorios',badgeType: 'none' },
  { icon: Package,         label: 'Produtos',                  path: '/admin/produtos',  badgeType: 'none' },
  { icon: Settings,        label: 'Sistema & Config',          path: '/admin/sistema',   badgeType: 'none' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [badges, setBadges] = useState({ inactive_clients: 0, delayed_tasks: 0, today: 0 });

  useEffect(() => {
    // Close sidebar on navigate
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadBadges() {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: clientsCount } = await supabase
          .from('platform_users')
          .select('*', { count: 'exact', head: true })
          .lt('updated_at', sevenDaysAgo.toISOString());
          
        const hojeStr = new Date().toISOString().substring(0, 10);
        
        const { data: tasks } = await supabase.from('admin_tasks').select('status, due_date').neq('status', 'concluida');
        
        let delayed = 0;
        let today = 0;
        if (tasks) {
          tasks.forEach(t => {
              if (!t.due_date) return;
              const tDate = t.due_date.substring(0, 10);
              if (tDate < hojeStr) delayed++;
              else if (tDate === hojeStr) today++;
          });
        }
        
        setBadges({
          inactive_clients: clientsCount || 0,
          delayed_tasks: delayed,
          today: today
        });
      } catch (err) {
        console.error("Erro ao carregar badges:", err);
      }
    }
    loadBadges();
  }, [location.pathname]); // Reload badges on navigation

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentItem = navItems.find(i => isActive(i.path, i.exact));

  const SidebarContent = () => (
    <>
      {/* Logo / Título */}
      <div className="px-5 pt-6 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-7 w-7 rounded bg-[#E85D24] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Descompliquei
            </div>
            <div className="text-sm font-bold text-[#E85D24] uppercase tracking-[0.2em] leading-tight mt-0.5">
              ADMIN OS
            </div>
          </div>
        </div>
        <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-white/50 hover:text-white p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4" style={{ borderTop: '1px solid hsl(220 10% 16%)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          const badgeValue = badges[item.badgeType as keyof typeof badges];
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors rounded"
              style={{
                background: active ? '#E85D24' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.45)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; } }}
            >
              <div className="flex items-center gap-3 truncate">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              
              {badgeValue > 0 && (
                <div 
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 leading-none flex items-center justify-center min-w-[18px] h-[18px]`}
                  style={{
                    backgroundColor: item.badgeType === 'delayed_tasks' ? '#EF4444' : (item.badgeType === 'inactive_clients' ? '#F97316' : 'rgba(255,255,255,0.2)'),
                    color: 'white'
                  }}
                >
                  {badgeValue > 99 ? '99+' : badgeValue}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-4" style={{ borderTop: '1px solid hsl(220 10% 16%)' }} />

      {/* Footer */}
      <div className="px-3 py-4 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(232,93,36,0.2)', border: '1px solid rgba(232,93,36,0.3)' }}
          >
            <span className="text-xs font-bold text-[#E85D24]">
              {(profile?.nome_completo || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {profile?.nome_completo || 'Admin'}
            </p>
            <p className="text-[10px] text-[#E85D24] font-medium">Admin</p>
          </div>
        </div>

        {/* Acesso rápido para visualização */}
        <div className="space-y-0.5">
          <p className="px-3 text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Visualizar como cliente
          </p>
          {[
            { icon: MessageSquare, label: 'Ver CRM', path: '/crm' },
            { icon: MonitorSmartphone, label: 'Ver Plataforma', path: '/plataforma' },
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors rounded"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* OVERLAY MOBILE */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-64 shrink-0 flex flex-col fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'hsl(220 10% 10%)', borderRight: '1px solid hsl(220 10% 16%)' }}
      >
        <SidebarContent />
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 min-h-screen overflow-x-hidden bg-background flex flex-col">
        {/* HEADER MOBILE */}
        <header className="flex items-center gap-4 lg:hidden px-6 py-4 border-b border-border bg-background/95 backdrop-blur z-10 sticky top-0">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-muted text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-[#E85D24] uppercase tracking-wider text-sm">ADMIN OS</span>
        </header>

        <div className="p-6 lg:p-8 flex-1">
          {/* BREADCRUMBS */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-6 uppercase tracking-wider">
            <button onClick={() => navigate('/admin')} className="hover:text-foreground transition-colors">Admin OS</button>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="text-foreground">{currentItem?.label || 'Página'}</span>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  );
}
