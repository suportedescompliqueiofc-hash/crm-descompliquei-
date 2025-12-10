import { useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ConversationsList } from "@/components/conversations/ConversationsList";
import { ActiveConversation } from "@/components/conversations/ActiveConversation";
import { MessageSquare } from "lucide-react";

export default function Conversations() {
  const { leadId } = useParams<{ leadId: string }>();

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <ConversationsList />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          {leadId ? (
            <ActiveConversation key={leadId} leadId={leadId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <h2 className="text-xl font-semibold">Selecione uma conversa</h2>
              <p>Escolha uma conversa na lista à esquerda para ver as mensagens.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}