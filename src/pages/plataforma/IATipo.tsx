import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowLeft, Loader2, Copy, History, Sparkles, Save, Maximize2 } from "lucide-react";
import { toast } from "sonner"; // Using standard toast if sonner is available.
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IATipo() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cerebroData, acesso } = usePlataforma();

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<{id: string, input_prompt: string, output_response: string, created_at: string}[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  
  // Dynamic fields
  const [fields, setFields] = useState<any>({});

  // Save Modal
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveCategory, setSaveCategory] = useState("Outros");

  // Expand Modal
  const [expandModalOpen, setExpandModalOpen] = useState(false);

  // IA Config Dictionary
  const CONFIG: Record<string, any> = {
    preattendance: {
      name: 'IA Pré-Atendimento', benefit: 'Evitar que leads esfriem por dúvidas comuns.',
      howTo: 'Preencha sobre o procedimento e a dúvida do paciente. A IA irá formular uma resposta acolhedora baseada no seu FAQ.',
      promptTemplate: 'Você é especialista em atendimento clínico. Clínica: {CLINIC_DIFFERENTIALS}. Tom de voz: {VOICE_TONE}. Procedimento: {procedimento}. Dúvida do lead: {duvida}. Gere uma resposta impecável para Whatsapp.',
      inputs: [{ id: 'procedimento', label: 'Procedimento / Serviço' }, { id: 'duvida', label: 'Dúvida do lead', type: 'textarea' }]
    },
    objections: {
      name: 'IA Objeções', benefit: 'Quebrar barreiras sem dar desconto ou pressionar.',
      howTo: 'Apenas cole a resposta do paciente (ex: Tá muito caro, vou pensar) que iremos contornar com sua autoridade.',
      promptTemplate: 'Você é especialista em vendas consultivas para clínicas de saúde.\nO profissional tem o seguinte perfil de clínica: {CLINIC_DIFFERENTIALS}.\nProcedimento âncora: {ANCHOR}.\nTom de voz: {VOICE_TONE}.\nO paciente disse a seguinte objeção: {input}\nGere uma resposta de alta conversão para Whatsapp sem dar desconto e sem pressionar, usando linguagem de autoridade.',
      inputs: [{ id: 'input', label: 'Cole a objeção que recebeu', type: 'textarea' }]
    },
    analysis: {
      name: 'IA Análise de Atendimento', benefit: 'Diagnosticar erros na venda.',
      howTo: 'Cole o roteiro da conversa crua do seu WhatsApp comercial. Nossas IAs vão apontar as rupturas.',
      promptTemplate: 'Você analisa atendimentos comerciais de clínicas de saúde.\nTom de voz ideal da clínica: {VOICE_TONE}.\nAnalise o atendimento abaixo e identifique:\n1) Os 3 pontos de ruptura,\n2) Em qual momento o lead esfriou,\n3) O que deveria ter sido dito diferente,\n4) Plano de melhoria para o próximo atendimento.\n\nAtendimento:\n{input}',
      inputs: [{ id: 'input', label: 'Cole o texto do atendimento', type: 'textarea' }]
    },
    followup: {
      name: 'IA Follow-Up', benefit: 'Reaquecer contatos que visualizaram e não responderam.',
      howTo: 'Descreva a etapa (D+1, etc), procedimento base e o contexto do lead.',
      promptTemplate: 'Gere uma mensagem de follow-up para WhatsApp de uma clínica de saúde.\nProcedimento: {procedimento}.\nEtapa: {etapa}.\nPerfil do lead: {perfil}.\nDiferenciais da Clínica: {CLINIC_DIFFERENTIALS}.\nA mensagem não pode parecer spam. Deve ser natural, conversacional, personalizada com tom {VOICE_TONE} e conduzir ao próximo passo sem ser óbvio.',
      inputs: [{ id: 'procedimento', label: 'Procedimento Negociado' }, { id: 'etapa', label: 'Etapa (Ex: Dia 1, Dia 3, etc.)' }, { id: 'perfil', label: 'Contexto / Perfil do Lead' }]
    },
    remarketing: {
      name: 'IA Remarketing', benefit: 'Fazer caixa rápido com pessoas da base.',
      howTo: 'Defina quão inativo está o lead e o procedimento alvo.',
      promptTemplate: 'Você deve criar um roteiro de abordagem de remarketing humanizado para ex-pacientes ou leads inativos.\nInatividade: {inatividade}.\nProcedimento ofertado: {procedimento}.\nPerfil/Público ICP: {perfil}.\nTom de voz: {VOICE_TONE}.\nAja de modo orgânico como se a clínica lembrasse com carinho deste perfil, oferecendo uma novidade sutil.',
      inputs: [{ id: 'inatividade', label: 'Tempo de Inatividade (Ex: 6 meses)' }, { id: 'procedimento', label: 'Procedimento / Novidade' }, { id: 'perfil', label: 'Como era esse ICP?' }]
    },
    campaign: {
      name: 'IA Briefing Campanhas', benefit: 'Criar direcionadores práticos de anúncios.',
      howTo: 'Preencha o que quer rodar no tráfego pago.',
      promptTemplate: 'Crie um briefing técnico de anúncios (Facebook/Instagram Ads) para uma clínica de saúde.\nProcedimento alvo: {procedimento}.\nObjetivo: {objetivo}.\nVerba de Guerra: {verba}.\nLeve em consideração o Perfil (ICP): {ICP_PROFILE}.\nGere 3 ideias de ângulos e configurações.',
      inputs: [{ id: 'procedimento', label: 'Procedimento alvo' }, { id: 'objetivo', label: 'Objetivo da Campanha' }, { id: 'verba', label: 'Verba Aproximada' }]
    },
    creative: {
      name: 'IA Roteirista Criativo', benefit: 'Gerar textos diretos pro Reel ou Foto.',
      howTo: 'Idealize qual procedimento quer focar para gravar conteúdo.',
      promptTemplate: 'Escreva um roteiro altamente retentor para um {formato} nas redes sociais da clínica.\nProcedimento em foco: {procedimento}.\nICP/Avatar: {ICP_PROFILE}.\nMedos que o ICP possui e devemos quebrar: {ICP_FEARS}.\nTraga Gancho (3s), Retenção, Corpo do Valor e um CTA invisível.',
      inputs: [{ id: 'procedimento', label: 'Procedimento Focado' }, { id: 'formato', label: 'Formato (ex: Reels falado, Carrossel, Storie)' }]
    },
    content: {
      name: 'IA Estratégia de Conteúdo', benefit: 'Calendário com linhas finas e persuasividade.',
      howTo: 'Deixe a IA montar seu funil orgânico (TOFU, MOFU, BOFU).',
      promptTemplate: 'Baseado no especialista clínico atuando focado em {procedimento}, gere uma pauta / grade de conteúdo para o período de {periodo}.\nDiferenciais da pessoa: {CLINIC_DIFFERENTIALS}.\nFaça mix de Prova, Educação, Quebra de Objeção e Entretenimento Técnico. Tom de voz {VOICE_TONE}.',
      inputs: [{ id: 'procedimento', label: 'Procedimentos Alvo do mix' }, { id: 'periodo', label: 'Período (Ex: 1 semana, 1 mês)' }]
    }
  };

  const iaConfig = CONFIG[tipo || ''] || CONFIG['objections'];
  const iasLiberadas = acesso.ias_liberadas ?? [];
  const iaLiberada = !tipo || iasLiberadas.includes(tipo);

  useEffect(() => {
    async function loadHistory() {
      if (!user || !tipo) return;
      const { data, error } = await supabase
        .from('platform_ia_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('ia_type', tipo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setHistory(data);
      }
      setLoadingHistory(false);
    }
    loadHistory();
    
    // Load persisted state for this specific IA
    if (user && tipo) {
      const storageKey = `ia_state_${user.id}_${tipo}`;
      try {
        const savedFields = localStorage.getItem(storageKey + '_fields');
        setFields(savedFields ? JSON.parse(savedFields) : {});
        
        const savedOutput = localStorage.getItem(storageKey + '_output');
        setOutput(savedOutput || "");
      } catch {
        setFields({});
        setOutput("");
      }
    }
  }, [tipo, user]);

  // Save state on change
  useEffect(() => {
    if (user && tipo && (Object.keys(fields).length > 0 || output)) {
      const storageKey = `ia_state_${user.id}_${tipo}`;
      localStorage.setItem(storageKey + '_fields', JSON.stringify(fields));
      localStorage.setItem(storageKey + '_output', output);
    } else if (user && tipo && Object.keys(fields).length === 0 && !output) {
      // Clear storage if user clicks "Nova Consulta"
      const storageKey = `ia_state_${user.id}_${tipo}`;
      localStorage.removeItem(storageKey + '_fields');
      localStorage.removeItem(storageKey + '_output');
    }
  }, [fields, output, tipo, user]);

  const replaceVariables = (template: string) => {
    let prompt = template;
    
    // Injete Cérebro
    prompt = prompt.replace(/{CLINIC_DIFFERENTIALS}/g, cerebroData?.differentials || 'Excelência e resultado em saúde.');
    prompt = prompt.replace(/{ANCHOR}/g, cerebroData?.anchor_procedure || 'Procedimento Ouro');
    prompt = prompt.replace(/{VOICE_TONE}/g, cerebroData?.voice_tone || 'Sério e Profissional');
    
    const icpAgeStr = cerebroData?.icp?.age ? `Idade: ${cerebroData.icp.age}` : '';
    const icpMotiv = cerebroData?.icp?.motivations ? `Desejos: ${cerebroData.icp.motivations}` : '';
    const icpFears = cerebroData?.icp?.fears || 'Dor, frustração ou preço';
    prompt = prompt.replace(/{ICP_PROFILE}/g, `${icpAgeStr} ${icpMotiv}`);
    prompt = prompt.replace(/{ICP_FEARS}/g, icpFears);

    // Injete Inputs do user
    iaConfig.inputs.forEach((inputDef: any) => {
      const regex = new RegExp(`{${inputDef.id}}`, 'g');
      prompt = prompt.replace(regex, fields[inputDef.id] || '(Não informado)');
    });

    return prompt;
  };

  const handleGenerate = async () => {
    // Basic validation
    const missing = iaConfig.inputs.find((i:any) => !fields[i.id]);
    if (missing) {
      toast.error(`O campo ${missing.label} é muito importante!`);
      return;
    }

    setGenerating(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");

      // Invoca a nossa Edge Function do xAI Grok Proxy
      const { data, error } = await supabase.functions.invoke('ia-proxy', {
        body: {
           ia_type: tipo,
           input_data: fields,
           user_id: user.id
        }
      });
      
      if (error) {
        console.error('Erro na Edge Function:', error);
        if (error.message?.includes('401')) {
          throw new Error("Erro de Autenticação (401): A função ia-proxy pode estar sem permissão ou não foi deployada corretamente com CORS.");
        }
        throw new Error(error.message || "Erro ao chamar a IA");
      }
      
      if (data && data.text) {
         setOutput(data.text);
         
         // Atualiza o histórico local para mostrar imediatamente (já foi salvo real pela cloud function)
         const inputSummary = JSON.stringify(fields).substring(0, 50) + "...";
         const newHist = {
           id: Math.random().toString(), // fake ID para render local até o re-fetch
           user_id: user.id,
           ia_type: tipo || 'geral',
           input_prompt: inputSummary,
           output_response: data.text,
           created_at: new Date().toISOString()
         };
         setHistory(prev => [newHist, ...prev].slice(0, 5));
      } else {
         throw new Error("A IA não retornou nenhum texto.");
      }
    } catch (e: any) {
      console.error("Erro na Geração: ", e);
      toast.error("Houve um erro na geração: " + (e.message || "Tente novamente."));
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenSaveModal = () => {
       const initialTitle = typeof fields === 'object' && Object.values(fields).length > 0 
           ? String(Object.values(fields)[0]).substring(0, 30) 
           : "Material Gerado";
       setSaveTitle(`${iaConfig.name} - ${initialTitle}`);
       setSaveCategory("Outros");
       setSaveModalOpen(true);
  };

  const handleConfirmSaveMaterial = async () => {
    if (!output || !user || !saveTitle) return;
    try {
       const { error } = await supabase.from('platform_materiais').insert({
          user_id: user.id,
          title: saveTitle,
          category: saveCategory,
          type: 'Documento', // It can be 'Documento' since it's a general text output
          content: output,
          created_at: new Date().toISOString() // Assuming the schema has created_at
       });
       if (error) throw error;
       toast.success("Salvo com sucesso nos Meus Materiais!");
       setSaveModalOpen(false);
    } catch(err: any) {
       toast.error("Erro ao salvar: " + err.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    toast("Copiado com sucesso! ✅");
  };

  const handleLoadHistory = (h: any) => {
    setOutput(h.output_response);
    toast("Membro do Histórico Carregado.");
  };

  // Guard: verificar se a IA está liberada no produto
  if (!iaLiberada) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">IA não disponível</h2>
        <p className="text-muted-foreground">Esta IA não está incluída no seu plano atual.</p>
        <Button variant="outline" onClick={() => navigate('/plataforma/ia-comercial')}>
          Voltar para IAs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-100px)] pb-12 flex flex-col pt-4">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted p-2" onClick={() => navigate('/plataforma/ia-comercial')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
             <Bot className="w-6 h-6 text-[#E85D24]" /> {iaConfig.name}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">{iaConfig.benefit}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* COLUNA ESQUERDA - HISTÓRICO & INSTRUÇÕES (35%) */}
        <div className="w-full lg:w-[35%] border border-border rounded-xl bg-card flex flex-col shadow-sm sticky top-4 h-fit">
          <div className="p-6 border-b border-border space-y-4 shrink-0 bg-background/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Como usar essa IA:</h3>
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">{iaConfig.howTo}</p>
            </div>
            {!cerebroData?.differentials && (
              <Badge variant="destructive" className="w-full justify-center">⚠ Cérebro Central Incompleto - Respostas podem estar genéricas</Badge>
            )}
          </div>
          
          <div className="p-6 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico Recente
            </h3>
            {loadingHistory ? (
              <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin opacity-50" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/50 p-4 rounded-lg text-center border border-dashed border-border text-xs">Nenhuma consulta realizada ainda.</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} onClick={() => handleLoadHistory(h)} className="border border-border bg-background p-3 rounded-xl cursor-pointer hover:border-[#E85D24]/50 transition-colors group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E85D24] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] text-muted-foreground font-mono mb-1">{new Date(h.created_at).toLocaleString()}</p>
                    <p className="text-xs text-foreground font-medium line-clamp-2 truncate">{h.input_prompt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA - PROMPT E OUTPUT (65%) */}
        <div className="flex-1 flex flex-col space-y-6">
          
          {/* AREA INPUT */}
          <Card className="border-border grid shadow-sm border-t-4 border-t-[#E85D24]">
             <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E85D24]" /> Contexto de Geração
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-5">
                {iaConfig.inputs.map((inp: any) => (
                  <div key={inp.id} className="space-y-2">
                    <label className="text-sm font-semibold text-foreground/80 pl-1 uppercase text-[11px] tracking-wider">{inp.label}</label>
                    {inp.type === 'textarea' ? (
                      <Textarea 
                        className="bg-background border-border min-h-[100px] text-sm resize-y" 
                        value={fields[inp.id] || ''} 
                        onChange={e => setFields({...fields, [inp.id]: e.target.value})} 
                        placeholder={inp.label}
                      />
                    ) : (
                      <Input 
                        className="bg-background border-border" 
                        value={fields[inp.id] || ''} 
                        onChange={e => setFields({...fields, [inp.id]: e.target.value})}
                        placeholder={`Digite: ${inp.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center">
                  <Button 
                    onClick={handleGenerate} 
                    disabled={generating} 
                    className="w-full sm:w-auto bg-[#E85D24] hover:bg-[#E85D24]/90 text-white font-bold tracking-wide min-w-[200px]"
                    size="lg"
                  >
                    {generating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando Inteligência...</> : 'Gerar Resposta com IA'}
                  </Button>
                  <Button variant="ghost" onClick={() => {setFields({}); setOutput("");}} className="text-muted-foreground w-full sm:w-auto">Nova Consulta</Button>
                </div>
             </CardContent>
          </Card>

          {/* AREA OUTPUT */}
          {output && (
            <Card className="border-emerald-500/30 bg-card overflow-hidden shadow-sm relative pt-4">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-[#E85D24]" />
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-foreground text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resposta da Máquina</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExpandModalOpen(true)} className="h-8 border-border hover:bg-muted font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    <Maximize2 className="w-4 h-4 mr-2" /> Expandir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenSaveModal} className="h-8 border-border hover:bg-muted font-semibold text-[#E85D24] hover:text-[#E85D24]">
                    <Save className="w-4 h-4 mr-2" /> Salvar Material
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 border-border hover:bg-muted font-semibold">
                    <Copy className="w-4 h-4 mr-2" /> Copiar Texto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-background border border-border rounded-xl p-5 md:p-6 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                  {output}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Salvar como Material</DialogTitle>
            <DialogDescription>
              Guarde este conteúdo no seu repositório de Meus Materiais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground text-xs uppercase tracking-wider">Título do Material</label>
              <Input 
                value={saveTitle} 
                onChange={(e) => setSaveTitle(e.target.value)} 
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground text-xs uppercase tracking-wider">Categoria</label>
              <Select value={saveCategory} onValueChange={setSaveCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="ICP">ICP / Persona</SelectItem>
                  <SelectItem value="Oferta">Oferta</SelectItem>
                  <SelectItem value="Script">Script de Venda</SelectItem>
                  <SelectItem value="Campanha">Campanha Ads</SelectItem>
                  <SelectItem value="Criativo">Conteúdo / Criativo</SelectItem>
                  <SelectItem value="Análise">Análise</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSaveMaterial} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90 font-bold">Salvar e Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expand Modal */}
      <Dialog open={expandModalOpen} onOpenChange={setExpandModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col border-border bg-card">
          <DialogHeader className="shrink-0 border-b border-border pb-4">
            <DialogTitle className="text-foreground text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#E85D24]" /> Resposta Expandida da IA
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-border">
            <div className="bg-background border border-border rounded-xl p-6 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {output}
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-4 border-t border-border flex justify-between sm:justify-between items-center w-full">
            <Button variant="outline" onClick={copyToClipboard} className="font-semibold">
              <Copy className="w-4 h-4 mr-2" /> Copiar Texto
            </Button>
            <Button onClick={() => setExpandModalOpen(false)} className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90 font-bold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
