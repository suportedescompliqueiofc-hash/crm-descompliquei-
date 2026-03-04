"use client";

import { useQuickMessages, QuickMessage, useLeadSequenceLogs } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders, QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Zap, Mic, Image as ImageIcon, Video, FileText, MessageSquare, Send, Folder, GripVertical, Clock, Play, StopCircle, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Lead } from "@/hooks/useLeads";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuickMessagesSidebarProps {
  lead: Lead | null;
}

function SortableMessageItem({ 
  msg, onClick, onSchedule, getIcon 
}: { 
  msg: QuickMessage; onClick: (msg: QuickMessage) => void; onSchedule: (msg: QuickMessage) => void; getIcon: (tipo: string) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: msg.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : "auto", opacity: isDragging ? 0.5 : 1, position: 'relative' as 'relative' };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex items-center group">
      <div {...attributes} {...listeners} className="mr-1 cursor-grab text-muted-foreground/30 hover:text-muted-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical className="h-4 w-4" /></div>
      <Button variant="outline" className="w-full justify-start h-auto py-2 px-3 relative group/btn hover:border-primary/50 hover:bg-primary/5 text-left whitespace-normal flex-1" onClick={() => onClick(msg)}>
        <div className="flex items-start gap-2.5 w-full">
          <div className="mt-0.5 flex-shrink-0 bg-muted rounded p-1 group-hover/btn:bg-background transition-colors">{getIcon(msg.tipo)}</div>
          <div className="flex-1 min-w-0 pr-14">
            <div className="font-medium text-xs leading-tight truncate">{msg.titulo}</div>
            <div className="flex items-center gap-1 text-[9px] text-primary/70 font-bold mt-1"><Clock className="h-2.5 w-2.5" /> {msg.delay_seconds || 5}s de intervalo</div>
          </div>
          <div className="opacity-0 group-hover/btn:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 hover:bg-primary/20 text-primary shadow-sm" onClick={(e) => { e.stopPropagation(); onSchedule(msg); }} title="Agendar"><Clock className="h-3.5 w-3.5" /></Button>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm"><Send className="h-3 w-3" /></div>
          </div>
        </div>
      </Button>
    </div>
  );
}

export function QuickMessagesSidebar({ lead }: QuickMessagesSidebarProps) {
  const { quickMessages, sendQuickMessage, scheduleQuickMessage, sendFolderSequence, isSendingSequence, isLoading: isLoadingMsgs, updateMessagesOrder } = useQuickMessages();
  const { folders } = useQuickMessageFolders();
  const { logs, cancelSequence, clearCompletedLogs } = useLeadSequenceLogs(lead?.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [messageToConfirm, setMessageToConfirm] = useState<QuickMessage | null>(null);
  const [messageToSchedule, setMessageToSchedule] = useState<QuickMessage | null>(null);
  const [sequenceFolder, setSequenceFolder] = useState<QuickMessageFolder | null>(null);
  const [localMessages, setLocalMessages] = useState<QuickMessage[]>([]);

  useEffect(() => { if (!isLoadingMsgs && quickMessages) setLocalMessages(quickMessages); }, [quickMessages, isLoadingMsgs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleStartSequence = async () => {
    if (!lead || !sequenceFolder) return;
    const messagesToSend = localMessages.filter(m => m.folder_id === sequenceFolder.id);
    await sendFolderSequence({ folderId: sequenceFolder.id, leadId: lead.id, messages: messagesToSend });
    setSequenceFolder(null);
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-3.5 w-3.5 text-blue-500" />;
      case 'imagem': return <ImageIcon className="h-3.5 w-3.5 text-purple-500" />;
      case 'video': return <Video className="h-3.5 w-3.5 text-pink-500" />;
      case 'pdf': return <FileText className="h-3.5 w-3.5 text-red-500" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localMessages.findIndex(i => i.id === active.id);
    const newIdx = localMessages.findIndex(i => i.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const newItems = arrayMove(localMessages, oldIdx, newIdx);
      setLocalMessages(newItems);
      updateMessagesOrder.mutate(newItems.map((m, i) => ({ id: m.id, position: i + 1, folder_id: m.folder_id || null })));
    }
  };

  if (!lead) return null;

  return (
    <div className="h-full flex flex-col bg-background w-72 xl:w-80 2xl:w-96 flex-shrink-0 shadow-sm border-l">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-foreground"><Zap className="h-4 w-4 text-primary" /> Mensagens Rápidas</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar atalho..." className="pl-8 h-8 text-xs bg-muted/30" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {logs && logs.length > 0 && (
        <div className="p-3 bg-muted/20 border-b space-y-3 shrink-0">
           <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase text-primary flex items-center gap-1.5"><Zap className="h-3 w-3" /> Sequência Ativa</h4>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => logs.some(l => l.status === 'pending') ? cancelSequence(logs[0].batch_id) : clearCompletedLogs()}>
                 {logs.some(l => l.status === 'pending') ? <><StopCircle className="h-3 w-3 mr-1" /> Parar</> : <><X className="h-3 w-3 mr-1" /> Limpar</>}
              </Button>
           </div>
           <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {logs.map(log => (<div key={log.id} className="flex items-center justify-between text-xs bg-background p-2 rounded border shadow-sm"><span className="truncate max-w-[140px] font-medium">{log.mensagens_rapidas?.titulo}</span>{log.status === 'pending' ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : log.status === 'sent' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-destructive" />}</div>))}
           </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Accordion type="multiple" defaultValue={folders.map(f => f.id)} className="w-full space-y-2">
              {folders.map(folder => {
                const msgs = localMessages.filter(m => m.folder_id === folder.id).filter(m => m.titulo.toLowerCase().includes(searchTerm.toLowerCase()));
                if (msgs.length === 0) return null;
                return (
                  <AccordionItem key={folder.id} value={folder.id} className="border-b-0 relative group">
                    <div className="flex items-center"><AccordionTrigger className="flex-1 hover:no-underline py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color }} />{folder.name}</div></AccordionTrigger>
                    <div className="absolute right-8 top-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100 bg-background/50 border border-primary/10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSequenceFolder(folder); }} title="Enviar sequência"><Play className="h-3 w-3 fill-current" /></Button></div></div>
                    <AccordionContent className="pt-1 pb-0 px-1">
                      <SortableContext items={msgs.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        {msgs.map(m => (<SortableMessageItem key={m.id} msg={m} onClick={setMessageToConfirm} onSchedule={setMessageToSchedule} getIcon={getIcon} />))}
                      </SortableContext>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </DndContext>
        </div>
      </ScrollArea>

      <Dialog open={!!sequenceFolder} onOpenChange={open => !open && setSequenceFolder(null)}>
        <DialogContent><DialogHeader><DialogTitle>Enviar Sequência</DialogTitle><DialogDescription>Deseja enviar todas as mensagens da pasta <strong>{sequenceFolder?.name}</strong>? Cada mensagem respeitará seu tempo de intervalo individual.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setSequenceFolder(null)}>Cancelar</Button><Button onClick={handleStartSequence} disabled={isSendingSequence}>{isSendingSequence ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2 fill-current" />} Iniciar Envio</Button></DialogFooter></DialogContent>
      </Dialog>
      
      <AlertDialog open={!!messageToConfirm} onOpenChange={open => !open && setMessageToConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar agora?</AlertDialogTitle><AlertDialogDescription>Enviar <strong>"{messageToConfirm?.titulo}"</strong> para {lead?.nome}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { sendQuickMessage({ message: messageToConfirm!, leadId: lead.id, phone: lead.telefone }); setMessageToConfirm(null); }}>Enviar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}