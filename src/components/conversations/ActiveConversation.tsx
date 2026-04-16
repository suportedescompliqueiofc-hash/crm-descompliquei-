"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Send, Smile, AlertTriangle, CheckCircle, Phone, User, Bot, ChevronDown, Trash2, Mic, Zap, MoreVertical, ChevronLeft, Paperclip, Loader2, ImageIcon, FileText, Globe, Sparkles, Info, Pencil, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import EmojiPicker from 'emoji-picker-react';
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import { useLead, useLeads } from "@/hooks/useLeads";
import { useLeadCadence } from "@/hooks/useCadences";
import { useMessages, useSendMessage, Message, Attachment, useDeleteMessage, useSendAudioMessage, useSendMediaMessage } from "@/hooks/useConversations";
import { useNotifications, useUpdateNotificationStatus } from "@/hooks/useNotifications";
import { useStages } from "@/hooks/useStages";
import { useMarketing } from "@/hooks/useMarketing";

import { AudioMessage } from "./AudioMessage";
import { MediaMessage } from "./MediaMessage";
import { FileMessage } from "./FileMessage";
import { NotificationMessage } from "./NotificationMessage";
import { AiLockControl } from "./AiLockControl";
import { CadenceLeadSelector } from "./CadenceLeadSelector";
import { TagManager } from "@/components/tags/TagManager";
import { AudioRecorder } from "./AudioRecorder";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { FullscreenMediaViewer } from "./FullscreenMediaViewer";
import { LeadModal } from "@/components/leads/LeadModal";
import { FormattedText } from "@/components/FormattedText";

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

const AttachmentRenderer = ({ 
  attachment, 
  isOutgoing, 
  onViewMedia 
}: { 
  attachment: Attachment; 
  isOutgoing: boolean;
  onViewMedia: (url: string, type: 'imagem' | 'video' | 'pdf', name?: string) => void;
}) => {
  const type = (attachment.file_type || '').toLowerCase();
  const path = (attachment.file_path || '').toLowerCase();
  const isAudio = type.includes('audio') || type.includes('ptt') || path.includes('.ogg') || path.includes('.mp3') || path.includes('.m4a') || path.includes('.webm');
  
  if (isAudio) return <AudioMessage filePath={attachment.file_path} variant={isOutgoing ? 'outgoing' : 'incoming'} />;
  
  if (type.includes('image') || type.includes('imagem') || type.includes('video')) {
    return (
      <MediaMessage 
        path={attachment.file_path} 
        type={type.includes('video') ? 'video' : 'imagem'} 
        onView={onViewMedia as any}
      />
    );
  }
  
  if (type.includes('pdf')) {
    return (
      <FileMessage 
        path={attachment.file_path} 
        fileName="Documento PDF" 
        onView={onViewMedia as any}
      />
    );
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

interface ActiveConversationProps {
  leadId: string;
  showQuickMessages?: boolean;
  onToggleQuickMessages?: () => void;
}

export function ActiveConversation({ leadId, showQuickMessages, onToggleQuickMessages }: ActiveConversationProps) {
  const navigate = useNavigate();
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const { activeCadence } = useLeadCadence(leadId);
  const { data: messages = [], isLoading: messagesLoading } = useMessages(leadId);
  const { data: notifications } = useNotifications(leadId);
  const { stages, isLoading: stagesLoading } = useStages();
  const { criativos } = useMarketing();
  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendAudio, isPending: isSendingAudio } = useSendAudioMessage();
  const { mutate: sendMedia, isPending: isSendingMedia } = useSendMediaMessage();
  const { mutate: updateNotification } = useUpdateNotificationStatus(leadId);
  const { updateLead } = useLeads();
  const { mutate: deleteMessage } = useDeleteMessage();
  
  const [messageContent, setMessageContent] = useState("");
  const [isAiActive, setIsAiActive] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Media Preview States (Send)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = useState(false);

  // Fullscreen Viewer State (View)
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'imagem' | 'video' | 'pdf'; name?: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const groupedMessages = useMemo(() => groupMessagesByDay(messages), [messages]);
  
  // Busca o nome do criativo associado
  const creativeName = useMemo(() => {
    if (!lead?.criativo_id || !criativos) return null;
    const creative = criativos.find((c: any) => c.id === lead.criativo_id);
    return creative?.nome || creative?.titulo || "Criativo Desconhecido";
  }, [lead?.criativo_id, criativos]);

  useEffect(() => { if (lead) setIsAiActive(lead.ia_ativa ?? true); }, [lead]);
  
  useLayoutEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); 
  }, [messages]);

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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(files);
      setIsMediaPreviewOpen(true);
    }
    if (e.target) e.target.value = '';
  };

  const handleConfirmMediaSend = async (filesWithCaptions: { file: File; caption: string }[]) => {
    for (const item of filesWithCaptions) {
      let type: 'imagem' | 'video' | 'pdf' = 'imagem';
      if (item.file.type.includes('image')) type = 'imagem';
      else if (item.file.type.includes('video')) type = 'video';
      else if (item.file.type === 'application/pdf') type = 'pdf';
      
      sendMedia({ leadId, file: item.file, type, caption: item.caption });
    }
    setPendingFiles([]);
  };

  const handleAiToggle = async (checked: boolean) => {
    if (!lead) return;
    setIsAiActive(checked);
    updateLead({ id: lead.id, ia_ativa: checked });
  };

  const openMediaViewer = (url: string, type: 'imagem' | 'video' | 'pdf', name?: string) => {
    setViewingMedia({ url, type, name });
  };

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'L';
  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);

  if (leadLoading || stagesLoading) return <Skeleton className="h-full w-full" />;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <header className="flex flex-col border-b bg-card shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center justify-between p-2 sm:p-3 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => navigate('/conversas')}><ChevronLeft className="h-5 w-5" /></Button>
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border bg-muted flex-shrink-0">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs sm:text-sm font-medium">{getInitials(lead?.nome)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold truncate text-base leading-tight">{lead?.nome || 'Lead'}</p>
                        {activeCadence && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0 h-4 border border-orange-200">
                                <Zap className="h-2.5 w-2.5 mr-0.5" /> Em cadência
                            </Badge>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full transition-colors"
                            onClick={() => setIsEditModalOpen(true)}
                            title="Editar Lead"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1 overflow-hidden">
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Phone className="h-2.5 w-2.5" />
                            {lead?.telefone}
                        </span>
                        
                        {/* Badge de Origem */}
                        <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/40 shrink-0">
                            <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[9px] font-bold uppercase text-muted-foreground">
                                {lead?.origem === 'marketing' ? 'Marketing' : 'Orgânico'}
                            </span>
                        </div>

                        {/* Badge de Criativo */}
                        {creativeName && (
                            <div className="flex items-center gap-1 bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 shrink-0 max-w-[120px] sm:max-w-[200px]">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                                <span className="text-[9px] font-medium text-primary truncate">
                                    {creativeName}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {/* Botão Resumo IA com texto formatado */}
                {lead?.resumo && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 gap-2 bg-[#FDF8F3] border-[#E9D5C3] text-[#A67C52] hover:bg-[#F9F1E8] hover:text-[#8B6441] rounded-full px-3"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-xs font-semibold">Resumo IA</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 shadow-xl border-primary/20 bg-background" align="end">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h4 className="font-bold text-sm text-foreground">Resumo do Atendimento</h4>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto pr-1">
                                    <FormattedText content={lead.resumo} className="text-xs" />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                <div className="hidden lg:block">
                    {leadId && <CadenceLeadSelector leadId={leadId} />}
                </div>
                
                <div className="flex items-center gap-2 pl-2 border-l ml-1">
                    <div className="flex items-center gap-2">
                        <Switch id="ai-toggle" checked={isAiActive} onCheckedChange={handleAiToggle} disabled={!lead} className="scale-75 sm:scale-90" />
                        <Zap className={cn("h-4 w-4 transition-colors", isAiActive ? "text-primary fill-primary/20" : "text-muted-foreground")} />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between px-3 pb-2 gap-3 overflow-x-auto scrollbar-none bg-muted/5">
            <div className="flex items-center gap-2 flex-shrink-0">
                {lead && stages.length > 0 && (
                    <Select value={lead.posicao_pipeline?.toString() || "1"} onValueChange={(v) => updateLead({ id: lead.id, posicao_pipeline: parseInt(v) })}>
                    <SelectTrigger className="w-[120px] sm:w-[160px] h-7 text-[10px] sm:text-xs bg-background/50 border-none shadow-none hover:bg-muted/40 transition-colors">
                        <SelectValue>
                        {currentStage ? <div className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.cor }} />{currentStage.nome}</div> : "Etapa"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>{stages.map(stage => (<SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>))}</SelectContent>
                    </Select>
                )}
                {lead && (
                  <Button
                    variant={lead.is_qualified ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 px-2 sm:px-3 text-[10px] sm:text-xs font-bold gap-1.5 transition-all duration-300 rounded-full uppercase tracking-wider",
                      lead.is_qualified 
                        ? "bg-emerald-500 text-white hover:bg-emerald-600 border-none shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)] scale-105 active:scale-95" 
                        : "text-muted-foreground hover:bg-muted/40 border-transparent bg-transparent hover:text-foreground"
                    )}
                    onClick={() => updateLead({ id: lead.id, is_qualified: !lead.is_qualified })}
                  >
                    <UserCheck className={cn("h-3.5 w-3.5", lead.is_qualified ? "fill-current" : "")} />
                    Qualificado
                  </Button>
                )}
            </div>
            <div className="flex-1 flex justify-end min-w-0 overflow-hidden">
                {lead && (
                    <div className="flex items-center gap-2 scale-90 origin-right">
                        <TagManager leadId={lead.id} />
                        {onToggleQuickMessages && (
                            <Button 
                                variant={showQuickMessages ? "default" : "ghost"} 
                                size="sm" 
                                className={cn(
                                    "h-7 px-2 rounded-full text-[10px] gap-1", 
                                    showQuickMessages ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                )} 
                                onClick={onToggleQuickMessages}
                            >
                                <Zap className="h-3 w-3" />
                                Mensagens Rápidas
                            </Button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <div className="lg:hidden">
                    {leadId && <CadenceLeadSelector leadId={leadId} />}
                </div>
                <div className="xs:block">{lead && <AiLockControl lead={lead} />}</div>
            </div>
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
            
            const isOutgoing = msg.remetente !== 'lead';
            const isAi = msg.remetente === 'bot';
            
            const typeLower = (msg.tipo_conteudo || '').toLowerCase();
            const pathLower = (msg.media_path || '').toLowerCase();
            const contentLower = (msg.conteudo || '').toLowerCase();
            
            const isAudio = typeLower.includes('audio') || typeLower.includes('ptt') || pathLower.includes('.ogg') || pathLower.includes('.mp3') || pathLower.includes('.m4a') || pathLower.includes('.webm') || (isOutgoing && contentLower.startsWith('http') && (contentLower.includes('.ogg') || contentLower.includes('.mp3') || contentLower.includes('.m4a')));
            const isVisualMedia = !isAudio && (typeLower.includes('image') || typeLower.includes('imagem') || typeLower.includes('video') || pathLower.includes('.jpg') || pathLower.includes('.png') || pathLower.includes('.mp4'));
            const isPdf = typeLower.includes('pdf') || pathLower.includes('.pdf');

            return (
              <div key={msg.id} className={cn("group relative flex flex-col gap-0.5 py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-200", isOutgoing ? "items-end" : "items-start")}>
                <div className={cn("flex items-end gap-2 max-w-[90%] sm:max-w-[85%]", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="h-8 w-8 flex-shrink-0 border shadow-sm">
                    {isOutgoing ? (
                      <AvatarFallback className={cn(isAi ? "bg-primary/20 text-primary" : "bg-amber-100 text-amber-700")}>{isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}</AvatarFallback>
                    ) : (<AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">{getInitials(lead?.nome)}</AvatarFallback>)}
                  </Avatar>
                  <div className={cn("p-2 sm:p-3 rounded-2xl relative shadow-sm transition-all min-w-[100px]", isOutgoing ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/40 rounded-bl-none")}>
                    <div className="mb-1 space-y-1">
                      {msg.message_attachments?.map(att => (
                        <AttachmentRenderer 
                          key={att.id} 
                          attachment={att} 
                          isOutgoing={isOutgoing} 
                          onViewMedia={openMediaViewer}
                        />
                      ))}
                    </div>
                    {!msg.message_attachments?.length && (msg.media_path || msg.conteudo) && (
                      <div className="mb-1">
                        {isAudio ? (
                          <AudioMessage filePath={msg.media_path || msg.conteudo || ''} variant={isOutgoing ? 'outgoing' : 'incoming'} />
                        ) : isVisualMedia ? (
                          <MediaMessage 
                            path={msg.media_path || msg.conteudo} 
                            type={typeLower.includes('video') || pathLower.includes('.mp4') ? 'video' : 'imagem'} 
                            onView={openMediaViewer as any}
                          />
                        ) : isPdf ? (
                          <FileMessage 
                            path={msg.media_path || msg.conteudo || ''} 
                            fileName="Documento PDF" 
                            onView={openMediaViewer as any}
                          />
                        ) : null}
                      </div>
                    )}
                    {msg.conteudo && !isAudio && !isVisualMedia && !isPdf && (<p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.conteudo}</p>)}
                    <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-70", isOutgoing ? "text-primary-foreground/80" : "text-muted-foreground")}><span className="text-[9px] sm:text-[10px] tabular-nums">{format(new Date(msg.criado_em), 'HH:mm')}</span>{isOutgoing && <CheckCircle className="h-2.5 w-2.5" />}</div>
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
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-muted/40 p-1 rounded-full border border-input/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all max-w-5xl mx-auto relative">
            <div className="flex items-center shrink-0">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary">
                            <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none" align="start" side="top">
                        <EmojiPicker onEmojiClick={(emoji) => setMessageContent(prev => prev + emoji.emoji)} />
                    </PopoverContent>
                </Popover>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary", isSendingMedia && "opacity-50")}
                            disabled={isSendingMedia}
                        >
                            {isSendingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-48 rounded-xl p-1 shadow-xl border-border/40">
                        <DropdownMenuItem className="gap-3 p-2 cursor-pointer rounded-lg" onClick={() => docInputRef.current?.click()}>
                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><FileText className="h-4 w-4" /></div>
                            <span className="font-medium text-sm">Documento</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-3 p-2 cursor-pointer rounded-lg" onClick={() => mediaInputRef.current?.click()}>
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><ImageIcon className="h-4 w-4" /></div>
                            <span className="font-medium text-sm">Fotos e vídeos</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <input 
                    type="file" 
                    className="hidden" 
                    ref={mediaInputRef} 
                    multiple
                    onChange={handleFileSelection}
                    accept="image/*,video/*"
                />
                <input 
                    type="file" 
                    className="hidden" 
                    ref={docInputRef} 
                    multiple
                    onChange={handleFileSelection}
                    accept="application/pdf"
                />
            </div>

            <Input placeholder="Digite sua mensagem..." value={messageContent} onChange={(e) => setMessageContent(e.target.value)} autoComplete="off" className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 h-8 sm:h-9 text-sm" />
            
            <div className="flex-shrink-0">
                {messageContent.trim() ? (
                    <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-sm">
                        <Send className="h-3.5 w-3.5 sm:h-4 w-4" />
                    </Button>
                ) : (
                    <Button type="button" size="icon" variant="ghost" className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground", isSendingAudio && "opacity-50")} onClick={() => setIsRecordingMode(true)} disabled={isSendingAudio || isSendingMedia}>
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                )}
            </div>
          </form>
        )}
      </footer>

      <MediaPreviewModal 
        isOpen={isMediaPreviewOpen}
        files={pendingFiles}
        onClose={() => { setIsMediaPreviewOpen(false); setPendingFiles([]); }}
        onSend={handleConfirmMediaSend}
        onAddFiles={(newFiles) => setPendingFiles([...pendingFiles, ...newFiles])}
      />

      {viewingMedia && (
        <FullscreenMediaViewer 
          mediaUrl={viewingMedia.url}
          type={viewingMedia.type}
          fileName={viewingMedia.name}
          onClose={() => setViewingMedia(null)}
        />
      )}

      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Excluir mensagem?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl" onClick={() => { if (deletingMessage) { deleteMessage({ messageId: deletingMessage.id, leadId, id_mensagem: deletingMessage.id_mensagem }); setDeletingMessage(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        lead={lead}
        mode="edit"
      />
    </div>
  );
}
