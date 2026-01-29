import { UserPlus, TrendingUp, DollarSign, Tag, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useStages } from "@/hooks/useStages";
import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";
import { ChartGradients, CustomChartTooltip, CHART_COLORS, glassCardClass } from "@/components/charts/ChartTheme";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  
  const { metrics, isLoading: metricsLoading, error: metricsError, refetch } = useDashboard(dateRange);
  const { stages, isLoading: stagesLoading } = useStages();

  const isLoading = metricsLoading || stagesLoading;

  const stageDistribution = useMemo(() => {
    if (!metrics?.leadsByStage || !stages.length) return [];
    
    const stageCounts = metrics.leadsByStage.reduce((acc, lead) => {
      acc[lead.etapa_id] = (acc[lead.etapa_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Cores personalizadas para o gráfico de pizza (estilo Neon)
    const neonColors = [CHART_COLORS.teal, CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.pink, CHART_COLORS.amber, CHART_COLORS.red];

    return stages.map((stage, index) => ({
      name: stage.nome,
      value: stageCounts[stage.posicao_ordem] || 0,
      color: neonColors[index % neonColors.length], // Usa cores neon em vez das cores do banco para consistência visual do tema
    })).filter(s => s.value > 0);
  }, [metrics?.leadsByStage, stages]);

  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 animate-in fade-in duration-500">
        <div className="bg-destructive/10 p-6 rounded-3xl backdrop-blur-md"><AlertTriangle className="h-10 w-10 text-destructive animate-pulse" /></div>
        <h3 className="text-xl font-semibold">Erro ao carregar o painel</h3>
        <Button onClick={() => refetch()} variant="outline" className="gap-2 rounded-xl"><RefreshCw className="h-4 w-4" /> Tentar Novamente</Button>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  const metricsData = [
    { title: "Novos Contatos", value: metrics.totalContatos.toString(), icon: UserPlus, color: "text-teal-500", bg: "bg-teal-500/10" },
    { title: "Leads Qualificados", value: metrics.totalNovosLeads.toString(), icon: Tag, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Taxa de Conversão", value: `${metrics.conversionRate}%`, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Faturamento Total", value: `R$ ${metrics.faturamentoTotal.toLocaleString('pt-BR')}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Painel de Controle
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">Performance em tempo real da sua clínica.</p>
        </div>
        <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-2xl backdrop-blur-sm border border-white/20">
          <DateRangePicker date={dateRange} setDate={setDateRange} className="border-none shadow-none" />
        </div>
      </div>

      {/* Bento Grid - KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, index) => (
          <Card 
            key={metric.title} 
            className={cn(
              glassCardClass, 
              "border-l-4 border-l-transparent hover:border-l-primary/50 transition-all duration-500"
            )}
            style={{ animationDelay: `${index * 100}ms` }} // Staggered animation
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{metric.title}</CardTitle>
              <div className={cn("p-2 rounded-xl backdrop-blur-md", metric.bg)}>
                <metric.icon className={cn("h-5 w-5", metric.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bento Grid - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Area Chart for "Natural" feel */}
        <Card className={cn(glassCardClass, "lg:col-span-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300")}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Contatos vs. Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={metrics.leadsOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis 
                  dataKey="day" 
                  stroke="currentColor" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  className="text-muted-foreground opacity-50"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  className="text-muted-foreground opacity-50"
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: CHART_COLORS.purple, strokeWidth: 1, strokeDasharray: "5 5" }} />
                <Legend iconType="circle" />
                <Area 
                  type="monotone" // Smooth curves
                  dataKey="captados" 
                  name="Contatos" 
                  stroke={CHART_COLORS.teal} 
                  fillOpacity={1} 
                  fill="url(#colorTeal)" 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "white", stroke: CHART_COLORS.teal }}
                />
                <Area 
                  type="monotone" 
                  dataKey="convertidos" 
                  name="Convertidos" 
                  stroke={CHART_COLORS.purple} 
                  fillOpacity={1} 
                  fill="url(#colorPurple)" 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "white", stroke: CHART_COLORS.purple }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Secondary Chart - Pie */}
        <Card className={cn(glassCardClass, "animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500")}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Distribuição no Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie 
                  data={stageDistribution} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={70} // Donut chart
                  outerRadius={100} 
                  paddingAngle={4} // Separated slices
                  dataKey="value" 
                  nameKey="name"
                  stroke="none"
                >
                  {stageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-lg" />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  iconType="circle" 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: "20px", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}