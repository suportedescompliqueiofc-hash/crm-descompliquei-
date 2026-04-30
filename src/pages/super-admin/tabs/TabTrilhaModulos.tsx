import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, RefreshCw, Edit, BookOpen, Clock, Activity, Box } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function TabTrilhaModulos({ toast }: { toast: any }) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_modules')
                             .select('*')
                             .order('pillar', { ascending: true })
                             .order('order_index', { ascending: true });
    
    if (data) {
      setModules(data);
    }
    setLoading(false);
  };
  
  useEffect(() => { loadData(); }, []);

  const handleEdit = (m: any) => { setForm(m); setShowEdit(true); };
  
  const handleSave = async () => {
    if (form.id && modules.find(m => m.id === form.id && !m._isNew)) {
       // update
       await supabase.from('platform_modules').update({
         pillar: form.pillar,
         order_index: form.order_index,
         title: form.title,
         min_plan: form.min_plan,
         active: form.active
       }).eq('id', form.id);
       toast({ title: 'Módulo atualizado!' });
    } else {
       // insert
       await supabase.from('platform_modules').insert({
         id: form.id,
         pillar: form.pillar,
         order_index: form.order_index,
         title: form.title,
         min_plan: form.min_plan,
         active: form.active
       });
       toast({ title: 'Módulo criado com sucesso!' });
    }
    setShowEdit(false);
    loadData();
  };

  const total = modules.length;
  const activeCount = modules.filter(m => m.active).length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Box className="h-5 w-5 text-blue-600"/><div><p className="text-xs text-muted-foreground">Total Módulos</p><p className="text-lg font-bold">{total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-emerald-600"/><div><p className="text-xs text-muted-foreground">Mósulos Ativos (Visíveis)</p><p className="text-lg font-bold">{activeCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-[#E85D24]"/><div><p className="text-xs text-muted-foreground">Pilares Registrados</p><p className="text-lg font-bold">{new Set(modules.map(m=>m.pillar)).size}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-amber-600"/><div><p className="text-xs text-muted-foreground">Aulas Pendentes de Conteúdo</p><p className="text-lg font-bold">{modules.filter(m => !m.video_url && !m.aprender_content).length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Arquitetura da Trilha</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setForm({ active: true, min_plan: 'pca', pillar: 1, _isNew: true }); setShowEdit(true); }} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90">
            <Plus className="h-4 w-4 mr-2"/> Nova Aula / Módulo
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Pilar</TableHead>
                <TableHead className="w-[50px]">Ordem</TableHead>
                <TableHead className="w-[80px]">ID Base</TableHead>
                <TableHead>Título da Aula</TableHead>
                <TableHead>Integridade (Conteúdo)</TableHead>
                <TableHead className="w-[100px]">Público</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação Básica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map(m => {
                const hasAprenda = !!m.video_url || !!m.aprender_content;
                const hasConstrua = m.construa_fields && m.construa_fields.length > 0;
                let strengthClass = "text-amber-500 bg-amber-50";
                let strengthLabel = "Vazio / Incompleto";
                if(hasAprenda && hasConstrua) { strengthClass = "text-emerald-700 bg-emerald-50"; strengthLabel = "Módulo Saudável"; }
                
                return (
                 <TableRow key={m.id}>
                  <TableCell className="font-bold text-muted-foreground">{m.pillar}</TableCell>
                  <TableCell>{m.order_index}</TableCell>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{m.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${strengthClass} border-0`}>{strengthLabel}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {hasAprenda ? '✅ Teoria ' : '❌ Teoria '} • 
                      {hasConstrua ? ' ✅ Prática' : ' ❌ Prática'}
                    </p>
                  </TableCell>
                  <TableCell><Badge variant={m.min_plan === 'gca' ? "default" : "secondary"} className={m.min_plan === 'gca' ? 'bg-[#E85D24]' : ''}>{m.min_plan.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <Switch checked={m.active} onCheckedChange={async (vis) => {
                      await supabase.from('platform_modules').update({active: vis}).eq('id', m.id); loadData();
                    }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(m)}><Edit className="w-4 h-4" /></Button>
                  </TableCell>
                 </TableRow>
                )
              })}
              {modules.length === 0 && <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Nenhum módulo. Comece a criar sua trilha.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Edit/New */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>{form._isNew ? 'Criar Novo Módulo' : 'Propriedades Básicas do Módulo'}</DialogTitle>
             {!form._isNew && <p className="text-xs text-muted-foreground">Para editar vídeos e exercícios, use a aba "Trilha — Conteúdo".</p>}
           </DialogHeader>
           
           <div className="space-y-4 pt-2">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <Label>ID de Texto (Ex: 1.1)</Label>
                 <Input value={form.id || ''} onChange={e=>setForm({...form, id: e.target.value})} disabled={!form._isNew} />
               </div>
               <div className="space-y-1">
                 <Label>Fase/Pilar (Ex: 1, 2, 3)</Label>
                 <Input type="number" value={form.pillar || ''} onChange={e=>setForm({...form, pillar: parseInt(e.target.value)})} />
               </div>
             </div>
             
             <div className="space-y-1">
               <Label>Nome Interno / Título</Label>
               <Input value={form.title || ''} onChange={e=>setForm({...form, title: e.target.value})} />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Plano de Acesso Restrito</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.min_plan || 'pca'} onChange={e=>setForm({...form, min_plan: e.target.value})}>
                    <option value="pca">P.C.A. (Libera todos)</option>
                    <option value="gca">G.C.A. (Exclusivo)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Posição na Pilha (Ordem)</Label>
                  <Input type="number" value={form.order_index || 0} onChange={e=>setForm({...form, order_index: parseInt(e.target.value)})} />
                </div>
             </div>
             
             <div className="flex items-center space-x-2 pt-2">
               <Switch checked={form.active} onCheckedChange={c=>setForm({...form, active: c})} id="active_mod" />
               <Label htmlFor="active_mod">Visível para alunos</Label>
             </div>
           </div>
           <DialogFooter>
             <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
             <Button onClick={handleSave} className="bg-[#E85D24]">Salvar Propriedades</Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
