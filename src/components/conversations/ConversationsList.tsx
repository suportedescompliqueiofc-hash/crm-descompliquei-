import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Mic, Image as ImageIcon, Video, FileText } from "lucide-react";
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

const MessagePreview = ({ content, type, sender }: { content?: string, type?: string, sender?: string }) => {
  if (!content && !type) return <span className="italic text-muted-foreground/60">Nenhuma mensagem</span>;

  const isOutgoing = sender === 'agente' || sender === 'bot' || sender === 'agente_crm';
  const prefix = isOutgoing ? <span className="mr-1">Você:</span> : null;

  if (type === 'audio') {
    return <div className="flex items-center gap-1 text-foreground/80"><Mic className="h-3 w-3" /> <span>Áudio</span></div>;
  }
  if (type === 'imagem') {
    return <div className="flex items-center gap-1 text-foreground/80"><ImageIcon className="h-3 w-3" /> <span>Foto</span></div>;
  }
  if (type === 'video') {
    return <div className="flex items-center gap-1 text-foreground/80"><Video className="h-3 w-3" /> <span>Vídeo</span></div>;
  }
  if (type === 'pdf' || type === 'arquivo') {
    return <div className="flex items-center gap-1 text-foreground/80"><FileText className="h-3 w-3" /> <span>Arquivo</span></div>;
  }

  // Fallback para quando o conteúdo é apenas o caminho do arquivo mas o tipo não foi detectado corretamente
  if (content && (content.includes('audio-mensagens/') || content.includes('media-mensagens/'))) {
    return <div className="flex items-center gap-1 text-foreground/80"><FileText className="h-3 w-3" /> <span>Mídia</span></div>;
  }

  return <span className="truncate flex items-center">{prefix}{content}</span>;
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
        "flex gap-3 p-3 rounded-lg transition-colors cursor-pointer border border-transparent group relative items-center",
        isActive ? "bg-muted border-border" : "hover:bg-muted/50"
      )}
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarFallback className={cn("text-sm font-semibold", isActive ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
          {getInitials(conversation.nome)}
        </AvatarFallback>
      </Avatar>
      
      {/* Container Principal de Texto */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        
        {/* Linha Superior: Nome e Horário */}
        <div className="flex justify-between items-baseline w-full">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span className="font-semibold text-sm truncate text-foreground block">
              {conversation.nome || conversation.telefone}
            </span>
            
            {/* Tags Compactas */}
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {conversation.tags.slice(0, 3).map(tag => {
                  const preset = TAG_COLORS.find(c => c.name === tag.color);
                  const isHex = tag.color && tag.color.startsWith('#');
                  
                  return (
                    <div 
                      key={tag.id} 
                      className={cn("w-2 h-2 rounded-full ring-1 ring-background", preset?.selector)} 
                      style={isHex ? { backgroundColor: tag.color } : undefined}
                      title={tag.name} 
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap ml-auto">
            {lastMessageTime}
          </span>
        </div>

        {/* Linha Inferior: Prévia da Mensagem */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            <MessagePreview 
              content={conversation.last_message_content} 
              type={conversation.last_message_type} 
              sender={conversation.last_message_sender} 
            />
          </div>
          
          {/* Espaço reservado para contador de mensagens não lidas ou ícone de pin no futuro */}
          {/* <div className="h-4 w-4 bg-primary rounded-full text-[9px] flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">1</div> */}
        </div>
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
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
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