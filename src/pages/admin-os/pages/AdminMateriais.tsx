import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface Material {
  id: string;
  user_id: string;
  module_id: string;
  title: string;
  category: string;
  type: string;
  content: any;
  created_at: string;
  platform_users?: { clinic_name: string };
  platform_modules?: { title: string };
}

export default function AdminMateriais() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState<Material[]>([]);
  
  const [search, setSearch] = useState('');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterCat, setFilterCat] = useState('todas');
  
  const [showContent, setShowContent] = useState<Material | null>(null);

  function extractText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content.text || content.markdown || content.content || JSON.stringify(content, null, 2);
  }

  useEffect(() => {
    document.title = 'Materiais · Admin OS | Descompliquei';
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_materiais')
        .select(`
          *,
          platform_users(clinic_name),
          platform_modules(title)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMateriais(data || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const clientes = Array.from(new Set(materiais.map(m => m.platform_users?.clinic_name).filter(Boolean)));
  const categorias = Array.from(new Set(materiais.map(m => m.category).filter(Boolean)));

  const filtered = materiais.filter(m => {
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCliente !== 'todos' && m.platform_users?.clinic_name !== filterCliente) return false;
    if (filterCat !== 'todas' && m.category !== filterCat) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Materiais Gerados pelos Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {materiais.length} materiais no total criados via IA na plataforma.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Clientes</SelectItem>
            {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Data</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Cliente</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Módulo Origem</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Título</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Tipo</th>
                <th className="px-4 py-3 text-right font-bold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#E85D24]"/></td></tr> : 
               filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum material encontrado.</td></tr> :
               filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.platform_users?.clinic_name || 'Desconhecido'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.platform_modules?.title || '—'}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{m.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{m.type || m.category || 'Documento'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setShowContent(m)}>
                      <Eye className="h-4 w-4 mr-1"/> Ver conteúdo
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!showContent} onOpenChange={(o) => !o && setShowContent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#E85D24]" />
              {showContent?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Gerado por {showContent?.platform_users?.clinic_name} em {showContent ? format(new Date(showContent.created_at), "dd/MM/yyyy 'às' HH:mm") : ''}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-5 bg-muted/30 rounded-md border border-border mt-2">
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-foreground
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
              prose-p:text-foreground prose-p:leading-relaxed
              prose-li:text-foreground prose-li:leading-relaxed
              prose-strong:text-foreground
              prose-ul:list-disc prose-ol:list-decimal
              prose-blockquote:border-l-[#E85D24] prose-blockquote:text-muted-foreground
              prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:text-foreground
              prose-hr:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {extractText(showContent?.content)}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
