import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, Plus } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at?: string;
  client_id?: string;
  meet_link?: string;
  description?: string;
  is_sessao_tatica?: boolean;
}

export default function AdminCalendario() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<{id:string, clinic_name:string}[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '', type: 'reuniao', start_at: '', end_at: '', meet_link: '', description: '', client_id: 'none'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Calendário · Admin OS | Descompliquei';
    loadData();
    loadClients();
  }, [currentDate]);

  async function loadClients() {
    const { data } = await supabase.from('platform_users').select('id, clinic_name');
    if (data) setClients(data);
  }

  async function loadData() {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 0 }).toISOString();
      const end = endOfWeek(monthEnd, { weekStartsOn: 0 }).toISOString();

      // Fetch admin events
      const { data: adminEvts, error: err1 } = await supabase
        .from('admin_events')
        .select('*')
        .gte('start_at', start)
        .lte('start_at', end);
      
      // Fetch sessões táticas (active only)
      const { data: sessoes, error: err2 } = await supabase
        .from('platform_sessoes_taticas')
        .select('*')
        .eq('active', true)
        .gte('scheduled_at', start)
        .lte('scheduled_at', end);

      if (err1) throw err1;
      if (err2) throw err2;

      const formattedSessoes: Event[] = (sessoes || []).map(s => ({
        id: s.id,
        title: s.title,
        type: 'sessao_tatica',
        start_at: s.scheduled_at,
        meet_link: s.meet_link,
        description: s.description,
        is_sessao_tatica: true
      }));

      setEvents([...(adminEvts || []), ...formattedSessoes]);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Render Calendar Grid
  const renderHeader = () => {
    const dateFormat = "EEEE";
    const days = [];
    let startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-bold text-sm text-muted-foreground uppercase py-2">
          {format(addDays(startDate, i), dateFormat, { locale: ptBR })}
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-border">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => isSameDay(new Date(e.start_at), cloneDay));

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-r border-b border-border relative transition-colors ${
              !isSameMonth(day, monthStart)
                ? "bg-muted/10 text-muted-foreground/30"
                : isToday(day)
                ? "bg-blue-500/5"
                : "hover:bg-muted/20 cursor-pointer"
            }`}
            onClick={() => {
              if (isSameMonth(cloneDay, monthStart)) {
                setFormData({ title: '', type: 'reuniao', start_at: format(cloneDay, "yyyy-MM-dd'T'10:00"), client_id: 'none' });
                setShowModal(true);
              }
            }}
          >
            <div className={`text-right font-medium text-sm mb-1 ${isToday(day) ? 'text-blue-500 font-bold' : ''}`}>
              {formattedDate}
            </div>
            <div className="flex flex-col gap-1">
              {dayEvents.map(evt => {
                let colorClass = 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
                if (evt.type === 'sessao_tatica') colorClass = 'bg-[#E85D24]/20 text-[#E85D24] border-[#E85D24]/30';
                if (evt.type === 'compromisso') colorClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                if (evt.type === 'lembrete') colorClass = 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={evt.id}
                    onClick={(e) => { e.stopPropagation(); setFormData(evt); setShowModal(true); }}
                    className={`text-[10px] px-1.5 py-1 rounded border truncate font-medium cursor-pointer ${colorClass}`}
                    title={evt.title}
                  >
                    {format(new Date(evt.start_at), "HH:mm")} - {evt.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="border-l border-t border-border bg-card rounded-b-lg overflow-hidden">{rows}</div>;
  };

  async function saveEvent() {
    if (!formData.title || !formData.start_at) {
      return toast({ title: 'Aviso', description: 'Título e Data Inicial são obrigatórios', variant: 'destructive' });
    }
    if (formData.is_sessao_tatica) {
      return toast({ title: 'Aviso', description: 'Sessões Táticas devem ser editadas na página de Sessões', variant: 'destructive' });
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.client_id === 'none') payload.client_id = null;

      if (formData.id) {
        const { error } = await supabase.from('admin_events').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('admin_events').insert([payload]);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: 'Evento salvo!' });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!formData.id || formData.is_sessao_tatica) return;
    if (!confirm('Deseja realmente excluir este evento?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('admin_events').delete().eq('id', formData.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Evento excluído!' });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Calendário Operacional</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe sessões, reuniões e eventos internos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleToday} variant="outline" className="font-bold">Hoje</Button>
          <Button onClick={() => { setFormData({ title: '', type: 'reuniao', start_at: '', client_id: 'none' }); setShowModal(true); }} className="bg-[#E85D24] text-white">
            <Plus className="h-4 w-4 mr-2"/> Novo Evento
          </Button>
        </div>
      </div>

      <Card className="border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 rounded-t-lg">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5"/></Button>
            <h2 className="text-xl font-bold uppercase tracking-wider text-foreground w-48 text-center">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5"/></Button>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-[#E85D24]" />}
        </div>
        <div>
          {renderHeader()}
          {renderCells()}
        </div>
      </Card>

      <div className="flex gap-4 items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Reunião</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#E85D24]"></div> Sessão Tática</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> Compromisso</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500"></div> Lembrete</div>
      </div>

      {/* EVENT MODAL */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{formData.id ? 'Detalhes do Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {formData.is_sessao_tatica ? (
              <div className="p-4 bg-muted/50 rounded-lg border border-border text-center space-y-2">
                <CalendarIcon className="h-8 w-8 text-[#E85D24] mx-auto opacity-50" />
                <p className="font-bold text-foreground">{formData.title}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(formData.start_at!), "dd/MM/yyyy 'às' HH:mm")}</p>
                {formData.meet_link && <a href={formData.meet_link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm block">Acessar Reunião</a>}
                <p className="text-xs mt-4 text-muted-foreground">Sessões Táticas devem ser editadas na aba Sessões.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Título</label>
                  <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Reunião de Alinhamento" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="compromisso">Compromisso</SelectItem>
                        <SelectItem value="lembrete">Lembrete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Cliente (Opcional)</label>
                    <Select value={formData.client_id || 'none'} onValueChange={v => setFormData({...formData, client_id: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3"/> Início</label>
                    <Input type="datetime-local" value={formData.start_at ? new Date(new Date(formData.start_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, start_at: e.target.value ? new Date(e.target.value).toISOString() : ''})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3"/> Fim (Opcional)</label>
                    <Input type="datetime-local" value={formData.end_at ? new Date(new Date(formData.end_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, end_at: e.target.value ? new Date(e.target.value).toISOString() : ''})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1"><LinkIcon className="h-3 w-3"/> Link Reunião</label>
                  <Input value={formData.meet_link || ''} onChange={e => setFormData({...formData, meet_link: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {(!formData.is_sessao_tatica && formData.id) ? (
              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={deleteEvent} disabled={saving}>
                Excluir
              </Button>
            ) : <div></div>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              {!formData.is_sessao_tatica && (
                <Button onClick={saveEvent} disabled={saving} className="bg-[#E85D24] text-white">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Salvar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
