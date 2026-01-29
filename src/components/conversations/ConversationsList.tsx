"use client";

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Mic, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsList, Conversation } from "@/hooks/useConversations";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TAG_COLORS } from "@/hooks/useTags";

const formatLastMessageTime = (timestamp?: string | null) => {
  if (!timestamp) return '';
  
  try {
    // Usa o construtor Date diretamente para maior compatibilidade com ISO strings do DB
    const date = new Date(timestamp);
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    
    if (isYesterday(date)) {
      return 'Ontem';
    }
    
    // Formato curto para datas anteriores
    return format(date, 'dd/MM');
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return '';
  }
};

const MessagePreview = ({ content, type, sender }: { content?: string, type?: string, sender?: string }) => {
  if (!content && !type) return <span className="italic text-muted-foreground/60">Nenhuma mensagem</span>;

  const isOutgoing = sender === 'agente' || sender === 'bot' || sender === 'agente_crm';
  const prefix = isOutgoing ? <span className="mr-0.5">Você: </span> : null;

  if (type === 'audio') {
    return <div className="flex items-center gap-1 text-muted-foreground"><Mic className="h-3 w-3 flex-shrink-0" /> <span>Áudio</span></div>;
  }
  if (type === 'imagem') {
    return <div className="flex items-center gap-1 text-muted-foreground"><ImageIcon className="h-3 w-3 flex-shrink-0" /> <span>Foto</span></div>;
  }
  if (type === 'video') {
    return <div className="flex items-center gap-1 text-muted-foreground"><Video className="h-3 w-3 flex-shrink-0" /> <span>Vídeo</span></div>;
  }
  if (type === 'pdf' || type === 'arquivo') {
    return <div className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3 flex-shrink-0" /> <span>Arquivo</span></div>;
  }

  return <span className="truncate block">{prefix}{content}</span>;
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
        "flex gap-3 p-3 transition-all cursor-pointer border-b border-border/40 relative items-start w-full group",
        isActive ? "bg-muted border-l-4 border-l-primary" : "bg-transparent hover:bg-muted/30"
      )}
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarFallback className={cn("text-sm font-semibold", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
          {getInitials(conversation.nome)}
        </AvatarFallback>
      </Avatar>
      
      {/* Container Principal */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full pt-0.5">
        
        {/* Linha Superior: Nome e Horário */}
        <div className="flex items-start justify-between w-full mb-1">
          {/* Lado Esquerdo: Nome + Tags */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden pr-2">
            <span className="font-semibold text-sm truncate text-foreground block">
              {conversation.nome || conversation.telefone}
            </span>
            
            {/* Tags (Pontos Coloridos) */}
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {conversation.tags.slice(0, 3).map(tag => {
                  const preset = TAG_COLORS.find(c => c.name === tag.color);
                  const isHex = tag.color && tag.color.startsWith('#');
                  
                  return (
                    <div 
                      key={tag.id} 
                      className={cn("w-2 h-2 rounded-full ring-1 ring-background", !isHex && preset?.selector)} 
                      style={isHex ? { backgroundColor: tag.color } : undefined}
                      title={tag.name} 
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Lado Direito: Horário fixo */}
          <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap font-medium">
            {lastMessageTime}
          </span>
        </div>

        {/* Linha Inferior: Prévia da Mensagem */}
        <div className="flex items-center w-full overflow-hidden">
          <div className="text-xs text-muted-foreground truncate w-full pr-2">
            <MessagePreview 
              content={conversation.last_message_content} 
              type={conversation.last_message_type} 
              sender={conversation.last_message_sender} 
            />
          </div>
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
    <div className="flex flex-col h-full bg-card border-r w-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            className="pl-10 h-10 bg-muted/30 border-muted-foreground/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 w-full">
        <div className="space-y-0">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border/40">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : filteredConversations && filteredConversations.length > 0 ? (
            filteredConversations.map(conversation => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}