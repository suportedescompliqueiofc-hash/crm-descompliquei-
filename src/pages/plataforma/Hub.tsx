import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, Brain, Zap, Calendar, BarChart, TrendingUp, CheckCircle2, ArrowRight, X } from "lucide-react";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { supabase } from "@/integrations/supabase/client";

// Fases da Rota de Resultado
const FASES = [
  { id: 1, name: "Diagnóstico e Configuração Inicial", threshold: 10, mark: "" },
  { id: 2, name: "Cérebro Central + Quick Win", threshold: 25, mark: "" },
  { id: 3, name: "Fundação Clínica", threshold: 40, mark: "✅ Clínica Estruturada" },
  { id: 4, name: "IA de Pré-Atendimento", threshold: 55, mark: "✅ Operação 24h Ativa" },
  { id: 5, name: "Motor de Demanda", threshold: 70, mark: "✅ Máquina de Leads Ligada" },
  { id: 6, name: "Motor Comercial", threshold: 85, mark: "✅ Funil Comercial Operando" },
  { id: 7, name: "Operação e Escala", threshold: 100, mark: "✅ Clínica em Comando" },
];

export default function Hub() {
  const { plataformaUser, plan, isCerebroComplete, cerebroPercent, totalModules, completedModules, progressPercent, progress, isContextLoading, acesso } = usePlataforma();
  const navigate = useNavigate();
  const [nextModule, setNextModule] = useState<any>(null);
  const [isLoadingModule, setIsLoadingModule] = useState(true);
  const [hideCerebroBanner, setHideCerebroBanner] = useState(() => sessionStorage.getItem('hideCerebroBanner') === 'true');

  useEffect(() => {
    // Só busca o próximo módulo quando o contexto já carregou
    if (isContextLoading) return;

    async function fetchNextModule() {
      const completedIds = progress.filter(p => p.completed).map(p => p.module_id);
      
      let query = supabase.from('platform_modules')
        .select('*')
        .order('order_index', { ascending: true })
        .limit(1);

      if (completedIds.length > 0) {
        query = query.not('id', 'in', `(${completedIds.join(',')})`);
      }

      if (plan === 'pca') {
        query = query.eq('min_plan', 'pca');
      }

      const { data } = await query.maybeSingle();
      if (data) setNextModule(data);
      setIsLoadingModule(false);
    }
    fetchNextModule();
  }, [progress, plan, isContextLoading]);


  // Calcular fase atual
  const currentPhaseIndex = FASES.findIndex(f => progressPercent <= f.threshold);
  const activePhase = currentPhaseIndex === -1 ? FASES.length : (progressPercent === 0 ? 1 : FASES[currentPhaseIndex].id);

  // Mensagem contextual
  const temTrilha = (acesso.pilares_liberados?.length ?? 0) > 0;
  const temIAs = acesso.acesso_ia_comercial || (acesso.ias_liberadas?.length ?? 0) > 0;
  const temCerebro = acesso.acesso_cerebro;
  const temSessoes = acesso.acesso_sessoes_taticas;
  const temCRM = acesso.acesso_crm;

  let greetingMsg = "Pronto para estruturar sua máquina de atração?";
  if (progressPercent >= 100) greetingMsg = "Parabéns! Sua máquina está completamente implementada.";
  else if (progressPercent > 80) greetingMsg = "Você está quase na escala final!";
  else if (progressPercent > 40) greetingMsg = "Sua máquina de vendas está tomando forma.";

  const handleDismissBanner = () => {
    sessionStorage.setItem('hideCerebroBanner', 'true');
    setHideCerebroBanner(true);
  };

  if (isContextLoading || !plataformaUser) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col mb-8">
          <Skeleton className="h-10 w-1/3 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <div className="mt-8">
           <Skeleton className="h-8 w-1/4 mb-4" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* BANNER AVISO CÉREBRO */}
      {temCerebro && !isCerebroComplete && !hideCerebroBanner && (
        <div className="bg-amber-500 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md bg-gradient-to-r from-amber-500 to-amber-600 relative pr-10">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 shrink-0" />
            <p className="font-bold text-sm">Configure o Cérebro Central para personalizar as IAs à sua especialidade.</p>
          </div>
          <Button onClick={() => navigate('/plataforma/cerebro')} variant="secondary" size="sm" className="bg-white/20 text-white border-white/30 hover:bg-white flex-shrink-0 hover:text-amber-600 font-bold w-full sm:w-auto">Configurar Agora</Button>
          <button onClick={handleDismissBanner} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* SEÇÃO 1 - BOAS VINDAS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground font-serif">
               Hub de Gestão Comercial
            </h1>
            <Badge className="bg-[#E85D24] text-white hover:bg-[#E85D24]/90 text-sm py-1 px-3">
              {plan?.toUpperCase() || 'P.C.A.'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">Olá, {plataformaUser?.clinic_name || "Clínica"}! {greetingMsg}</p>
        </div>
      </div>

      {/* SEÇÃO 2 - BARRA DE PROGRESSO */}
      {temTrilha && <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-card-foreground text-lg">Rota de Resultado</CardTitle>
          <CardDescription>Acompanhe sua evolução na Trilha C.L.A.R.O.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex justify-between items-center w-full mt-6 mb-16 hidden md:flex">
             {/* Linha de fundo */}
            <div className="absolute top-4 left-0 w-full h-[2px] bg-border z-0" />
            <div 
              className="absolute top-4 left-0 h-[2px] bg-[#E85D24] z-0 transition-all duration-500" 
              style={{ width: `${Math.max(0, Math.min(100, (activePhase - 1) * (100 / (FASES.length - 1))))}%` }}
            />
            {FASES.map((fase) => {
              const isPast = fase.id < activePhase;
              const isActive = fase.id === activePhase;
              const isFuture = fase.id > activePhase;
              
              return (
                <div key={fase.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                    ${isPast ? 'bg-[#E85D24] border-[#E85D24] text-white scale-105' : ''}
                    ${isActive ? 'bg-background border-[#E85D24] text-[#E85D24] animate-pulse ring-4 ring-[#E85D24]/30 shadow-[0_0_15px_rgba(232,93,36,0.3)] scale-110' : ''}
                    ${isFuture ? 'bg-background border-border text-muted-foreground' : ''}
                  `}>
                    {isPast ? <CheckCircle2 className="w-5 h-5 text-white" /> : fase.id}
                  </div>
                  <div className="text-center absolute top-12 w-28">
                    <p className={`text-[11px] font-semibold leading-tight ${isPast || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {fase.name}
                      {fase.id === 2 && <Zap className="w-3 h-3 inline ml-1 text-amber-500 fill-amber-500" />}
                    </p>
                    {isPast && fase.mark && (
                      <p className="text-[9px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded uppercase mt-1.5 animate-in zoom-in-0 duration-500 border border-emerald-500/20 inline-block">
                        {fase.mark}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute -top-7 whitespace-nowrap bg-[#E85D24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-in slide-in-from-bottom-2 duration-500">
                      VOCÊ ESTÁ AQUI ↓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-sm md:hidden text-foreground font-medium">
             Fase Atual: {FASES[Math.min(activePhase - 1, FASES.length - 1)]?.name}
          </div>
        </CardContent>
      </Card>}

      {/* SEÇÃO 3 - PRÓXIMO PASSO OU START */}
      {temTrilha && nextModule ? (
        <Card className="border-[#E85D24]/30 bg-gradient-to-r from-card to-[#E85D24]/5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E85D24]" />
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge variant="outline" className="text-[#E85D24] border-[#E85D24] uppercase text-[10px] tracking-wider mb-2 font-bold">
                {progressPercent === 0 ? 'START INICIAL ➔' : 'PRÓXIMO PASSO ➔'}
              </Badge>
              <h2 className="text-2xl font-bold text-foreground leading-tight">{progressPercent === 0 ? 'Comece construindo sua Fundação' : nextModule.title}</h2>
              <p className="text-muted-foreground">{progressPercent === 0 ? 'Acesse a Trilha C.L.A.R.O. e construa o pilar 1 da sua estrutura comercial.' : nextModule.description}</p>
            </div>
            <Button 
              size="lg" 
              className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white min-w-[200px] shrink-0"
              onClick={() => navigate(`/plataforma/trilha/${progressPercent === 0 ? nextModule.id : nextModule.id}`)}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {progressPercent === 0 ? 'Dar o Primeiro Passo' : 'Continuar Trilha'}
            </Button>
          </CardContent>
        </Card>
      ) : temTrilha && progressPercent >= 100 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
           <CheckCircle2 className="w-8 h-8 shrink-0" />
           <div>
             <h3 className="font-bold text-lg">Trilha 100% Concluída!</h3>
             <p className="text-sm">Você absorveu todo o conteúdo base. Seu desafio agora é colocar a constância no Tráfego e no CRM.</p>
           </div>
        </div>
      ) : null}

      {/* SEÇÃO 4 - FERRAMENTAS */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">Ferramentas de Gestão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Trilha C.L.A.R.O. */}
          {temTrilha && (
            <Card className="border-border bg-card hover:border-[#E85D24]/50 transition-colors cursor-pointer group" onClick={() => navigate('/plataforma/trilha')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{completedModules}/{totalModules} módulos</span>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">Trilha C.L.A.R.O.</CardTitle>
                <Progress value={progressPercent} className="h-1.5 mb-4 bg-muted" />
                <Button variant="ghost" className="w-full text-[#E85D24] hover:text-[#E85D24] hover:bg-[#E85D24]/10 group-hover:bg-[#E85D24]/10">
                  Acessar Trilha <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Cérebro Central */}
          {temCerebro && (
            <Card className="border-border bg-card hover:border-[#E85D24]/50 transition-colors cursor-pointer group" onClick={() => navigate('/plataforma/cerebro')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <Brain className="w-5 h-5" />
                </div>
                {cerebroPercent >= 100 ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-transparent">100% Configurado</Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-transparent">{cerebroPercent}% Configurado</Badge>
                )}
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">Cérebro Central</CardTitle>
                <Progress value={cerebroPercent} className="h-1.5 mb-2 bg-muted" />
                <p className="text-sm text-muted-foreground mb-4">Inteligência base da sua unidade</p>
                <Button variant="ghost" className="w-full text-[#E85D24] hover:text-[#E85D24] hover:bg-[#E85D24]/10 group-hover:bg-[#E85D24]/10">
                  {cerebroPercent >= 100 ? 'Ver Configuração' : 'Continuar Configuração'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* IAs Comerciais */}
          {temIAs && (
            <Card className="border-border bg-card hover:border-[#E85D24]/50 transition-colors cursor-pointer group" onClick={() => navigate('/plataforma/ia-comercial')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <Zap className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">IAs Comerciais</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  {acesso.ias_liberadas?.length || 0} IAs Especialistas disponíveis
                </p>
                <Button variant="ghost" className="w-full text-[#E85D24] hover:text-[#E85D24] hover:bg-[#E85D24]/10 group-hover:bg-[#E85D24]/10">
                  Acessar IAs <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sessões Táticas */}
          {temSessoes && (
            <Card className="border-border bg-card hover:border-[#E85D24]/50 transition-colors cursor-pointer group" onClick={() => navigate('/plataforma/sessoes-taticas')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">Sessões Táticas</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">Acesse as mentorias semanais</p>
                <Button variant="ghost" className="w-full text-[#E85D24] hover:text-[#E85D24] hover:bg-[#E85D24]/10 group-hover:bg-[#E85D24]/10">
                  Ver Sessões <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* CRM e Funil */}
          {temCRM && (
            <Card className="border-[#E85D24]/30 bg-card hover:border-[#E85D24]/60 transition-colors cursor-pointer group" onClick={() => window.open('/crm/pipeline', '_blank', 'noopener,noreferrer')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <BarChart className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">CRM e Funil</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">Gerencie seus leads e funil comercial</p>
                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); window.open('/crm/pipeline', '_blank', 'noopener,noreferrer'); }} className="w-full text-white hover:text-white bg-[#E85D24]/80 hover:bg-[#E85D24] group-hover:bg-[#E85D24]">
                  Acessar Pipeline <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Painel de Métricas */}
          {temCRM && (
            <Card className="border-border bg-card hover:border-[#E85D24]/50 transition-colors cursor-pointer group" onClick={() => window.open('/crm', '_blank', 'noopener,noreferrer')}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#E85D24]/10 flex items-center justify-center text-[#E85D24] group-hover:bg-[#E85D24]/20 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-foreground mb-2">Painel de Métricas</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">Veja o desempenho da sua clínica</p>
                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); window.open('/crm', '_blank', 'noopener,noreferrer'); }} className="w-full text-[#E85D24] hover:text-[#E85D24] hover:bg-[#E85D24]/10 group-hover:bg-[#E85D24]/10">
                  Ver Painel <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
