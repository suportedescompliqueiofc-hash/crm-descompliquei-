import { useFunnelMetrics, FunnelStep } from "@/hooks/useFunnelMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { ArrowDown, AlertCircle, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FunnelMetricsTabProps {
  dateRange: DateRange | undefined;
}

export function FunnelMetricsTab({ dateRange }: FunnelMetricsTabProps) {
  const { data: funnelData, isLoading, error } = useFunnelMetrics(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !funnelData || funnelData.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Dados Insuficientes</h3>
          <p className="text-muted-foreground">Não há histórico de movimentação suficiente para o período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  const topCount = funnelData[0]?.count || 1; // Evita divisão por zero

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Visual do Funil */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Conversão Real</CardTitle>
            <CardDescription>Visualização acumulada do volume de leads por etapa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {funnelData.map((step, index) => {
              const isLast = index === funnelData.length - 1;
              // Largura da barra baseada na % relativa ao topo do funil
              const widthPercentage = Math.max((step.count / topCount) * 100, 2); 
              
              return (
                <div key={step.stageId} className="relative group">
                  <div className="flex items-center gap-4 mb-1">
                    <div className="w-32 flex-shrink-0 text-sm font-medium text-right truncate" title={step.stageName}>
                      {step.stageName}
                    </div>
                    
                    <div className="flex-1 h-10 bg-muted/30 rounded-r-lg relative flex items-center group-hover:bg-muted/50 transition-colors">
                      <div 
                        className="h-full rounded-r-lg flex items-center justify-end pr-3 transition-all duration-500 ease-out text-white font-bold text-sm shadow-sm"
                        style={{ 
                          width: `${widthPercentage}%`, 
                          backgroundColor: step.color 
                        }}
                      >
                        {step.count}
                      </div>
                    </div>

                    <div className="w-24 flex-shrink-0 text-xs text-muted-foreground text-right">
                      {step.conversionFromStart.toFixed(1)}% do total
                    </div>
                  </div>

                  {/* Conector Visual e Taxa de Conversão para a próxima etapa */}
                  {!isLast && (
                    <div className="flex items-center gap-4 h-8">
                      <div className="w-32"></div> {/* Spacer */}
                      <div className="flex-1 pl-4 flex items-center">
                        <div className="h-full w-px border-l border-dashed border-border ml-[2px]"></div>
                        <div className={cn(
                          "ml-4 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                          step.conversionToNext >= 50 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {step.conversionToNext >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {step.conversionToNext.toFixed(0)}% conversão
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground mr-24">
                          <span className="text-red-500 font-medium">-{step.dropoffCount}</span> perdidos
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* KPIs Laterais */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eficiência Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {funnelData[funnelData.length - 1]?.conversionFromStart.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dos {topCount} leads iniciais, {funnelData[funnelData.length - 1]?.count} fecharam negócio.
              </p>
              <Progress value={funnelData[funnelData.length - 1]?.conversionFromStart} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Maior Ponto de Perda</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Encontra a etapa com maior dropoff absoluto (excluindo a última)
                const biggestDrop = [...funnelData].slice(0, -1).sort((a, b) => b.dropoffCount - a.dropoffCount)[0];
                if (!biggestDrop) return <p className="text-sm">Dados insuficientes</p>;

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: biggestDrop.color }} />
                      <span className="font-semibold">{biggestDrop.stageName}</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      -{biggestDrop.dropoffCount} leads
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pararam nesta etapa e não avançaram.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Filter className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-primary">Análise de Comportamento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estes dados mostram o fluxo <strong>acumulado</strong>. Se um lead avançou da etapa 1 para a 3, ele é contabilizado como tendo passado pela 2, garantindo a integridade da conversão do funil.
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