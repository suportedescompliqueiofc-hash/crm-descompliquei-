import { useState, useEffect } from "react";
import { Save, Bot, Sparkles, History, Undo2, Power, Wrench, Clock, MessageSquare, Bell, Database, Activity, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PromptEditor } from "@/components/ai/PromptEditor";
import { useAiPrompt } from "@/hooks/useAiPrompt";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AiLogsViewer } from "@/components/ai/AiLogsViewer";

const defaultPrompt = `# 1. IDENTIDADE E PAPEL
Você é a Assistente Virtual Inteligente da [NOME DA CLÍNICA].
Sua função é realizar o pré-atendimento, triagem inicial e agendamento de avaliações.

# 2. DIRETRIZES GERAIS
- Seja sempre cordial, acolhedora e profissional.
- Use linguagem clara, simples e próxima — ideal para WhatsApp.
- Responda de forma concisa e direta (máx. 3 parágrafos por mensagem).
- Nunca forneça diagnósticos clínicos.

# 3. OBJETIVOS
1. Identificar se é um paciente novo ou recorrente.
2. Entender o motivo do contato.
3. Coletar o nome do lead.
4. Agending de avaliação presencial.

# 4. QUANDO ACIONAR A EQUIPE
Use a ferramenta "notificacao" quando o lead:
- Confirmar interesse em agendar
- Solicitar falar com um humano
- Apresentar caso de urgência`;
const AI_TOOLS = [
  {
    icon: Database,
    name: "crm",
    label: "Ferramenta CRM",
    description: "Atualiza automaticamente o nome do lead, procedimento de interesse, resumo da conversa e move a fase no pipeline.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Bell,
    name: "notificacao",
    label: "Ferramenta Notificação",
    description: "Notifica a equipe humana quando o lead está qualificado. A IA é desativada e o atendimento passa para um humano.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

export default function AiSettings() {
  const { prompt, iaAtiva, acumuloMensagens, lastUpdated, isLoading, savePrompt, toggleIa, isTogglingIa, isSaving } = useAiPrompt();
  const [localPrompt, setLocalPrompt] = useState("");
  const [localAcumulo, setLocalAcumulo] = useState(45);
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [originalAcumulo, setOriginalAcumulo] = useState(45);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("base");

  useEffect(() => {
    if (prompt) {
      setLocalPrompt(prompt);
      setOriginalPrompt(prompt);
    } else if (!isLoading) {
      setLocalPrompt(defaultPrompt);
      setOriginalPrompt(defaultPrompt);
    }

    if (acumuloMensagens) {
      setLocalAcumulo(acumuloMensagens);
      setOriginalAcumulo(acumuloMensagens);
    }
  }, [prompt, acumuloMensagens, isLoading]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setHasChanges(value !== originalPrompt || localAcumulo !== originalAcumulo);
  };

  const handleAcumuloChange = (value: string) => {
    const num = Number(value);
    setLocalAcumulo(num);
    setHasChanges(localPrompt !== originalPrompt || num !== originalAcumulo);
  };

  const handleSave = () => {
    savePrompt(localPrompt, undefined, localAcumulo, {
      onSuccess: () => {
        setHasChanges(false);
        setOriginalPrompt(localPrompt);
        setOriginalAcumulo(localAcumulo);
      }
    });
  };

  const handleRevert = () => {
    setLocalPrompt(originalPrompt);
    setLocalAcumulo(originalAcumulo);
    setHasChanges(false);
    toast.info("Alterações descartadas.");
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-6 pr-1 h-[calc(100vh-6rem)] scrollbar-hide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Inteligência Artificial
          </h1>
          <p className="text-muted-foreground mt-1">Configure o comportamento e as regras da sua assistente virtual.</p>
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
            {isSaving ? "Salvando..." : "Salvar"}
            {hasChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
          </Button>
        </div>
      </div>

      {/* ── Seção de Logs (TOP) ── */}
      <div className="flex-shrink-0" style={{ height: '340px' }}>
        <Card className="flex flex-col h-full border-sidebar-border shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between py-2.5 px-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-tight">Monitor de Inteligência em Tempo Real</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Tracking
              </Badge>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 p-4 pt-1">
              <AiLogsViewer />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4" style={{ minHeight: '520px' }}>
        {/* Lado Esquerdo Principal (Prompt Editors) */}
        <div className="flex-1 flex flex-col" style={{ minHeight: '520px' }}>
          <Tabs defaultValue="base" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            <TabsList className="w-fit mb-2 bg-muted/30 p-1 border flex-shrink-0">
              <TabsTrigger value="base" className="text-xs px-6 py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sparkles className="h-3.5 w-3.5 mr-2 opacity-70" />
                Prompt Agente Base
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo renderizado condicionalmente para evitar bug de layout do Radix */}
            <div className="flex-1" style={{ minHeight: '460px' }}>
              {activeTab === "base" && (
                <Card className="flex flex-col border-sidebar-border shadow-sm bg-background overflow-hidden" style={{ height: '460px' }}>
                  <div className="flex flex-row items-center justify-between py-2 px-4 border-b bg-muted/10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instruções de Comportamento</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] bg-background px-1.5 py-0">system.prompt.md</Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground">
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                          <div className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/10 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">Prompt Agente Base (Tela Cheia)</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs bg-background px-2 py-0.5">system.prompt.md</Badge>
                          </div>
                          <div className="flex-1 relative overflow-hidden min-h-0 bg-background">
                            {isLoading ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
                              </div>
                            ) : (
                              <PromptEditor
                                value={localPrompt}
                                onChange={handlePromptChange}
                                disabled={isLoading || isSaving}
                              />
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="flex-1 relative overflow-hidden min-h-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
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
              )}
            </div>
          </Tabs>
        </div>

        {/* Painel lateral */}
        <div className="w-72 flex flex-col gap-3 flex-shrink-0 pr-1 pb-4">
          
          {/* Status da IA */}
          <Card className="p-4 border-sidebar-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Power className={`h-4 w-4 ${iaAtiva ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm">Status da IA</span>
              </div>
              <Badge 
                variant={iaAtiva ? "default" : "secondary"}
                className={iaAtiva ? "bg-green-500/20 text-green-600 border-green-500/30" : ""}
              >
                {iaAtiva ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {iaAtiva 
                ? "A IA responde automaticamente as mensagens dos leads no WhatsApp." 
                : "A IA está desativada. As mensagens não serão respondidas automaticamente."}
            </p>
            <div className="flex items-center gap-3">
              <Switch
                checked={iaAtiva}
                onCheckedChange={toggleIa}
                disabled={isTogglingIa || isLoading}
                id="toggle-ia"
              />
              <Label htmlFor="toggle-ia" className="text-sm cursor-pointer">
                {iaAtiva ? "Desativar IA" : "Ativar IA"}
              </Label>
            </div>
          </Card>

          {/* Config técnica */}
          <Card className="p-4 border-sidebar-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Configurações</span>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Modelo</span>
                <Badge variant="outline" className="font-mono text-xs">Grok-3-fast</Badge>
              </div>
              <div className="flex flex-col gap-1.5 pb-2">
                <span className="text-muted-foreground">Acúmulo de msgs (espera)</span>
                <select 
                  id="acumulo"
                  className="flex h-8 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={localAcumulo}
                  onChange={(e) => handleAcumuloChange(e.target.value)}
                  disabled={isLoading || isSaving}
                >
                  <option value="15" className="bg-background text-foreground">15 s</option>
                  <option value="30" className="bg-background text-foreground">30 s</option>
                  <option value="45" className="bg-background text-foreground">45 s</option>
                  <option value="60" className="bg-background text-foreground">60 s</option>
                  <option value="90" className="bg-background text-foreground">90 s</option>
                  <option value="120" className="bg-background text-foreground">120 s</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Delay entre msgs</span>
                <Badge variant="outline" className="font-mono text-xs">2-3s</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transcrição áudio</span>
                <Badge variant="outline" className="font-mono text-xs text-green-600">Whisper ✓</Badge>
              </div>
            </div>
          </Card>

          {/* Tools disponíveis */}
          <Card className="p-4 border-sidebar-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Ferramentas do Agente</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              O agente usa estas tools automaticamente durante a conversa:
            </p>
            <div className="space-y-3">
              {AI_TOOLS.map((tool) => (
                <div key={tool.name} className={`rounded-lg p-3 ${tool.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <tool.icon className={`h-3.5 w-3.5 ${tool.color}`} />
                    <span className={`text-xs font-semibold ${tool.color}`}>{tool.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Dica do prompt */}
          <Card className="p-4 border-sidebar-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Dicas do Prompt</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Use <code className="bg-muted px-1 rounded text-[10px]"># Seção</code> para organizar</li>
              <li>Defina claramente quando acionar a equipe</li>
              <li>Mencione os produtos/serviços que oferece</li>
              <li>Inclua restrições do que a IA <em>não</em> deve fazer</li>
              <li>O agente já conhece a data/hora atual automaticamente</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}