import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Edit, Bot, FileCode2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function TabIaConfig({ toast }: { toast: any }) {
  const [ias, setIas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_ia_config').select('*').order('created_at', { ascending: true });
    if (data) setIas(data);
    setLoading(false);
  };
  
  useEffect(() => { loadData(); }, []);

  const handleEdit = (ia: any) => { setForm(ia); setShowEdit(true); };
  
  const handleSave = async () => {
    await supabase.from('platform_ia_config').update({
       name: form.name,
       description: form.description,
       system_prompt: form.system_prompt,
       model: form.model,
       active: form.active,
       min_plan: form.min_plan
    }).eq('id', form.id);
    
    toast({ title: 'Configuração da IA atualizada!' });
    setShowEdit(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold">Gerenciador de IAs Comerciais</h2>
           <p className="text-sm text-muted-foreground">Ajuste os prompts de sistema e regras de negócio para as inteligências da plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> Atualizar Regras
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-[#E85D24]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codinome Interno</TableHead>
                <TableHead>Agente de IA</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ajustar Prompt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ias.map(ia => (
                <TableRow key={ia.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{ia.ia_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                       <Bot className="w-4 h-4 text-emerald-600"/>
                       {ia.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-[300px] truncate">{ia.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700">{ia.model}</Badge></TableCell>
                  <TableCell><Badge variant={ia.min_plan === 'gca' ? 'default' : 'secondary'} className={ia.min_plan === 'gca' ? 'bg-[#E85D24]': ''}>{ia.min_plan.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Switch checked={ia.active} onCheckedChange={async (val) => { await supabase.from('platform_ia_config').update({active: val}).eq('id', ia.id); loadData(); }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ia)}>
                       <FileCode2 className="w-4 h-4 mr-2" /> Editar Backend
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {ias.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma IA mapeada no banco.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Edição */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
         <DialogContent className="max-w-3xl">
           <DialogHeader><DialogTitle>Editar Comportamento da IA: {form.name}</DialogTitle></DialogHeader>
           
           <div className="space-y-4 pt-2">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome de Exibição</Label>
                  <Input value={form.name || ''} onChange={e=>setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Acesso Mínimo</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.min_plan || 'pca'} onChange={e=>setForm({...form, min_plan: e.target.value})}>
                    <option value="pca">P.C.A.</option>
                    <option value="gca">G.C.A.</option>
                  </select>
                </div>
             </div>
             
             <div className="space-y-1">
               <Label>Subtítulo / Descrição</Label>
               <Input value={form.description || ''} onChange={e=>setForm({...form, description: e.target.value})} />
             </div>
             
             <div className="space-y-1 border rounded-md p-3 bg-secondary/20">
               <div className="flex items-center justify-between mb-2">
                  <Label className="text-[#E85D24] font-bold">System Prompt Instrucional</Label>
                  <Badge variant="outline" className="font-mono text-xs">{form.model}</Badge>
               </div>
               <p className="text-[11px] text-muted-foreground mb-2">
                 Essas são as regras absolutas que a IA seguirá antes de ler a resposta do usuário.
                 Você pode usar chaves dinâmicas que serão injetadas: `{"{CLINIC_NAME}"}`, `{"{SPECIALTY}"}`, `{"{CONTEXT}"}`.
               </p>
               <Textarea 
                 className="min-h-[250px] font-mono text-sm leading-relaxed border-0 bg-background resize-y" 
                 value={form.system_prompt || ''} 
                 onChange={e=>setForm({...form, system_prompt: e.target.value})} 
               />
             </div>

             <div className="flex items-center space-x-2">
               <Switch checked={form.active} onCheckedChange={c=>setForm({...form, active: c})} id="active_ia" />
               <Label htmlFor="active_ia">Agente Ativo e Visível para Uso</Label>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
             <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">Compilar e Salvar</Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
