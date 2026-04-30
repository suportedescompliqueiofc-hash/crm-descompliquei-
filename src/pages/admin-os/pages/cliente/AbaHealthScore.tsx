import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Health { id: string; score: number; engajamento: string; satisfacao: string; risco_churn: string; observacao: string | null; created_at: string }
interface Props { clientId: string; healthHistory: Health[]; onRefresh: () => void }

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-8 border-muted" style={{ borderBottomColor: 'transparent' }} />
        <div className="absolute inset-0 rounded-t-full border-8 border-transparent"
          style={{ borderTopColor: color, borderLeftColor: pct > 25 ? color : 'transparent', borderRightColor: pct > 75 ? color : 'transparent', transform: `rotate(${(pct / 100) * 180 - 90}deg)`, transformOrigin: 'center bottom' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-black" style={{ color }}>{score}</div>
      </div>
      <p className="text-xs text-muted-foreground">Health Score</p>
    </div>
  );
}

const BADGE_MAP: Record<string, Record<string, string>> = {
  engajamento: { alto: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', medio: 'bg-blue-500/20 text-blue-700 dark:text-blue-300', baixo: 'bg-amber-500/20 text-amber-700 dark:text-amber-300', critico: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  risco_churn: { baixo: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', medio: 'bg-amber-500/20 text-amber-700 dark:text-amber-300', alto: 'bg-red-500/20 text-red-700 dark:text-red-300' },
};

export default function AbaHealthScore({ clientId, healthHistory, onRefresh }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ engajamento: 'medio', satisfacao: 'bom', risco_churn: 'medio', score: 60, observacao: '' });
  const [saving, setSaving] = useState(false);
  const latest = healthHistory[0];

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('admin_client_health').insert({
      client_id: clientId, ...form, avaliado_por: user?.id,
    });
    if (error) { toast.error('Erro ao salvar avaliação.'); }
    else { toast.success('Avaliação registrada!'); setOpen(false); onRefresh(); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Score atual */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <ScoreGauge score={latest?.score ?? 0} />
          <div className="space-y-2 flex-1">
            {latest ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-[10px] border-0 ${BADGE_MAP.engajamento[latest.engajamento] || 'bg-muted text-muted-foreground'}`}>
                    Engajamento: {latest.engajamento}
                  </Badge>
                  <Badge className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 border-0">
                    Satisfação: {latest.satisfacao}
                  </Badge>
                  <Badge className={`text-[10px] border-0 ${BADGE_MAP.risco_churn[latest.risco_churn] || 'bg-muted text-muted-foreground'}`}>
                    Churn: {latest.risco_churn}
                  </Badge>
                </div>
                {latest.observacao && <p className="text-sm text-muted-foreground">{latest.observacao}</p>}
                <p className="text-[11px] text-muted-foreground">Última avaliação: {new Date(latest.created_at).toLocaleDateString('pt-BR')}</p>
              </>
            ) : <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>}
          </div>
          <Button onClick={() => setOpen(true)} className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white gap-1.5 shrink-0 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova Avaliação
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#E85D24]" /> Histórico de Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {healthHistory.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma avaliação ainda.</p>
          ) : healthHistory.map(h => (
            <div key={h.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`text-lg font-black w-12 text-center ${h.score >= 70 ? 'text-emerald-600' : h.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{h.score}</div>
              <div className="flex-1 flex flex-wrap gap-1">
                <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">Eng.: {h.engajamento}</Badge>
                <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">Churn: {h.risco_churn}</Badge>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Avaliação de Health Score</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: 'Engajamento', key: 'engajamento', opts: ['alto','medio','baixo','critico'] },
              { label: 'Satisfação', key: 'satisfacao', opts: ['otimo','bom','regular','ruim'] },
              { label: 'Risco de Churn', key: 'risco_churn', opts: ['baixo','medio','alto'] },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{f.label}</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Score (0–100)</label>
              <Input type="number" min={0} max={100} value={form.score}
                onChange={e => setForm(p => ({ ...p, score: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Observação</label>
              <Textarea rows={3} value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
