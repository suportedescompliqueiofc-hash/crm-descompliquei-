import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const NOTE_TYPES = ['observacao', 'alerta', 'oportunidade', 'historico'] as const;
const NOTE_LABELS: Record<string, string> = {
  observacao: 'Observação', alerta: 'Alerta', oportunidade: 'Oportunidade', historico: 'Histórico',
};
const NOTE_COLORS: Record<string, string> = {
  observacao: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  alerta: 'bg-red-500/20 text-red-700 dark:text-red-300',
  oportunidade: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  historico: 'bg-muted text-muted-foreground',
};

interface Note { id: string; content: string; type: string; created_at: string; created_by: string | null }
interface Props { clientId: string; notes: Note[]; onRefresh: () => void }

export default function AbaAnotacoes({ clientId, notes, onRefresh }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState<string>('observacao');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('admin_client_notes').insert({
      client_id: clientId, content, type, created_by: user?.id,
    });
    if (error) { toast.error('Erro ao salvar nota.'); }
    else { toast.success('Anotação adicionada!'); setContent(''); setOpen(false); onRefresh(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar Anotação
        </Button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhuma anotação ainda.</CardContent></Card>
        ) : notes.map(note => (
          <Card key={note.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={`text-[10px] border-0 ${NOTE_COLORS[note.type] || 'bg-muted text-muted-foreground'}`}>
                  {NOTE_LABELS[note.type] || note.type}
                </Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Anotação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={type} onChange={e => setType(e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{NOTE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Anotação *</label>
              <Textarea rows={4} placeholder="Escreva a anotação..." value={content} onChange={e => setContent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !content.trim()} className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
