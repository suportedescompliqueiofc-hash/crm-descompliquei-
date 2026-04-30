import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, BookOpen, BrainCircuit, Activity, Clock } from 'lucide-react';

interface ProductAccess {
  acesso_crm: boolean;
  acesso_cerebro: boolean;
  acesso_sessoes_taticas: boolean;
  acesso_materiais: boolean;
  acesso_ia_comercial: boolean;
  pilares_liberados: string[];
  ias_liberadas: string[];
}

interface Props {
  client: any;
  progress: number;
  modulosConcluidos: number;
  iaTotal: number;
  materiaisTotal: number;
  recentActivity: any[];
  productAccess?: ProductAccess | null;
}

function timeAgo(d: string): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

export default function AbaVisaoGeral({ client, progress, modulosConcluidos, iaTotal, materiaisTotal, recentActivity, productAccess }: Props) {
  const hasTrilha = (productAccess?.pilares_liberados?.length ?? 0) > 0;
  const hasIA = productAccess?.acesso_ia_comercial ?? false;
  const hasMateriais = productAccess?.acesso_materiais ?? false;
  const hasPlatformMetrics = hasTrilha || hasIA || hasMateriais;

  return (
    <div className="space-y-6">
      {/* Informações básicas */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Clínica', value: client.clinic_name },
            { label: 'Especialidade', value: client.specialty },
            { label: 'Cidade / UF', value: client.city_state },
            { label: 'WhatsApp', value: client.whatsapp },
            { label: 'Produto', value: client.product_name || '—' },
            { label: 'Expiração', value: client.trial_ends_at ? new Date(client.trial_ends_at).toLocaleDateString('pt-BR') : client.product_name ? '♾️ Vitalício' : '—' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{f.label}</p>
              <p className="text-sm text-foreground mt-0.5">{f.value || '—'}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Métricas — só mostra se o produto tem acesso a features de plataforma */}
      {hasPlatformMetrics && (
        <div className={`grid grid-cols-2 ${[hasTrilha, hasTrilha, hasIA, hasMateriais].filter(Boolean).length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
          {hasTrilha && (
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-5 w-5 mx-auto mb-1 text-[#E85D24]" />
                <p className="text-2xl font-black text-[#E85D24]">{progress}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Progresso</p>
              </CardContent>
            </Card>
          )}
          {hasTrilha && (
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-black text-blue-600">{modulosConcluidos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Módulos Concluídos</p>
              </CardContent>
            </Card>
          )}
          {hasIA && (
            <Card>
              <CardContent className="p-4 text-center">
                <Bot className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-2xl font-black text-purple-600">{iaTotal}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">IAs Usadas</p>
              </CardContent>
            </Card>
          )}
          {hasMateriais && (
            <Card>
              <CardContent className="p-4 text-center">
                <BrainCircuit className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <p className="text-2xl font-black text-emerald-600">{materiaisTotal}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Materiais Gerados</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Atividade recente */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#E85D24]" /> Últimas Atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {recentActivity.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma atividade registrada.</p>
          ) : recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className={`h-2 w-2 rounded-full shrink-0 ${item.tipo === 'ia' ? 'bg-purple-500' : 'bg-blue-500'}`} />
              <p className="text-sm text-foreground flex-1">{item.descricao}</p>
              <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />{timeAgo(item.date)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
