"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Send, Smile, AlertTriangle, CheckCircle, Phone, User, Bot, ChevronDown, Trash2, Mic } from "lucide-react";
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

// --- COMPONENTES AUXILIARES ---

const DateSeparator = ({ dateString }: { dateString: string }) => {
  const date = parseISO(dateString);
  let displayDate: string;

  if (isToday(date)) displayDate = 'Hoje';
  else if (isYesterday(date)) displayDate = 'Ontem';
  else if (date.getTime() > new Date().getTime() - 7 * 24 * 60 * 60 * 1000) displayDate = format(date, 'EEEE', { locale: ptBR });
  else displayDate = format(date, 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="flex justify-center my-4 sticky top-0 z-10">
      <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground shadow-sm uppercase">{displayDate}</div>
    </div>
  );
};

const AttachmentRenderer = ({ attachment, isOutgoing }: { attachment: Attachment; isOutgoing: boolean }) => {
  const type = attachment.file_type?.toLowerCase() || 'arquivo';
  const path = attachment.file_path;
  
  if (type.includes('audio') || type.includes('áudio')) return <AudioMessage filePath={path} variant={isOutgoing ? 'outgoing' : 'incoming'} />;
  
  if (type.includes('imagem') || type.includes('image') || type.includes('foto') || type.includes('video')) {
    const mediaType = type.includes('video') ? 'video' : 'imagem';
    return <MediaMessage path={path} type={mediaType} />;
  }

  if (type.includes('pdf') || type.includes('document') || type.includes('application')) {
    return <FileMessage path={path} fileName="Documento PDF" />;
  }

  return <div className="p-2 bg-muted/20 border rounded text-xs text-muted-foreground mb-1 break-all">Anexo: {path}</div>;
};

const LegacyAttachmentRenderer = ({ content, isOutgoing }: { content: string; isOutgoing: boolean }) => {
  const attachmentBlockIndex = content.toLowerCase().indexOf('attachments:');
  if (attachmentBlockIndex === -1) return null;

  const attachmentBlock = content.substring(attachmentBlockIndex);
  const attachmentLines = attachmentBlock.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.substring(1).trim());

  return (
    <div className="flex flex-col gap-2 mb-1">
      {attachmentLines.map((line, index) => {
        const pathMatch = line.match(/^(.*?)\s+\(/);
        const typeMatch = line.match(/\((.*?)\)/);
        if (!pathMatch || !typeMatch) return null;

        const path = pathMatch[1].trim();
        const type = typeMatch[1].trim();
        const attachment: Attachment = { id: `legacy-${index}`, file_path: path, file_type: type as any };
        return <AttachmentRenderer key={attachment.id} attachment={attachment} isOutgoing={isOutgoing} />;
      })}
    </div>
  );
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

export function ActiveConversation({ leadId }: { leadId: string }) {
  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const { data: messages, isLoading: messagesLoading } = useMessages(leadId);
  const { data: notifications } = useNotifications(leadId);
  const { stages, isLoading: stagesLoading } = useStages();
  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendAudio, isPending: isSendingAudio } = useSendAudioMessage();
  const { mutate: updateNotification } = useUpdateNotificationStatus(leadId);
  const { updateLead } = useLeads();
  const { mutate: deleteMessage } = useDeleteMessage();
  
  const [messageContent, setMessageContent] = useState("");
  const [isAiActive, setIsAiActive] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processedMessages = useMemo(() => {
    if (!messages) return [];
    
    const res: Message[] = [];
    const seenIds = new Set<string>();
    
    const sorted = [...messages].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      
      if (seenIds.has(msg.id)) continue;
      
      if (msg.tipo_conteudo === 'audio') {
        const lastMsg = res[res.length - 1];
        
        if (lastMsg && 
            lastMsg.tipo_conteudo === 'audio' && 
            lastMsg.remetente === msg.remetente) {
            
            const t1 = new Date(lastMsg.criado_em).getTime();
            const t2 = new Date(msg.criado_em).getTime();
            
            if (Math.abs(t2 - t1) < 20000) {
               const isLastTemp = lastMsg.id.startsWith('temp-');
               const isCurrTemp = msg.id.startsWith('temp-');

               if (isLastTemp && !isCurrTemp) {
                   res.pop();
                   seenIds.delete(lastMsg.id);
                   res.push(msg);
                   seenIds.add(msg.id);
                   continue;
               }
               
               if (!isLastTemp && isCurrTemp) {
                   continue;
               }

               continue;
            }
        }
      }
      
      seenIds.add(msg.id);
      res.push(msg);
    }
    
    return res;
  }, [messages]);

  const groupedMessages = processedMessages.length > 0 ? groupMessagesByDay(processedMessages) : [];

  useEffect(() => {
    if (lead) setIsAiActive(lead.ia_ativa ?? true);
  }, [lead]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [processedMessages, isRecordingMode]);

  const handleAiToggle = async (checked: boolean) => {
    if (!lead) return;
    setIsAiActive(checked);
    updateLead(
      { id: lead.id, ia_ativa: checked },
      {
        onSuccess: () => toast.success(`IA ${checked ? 'ativada' : 'desativada'} com sucesso.`),
        onError: () => {
          toast.error('Erro ao atualizar o status da IA.');
          setIsAiActive(!checked);
        },
      }
    );
    try {
      await fetch('https://webhook.orbevision.shop/webhook/ativar-desativar-chat-moncao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: checked ? 'ativar' : 'desativar',
          lead_id: lead.id,
          telefone: lead.telefone,
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar webhook de ativação/desativação da IA:', error);
    }
  };

  const handleStageChange = (newPosition: string) => {
    if (!lead) return;
    const stagePosition = parseInt(newPosition, 10);
    // CORREÇÃO: Usa posicao_pipeline em vez de etapa_id
    updateLead({ id: lead.id, posicao_pipeline: stagePosition });
  };

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

  const getInitials = (name?: string) => {
    if (!name) return 'L';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isLoading = leadLoading || stagesLoading;
  
  // CORREÇÃO: Busca a etapa pela posição
  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);

  if (isLoading) return <Skeleton className="h-full w-full" />;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border-b bg-card">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-12 w-12 border">
            <AvatarFallback className="bg-accent text-accent-foreground">{getInitials(lead?.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{lead?.nome || 'Carregando...'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0"><Phone className="h-3 w-3" />{lead?.telefone}</p>
            </div>
            {lead && <TagManager leadId={lead.id} />}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap justify-end">
          {lead && stages.length > 0 && (
            // CORREÇÃO: Usa posicao_pipeline como value e posicao_ordem nas opções
            <Select 
              value={lead.posicao_pipeline?.toString() || "1"} 
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="w-[180px] h-9">
                <div className="flex items-center gap-2 truncate">
                  <SelectValue placeholder="Selecione a etapa">
                    {currentStage && <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.cor }} />{currentStage.nome}</div>}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.cor }} />
                      {stage.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="h-6 w-px bg-border mx-1 hidden md:block"></div>
          {lead && <AiLockControl lead={lead} />}
          <div className="flex items-center space-x-2"><Switch id="ai-toggle" checked={isAiActive} onCheckedChange={handleAiToggle} disabled={!lead} /></div>
        </div>
      </header>

      {notifications && notifications.length > 0 && (
        <div className="p-2 bg-amber-100 border-b border-amber-200">
          {notifications.map(notif => (
            <div key={notif.id} className="flex items-start justify-between gap-2 text-amber-800 text-sm">
              <div className="flex items-start gap-2 flex-1"><AlertTriangle className="h-4 w-4 flex-shrink-0 mt-1" /><NotificationMessage message={notif.mensagem} /></div>
              <Button size="sm" variant="ghost" className="text-amber-800 hover:bg-amber-200 h-7" onClick={() => updateNotification(notif.id)}><CheckCircle className="h-4 w-4 mr-1" /> Resolvido</Button>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {messagesLoading ? <p className="text-center text-muted-foreground text-sm py-4">Carregando mensagens...</p> : (
            groupedMessages.map((item, index) => {
              if (item.type === 'separator') return <DateSeparator key={`sep-${index}`} dateString={item.date} />;

              const msg = item as Message;
              const isOutgoing = msg.remetente === 'agente' || msg.remetente === 'bot';
              
              if (msg.tipo_conteudo === 'audio' && msg.conteudo && (!msg.message_attachments || msg.message_attachments.length === 0)) {
                return (
                  <div key={msg.id} className={cn("group relative flex flex-col gap-1 py-1", isOutgoing ? "items-end" : "items-start")}>
                    <div className={cn("flex items-end gap-2", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("max-w-[85%] md:max-w-md p-3 rounded-2xl relative", isOutgoing ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border rounded-bl-none")}>
                        <AudioMessage filePath={msg.conteudo} variant={isOutgoing ? 'outgoing' : 'incoming'} />
                        <p className="text-[10px] opacity-70 mt-1 text-right">{format(new Date(msg.criado_em), 'HH:mm')}</p>
                      </div>
                      {!isOutgoing ? (
                        <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(lead?.nome)}</AvatarFallback></Avatar>
                      ) : (
                        <Avatar className="h-8 w-8 bg-success"><AvatarFallback className="bg-transparent text-success-foreground">{msg.remetente === 'bot' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}</AvatarFallback></Avatar>
                      )}
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity")}>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setDeletingMessage(msg)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              }

              const hasNewAttachments = msg.message_attachments && msg.message_attachments.length > 0;
              const legacyAttachmentIndex = msg.conteudo?.toLowerCase().indexOf('attachments:');
              const hasLegacyAttachments = !hasNewAttachments && legacyAttachmentIndex !== -1;

              let caption = msg.conteudo || '';
              if (hasLegacyAttachments) {
                caption = msg.conteudo.substring(0, legacyAttachmentIndex).trim();
              }

              return (
                <div key={msg.id} className={cn("group relative flex flex-col gap-1 py-1", isOutgoing ? "items-end" : "items-start")}>
                  <div className={cn("flex items-end gap-2", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("max-w-[85%] md:max-w-md p-3 rounded-2xl relative", isOutgoing ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border rounded-bl-none")}>
                      {hasNewAttachments && msg.message_attachments!.map(att => <AttachmentRenderer key={att.id} attachment={att} isOutgoing={isOutgoing} />)}
                      {hasLegacyAttachments && <LegacyAttachmentRenderer content={msg.conteudo} isOutgoing={isOutgoing} />}
                      
                      {caption && <p className="text-sm whitespace-pre-wrap">{caption}</p>}
                      
                      <p className="text-[10px] opacity-70 mt-1 text-right">{format(new Date(msg.criado_em), 'HH:mm')}</p>
                    </div>
                    {!isOutgoing ? (
                      <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(lead?.nome)}</AvatarFallback></Avatar>
                    ) : (
                      <Avatar className="h-8 w-8 bg-success"><AvatarFallback className="bg-transparent text-success-foreground">{msg.remetente === 'bot' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}</AvatarFallback></Avatar>
                    )}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn(
                          "h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                        )}>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setDeletingMessage(msg)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <footer className="p-4 border-t bg-card">
        {isRecordingMode ? (
          <AudioRecorder 
            onSend={handleSendAudio} 
            onCancel={() => setIsRecordingMode(false)} 
          />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon"><Smile className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none"><EmojiPicker onEmojiClick={(emojiObject) => setMessageContent(prev => prev + emojiObject.emoji)} /></PopoverContent>
            </Popover>
            <Input placeholder="Digite sua mensagem..." value={messageContent} onChange={(e) => setMessageContent(e.target.value)} autoComplete="off" />
            
            {messageContent.trim() ? (
              <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 transition-all"><Send className="h-5 w-5" /></Button>
            ) : (
              <Button 
                type="button" 
                size="icon" 
                variant="outline" 
                className={cn("transition-all", isSendingAudio && "opacity-50 cursor-not-allowed")}
                onClick={() => setIsRecordingMode(true)}
                disabled={isSendingAudio}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </form>
        )}
      </footer>

      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida permanentemente desta conversa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deletingMessage) {
                  deleteMessage({
                    messageId: deletingMessage.id,
                    leadId,
                    id_mensagem: deletingMessage.id_mensagem,
                  });
                  setDeletingMessage(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}