"use client";

import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders, QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Zap, Mic, Image as ImageIcon, Video, FileText, MessageSquare, Send, Folder, GripVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Lead } from "@/hooks/useLeads";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuickMessagesSidebarProps {
  lead: Lead | null;
}

function SortableMessageItem({ 
  msg, 
  onClick, 
  getIcon 
}: { 
  msg: QuickMessage; 
  onClick: (msg: QuickMessage) => void;
  getIcon: (tipo: string) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: msg.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex items-center group">
      <div 
        {...attributes} 
        {...listeners} 
        className="mr-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Button
        variant="outline"
        className="w-full justify-start h-auto py-2.5 px-3 relative group/btn hover:border-primary/50 hover:bg-primary/5 text-left whitespace-normal flex-1"
        onClick={() => onClick(msg)}
      >
        <div className="flex items-start gap-3 w-full">
          <div className="mt-0.5 flex-shrink-0 bg-muted rounded p-1.5 group-hover/btn:bg-background transition-colors">
            {getIcon(msg.tipo)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {msg.titulo}
            </div>
            {msg.conteudo && (
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 font-normal opacity-80">
                {msg.conteudo}
              </p>
            )}
          </div>
          <div className="opacity-0 group-hover/btn:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm transition-opacity">
            <Send className="h-3 w-3" />
          </div>
        </div>
      </Button>
    </div>
  );
}

export function QuickMessagesSidebar({ lead }: QuickMessagesSidebarProps) {
  const { quickMessages, sendQuickMessage, isLoading: isLoadingMsgs, updateMessagesOrder } = useQuickMessages();
  const { folders, isLoading: isLoadingFolders } = useQuickMessageFolders();
  const [searchTerm, setSearchTerm] = useState("");
  const [messageToConfirm, setMessageToConfirm] = useState<QuickMessage | null>(null);
  
  // Local state for optimistic updates
  const [localMessages, setLocalMessages] = useState<QuickMessage[]>([]);
  const [localFolders, setLocalFolders] = useState<QuickMessageFolder[]>([]);

  // Refs para rastrear a última versão dos dados sincronizados e evitar loops
  const lastSyncedMessagesRef = useRef<string>("");
  const lastSyncedFoldersRef = useRef<string>("");

  // Sincronização Estável: Mensagens
  useEffect(() => {
    if (!isLoadingMsgs && quickMessages) {
      const serverStr = JSON.stringify(quickMessages);
      // Só atualiza se os dados do servidor mudaram em relação à última sincronização
      if (serverStr !== lastSyncedMessagesRef.current) {
        setLocalMessages(quickMessages);
        lastSyncedMessagesRef.current = serverStr;
      }
    }
  }, [quickMessages, isLoadingMsgs]);

  // Sincronização Estável: Pastas
  useEffect(() => {
    if (!isLoadingFolders && folders) {
      const serverStr = JSON.stringify(folders);
      // Só atualiza se os dados do servidor mudaram em relação à última sincronização
      if (serverStr !== lastSyncedFoldersRef.current) {
        setLocalFolders(folders);
        lastSyncedFoldersRef.current = serverStr;
      }
    }
  }, [folders, isLoadingFolders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredMessages = localMessages.filter(msg => 
    msg.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (msg.conteudo && msg.conteudo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClickMessage = (msg: QuickMessage) => setMessageToConfirm(msg);

  const handleConfirmSend = () => {
    if (!lead || !messageToConfirm) return;
    sendQuickMessage({ message: messageToConfirm, leadId: lead.id, phone: lead.telefone });
    setMessageToConfirm(null);
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-4 w-4 text-blue-500" />;
      case 'imagem': return <ImageIcon className="h-4 w-4 text-purple-500" />;
      case 'video': return <Video className="h-4 w-4 text-pink-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMessagesByFolder = (folderId: string | null) => filteredMessages.filter(m => (m.folder_id || null) === folderId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localMessages.findIndex((item) => item.id === active.id);
    const newIndex = localMessages.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(localMessages, oldIndex, newIndex);
      setLocalMessages(newItems);
      
      // Atualiza a ref para evitar que o efeito de sync reverta a mudança imediatamente
      // antes da resposta do servidor (Optimistic UI support)
      // Nota: Idealmente o servidor responderia rápido, mas isso previne flashs
      // lastSyncedMessagesRef.current = JSON.stringify(newItems); // Opcional, dependendo da estratégia

      const updates = newItems.map((msg, index) => ({ id: msg.id, position: index + 1, folder_id: msg.folder_id || null }));
      updateMessagesOrder.mutate(updates);
    }
  };

  if (!lead) return null;

  return (
    <div className="h-full flex flex-col bg-background border-l w-80 flex-shrink-0 shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          Mensagens Rápidas
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar atalho..." 
            className="pl-8 h-8 text-xs bg-muted/30 border-muted-foreground/10 focus-visible:ring-primary" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingMsgs || isLoadingFolders ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Carregando...</div>
        ) : (
          <div className="p-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Accordion type="multiple" defaultValue={localFolders.map(f => f.id)} className="w-full space-y-2">
                {localFolders.map(folder => {
                  const msgs = getMessagesByFolder(folder.id);
                  if (msgs.length === 0) return null;
                  return (
                    <AccordionItem key={folder.id} value={folder.id} className="border-b-0">
                      <AccordionTrigger className="hover:no-underline py-2 px-1 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                          {folder.name}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-0 px-1">
                        <SortableContext items={msgs.map(m => m.id)} strategy={verticalListSortingStrategy}>
                          {msgs.map(msg => (
                            <SortableMessageItem key={msg.id} msg={msg} onClick={handleClickMessage} getIcon={getIcon} />
                          ))}
                        </SortableContext>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

                {getMessagesByFolder(null).length > 0 && (
                  <AccordionItem value="uncategorized" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 px-1 rounded hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        Geral
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0 px-1">
                      <SortableContext items={getMessagesByFolder(null).map(m => m.id)} strategy={verticalListSortingStrategy}>
                        {getMessagesByFolder(null).map(msg => (
                          <SortableMessageItem key={msg.id} msg={msg} onClick={handleClickMessage} getIcon={getIcon} />
                        ))}
                      </SortableContext>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </DndContext>
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={!!messageToConfirm} onOpenChange={(open) => !open && setMessageToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar a mensagem <strong>"{messageToConfirm?.titulo}"</strong> para {lead?.nome}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} className="bg-primary hover:bg-primary/90">
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}