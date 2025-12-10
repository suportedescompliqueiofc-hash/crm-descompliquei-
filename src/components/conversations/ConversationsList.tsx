import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsList, Conversation } from "@/hooks/useConversations";
import { format, isToday, isYesterday, differenceInDays, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TAG_COLORS } from "@/hooks/useTags";

const formatLastMessageTime = (timestamp?: string | null) => {
  if (!timestamp) return '';
  
  // Cria a data diretamente. O construtor Date() lida bem com strings ISO do Supabase.
  const date = new Date(timestamp);
  
  if (!isValid(date)) return '';

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  
  if (isYesterday(date)) {
    return 'Ontem';
  }
  
  const now = new Date();
  if (differenceInDays(now, date) < 7) {
    const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
    return dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).split('-')[0];
  }
  
  return format(date, 'dd/MM/yy');
};

const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
  const { leadId } = useParams();
  const isActive = leadId === conversation.id;

  const lastMessageTime = formatLastMessageTime(conversation.last_message_timestamp);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Link
      to={`/conversas/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer border border-transparent",
        isActive ? "bg-muted border-border" : "hover:bg-muted/50"
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={cn("text-xs font-semibold", isActive ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
          {getInitials(conversation.nome)}
        </AvatarFallback>
      </Avatar>
      
      {/* Container principal de texto: ocupa todo o espaço restante */}
      <div className="flex-1 min-w-0 grid gap-0.5">
        
        {/* Linha 1: Nome e Horário */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="font-semibold text-sm truncate text-foreground">
              {conversation.nome || conversation.telefone}
            </span>
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {conversation.tags.slice(0, 2).map(tag => {
                  const color = TAG_COLORS.find(c => c.name === tag.color) || TAG_COLORS[0];
                  return <div key={tag.id} className={cn("w-2 h-2 rounded-full", color.selector)} title={tag.name} />;
                })}
              </div>
            )}
          </div>
          
          <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
            {lastMessageTime}
          </span>
        </div>

        {/* Linha 2: Última mensagem */}
        <p className="text-xs text-muted-foreground truncate h-4 leading-4">
          {conversation.last_message_content}
        </p>
      </div>
    </Link>
  );
};

export function ConversationsList() {
  const { data: conversations, isLoading } = useConversationsList();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations?.filter(c =>
    (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.telefone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : (
            filteredConversations?.map(conversation => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}