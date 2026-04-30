import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function TabMateriais({ toast }: { toast: any }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    // Faz um join seguro se user_id for fkey para auth.users ou platform_users
    // Vou puxar tudo e relacionar os nomes das clinicas localmente para evitar block RLS
    const { data: mats } = await supabase.from('platform_materiais').select('*').order('created_at', { ascending: false });
    const { data: pUsers } = await supabase.from('platform_users').select('id, clinic_name');

    if (mats) {
      const enriched = mats.map(m => {
        const u = pUsers?.find(pu => pu.id === m.user_id);
        return {
          ...m,
          clinic_name: u?.clinic_name || 'Desconhecida'
        };
      });
      setMaterials(enriched);
    }
    setLoading(false);
  };
  
  useEffect(() => { loadData(); }, []);

  const filtered = materials.filter(m => 
    m.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold">Documentos & Materiais Gerados</h2>
           <p className="text-sm text-muted-foreground">Acompanhe todos os arquivos PDFs e Docs que as IAs geraram para os clientes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> Atualizar
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <div className="p-4 border-b flex items-center">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <Input 
            placeholder="Buscar por clínica, nome do arquivo ou tipo..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-md border-0 bg-secondary/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Clínica (Autor)</TableHead>
                <TableHead>Tipo (Módulo Origem)</TableHead>
                <TableHead>Título do Arquivo</TableHead>
                <TableHead className="text-right">Baixar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {m.clinic_name}
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      Mod: {m.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {m.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.file_url ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                          <Download className="w-4 h-4 mr-1"/> Download
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem arquivo</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum material encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
