import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Link as LinkIcon, Video, Plus, Edit3, Loader2 } from 'lucide-react';
import { format, isAfter, isBefore, startOfToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sessao {
  id: string;
  title: string;
  type: string;
  scheduled_at: string;
  meet_link: string;
  recording_url: string;
  description: string;
  active: boolean;
}

export default function AdminSessoes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState('todas');
  const [filterTime, setFilterTime] = useState('todas');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Sessao>>({
    title: '', type: 'comercial', scheduled_at: '', meet_link: '', recording_url: '', description: '', active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Sessões Táticas · Admin OS | Descompliquei';
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_sessoes_taticas')
        .select('*')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      setSessoes(data || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const hoje = startOfToday();
  const proximas = sessoes.filter(s => s.active && isAfter(new Date(s.scheduled_at), hoje));
  const proximaSessao = proximas.length > 0 ? proximas[0] : null;

  const filtered = sessoes.filter(s => {
    if (filterType !== 'todas' && s.type !== filterType) return false;
    if (filterTime === 'futuras' && !isAfter(new Date(s.scheduled_at), hoje)) return false;
    if (filterTime === 'passadas' && !isBefore(new Date(s.scheduled_at), hoje)) return false;
    return true;
  });

  async function saveSessao() {
    if (!formData.title || !formData.scheduled_at) {
      return toast({ title: 'Aviso', description: 'Título e Data são obrigatórios', variant: 'destructive' });
    }
    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase.from('platform_sessoes_taticas').update(formData).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('platform_sessoes_taticas').insert([formData]);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: 'Sessão salva com sucesso' });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const { error } = await supabase.from('platform_sessoes_taticas').update({ active: !current }).eq('id', id);
      if (error) throw error;
      setSessoes(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  }

  function openNew() {
    setFormData({ title: '', type: 'comercial', scheduled_at: '', meet_link: '', recording_url: '', description: '', active: true });
    setShowModal(true);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
            Sessões Táticas
            <Badge className="bg-[#E85D24]">Comercial</Badge>
            <Badge className="bg-blue-600">Demanda</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os encontros ao vivo com seus clientes.</p>
        </div>
        <Button onClick={openNew} className="bg-[#E85D24] text-white">
          <Plus className="h-4 w-4 mr-2" /> Nova Sessão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Próxima Sessão */}
        <Card className="md:col-span-1 bg-gradient-to-br from-background to-muted/50 border-[#E85D24]/30">
          <CardHeader>
            <CardTitle className="text-sm text-[#E85D24] uppercase tracking-wider">Próxima Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            {proximaSessao ? (
              <div className="space-y-3">
                <h3 className="text-xl font-bold">{proximaSessao.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(new Date(proximaSessao.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </div>
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline">{proximaSessao.type}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma sessão futura agendada.</p>
            )}
          </CardContent>
        </Card>

        {/* Mini Calendario (Visão 4 semanas simples) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Próximos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const d = addDays(hoje, i);
                const hasSessao = sessoes.some(s => new Date(s.scheduled_at).toDateString() === d.toDateString());
                if (!hasSessao && i > 14) return null; // hide empty far days to save space
                return (
                  <div key={i} className={`shrink-0 flex flex-col items-center justify-center p-2 rounded-lg border w-16 h-20 ${hasSessao ? 'bg-[#E85D24]/10 border-[#E85D24]/50' : 'bg-muted/10 border-border'}`}>
                    <span className="text-[10px] text-muted-foreground uppercase">{format(d, 'EEE', { locale: ptBR })}</span>
                    <span className={`text-lg font-bold ${hasSessao ? 'text-[#E85D24]' : 'text-foreground'}`}>{format(d, 'dd')}</span>
                    {hasSessao && <div className="w-1.5 h-1.5 rounded-full bg-[#E85D24] mt-1" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-border flex gap-4 bg-muted/20">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os Tipos</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="demanda">Demanda</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTime} onValueChange={setFilterTime}>
            <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os Períodos</SelectItem>
              <SelectItem value="futuras">Futuras</SelectItem>
              <SelectItem value="passadas">Passadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Data/Hora</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Título</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Tipo</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Links</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Ativa</th>
                <th className="px-4 py-3 text-right font-bold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#E85D24]"/></td></tr> : 
               filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma sessão encontrada.</td></tr> :
               filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    {format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">{s.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={s.type === 'comercial' ? 'text-[#E85D24] border-[#E85D24]/30' : 'text-blue-500 border-blue-500/30'}>
                      {s.type.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    {s.meet_link && <a href={s.meet_link} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-500 hover:underline"><LinkIcon className="h-3 w-3 mr-1"/> Reunião</a>}
                    {s.recording_url && <a href={s.recording_url} target="_blank" rel="noreferrer" className="flex items-center text-xs text-emerald-500 hover:underline"><Video className="h-3 w-3 mr-1"/> Gravação</a>}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={s.active} onCheckedChange={() => toggleActive(s.id, s.active)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setFormData(s); setShowModal(true); }}>
                      <Edit3 className="h-4 w-4"/>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{formData.id ? 'Editar Sessão' : 'Nova Sessão'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título</label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Sessão Tática #12 - Fechamento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="comercial">Comercial</SelectItem><SelectItem value="demanda">Demanda</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data e Hora</label>
                <Input type="datetime-local" value={formData.scheduled_at ? new Date(new Date(formData.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : ''})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link da Reunião (Meet/Zoom)</label>
              <Input value={formData.meet_link || ''} onChange={e => setFormData({...formData, meet_link: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL da Gravação</label>
              <Input value={formData.recording_url || ''} onChange={e => setFormData({...formData, recording_url: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={formData.active} onCheckedChange={c => setFormData({...formData, active: !!c})} />
              <label className="text-sm font-medium">Sessão Ativa na Plataforma</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={saveSessao} disabled={saving} className="bg-[#E85D24] text-white">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
