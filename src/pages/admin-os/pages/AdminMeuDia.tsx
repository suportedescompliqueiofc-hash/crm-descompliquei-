import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, CheckSquare,
  Calendar, Clock, ExternalLink, AlertTriangle, Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────────────
interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  due_date: string | null;
  client_id: string | null;
  subtasks: any[];
}

interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_at: string;
  end_at: string | null;
  client_id: string | null;
  meet_link: string | null;
  all_day: boolean;
  color: string;
}

interface PlatformUser {
  id: string;
  clinic_name: string | null;
  updated_at: string | null;
  plan: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toLocalDateStr(d: Date) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const TYPE_LABEL: Record<string, string> = {
  reuniao: 'Reunião', sessao_tatica: 'Sessão Tática',
  compromisso: 'Compromisso', lembrete: 'Lembrete', outro: 'Outro',
};
const TYPE_COLOR: Record<string, string> = {
  reuniao: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  sessao_tatica: 'bg-[#E85D24]/20 text-[#E85D24]',
  compromisso: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  lembrete: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  outro: 'bg-muted text-muted-foreground',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-500 text-white',
  baixa: 'bg-blue-400 text-white',
};

// ── Component ────────────────────────────────────────────────────────────
export default function AdminMeuDia() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [clients, setClients] = useState<PlatformUser[]>([]);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  // Modal Nova Tarefa
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'media' });
  const [savingTask, setSavingTask] = useState(false);

  // Modal Novo Evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'reuniao', start_at: '', meet_link: '' });
  const [savingEvent, setSavingEvent] = useState(false);

  const dateStr = toLocalDateStr(selectedDate);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const dayStart = `${dateStr}T00:00:00`;
        const dayEnd = `${dateStr}T23:59:59`;

        const [evRes, taskRes, userRes] = await Promise.all([
          supabase
            .from('admin_events')
            .select('*')
            .gte('start_at', dayStart)
            .lte('start_at', dayEnd)
            .order('start_at'),
          supabase
            .from('admin_tasks')
            .select('*')
            .gte('due_date', dayStart)
            .lte('due_date', dayEnd)
            .order('priority'),
          supabase
            .from('platform_users')
            .select('id, clinic_name, updated_at, plan')
            .order('updated_at', { ascending: false }),
        ]);

        setEvents((evRes.data || []) as AdminEvent[]);
        setTasks((taskRes.data || []) as AdminTask[]);
        setClients((userRes.data || []) as PlatformUser[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateStr]);

  // ── Actions ─────────────────────────────────────────────────────────
  const toggleTask = async (task: AdminTask) => {
    const newStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    setUpdatingTask(task.id);
    const { error } = await supabase
      .from('admin_tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success(newStatus === 'concluida' ? '✅ Tarefa concluída!' : 'Tarefa reaberta.');
    }
    setUpdatingTask(null);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    setSavingTask(true);
    const { data, error } = await supabase
      .from('admin_tasks')
      .insert({
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        due_date: `${dateStr}T12:00:00+00:00`,
        created_by: user?.id,
        status: 'pendente',
      })
      .select()
      .single();
    if (!error && data) {
      setTasks(prev => [...prev, data as AdminTask]);
      setNewTask({ title: '', description: '', priority: 'media' });
      setShowTaskModal(false);
      toast.success('Tarefa criada!');
    } else {
      toast.error('Erro ao criar tarefa.');
    }
    setSavingTask(false);
  };

  const createEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_at) return;
    setSavingEvent(true);
    const { data, error } = await supabase
      .from('admin_events')
      .insert({
        title: newEvent.title,
        type: newEvent.type,
        start_at: `${dateStr}T${newEvent.start_at}:00`,
        meet_link: newEvent.meet_link || null,
        created_by: user?.id,
        color: '#E85D24',
      })
      .select()
      .single();
    if (!error && data) {
      setEvents(prev => [...prev, data as AdminEvent].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      ));
      setNewEvent({ title: '', type: 'reuniao', start_at: '', meet_link: '' });
      setShowEventModal(false);
      toast.success('Evento criado!');
    } else {
      toast.error('Erro ao criar evento.');
    }
    setSavingEvent(false);
  };

  // ── Computed ─────────────────────────────────────────────────────────
  const pendentes = tasks.filter(t => t.status !== 'concluida');
  const concluidas = tasks.filter(t => t.status === 'concluida');
  const clientesAtencao = clients.filter(u => daysSince(u.updated_at) >= 5);
  const isToday = toLocalDateStr(selectedDate) === toLocalDateStr(new Date());

  const navDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* HEADER + NAVEGAÇÃO */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
            Meu Dia
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {formatDate(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="text-xs">
              Hoje
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => navDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#E85D24]" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── AGENDA DO DIA ──────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#E85D24]" /> Agenda do Dia
              </h2>
              <Button
                size="sm"
                onClick={() => setShowEventModal(true)}
                className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Novo Evento
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm">Nenhum compromisso agendado para este dia.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {events.map(ev => (
                      <div key={ev.id} className="flex gap-4 px-4 py-3">
                        {/* Horário */}
                        <div className="text-right shrink-0 pt-0.5">
                          <p className="text-sm font-bold text-foreground">
                            {ev.all_day ? 'Dia todo' : new Date(ev.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {ev.end_at && !ev.all_day && (
                            <p className="text-[11px] text-muted-foreground">
                              até {new Date(ev.end_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        {/* Linha vertical colorida */}
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-full rounded-full" style={{ background: ev.color || '#E85D24', minHeight: 40 }} />
                        </div>
                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${TYPE_COLOR[ev.type] || TYPE_COLOR.outro}`}>
                              {TYPE_LABEL[ev.type] || ev.type}
                            </Badge>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                          )}
                          {ev.meet_link && (
                            <a
                              href={ev.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Abrir Meet
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── TAREFAS DO DIA ──────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#E85D24]" />
                Tarefas do Dia
                {pendentes.length > 0 && (
                  <Badge className="bg-[#E85D24] text-white text-[10px] px-1.5 py-0">{pendentes.length}</Badge>
                )}
              </h2>
              <Button
                size="sm"
                onClick={() => setShowTaskModal(true)}
                className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Tarefa
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pendentes */}
              <Card>
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pendentes ({pendentes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border">
                  {pendentes.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      ✅ Nenhuma tarefa pendente!
                    </div>
                  ) : (
                    pendentes.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        updating={updatingTask === task.id}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Concluídas */}
              <Card className="opacity-80">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Concluídas ({concluidas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border">
                  {concluidas.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Nenhuma tarefa concluída ainda.
                    </div>
                  ) : (
                    concluidas.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        updating={updatingTask === task.id}
                        done
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── CLIENTES QUE PRECISAM DE ATENÇÃO ─────────────────── */}
          {clientesAtencao.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Clientes que Precisam de Atenção
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {clientesAtencao.slice(0, 8).map(client => {
                    const days = daysSince(client.updated_at);
                    return (
                      <div key={client.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">
                            {(client.clinic_name || 'C').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {client.clinic_name || 'Cliente sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Último acesso: há {days} dia{days !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 ${days >= 14 ? 'bg-red-500 text-white' : days >= 7 ? 'bg-amber-500 text-white' : 'bg-yellow-400 text-black'}`}>
                            {days >= 14 ? '🔴 Crítico' : days >= 7 ? '🟡 Atenção' : '🟠 Aviso'}
                          </Badge>
                          <button
                            onClick={() => navigate('/admin/clientes')}
                            className="text-xs text-[#E85D24] font-medium hover:underline"
                          >
                            Ver cliente
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {clientesAtencao.length > 8 && (
                    <div className="p-3 text-center">
                      <button
                        onClick={() => navigate('/admin/clientes')}
                        className="text-xs text-[#E85D24] font-medium hover:underline"
                      >
                        Ver todos os {clientesAtencao.length} clientes →
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

        </div>
      )}

      {/* ── MODAL NOVA TAREFA ────────────────────────────────────────── */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Título *</label>
              <Input
                placeholder="Ex: Ligar para Clínica HOF..."
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <Textarea
                placeholder="Detalhes da tarefa..."
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Prioridade</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newTask.priority}
                onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>Cancelar</Button>
            <Button
              onClick={createTask}
              disabled={savingTask || !newTask.title.trim()}
              className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white"
            >
              {savingTask ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL NOVO EVENTO ────────────────────────────────────────── */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Evento — {selectedDate.toLocaleDateString('pt-BR')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Título *</label>
              <Input
                placeholder="Ex: Reunião com Clínica X..."
                value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={newEvent.type}
                  onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))}
                >
                  <option value="reuniao">Reunião</option>
                  <option value="sessao_tatica">Sessão Tática</option>
                  <option value="compromisso">Compromisso</option>
                  <option value="lembrete">Lembrete</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Horário *</label>
                <Input
                  type="time"
                  value={newEvent.start_at}
                  onChange={e => setNewEvent(p => ({ ...p, start_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Link Meet (opcional)</label>
              <Input
                placeholder="https://meet.google.com/..."
                value={newEvent.meet_link}
                onChange={e => setNewEvent(p => ({ ...p, meet_link: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventModal(false)}>Cancelar</Button>
            <Button
              onClick={createEvent}
              disabled={savingEvent || !newEvent.title.trim() || !newEvent.start_at}
              className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white"
            >
              {savingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Sub-componente TaskRow ────────────────────────────────────────────────
function TaskRow({
  task, onToggle, updating, done = false
}: {
  task: AdminTask;
  onToggle: (t: AdminTask) => void;
  updating: boolean;
  done?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        disabled={updating}
        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
          done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-border hover:border-[#E85D24]'
        }`}
      >
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : done ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm text-foreground truncate ${done ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>
        )}
      </div>
      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 border-0 ${PRIORITY_COLORS[task.priority] || 'bg-muted text-muted-foreground'}`}>
        {task.priority}
      </Badge>
    </div>
  );
}
