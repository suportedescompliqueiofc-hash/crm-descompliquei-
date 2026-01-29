import { useParams } from "react-router-dom";
import { ConversationsList } from "@/components/conversations/ConversationsList";
import { ActiveConversation } from "@/components/conversations/ActiveConversation";
import { QuickMessagesSidebar } from "@/components/conversations/QuickMessagesSidebar";
import { MessageSquare } from "lucide-react";
import { useLead } from "@/hooks/useLeads";
import { useState } from "react";

export default function Conversations() {
  const { leadId } = useParams<{ leadId: string }>();
  const { data: lead } = useLead(leadId || null);
  const [showQuickMessages, setShowQuickMessages] = useState(true);

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Container principal com borda e cantos arredondados */}
      <div className="flex h-full w-full rounded-lg border bg-background overflow-hidden">
        
        {/* Área Flexível (Lista + Chat) */}
        <div className="flex-1 min-w-0 h-full flex">
            
            {/* Painel Esquerdo: Lista (Largura Fixa) */}
            <div className="hidden md:block w-80 lg:w-96 flex-shrink-0 h-full">
              <ConversationsList />
            </div>
            
            {/* Painel Central: Chat Ativo */}
            <div className="flex-1 min-w-0 h-full border-l">
              {leadId ? (
                <div className="flex flex-col h-full relative">
                  <div className="flex-1 overflow-hidden">
                    <ActiveConversation 
                      leadId={leadId} 
                      showQuickMessages={showQuickMessages}
                      onToggleQuickMessages={() => setShowQuickMessages(!showQuickMessages)}
                    />
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
            </div>
        </div>

        {/* Painel Direito Fixo: Mensagens Rápidas */}
        {showQuickMessages && leadId && (
          <div className="hidden md:block h-full flex-shrink-0">
            <QuickMessagesSidebar lead={lead || null} />
          </div>
        )}
      </div>
    </div>
  );
}