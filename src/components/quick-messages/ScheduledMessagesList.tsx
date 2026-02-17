import { useScheduledMessages, ScheduledMessageLog } from "@/hooks/useScheduledMessages";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CheckCircle2, AlertCircle, Trash2, Calendar as CalendarIcon, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ScheduledMessagesList() {
  const { scheduledMessages, isLoading, deleteScheduledMessage } = useScheduledMessages();

  const getStatusBadge = (status: string, errorMessage: string | null) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 shadow-none">
            <CheckCircle2 className="h-3 w-3" /> Enviada
          </Badge>
        );
      case 'error':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="gap-1 shadow-none cursor-help">
                  <AlertCircle className="h-3 w-3" /> Erro
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] bg-destructive text-destructive-foreground">
                <p>{errorMessage || "Erro desconhecido ao enviar."}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 shadow-none">
            <Clock className="h-3 w-3" /> Pendente
          </Badge>
        );
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Carregando log de agendamentos...</div>;
  }

  if (scheduledMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 rounded-xl border border-dashed">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
        <p className="text-muted-foreground">Nenhuma mensagem agendada no histórico.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Agende mensagens através do chat lateral.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Cliente</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Mensagem</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Agendado Para</TableHead>
            <TableHead className="text-xs uppercase font-bold tracking-wider">Status</TableHead>
            <TableHead className="text-right text-xs uppercase font-bold tracking-wider">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scheduledMessages.map((item) => (
            <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{item.leads?.nome || "Cliente Removido"}</span>
                  <span className="text-[10px] text-muted-foreground">{item.leads?.telefone}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[150px]">{item.mensagens_rapidas?.titulo || "Mensagem Removida"}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{format(parseISO(item.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <span className="text-[10px] font-bold text-primary">{format(parseISO(item.scheduled_for), "HH:mm")}</span>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(item.status, item.error_message)}
              </TableCell>
              <TableCell className="text-right">
                {item.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => deleteScheduledMessage(item.id)}
                    title="Cancelar Agendamento"
                  >
                    <Trash2 className="h-4 w-4" />
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