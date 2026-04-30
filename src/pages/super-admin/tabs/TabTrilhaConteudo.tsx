import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Video, ListTree, GripVertical, CheckSquare, Settings2, Trash2, ArrowUp, ArrowDown, Plus, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function TabTrilhaConteudo({ toast }: { toast: any }) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  // Builder state para o módulo selecionado
  const [videoUrl, setVideoUrl] = useState('');
  const [aprenderContent, setAprenderContent] = useState('');
  const [construaFields, setConstruaFields] = useState<any[]>([]);
  const [valideChecklist, setValideChecklist] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_modules')
                             .select('*')
                             .order('pillar', { ascending: true })
                             .order('order_index', { ascending: true });
    if (data) { setModules(data); }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Update builder form when selecting a module
  useEffect(() => {
    if(!selectedModuleId) return;
    const mod = modules.find(m => m.id === selectedModuleId);
    if(mod) {
      setVideoUrl(mod.video_url || '');
      setAprenderContent(mod.aprender_content || '');
      setConstruaFields(mod.construa_fields || []);
      setValideChecklist(mod.valide_checklist || []);
    }
  }, [selectedModuleId, modules]);

  const saveContent = async () => {
    if(!selectedModuleId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('platform_modules').update({
        video_url: videoUrl,
        aprender_content: aprenderContent,
        construa_fields: construaFields,
        valide_checklist: valideChecklist
      }).eq('id', selectedModuleId);
      
      if (error) throw error;

      toast({ title: 'Conteúdo salvo e publicado no app.' });
      loadData(); // refresh list
    } catch(e: any) {
      console.error('Erro ao salvar:', e);
      toast({ title: 'Erro ao salvar', description: e.message || 'Houve um problema ao salvar no banco.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingVideo(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `modulos/${selectedModuleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-mensagens')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media-mensagens')
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      toast({ title: 'Vídeo carregado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({ title: 'Falha no upload', description: error.message || 'Houve um problema ao enviar o arquivo para o storage.', variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  // --- Handlers do "Construa" (Campos Dinâmicos)
  const addField = () => {
    setConstruaFields([...construaFields, { id: `field_${Date.now()}`, type: 'text', label: 'Novo Campo', placeholder: '', required: false }]);
  };
  const updateField = (index: number, key: string, value: any) => {
    const updated = [...construaFields];
    updated[index][key] = value;
    setConstruaFields(updated);
  };
  const removeField = (index: number) => {
    setConstruaFields(construaFields.filter((_, i) => i !== index));
  };
  const moveField = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= construaFields.length) return;
    const updated = [...construaFields];
    const temp = updated[index];
    updated[index] = updated[index + direction];
    updated[index + direction] = temp;
    setConstruaFields(updated);
  };

  // --- Handlers do "Valide" (Checklist)
  const addCheckItem = () => {
    setValideChecklist([...valideChecklist, { id: `chk_${Date.now()}`, text: 'Nova tarefa de validação', required: true }]);
  };
  const updateCheckItem = (index: number, key: string, value: any) => {
    const updated = [...valideChecklist];
    updated[index][key] = value;
    setValideChecklist(updated);
  };
  const removeCheckItem = (index: number) => {
    setValideChecklist(valideChecklist.filter((_, i) => i !== index));
  };


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[600px]">
      {/* Sidebar de Seleção */}
      <Card className="w-full lg:w-80 flex-shrink-0 h-full flex flex-col shadow-sm">
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base flex justify-between items-center">
            Selecione a Aula
            <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1 no-scrollbar">
           {loading ? <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div> : (
              <div className="divide-y">
                {modules.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setSelectedModuleId(m.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedModuleId === m.id ? 'bg-[#E85D24]/10 border-l-4 border-l-[#E85D24]' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="font-medium text-sm truncate">{m.id} - {m.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                       {m.video_url ? <span className="text-emerald-600">🎥 Vídeo ok</span> : <span>Sem vídeo</span>}
                       {m.construa_fields?.length > 0 ? <span className="text-emerald-600">📝 Exercícios</span> : <span></span>}
                    </div>
                  </button>
                ))}
              </div>
           )}
        </CardContent>
      </Card>

      {/* Área Principal de Construção */}
      {selectedModuleId ? (
        <Card className="flex-1 flex flex-col shadow-sm border overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Modo Construtor ({selectedModuleId})</CardTitle>
              <p className="text-xs text-muted-foreground">Configure os passos Aprenda, Construa e Valide desta aula.</p>
            </div>
            <Button onClick={saveContent} disabled={isSaving} className="bg-[#E85D24]">
               {isSaving ? 'Salvando...' : 'Salvar Conteúdos da Aula'}
            </Button>
          </CardHeader>
          
          <CardContent className="p-0 overflow-y-auto flex-1 no-scrollbar">
            <Accordion type="multiple" defaultValue={["aprenda", "construa", "valide"]} className="w-full">
              
              {/* === ETAPA APRENDA === */}
              <AccordionItem value="aprenda" className="border-b-0 px-6 py-2">
                <AccordionTrigger className="hover:no-underline"><div className="flex items-center text-lg"><Video className="w-5 h-5 mr-2 text-blue-500" /> Etapa: Aprenda (Vídeo)</div></AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Vídeo (Youtube ou Vimeo)</Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://vimeo.com/..." value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} />
                      <div className="relative">
                         <Button variant="outline" className="whitespace-nowrap" disabled={uploadingVideo}>
                           {uploadingVideo ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                           {uploadingVideo ? 'Enviando...' : 'Upload'}
                         </Button>
                         <input type="file" accept="video/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleVideoUpload} disabled={uploadingVideo} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Você pode colar o link do YouTube/Vimeo direto, ou fazer o upload de um arquivo nativo na plataforma.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Instruções / Texto de Apoio</Label>
                    <Textarea placeholder="Escreva aqui o que o usuário deve prestar atenção..." className="min-h-[100px]" value={aprenderContent} onChange={e=>setAprenderContent(e.target.value)} />
                  </div>
                </AccordionContent>
              </AccordionItem>
              <div className="h-2 bg-muted/20 border-y" />

              {/* === ETAPA CONSTRUA === */}
              <AccordionItem value="construa" className="border-b-0 px-6 py-2">
                <AccordionTrigger className="hover:no-underline"><div className="flex items-center text-lg"><Settings2 className="w-5 h-5 mr-2 text-amber-500" /> Etapa: Construa (Exercícios)</div></AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Monte o formulário que o usuário deve preencher para salvar seus dados do Cérebro Central nesta etapa.</p>
                  
                  <div className="space-y-3">
                    {construaFields.map((f, i) => (
                      <div key={f.id} className="flex flex-col border rounded-md bg-card shadow-sm p-3 group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={()=>moveField(i, -1)} disabled={i===0}><ArrowUp className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={()=>moveField(i, 1)} disabled={i===construaFields.length-1}><ArrowDown className="w-4 h-4"/></Button>
                            <Badge variant="secondary" className="text-xs font-mono">{f.id}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 opacity-50 group-hover:opacity-100" onClick={()=>removeField(i)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 sm:col-span-5 space-y-1">
                            <Label className="text-xs">Rótulo da Pergunta</Label>
                            <Input placeholder="Qual seu diferencial?" value={f.label} onChange={(e)=>updateField(i, 'label', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="col-span-6 sm:col-span-3 space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={f.type} onChange={(e)=>updateField(i, 'type', e.target.value)}>
                              <option value="text">Texto Curto</option>
                              <option value="textarea">Texto Longo</option>
                              <option value="select">Lista Dropdown</option>
                              <option value="checkbox">Caixa Sim/Não</option>
                            </select>
                          </div>
                          <div className="col-span-6 sm:col-span-4 space-y-1">
                            <Label className="text-xs">ID no Banco (Chave JSON)</Label>
                            <Input placeholder="diferencial_1" value={f.id} onChange={(e)=>updateField(i, 'id', e.target.value)} className="h-8 text-sm font-mono" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" className="w-full border-dashed" onClick={addField}>
                     <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta / Campo
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <div className="h-2 bg-muted/20 border-y" />

              {/* === ETAPA VALIDE === */}
              <AccordionItem value="valide" className="border-b-0 px-6 py-2">
                <AccordionTrigger className="hover:no-underline"><div className="flex items-center text-lg"><CheckSquare className="w-5 h-5 mr-2 text-emerald-500" /> Etapa: Valide (Checklist Falso/Visual)</div></AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Itens que o usuário precisa revisar mentalmente (visual) e marcar como feito para ativar o botão Finalizar.</p>
                  
                  <div className="space-y-2">
                    {valideChecklist.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Input value={c.text} onChange={(e)=>updateCheckItem(i, 'text', e.target.value)} className="flex-1" placeholder="Ex: Revisei os textos de apoio" />
                        <Button variant="ghost" size="icon" className="text-red-500 flex-shrink-0" onClick={()=>removeCheckItem(i)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={addCheckItem}><Plus className="w-4 h-4 mr-1" /> Adicionar Check</Button>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 hidden lg:flex flex-col justify-center items-center text-center p-6 shadow-sm border-dashed">
          <ListTree className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">Construtor de Conteúdo</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">Selecione uma aula no menu lateral para visualizar e editar as etapas Aprenda, Construa e Valide do C.L.A.R.O.</p>
        </Card>
      )}
    </div>
  );
}
