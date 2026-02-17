"use client";

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Mic, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsList, Conversation } from "@/hooks/useConversations";
import { format, isToday, isYesterday, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TAG_COLORS } from "@/hooks/useTags";

const formatLastMessageTime = (timestamp?: string | null) => {
  if (!timestamp) return '';
  try {
    let date = parseISO(timestamp);
    if (!isValid(date)) {
      date = new Date(timestamp.replace(' ', 'T'));
    }
    if (!isValid(date)) return '';
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM');
  } catch (e) {
    return '';
  }
};

const MessagePreview = ({ content, type, sender }: { content?: string, type?: string, sender?: string }) => {
  if (!content && !type) return <span className="italic text-muted-foreground/60">Nenhuma mensagem</span>;
  const isOutgoing = sender === 'agente' || sender === 'bot' || sender === 'agente_crm';

  return (
    <div className="flex items-center gap-1 w-full overflow-hidden text-muted-foreground/80">
      {isOutgoing && <span className="font-medium text-primary shrink-0">Você:</span>}
      {type === 'audio' && <Mic className="h-3 w-3 shrink-0" />}
      {type === 'imagem' && <ImageIcon className="h-3 w-3 shrink-0" />}
      {type === 'video' && <Video className="h-3 w-3 shrink-0" />}
      {(type === 'pdf' || type === 'arquivo') && <FileText className="h-3 w-3 shrink-0" />}
      
      <span className="block truncate flex-1">
        {type !== 'texto' ? (type === 'audio' ? 'Áudio' : type === 'imagem' ? 'Foto' : type === 'video' ? 'Vídeo' : 'Arquivo') : content}
      </span>
    </div>
  );
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
        "flex gap-3 p-3 transition-all cursor-pointer border-b border-border/40 items-center w-full group overflow-hidden",
        isActive ? "bg-muted border-l-4 border-l-primary" : "bg-transparent hover:bg-muted/40"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0 border border-border/20">
        <AvatarFallback className={cn("text-sm font-semibold", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
          {getInitials(conversation.nome)}
        </AvatarFallback>
      </Avatar>
      
      {/* Container de conteúdo com GRID estrito: 1fr para texto (ocupa o que sobra) e auto para o horário */}
      <div className="flex-1 min-w-0 grid grid-rows-2 gap-y-0.5">
        
        {/* Linha 1: Nome + Etiquetas + Horário */}
        <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-bold text-sm text-foreground truncate">
              {conversation.nome || conversation.telefone}
            </span>
            
            <div className="flex gap-0.5 shrink-0">
              {conversation.tags?.slice(0, 2).map(tag => {
                const isHex = tag.color?.startsWith('#');
                const preset = TAG_COLORS.find(c => c.name === tag.color);
                return (
                  <div 
                    key={tag.id} 
                    className={cn("w-2 h-2 rounded-full border border-background shadow-xs", !isHex && preset?.selector)} 
                    style={isHex ? { backgroundColor: tag.color } : undefined}
                    title={tag.name}
                  />
                );
              })}
            </div>
          </div>
          
          <span className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap shrink-0">
            {lastMessageTime || '--:--'}
          </span>
        </div>

        {/* Linha 2: Preview da Mensagem */}
        <div className="min-w-0 overflow-hidden h-5">
          <div className="text-xs w-full">
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
    <div className="flex flex-col h-full bg-card border-r w-full overflow-hidden">
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm shrink-0">
        <h2 className="text-xl font-bold mb-4">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            className="pl-10 h-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border/40">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filteredConversations && filteredConversations.length > 0 ? (
            filteredConversations.map(conversation => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchTerm ? "Nenhuma conversa encontrada." : "Nenhuma conversa disponível."}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}