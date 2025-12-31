import { useState, useEffect } from "react";
import { Save, Bot, Sparkles, History, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromptEditor } from "@/components/ai/PromptEditor";
import { useAiPrompt } from "@/hooks/useAiPrompt";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const defaultPrompt = `# 1. IDENTIDADE E PAPEL
Você é a Assistente Virtual Inteligente do escritório Viviane Braga Advocacia.
Sua função é realizar o pré-atendimento, triagem inicial e agendamento de consultas jurídicas.

# 2. DIRETRIZES GERAIS
- Seja sempre formal, cordial, empática e profissional.
- Evite gírias. Use uma linguagem clara, mas que transmita seriedade e confiança.
- Responda de forma concisa e direta (ideal para WhatsApp).
- Não forneça aconselhamento jurídico específico (diga que apenas o advogado pode analisar o caso em detalhes).

# 3. OBJETIVOS
1. Identificar se é um cliente novo ou recorrente.
2. Entender a área do direito (Família, Trabalhista, Civil, etc.) ou o problema principal.
3. Agendar uma consulta ou reunião com a Dra. Viviane ou equipe.`;

export default function AiSettings() {
  const { prompt, lastUpdated, isLoading, savePrompt, isSaving } = useAiPrompt();
  const [localPrompt, setLocalPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState(""); // Para reverter se necessário
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (prompt) {
      setLocalPrompt(prompt);
      setOriginalPrompt(prompt);
    } else if (!isLoading) {
      setLocalPrompt(defaultPrompt);
      setOriginalPrompt(defaultPrompt);
    }
  }, [prompt, isLoading]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setHasChanges(value !== originalPrompt);
  };

  const handleSave = () => {
    savePrompt(localPrompt, {
      onSuccess: () => {
        setHasChanges(false);
        setOriginalPrompt(localPrompt);
      }
    });
  };

  const handleRevert = () => {
    setLocalPrompt(originalPrompt);
    setHasChanges(false);
    toast.info("Alterações descartadas.");
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Inteligência Artificial
          </h1>
          <p className="text-muted-foreground mt-1">Configure o comportamento e as regras da sua assistente virtual jurídica.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleRevert} className="gap-2">
              <Undo2 className="h-4 w-4" />
              Descartar
            </Button>
          )}
          {lastUpdated && !hasChanges && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 hidden md:flex mr-2">
              <History className="h-3 w-3" />
              Atualizado em {format(new Date(lastUpdated), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isSaving || !hasChanges}
            className="gap-2 min-w-[120px] relative"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Prompt"}
            {hasChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
          </Button>
        </div>
      </div>

      {/* Main Content - Full Editor */}
      <Card className="flex-1 overflow-hidden border-sidebar-border shadow-sm bg-background flex flex-col">
        <div className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/20 flex-shrink-0">
          <div className="space-y-1">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Editor de Sistema
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs bg-background">prompt.system.md</Badge>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <PromptEditor 
              value={localPrompt} 
              onChange={handlePromptChange} 
              disabled={isLoading || isSaving}
            />
          )}
        </div>
      </Card>
    </div>
  );
}