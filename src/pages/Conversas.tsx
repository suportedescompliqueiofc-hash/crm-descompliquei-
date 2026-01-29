import { useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ConversationsList } from "@/components/conversations/ConversationsList";
import { ActiveConversation } from "@/components/conversations/ActiveConversation";
import { QuickMessagesSidebar } from "@/components/conversations/QuickMessagesSidebar";
import { MessageSquare } from "lucide-react";
import { useLead } from "@/hooks/useLeads";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function Conversations() {
  const { leadId } = useParams<{ leadId: string }>();
  const { data: lead } = useLead(leadId || null);
  const [showQuickMessages, setShowQuickMessages] = useState(true);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-background">
        
        {/* Painel Esquerdo: Lista */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="hidden md:block">
          <ConversationsList />
        </ResizablePanel>
        
        <ResizableHandle withHandle className="hidden md:flex" />
        
        {/* Painel Central: Chat Ativo */}
        <ResizablePanel defaultSize={55} minSize={40}>
          {leadId ? (
            <div className="flex flex-col h-full relative">
              <div className="flex-1 overflow-hidden">
                <ActiveConversation leadId={leadId} />
              </div>
              {/* Toggle de Quick Messages Mobile/Desktop */}
              <div className="absolute top-3 right-4 z-10 md:hidden">
                 <Button 
                    size="icon" 
                    variant={showQuickMessages ? "default" : "outline"} 
                    className="h-8 w-8 rounded-full shadow-md"
                    onClick={() => setShowQuickMessages(!showQuickMessages)}
                 >
                    <Zap className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-muted/5">
              <div className="bg-muted p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Selecione uma conversa</h2>
              <p>Escolha um cliente na lista para iniciar o atendimento.</p>
            </div>
          )}
        </ResizablePanel>

        {/* Painel Direito: Mensagens Rápidas */}
        {showQuickMessages && leadId && (
          <>
            <ResizableHandle withHandle className="hidden md:flex" />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden md:block bg-background">
              <QuickMessagesSidebar lead={lead || null} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}