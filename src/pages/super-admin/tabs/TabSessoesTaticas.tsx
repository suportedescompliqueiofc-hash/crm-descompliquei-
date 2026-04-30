import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, RefreshCw, Edit, Video, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function TabSessoesTaticas({ toast }: { toast: any }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('platform_sessoes_taticas')
                             .select('*')
                             .order('scheduled_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar sessões táticas:', error);
      toast({ 
        title: 'Erro ao carregar dados', 
        description: error.message,
        variant: 'destructive' 
      });
    }

    if (data) setSessions(data);
    setLoading(false);
  };
  
  useEffect(() => { loadData(); }, []);

  const handleEdit = (s: any) => { 
    let formattedDate = '';
    if (s.scheduled_at) {
       const d = new Date(s.scheduled_at);
       const pad = (n: number) => n.toString().padStart(2, '0');
       formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setForm({...s, scheduled_at_local: formattedDate}); 
    setShowEdit(true); 
  };
  
  const handleSave = async () => {
    let finalDate = undefined;
    if (form.scheduled_at_local) {
       finalDate = new Date(form.scheduled_at_local).toISOString();
    }
    const payload = {
      title: form.title, 
      type: (form.type || 'comercial').toLowerCase(), 
      description: form.description,
      meet_link: form.meet_link, recording_url: form.recording_url,
      active: form.active !== false, scheduled_at: finalDate
    };

    if (form.id) {
       await supabase.from('platform_sessoes_taticas').update(payload).eq('id', form.id);
       toast({ title: 'Sessão atualizada com sucesso!' });
    } else {
       await supabase.from('platform_sessoes_taticas').insert(payload);
       toast({ title: 'Nova Sessão agendada!' });
    }
    setShowEdit(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold">Calendário de Mentorias</h2>
           <p className="text-sm text-muted-foreground">Agende sessões ao vivo e disponibilize gravações.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setForm({ active: true, type: 'Comercial' }); setShowEdit(true); }} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90">
            <Plus className="h-4 w-4 mr-2"/> Nova Sessão
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e Hora</TableHead>
                <TableHead>Foco (Tipo)</TableHead>
                <TableHead>Título e Descrição</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="w-[100px] text-center">No Ar (Visível)</TableHead>
                <TableHead className="text-right">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                     <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground"/> 
                        {s.scheduled_at ? format(new Date(s.scheduled_at), 'dd/MM/yyyy HH:mm') : '—'}
                     </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.type === 'comercial' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}>
                      {s.type === 'comercial' ? 'Comercial' : 'Demanda'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{s.description || 'Sem descrição'}</div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1 text-xs">
                        {s.meet_link ? <a href={s.meet_link} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline"><ExternalLink className="w-3 h-3"/> Meet Agendado</a> : <span className="text-muted-foreground">Sem Meet</span>}
                        {s.recording_url ? <a href={s.recording_url} target="_blank" className="flex items-center gap-1 text-emerald-500 hover:underline"><Video className="w-3 h-3"/> Gravação Pronta</a> : <span className="text-muted-foreground">Sem Gravação</span>}
                     </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={s.active} onCheckedChange={async (val) => { 
                       await supabase.from('platform_sessoes_taticas').update({active: val}).eq('id', s.id); 
                       loadData(); 
                    }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma sessão tática agendada.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Nova/Edição */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
         <DialogContent className="max-w-xl">
           <DialogHeader><DialogTitle>{form.id ? 'Editar Sessão Tática' : 'Agendar Nova Sessão'}</DialogTitle></DialogHeader>
           
           <div className="space-y-4 pt-2">
             <div className="space-y-1">
               <Label>Título Chamativo</Label>
               <Input value={form.title || ''} onChange={e=>setForm({...form, title: e.target.value})} placeholder="Ex: Como contornar objeção de preço alto" />
             </div>
             <div className="space-y-1">
               <Label>Descrição Curta (Opcional)</Label>
               <Input value={form.description || ''} onChange={e=>setForm({...form, description: e.target.value})} placeholder="Resumo do que será ensinado" />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={form.scheduled_at_local || ''} onChange={e=>setForm({...form, scheduled_at_local: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Foco da Sessão</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type || 'Comercial'} onChange={e=>setForm({...form, type: e.target.value})}>
                    <option value="Comercial">Comercial</option>
                    <option value="Demanda">Geração de Demanda</option>
                  </select>
                </div>
             </div>
             
             <div className="space-y-1">
               <Label>Link ao Vivo (Google Meet, Zoom)</Label>
               <Input value={form.meet_link || ''} onChange={e=>setForm({...form, meet_link: e.target.value})} placeholder="https://meet.google.com/..." />
               <p className="text-[11px] text-muted-foreground">O botão 'Entrar' só é liberado para o aluno 15 minutos antes da sessão.</p>
             </div>
             <div className="space-y-1">
               <Label>Link Gravação (Vimeo ou Youtube Unlisted)</Label>
               <Input value={form.recording_url || ''} onChange={e=>setForm({...form, recording_url: e.target.value})} placeholder="Após a live, cole aqui pra virar replay." />
               <p className="text-[11px] text-muted-foreground">Se preenchido, o card da live vira instantaneamente um card de gravação.</p>
             </div>
             
             <div className="flex items-center space-x-2 pt-2">
               <Switch checked={form.active} onCheckedChange={c=>setForm({...form, active: c})} id="active_2" />
               <Label htmlFor="active_2">Visível no Calendário de todos alunos</Label>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
             <Button onClick={handleSave} className="bg-[#E85D24]">Agendar Sessão</Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
