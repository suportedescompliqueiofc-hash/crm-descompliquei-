import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PromptOptimizerChatProps {
  currentPrompt: string;
  onPromptUpdate: (newPrompt: string) => void;
}

export function PromptOptimizerChat({ currentPrompt, onPromptUpdate }: PromptOptimizerChatProps) {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar histórico inicial
  useEffect(() => {
    if (profile?.organization_id) {
      const fetchHistory = async () => {
        const { data } = await supabase
          .from('ai_prompt_chat_history')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: true });
        
        if (data) {
          setMessages(data.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
        }
      };
      fetchHistory();
    }
  }, [profile?.organization_id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-prompt', {
        body: { 
          message: userMsg.content,
          currentPrompt: currentPrompt
        }
      });

      if (error) throw new Error(error.message);

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.message 
      };
      
      setMessages(prev => [...prev, aiMsg]);

      if (data.newPrompt) {
        onPromptUpdate(data.newPrompt);
        toast.success("Prompt atualizado pela IA!", {
          description: "Revise as alterações e clique em salvar.",
          icon: <Sparkles className="h-4 w-4 text-accent" />
        });
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao processar solicitação.", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Assistente de Otimização
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Peça melhorias, correções ou novas regras para o seu prompt.
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto opacity-50" />
              <p>Como posso ajudar a melhorar seu prompt hoje?</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" className="text-xs h-auto py-1" onClick={() => { setInputValue("Melhore o tom para ser mais empático"); }}>
                  "Seja mais empático"
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-auto py-1" onClick={() => { setInputValue("Adicione uma regra para não falar preços"); }}>
                  "Regra: sem preços"
                </Button>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full gap-2 max-w-[85%]", // Reduzi para 85% para evitar colar na borda
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={cn(msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "p-3 rounded-lg text-sm overflow-hidden", // Adicionei overflow-hidden para garantir que o conteúdo não vaze
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                )}
              >
                <div className={cn(
                  "prose prose-sm max-w-none break-words leading-relaxed",
                  msg.role === "user" ? "dark:prose-invert text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground" : "dark:prose-invert"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      code: ({node, ...props}) => <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-xs break-all" {...props} />,
                      // Alterado 'pre' para usar whitespace-pre-wrap e break-words em vez de overflow-x-auto
                      // Isso faz com que blocos de código quebrem linha em vez de rolar ou cortar
                      pre: ({node, ...props}) => <pre className="bg-black/10 dark:bg-white/10 rounded p-2 my-2 font-mono text-xs whitespace-pre-wrap break-words" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex w-full gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
              <div className="bg-muted p-3 rounded-lg rounded-tl-none flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-muted-foreground">Analisando e otimizando...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Ex: Adicione instruções sobre agendamento..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}