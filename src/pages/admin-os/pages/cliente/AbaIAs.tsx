import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock } from 'lucide-react';

const IA_LABEL: Record<string, string> = {
  preattendance: 'Pré-Atendimento', objections: 'Objeções',
  remarketing: 'Remarketing', analysis: 'Análise',
  copywriter: 'Copywriter', scripts: 'Scripts',
  strategy: 'Estratégia', reporting: 'Relatórios',
};
const IA_COLOR: Record<string, string> = {
  preattendance: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  objections: 'bg-red-500/20 text-red-700 dark:text-red-300',
  remarketing: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  analysis: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  copywriter: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  scripts: 'bg-[#E85D24]/20 text-[#E85D24]',
};

interface Props { iaHistory: Array<{ id: string; ia_type: string; input_text: string | null; created_at: string }> }

export default function AbaIAs({ iaHistory }: Props) {
  // Contagem por tipo
  const counts: Record<string, number> = {};
  iaHistory.forEach(h => { counts[h.ia_type] = (counts[h.ia_type] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-6">
      {/* Resumo por IA */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#E85D24]" /> Uso por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma consulta realizada.</p>
          ) : sorted.map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <Badge className={`text-[10px] w-36 justify-center border-0 shrink-0 ${IA_COLOR[type] || 'bg-muted text-muted-foreground'}`}>
                {IA_LABEL[type] || type}
              </Badge>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#E85D24] rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-sm font-bold text-foreground w-8 text-right shrink-0">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Últimas consultas */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Últimas 10 Consultas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {iaHistory.slice(0, 10).map(h => (
            <div key={h.id} className="px-4 py-3 flex gap-3 items-start">
              <Badge className={`text-[10px] border-0 shrink-0 mt-0.5 ${IA_COLOR[h.ia_type] || 'bg-muted text-muted-foreground'}`}>
                {IA_LABEL[h.ia_type] || h.ia_type}
              </Badge>
              <p className="text-sm text-foreground flex-1 line-clamp-2">{h.input_text || '—'}</p>
              <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(h.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
          {iaHistory.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma consulta registrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
