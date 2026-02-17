import { useCadenceMonitoring, CadenceLog } from "@/hooks/useCadenceMonitoring";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CheckCircle2, AlertCircle, StopCircle, User, GitMerge, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRange } from "react-day-picker";

interface CadenceMonitoringTabProps {
  dateRange: DateRange | undefined;
}

export function CadenceMonitoringTab({ dateRange }: CadenceMonitoringTabProps) {
  const { logs, isLoading, stopCadence } = useCadenceMonitoring(dateRange);

  const getStatusBadge = (status: string, lastStatus: string | null) => {
    if (status === 'concluido') return <Badge className="bg-blue-100 text-blue-700 border-blue-200 shadow-none">Concluída</Badge>;
    if (status === 'cancelado') return <Badge variant="outline" className="bg-gray-100 text-gray-600 shadow-none">Cancelada</Badge>;
    
    if (lastStatus === 'erro') return <Badge variant="destructive" className="shadow-none">Erro no Envio</Badge>;
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none animate-pulse">Ativa</Badge>;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Carregando histórico de monitoramento...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 rounded-xl border border-dashed">
        <GitMerge className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
        <p className="text-muted-foreground">Nenhuma atividade de cadência registrada no período.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Ative cadências para clientes no chat para ver o progresso aqui.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Cliente</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Fluxo / Passo</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Último Envio</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Próximo</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Status</TableHead>
            <TableHead className="text-right text-xs uppercase font-bold tracking-wider">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="group hover:bg-muted/10 transition-colors">
              <TableCell>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-sm">{log.leads?.nome || "Cliente Removido"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground pl-4">{log.leads?.telefone}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{log.cadencias?.nome || "Removida"}</span>
                  <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                    <MessageSquare className="h-3 w-3" /> Passo {log.passo_atual_ordem}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">
                    {log.ultima_execucao ? format(parseISO(log.ultima_execucao), "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : "-"}
                  </span>
                  {log.status_ultima_execucao === 'erro' && log.erro_log && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[9px] text-red-500 font-medium flex items-center gap-1 cursor-help truncate max-w-[120px]">
                            <AlertCircle className="h-2.5 w-2.5" /> Ver erro
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-destructive text-destructive-foreground p-2 max-w-[200px] text-[10px]">
                          {log.erro_log}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {log.proxima_execucao ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{format(parseISO(log.proxima_execucao), "dd/MM/yy", { locale: ptBR })}</span>
                    <span className="text-[10px] text-primary font-bold">{format(parseISO(log.proxima_execucao), "HH:mm")}</span>
                  </div>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                {getStatusBadge(log.status, log.status_ultima_execucao)}
              </TableCell>
              <TableCell className="text-right">
                {log.status === 'ativo' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => stopCadence(log.id)}
                    title="Interromper Cadência"
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}