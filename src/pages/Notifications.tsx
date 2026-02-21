import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Bell, CheckCircle, User, Phone, Trash2, Clock, Plus, Settings2, ShieldAlert } from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { LeadSelector } from "@/components/notifications/LeadSelector";
import { useAllNotifications, NotificationWithLead } from "@/hooks/useAllNotifications";
import { useInactivityAlerts } from "@/hooks/useInactivityAlerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const NotificationCard = ({ notification, onUpdateStatus }: { notification: NotificationWithLead, onUpdateStatus: (id: string, status: 'pendente' | 'resolvido') => void }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.criado_em), { addSuffix: true, locale: ptBR });

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className={notification.status === 'pendente' ? "bg-amber-100 text-amber-600 p-2 rounded-full mt-1 shrink-0" : "bg-muted text-muted-foreground p-2 rounded-full mt-1 shrink-0"}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm sm:text-base break-words">{notification.mensagem}</p>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Cliente: {notification.leads?.nome || 'Desconhecido'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">WhatsApp: {notification.leads?.telefone || 'N/A'}</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground pt-1">{timeAgo}</p>
            </div>
          </div>
          {notification.status === 'pendente' && (
            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(notification.id, 'resolvido')} className="shrink-0 h-8 text-[10px] sm:text-xs">
              <CheckCircle className="h-3.5 w-3.5 sm:mr-2" />
              <span className="hidden sm:inline">Resolver</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Notifications() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>('todos');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'resolvidas' | 'config'>('pendentes');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Alertas de Inatividade
  const { rules, isLoading: loadingRules, createRule, deleteRule, toggleRule } = useInactivityAlerts();
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", minutes: 30 });

  const { notifications, isLoading, updateStatus, deleteResolved, isDeletingResolved } = useAllNotifications({ dateRange, leadId: selectedLeadId });

  const { pending, resolved } = useMemo(() => {
    const pending = notifications.filter(n => n.status === 'pendente');
    const resolved = notifications.filter(n => n.status === 'resolvido');
    return { pending, resolved };
  }, [notifications]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRule.mutate(newRule, {
      onSuccess: () => {
        setIsRuleModalOpen(false);
        setNewRule({ name: "", minutes: 30 });
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de alertas e regras de inatividade.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'resolvidas' && resolved.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsConfirmOpen(true)}
              className="text-destructive hover:bg-destructive/10 h-9"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Resolvidas
            </Button>
          )}
          {activeTab === 'config' && (
            <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-2">
                  <Plus className="h-4 w-4" /> Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle>Novo Alerta de Inatividade</DialogTitle>
                  <DialogDescription>O sistema notificará se o lead não responder após este tempo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateRule} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Nome da Regra</Label>
                    <Input placeholder="Ex: Lead Parado 1 hora" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tempo de Inatividade (Minutos)</Label>
                    <Input type="number" min="1" value={newRule.minutes} onChange={e => setNewRule({...newRule, minutes: parseInt(e.target.value) || 0})} required />
                    <p className="text-[10px] text-muted-foreground">Ex: 60 para 1 hora, 1440 para 1 dia.</p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">Criar Alerta</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <div className="overflow-x-auto scrollbar-none pb-1">
          <TabsList className="bg-muted inline-flex w-full sm:w-auto">
            <TabsTrigger value="pendentes" className="text-xs sm:text-sm whitespace-nowrap">
              Pendentes <Badge className="ml-2 bg-destructive text-destructive-foreground h-5 px-1.5">{isLoading ? '...' : pending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolvidas" className="text-xs sm:text-sm whitespace-nowrap">
              Resolvidas <Badge variant="secondary" className="ml-2 h-5 px-1.5">{isLoading ? '...' : resolved.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs sm:text-sm whitespace-nowrap gap-2">
              <Settings2 className="h-4 w-4" /> Configurar Regras
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pendentes" className="mt-6 space-y-4">
          <Card className="shadow-sm mb-4">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
              <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" hideQuickSelect />
              <LeadSelector selectedLeadId={selectedLeadId} setSelectedLeadId={setSelectedLeadId} />
            </CardContent>
          </Card>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : pending.length > 0 ? (
            pending.map(notification => (
              <NotificationCard key={notification.id} notification={notification} onUpdateStatus={(id, s) => updateStatus({ notificationId: id, status: s })} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm px-4">Nenhuma notificação pendente.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolvidas" className="mt-6 space-y-4">
          <Card className="shadow-sm mb-4">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
              <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" hideQuickSelect />
              <LeadSelector selectedLeadId={selectedLeadId} setSelectedLeadId={setSelectedLeadId} />
            </CardContent>
          </Card>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : resolved.length > 0 ? (
            resolved.map(notification => (
              <NotificationCard key={notification.id} notification={notification} onUpdateStatus={(id, s) => updateStatus({ notificationId: id, status: s })} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm px-4">Nenhuma notificação resolvida neste período.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" /> Como funcionam os alertas?
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  As regras abaixo definem quando o sistema deve avisar sua equipe que um cliente não respondeu. 
                  O sistema verifica o tempo desde a <strong>última mensagem enviada por você</strong> que ainda não teve resposta do lead.
                </CardDescription>
              </CardHeader>
            </Card>

            {loadingRules ? (
              <Skeleton className="h-32 w-full" />
            ) : rules.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl bg-muted/10">
                <p className="text-muted-foreground text-sm">Nenhuma regra configurada.</p>
                <Button variant="link" onClick={() => setIsRuleModalOpen(true)}>Criar meu primeiro alerta</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map(rule => (
                  <Card key={rule.id} className="shadow-sm hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm sm:text-base truncate">{rule.name}</h4>
                          <div className="flex items-center gap-1.5 text-primary text-xs mt-1 font-semibold">
                            <Clock className="h-3.5 w-3.5" /> {rule.minutes} minutos
                          </div>
                        </div>
                        <Switch 
                          checked={rule.is_active} 
                          onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-dashed mt-auto">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inatividade</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteRule.mutate(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar notificações resolvidas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente todas as notificações com status "Resolvido".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-4">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { deleteResolved(); setIsConfirmOpen(false); }}
              className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl"
              disabled={isDeletingResolved}
            >
              {isDeletingResolved ? "Limpando..." : "Sim, Limpar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}