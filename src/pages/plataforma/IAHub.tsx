import { useNavigate } from "react-router-dom";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Search, Send, RefreshCw, Megaphone, Film, PenTool, Lock, BrainCircuit, ArrowRight } from "lucide-react";

const IA_LIST = [
  { id: 'preattendance', title: 'Pré-Atendimento', benefit: 'Zero lead perdido por demora na resposta', badge: 'Ativa 24h no WhatsApp', icon: Bot, requiredPlan: 'pca' },
  { id: 'objections', title: 'Objeções', benefit: 'Recepção nunca mais trava na hora que importa', badge: 'Na hora da objeção', icon: MessageSquare, requiredPlan: 'pca' },
  { id: 'analysis', title: 'Análise de Atendimento', benefit: 'Cada atendimento melhora com dados', badge: 'Diagnóstico de conversão', icon: Search, requiredPlan: 'pca' },
  { id: 'followup', title: 'Follow-Up', benefit: 'Zero lead esquecido no funil', badge: 'D+1, D+3, D+7', icon: Send, requiredPlan: 'pca' },
  { id: 'remarketing', title: 'Remarketing', benefit: 'Base inativa vira caixa todo mês', badge: 'Base antiga = dinheiro novo', icon: RefreshCw, requiredPlan: 'pca' },
  { id: 'campaign', title: 'Campanhas', benefit: 'Brief de anúncio pronto em minutos', badge: 'Exclusivo G.C.A.', icon: Megaphone, requiredPlan: 'gca' },
  { id: 'creative', title: 'Criativo', benefit: 'Roteiro de criativo pronto para gravar', badge: 'Exclusivo G.C.A.', icon: Film, requiredPlan: 'gca' },
  { id: 'content', title: 'Conteúdo', benefit: 'Calendário de conteúdo mensal por ICP', badge: 'Exclusivo G.C.A.', icon: PenTool, requiredPlan: 'gca' }
];

export default function IAHub() {
  const navigate = useNavigate();
  const { plan, isCerebroComplete, acesso } = usePlataforma();
  const iasLiberadas = acesso.ias_liberadas ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="space-y-4 border-b border-border pb-6">
        <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground font-serif">Stack de IA Comercial</h1>
        <p className="text-muted-foreground text-lg">{iasLiberadas.length} inteligência{iasLiberadas.length !== 1 ? 's artificiais' : ' artificial'} disponíve{iasLiberadas.length !== 1 ? 'is' : 'l'} para você.</p>
      </div>

      {/* AVISO CÉREBRO NÃO CONFIGURADO */}
      {!isCerebroComplete && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-amber-600 dark:text-amber-500">
              <BrainCircuit className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-lg leading-tight">Configure o Cérebro Central para personalizar as respostas das IAs</h3>
                <p className="text-sm opacity-90 mt-1">Gere saídas treinadas especificamente para seu ICP e Procedimentos.</p>
              </div>
            </div>
            <Button onClick={() => navigate('/plataforma/cerebro')} className="bg-amber-500 hover:bg-amber-600 text-white w-full md:w-auto shrink-0 font-bold tracking-wide">
              Configurar Agora <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* GRID DE IAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IA_LIST.map((ia) => {
          const Icon = ia.icon;
          const isLocked = !iasLiberadas.includes(ia.id);
          
          return (
            <Card key={ia.id} className={`border-border transition-all ${isLocked ? 'opacity-80' : 'hover:border-[#E85D24]/50 bg-card'}`}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between relative">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isLocked ? 'bg-muted text-muted-foreground' : 'bg-[#E85D24]/10 text-[#E85D24]'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className={`text-xl font-bold ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>{ia.title}</CardTitle>
                    <p className={`text-sm mt-1 mb-2 ${isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>{ia.benefit}</p>
                    <Badge variant="outline" className={`${isLocked ? 'border-amber-500/30 text-amber-500' : 'border-[#E85D24]/30 text-[#E85D24]'} bg-transparent font-semibold`}>
                      {isLocked && <Lock className="w-3 h-3 mr-1.5 inline" />} 
                      {ia.badge}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLocked ? (
                  <Button disabled variant="outline" className="w-full mt-2 font-bold cursor-not-allowed border-dashed bg-muted/50 text-muted-foreground">
                    <Lock className="w-4 h-4 mr-2" /> Não incluída no seu plano
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate(`/plataforma/ia-comercial/${ia.id}`)}
                    className="w-full mt-2 bg-[#E85D24] hover:bg-[#E85D24]/90 text-white font-bold"
                  >
                    Usar IA <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
