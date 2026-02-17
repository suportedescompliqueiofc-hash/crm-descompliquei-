"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Send, Smile, AlertTriangle, CheckCircle, Phone, User, Bot, ChevronDown, Trash2, Mic, Zap, MoreVertical, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLead, useLeads } from "@/hooks/useLeads";
import { useMessages, useSendMessage, Message, Attachment, useDeleteMessage, useSendAudioMessage } from "@/hooks/useConversations";
import { useNotifications, useUpdateNotificationStatus } from "@/hooks/useNotifications";
import { useStages } from "@/hooks/useStages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import EmojiPicker from 'emoji-picker-react';
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AudioMessage } from "./AudioMessage";
import { MediaMessage } from "./MediaMessage";
import { FileMessage } from "./FileMessage";
import { NotificationMessage } from "./NotificationMessage";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiLockControl } from "./AiLockControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TagManager } from "@/components/tags/TagManager";
import { AudioRecorder } from "./AudioRecorder";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// --- COMPONENTES AUXILIARES ---

const DateSeparator = ({ dateString }: { dateString: string }) => {
  const date = parseISO(dateString);
  let displayDate: string;
  if (isToday(date)) displayDate = 'Hoje';
  else if (isYesterday(date)) displayDate = 'Ontem';
  else displayDate = format(date, 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="flex justify-center my-4 sticky top-0 z-10">
      <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground shadow-sm uppercase">{displayDate}</div>
    </div>
  );
};

const AttachmentRenderer = ({ attachment, isOutgoing }: { attachment: Attachment; isOutgoing: boolean }) => {
  const type = (attachment.file_type || '').toLowerCase();
  // Verificação mais flexível para áudio
  if (type.includes('audio')) {
    return <AudioMessage filePath={attachment.file_path} variant={isOutgoing ? 'outgoing' : 'incoming'} />;
  }
  if (type.includes('image') || type.includes('imagem') || type.includes('video')) {
    return <MediaMessage path={attachment.file_path} type={type.includes('video') ? 'video' : 'imagem'} />;
  }
  if (type.includes('pdf')) {
    return <FileMessage path={attachment.file_path} fileName="Documento PDF" />;
  }
  return <div className="p-2 bg-muted/20 border rounded text-xs text-muted-foreground mb-1 break-all">Anexo: {attachment.file_path}</div>;
};

const groupMessagesByDay = (messages: Message[]) => {
  const grouped: (Message | { type: 'separator', date: string })[] = [];
  let lastDate = '';
  messages.forEach(msg => {
    const currentDate = format(parseISO(msg.criado_em), 'yyyy-MM-dd');
    if (currentDate !== lastDate) {
      grouped.push({ type: 'separator', date: msg.criado_em });
      lastDate = currentDate;
    }
    grouped.push(msg);
  });
  return grouped;
};

// --- COMPONENTE PRINCIPAL ---

interface ActiveConversationProps {
  leadId: string;
  showQuickMessages?: boolean;
  onToggleQuickMessages?: () => void;
}

export function ActiveConversation({ leadId, showQuickMessages, onToggleQuickMessages }: ActiveConversationProps) {
  const navigate = useNavigate();
  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const { data: initialMessages, isLoading: messagesLoading } = useMessages(leadId);
  const { data: notifications } = useNotifications(leadId);
  const { stages, isLoading: stagesLoading } = useStages();
  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendAudio, isPending: isSendingAudio } = useSendAudioMessage();
  const { mutate: updateNotification } = useUpdateNotificationStatus(leadId);
  const { updateLead } = useLeads();
  const { mutate: deleteMessage } = useDeleteMessage();
  
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [isAiActive, setIsAiActive] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages) {
      setLocalMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`chat-sync-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          setLocalMessages((prev) => {
            const alreadyExists = prev.some(m => m.id === newMessage.id);
            if (alreadyExists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          setLocalMessages((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const groupedMessages = useMemo(() => groupMessagesByDay(localMessages), [localMessages]);

  useEffect(() => {
    if (lead) setIsAiActive(lead.ia_ativa ?? true);
  }, [lead]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [localMessages, isRecordingMode]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim()) {
      sendMessage({ leadId, content: messageContent.trim() });
      setMessageContent("");
    }
  };

  const handleSendAudio = (blob: Blob) => {
    setIsRecordingMode(false);
    sendAudio({ leadId, audioBlob: blob });
  };

  const handleAiToggle = async (checked: boolean) => {
    if (!lead) return;
    setIsAiActive(checked);
    updateLead({ id: lead.id, ia_ativa: checked });
    try {
      await fetch('https://webhook.orbevision.shop/webhook/ativar-desativar-chat-gleyce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: checked ? 'ativar' : 'desativar', lead_id: lead.id, telefone: lead.telefone }),
      });
    } catch (error) { console.error(error); }
  };

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'L';
  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);

  if (leadLoading || stagesLoading) return <Skeleton className="h-full w-full" />;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <header className="flex flex-col border-b bg-card shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center justify-between p-2 sm:p-3 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => navigate('/conversas')}><ChevronLeft className="h-5 w-5" /></Button>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border bg-muted flex-shrink-0">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs sm:text-sm font-medium">{getInitials(lead?.nome)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <p className="font-semibold truncate text-sm sm:text-base leading-tight">{lead?.nome || 'Lead'}</p>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{lead?.telefone}</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="hidden xs:block">{lead && <AiLockControl lead={lead} />}</div>
                <div className="flex items-center gap-2 px-1 py-1 bg-muted/20 rounded-lg border border-border/40">
                    <Switch id="ai-toggle" checked={isAiActive} onCheckedChange={handleAiToggle} disabled={!lead} className="scale-75 sm:scale-90" />
                    {onToggleQuickMessages && (
                        <Button variant={showQuickMessages ? "default" : "ghost"} size="icon" className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-all rounded-full", showQuickMessages ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")} onClick={onToggleQuickMessages}>
                            <Zap className="h-3.5 w-3.5 sm:h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-2 gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 flex-shrink-0">
                {lead && stages.length > 0 && (
                    <Select value={lead.posicao_pipeline?.toString() || "1"} onValueChange={(v) => updateLead({ id: lead.id, posicao_pipeline: parseInt(v) })}>
                    <SelectTrigger className="w-[120px] sm:w-[160px] h-7 text-[10px] sm:text-xs bg-background/50">
                        <SelectValue>
                        {currentStage ? <div className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.cor }} />{currentStage.nome}</div> : "Etapa"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>{stages.map(stage => (<SelectItem key={stage.id} value={stage.posicao_ordem.toString()}><div className="flex items-center gap-2 text-xs"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.cor }} />{stage.nome}</div></SelectItem>))}</SelectContent>
                    </Select>
                )}
            </div>
            <div className="flex-1 flex justify-end min-w-0 overflow-hidden">{lead && <div className="scale-90 origin-right"><TagManager leadId={lead.id} /></div>}</div>
            <div className="xs:hidden">{lead && <AiLockControl lead={lead} />}</div>
        </div>
      </header>

      {notifications && notifications.length > 0 && (
        <div className="p-2 bg-amber-100 border-b border-amber-200 flex-shrink-0">
          {notifications.map(notif => (
            <div key={notif.id} className="flex items-start justify-between gap-2 text-amber-800 text-xs">
              <div className="flex items-start gap-1.5 flex-1"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /><NotificationMessage message={notif.mensagem} /></div>
              <Button size="sm" variant="ghost" className="text-amber-800 hover:bg-amber-200 h-6 text-[10px] px-1" onClick={() => updateNotification(notif.id)}><CheckCircle className="h-3 w-3 mr-1" /> Resolver</Button>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 bg-muted/10">
        <div className="p-3 sm:p-4 space-y-2 max-w-4xl 2xl:max-w-5xl mx-auto min-h-full">
          {groupedMessages.map((item, index) => {
            if (item.type === 'separator') return <DateSeparator key={`sep-${index}`} dateString={item.date} />;
            const msg = item as Message;
            const isFromLead = msg.remetente === 'lead';
            const isAi = msg.remetente === 'bot';
            const isOutgoing = !isFromLead;
            
            // Verificações flexíveis de tipo
            const isAudio = (msg.tipo_conteudo || '').toLowerCase().includes('audio');
            const isVisualMedia = (msg.tipo_conteudo || '').toLowerCase().includes('image') || 
                                (msg.tipo_conteudo || '').toLowerCase().includes('imagem') || 
                                (msg.tipo_conteudo || '').toLowerCase().includes('video');

            return (
              <div key={msg.id} className={cn("group relative flex flex-col gap-0.5 py-0.5", isOutgoing ? "items-end" : "items-start")}>
                <div className={cn("flex items-end gap-2 max-w-[90%] sm:max-w-[85%]", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="h-8 w-8 flex-shrink-0 border shadow-sm">
                    {isOutgoing ? (
                      <AvatarFallback className={cn(isAi ? "bg-primary/20 text-primary" : "bg-amber-100 text-amber-700")}>{isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}</AvatarFallback>
                    ) : (<AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">{getInitials(lead?.nome)}</AvatarFallback>)}
                  </Avatar>
                  <div className={cn("p-2 sm:p-3 rounded-2xl relative shadow-sm transition-all min-w-[100px]", isOutgoing ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/40 rounded-bl-none")}>
                    {/* Renderização de Mídias via Anexos */}
                    <div className="mb-1 space-y-1">
                        {msg.message_attachments?.map(att => <AttachmentRenderer key={att.id} attachment={att} isOutgoing={isOutgoing} />)}
                    </div>
                    
                    {/* Fallback para media_path direto se não houver anexos */}
                    {!msg.message_attachments?.length && msg.media_path && (
                        <div className="mb-1">
                            {isAudio ? (
                                <AudioMessage filePath={msg.media_path} variant={isOutgoing ? 'outgoing' : 'incoming'} />
                            ) : isVisualMedia ? (
                                <MediaMessage path={msg.media_path} type={msg.tipo_conteudo?.includes('video') ? 'video' : 'imagem'} />
                            ) : null}
                        </div>
                    )}

                    {msg.conteudo && !isAudio && <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.conteudo}</p>}
                    
                    <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-70", isOutgoing ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      <span className="text-[9px] sm:text-[10px] tabular-nums">{format(new Date(msg.criado_em), 'HH:mm')}</span>
                      {isOutgoing && <CheckCircle className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0", isOutgoing ? "mr-1" : "ml-1")}><ChevronDown className="h-3 w-3 text-muted-foreground" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align={isOutgoing ? "end" : "start"}><DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs" onSelect={() => setDeletingMessage(msg)}><Trash2 className="mr-2 h-3.5 w-3.5" /><span>Excluir</span></DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      <footer className="p-2 sm:p-3 border-t bg-card flex-shrink-0">
        {isRecordingMode ? (
          <AudioRecorder onSend={handleSendAudio} onCancel={() => setIsRecordingMode(false)} />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-muted/40 p-1 rounded-full border border-input/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all max-w-5xl mx-auto">
            <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary shrink-0"><Smile className="h-4 w-4 sm:h-5 sm:w-5" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-none" align="start" side="top"><EmojiPicker onEmojiClick={(emoji) => setMessageContent(prev => prev + emoji.emoji)} /></PopoverContent></Popover>
            <Input placeholder="Digite sua mensagem..." value={messageContent} onChange={(e) => setMessageContent(e.target.value)} autoComplete="off" className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 h-8 sm:h-9 text-sm" />
            <div className="flex-shrink-0">
                {messageContent.trim() ? (<Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-sm"><Send className="h-3.5 w-3.5 sm:h-4 w-4" /></Button>) : (<Button type="button" size="icon" variant="ghost" className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground", isSendingAudio && "opacity-50")} onClick={() => setIsRecordingMode(true)} disabled={isSendingAudio}><Mic className="h-4 w-4 sm:h-5 sm:w-5" /></Button>)}
            </div>
          </form>
        )}
      </footer>

      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Excluir mensagem?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl" onClick={() => { if (deletingMessage) { deleteMessage({ messageId: deletingMessage.id, leadId, id_mensagem: deletingMessage.id_mensagem }); setLocalMessages(prev => prev.filter(m => m.id !== deletingMessage.id)); setDeletingMessage(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}