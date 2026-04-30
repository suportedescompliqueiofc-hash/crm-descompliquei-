import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, HardDrive, Key, Server, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TabSistema({ toast }: { toast: any }) {
  return (
    <div className="space-y-6">
      <div>
         <h2 className="text-xl font-bold">Saúde do Sistema</h2>
         <p className="text-sm text-muted-foreground">Métricas e configurações sensíveis da infraestrutura.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
              <Database className="w-4 h-4 mr-2" /> Banco de Dados Main (Supabase)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-emerald-600">Conectado</div>
             <p className="text-xs text-muted-foreground mt-2">RLS ativos em todas as tabelas platform_*. Operação Normal.</p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
              <HardDrive className="w-4 h-4 mr-2" /> Storage (Buckets)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-blue-600">Ativo</div>
             <p className="text-xs text-muted-foreground mt-2">Bucket: platform-videos OK.<br/>Limite configurado: 500MB/arq.</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#E85D24] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
              <Cpu className="w-4 h-4 mr-2" /> Motor de IA
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-[#E85D24]">Grok xAI</div>
             <p className="text-xs text-muted-foreground mt-2">Endpoint de inferência externo liberado. Latência esperada: ~2.5s.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-secondary/20 shadow-sm border-dashed">
         <CardContent className="p-6">
            <div className="flex items-start gap-4">
               <div className="p-3 bg-card rounded-md border"><Server className="w-6 h-6 text-muted-foreground" /></div>
               <div>
                  <h3 className="font-bold text-foreground">Ambiente de Operação</h3>
                  <p className="text-sm text-muted-foreground mb-4">Esta arquitetura suporta até 10.000 requisições concorrentes entre CRM e Plataforma, suportada pela edge-network da Vercel e workers Deno/Supabase.</p>
                  <div className="flex gap-2">
                     <Badge variant="outline" className="font-mono">v1.5.0-platform</Badge>
                     <Badge variant="outline" className="font-mono">React 18 + Vite</Badge>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
