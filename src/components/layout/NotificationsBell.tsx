import { Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllNotifications } from "@/hooks/useAllNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";

export function NotificationsBell() {
  const navigate = useNavigate();
  const { notifications, isLoading, updateStatus } = useAllNotifications({
    dateRange: undefined,
    leadId: 'todos',
  });

  const pendingNotifications = notifications.filter(n => n.status === 'pendente');

  const handleNotificationClick = (leadId: string) => {
    navigate(`/conversas/${leadId}`);
  };

  const handleResolve = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Impede que o menu suspenso feche ao clicar
    updateStatus({ notificationId, status: 'resolvido' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {pendingNotifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {pendingNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações Pendentes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-2 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pendingNotifications.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">
              Nenhuma notificação pendente.
            </div>
          ) : (
            pendingNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-0 cursor-pointer"
                onSelect={() => handleNotificationClick(notification.lead_id)}
              >
                <div className="flex flex-col p-2 w-full hover:bg-muted/50">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {notification.mensagem}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliente: {notification.leads?.nome || 'Desconhecido'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.criado_em), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                      onClick={(e) => handleResolve(e, notification.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolver
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}