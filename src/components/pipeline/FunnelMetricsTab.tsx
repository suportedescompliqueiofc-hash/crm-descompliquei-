import { useFunnelMetrics } from "@/hooks/useFunnelMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { AlertCircle, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { glassCardClass } from "@/components/charts/ChartTheme";

interface FunnelMetricsTabProps {
  dateRange: DateRange | undefined;
}

export function FunnelMetricsTab({ dateRange }: FunnelMetricsTabProps) {
  const { data: funnelData, isLoading, error } = useFunnelMetrics(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !funnelData || funnelData.length === 0) {
    return (
      <Card className={cn(glassCardClass, "border-dashed border-2")}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Dados Insuficientes</h3>
          <p className="text-muted-foreground max-w-sm">
            Não foi possível carregar as etapas do funil padrão.
          </p>
        </CardContent>
      </Card>
    );
  }

  const topCount = funnelData[0]?.count || 1; 

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Visual do Funil - Glass Effect */}
        <Card className={cn(glassCardClass, "lg:col-span-2")}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Fluxo de Conversão Real</CardTitle>
            <CardDescription>Visualização acumulada do volume de leads por etapa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {funnelData.map((step, index) => {
              const isLast = index === funnelData.length - 1;
              const widthPercentage = Math.max((step.count / topCount) * 100, 2); 
              
              return (
                <div key={step.stageId || index} className="relative group">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-36 flex-shrink-0 text-sm font-medium text-right truncate text-muted-foreground group-hover:text-foreground transition-colors" title={step.stageName}>
                      {step.stageName}
                    </div>
                    
                    {/* Barra Estilo "Beam" */}
                    <div className="flex-1 h-12 bg-muted/20 rounded-r-2xl relative flex items-center group-hover:bg-muted/30 transition-colors overflow-hidden backdrop-blur-sm border border-white/5">
                      <div 
                        className="h-full rounded-r-2xl flex items-center justify-end pr-4 transition-all duration-1000 ease-out text-white font-bold text-sm shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                        style={{ 
                          width: `${widthPercentage}%`, 
                          backgroundColor: step.color,
                          boxShadow: `0 0 20px -5px ${step.color}` // Glow effect
                        }}
                      >
                        <span className="drop-shadow-md text-lg">{step.count}</span>
                      </div>
                    </div>

                    <div className="w-24 flex-shrink-0 text-xs text-muted-foreground text-right font-mono">
                      {step.conversionFromStart.toFixed(1)}%
                    </div>
                  </div>

                  {/* Conector Visual */}
                  {!isLast && (
                    <div className="flex items-center gap-4 h-6 -my-1">
                      <div className="w-36"></div>
                      <div className="flex-1 pl-4 flex items-center relative">
                        <div className="absolute left-[2px] top-0 bottom-0 w-px border-l border-dashed border-border/50"></div>
                        
                        {/* Tag de Conversão Flutuante */}
                        <div className={cn(
                          "ml-6 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md shadow-sm border",
                          step.conversionToNext >= 50 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        )}>
                          {step.conversionToNext >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {step.conversionToNext.toFixed(0)}%
                        </div>
                        
                        <div className="ml-auto text-[10px] text-muted-foreground/60 mr-24">
                          {step.dropoffCount > 0 && (
                            <span className="text-red-400 font-medium">-{step.dropoffCount} pararam</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* KPIs Laterais - Bento Stack */}
        <div className="space-y-6">
          <Card className={glassCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Eficiência Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-extrabold text-foreground tracking-tighter bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                {funnelData[funnelData.length - 1]?.conversionFromStart.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dos {topCount} leads iniciais, {funnelData[funnelData.length - 1]?.count} fecharam negócio.
              </p>
              <Progress value={funnelData[funnelData.length - 1]?.conversionFromStart} className="h-3 mt-4 rounded-full" />
            </CardContent>
          </Card>

          <Card className={glassCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Maior Gargalo</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const biggestDrop = [...funnelData].slice(0, -1).sort((a, b) => b.dropoffCount - a.dropoffCount)[0];
                if (!biggestDrop || biggestDrop.dropoffCount === 0) return <p className="text-sm text-muted-foreground">Sem perdas significativas</p>;

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: biggestDrop.color }} />
                      <span className="font-bold text-lg">{biggestDrop.stageName}</span>
                    </div>
                    <div className="text-3xl font-bold text-red-500">
                      -{biggestDrop.dropoffCount} leads
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estagnaram nesta etapa.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border border-blue-500/20 rounded-[24px]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Filter className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400">Visão Padrão</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Exibindo apenas o fluxo ideal de 6 etapas. Leads em etapas de "Perda" não são removidos dos contadores anteriores.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}