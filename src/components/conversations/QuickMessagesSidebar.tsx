import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders } from "@/hooks/useQuickMessageFolders";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Zap, Mic, Image as ImageIcon, Video, FileText, MessageSquare, Send, Folder } from "lucide-react";
import { useState } from "react";
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

interface QuickMessagesSidebarProps {
  lead: Lead | null;
}

export function QuickMessagesSidebar({ lead }: QuickMessagesSidebarProps) {
  const { quickMessages, sendQuickMessage, isLoading: isLoadingMsgs } = useQuickMessages();
  const { folders, isLoading: isLoadingFolders } = useQuickMessageFolders();
  const [searchTerm, setSearchTerm] = useState("");
  const [messageToConfirm, setMessageToConfirm] = useState<QuickMessage | null>(null);

  const filteredMessages = quickMessages.filter(msg => 
    msg.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (msg.conteudo && msg.conteudo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClickMessage = (msg: QuickMessage) => {
    setMessageToConfirm(msg);
  };

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

  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground bg-muted/10 border-l w-80 flex-shrink-0">
        <Zap className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-sm">Selecione uma conversa para enviar mensagens rápidas.</p>
      </div>
    );
  }

  const getMessagesByFolder = (folderId: string | null) => {
    return filteredMessages.filter(m => (m.folder_id || null) === folderId);
  };

  const renderMessageButton = (msg: QuickMessage) => (
    <Button
      key={msg.id}
      variant="outline"
      className="w-full justify-start h-auto py-2.5 px-3 relative group hover:border-primary/50 hover:bg-primary/5 text-left whitespace-normal mb-2"
      onClick={() => handleClickMessage(msg)}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="mt-0.5 flex-shrink-0 bg-muted rounded p-1.5 group-hover:bg-background transition-colors">
          {getIcon(msg.tipo)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm flex items-center justify-between">
            {msg.titulo}
          </div>
          {msg.conteudo && (
            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 font-normal opacity-80">
              {msg.conteudo}
            </p>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm transition-opacity">
          <Send className="h-3 w-3" />
        </div>
      </div>
    </Button>
  );

  return (
    <div className="h-full flex flex-col bg-background border-l w-80 flex-shrink-0">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          Mensagens Rápidas
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar atalho..." 
            className="pl-8 h-8 text-xs bg-muted/30" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingMsgs || isLoadingFolders ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Carregando...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Nenhuma mensagem encontrada.</div>
        ) : (
          <div className="p-3">
            <Accordion type="multiple" defaultValue={folders.map(f => f.id)} className="w-full space-y-2">
              
              {/* Pastas */}
              {folders.map(folder => {
                const msgs = getMessagesByFolder(folder.id);
                if (msgs.length === 0) return null;

                return (
                  <AccordionItem key={folder.id} value={folder.id} className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 px-1 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                        {folder.name}
                        <span className="text-[10px] text-muted-foreground ml-1">({msgs.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0 px-1">
                      {msgs.map(renderMessageButton)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              {/* Mensagens sem Pasta */}
              {getMessagesByFolder(null).length > 0 && (
                <AccordionItem value="uncategorized" className="border-b-0">
                  <AccordionTrigger className="hover:no-underline py-2 px-1 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      Geral
                      <span className="text-[10px] text-muted-foreground ml-1">({getMessagesByFolder(null).length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0 px-1">
                    {getMessagesByFolder(null).map(renderMessageButton)}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
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