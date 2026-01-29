import { UserPlus, TrendingUp, DollarSign, Tag, AlertTriangle, RefreshCw, Megaphone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useStages } from "@/hooks/useStages";
import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";

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

    // Cores padrão do sistema
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return stages.map((stage, index) => ({
      name: stage.nome,
      value: stageCounts[stage.posicao_ordem] || 0,
      color: stage.cor || COLORS[index % COLORS.length],
    })).filter(s => s.value > 0);
  }, [metrics?.leadsByStage, stages]);

  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="bg-destructive/10 p-6 rounded-full"><AlertTriangle className="h-10 w-10 text-destructive" /></div>
        <h3 className="text-xl font-semibold">Erro ao carregar o painel</h3>
        <Button onClick={() => refetch()} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Tentar Novamente</Button>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>;
  }

  const metricsData = [
    { title: "Total Contatos", value: metrics.totalContatos.toString(), icon: UserPlus, description: "Todos os registros" },
    { title: "Leads Marketing", value: (metrics.marketingLeads || 0).toString(), icon: Megaphone, description: "Origem Marketing (Ads)" },
    { title: "Leads Orgânico", value: (metrics.organicLeads || 0).toString(), icon: Users, description: "Indicação, Manual..." },
    { title: "Taxa de Conversão", value: `${metrics.conversionRate}%`, icon: TrendingUp, description: "Funil de vendas" },
    { title: "Faturamento", value: `R$ ${metrics.faturamentoTotal.toLocaleString('pt-BR')}`, icon: DollarSign, description: "Vendas fechadas" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
          <p className="text-muted-foreground mt-1">Visão geral do desempenho da sua clínica.</p>
        </div>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {metricsData.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Evolução de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.leadsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="captados" name="Captados" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="convertidos" name="Convertidos" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribuição do Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stageDistribution} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value" 
                    nameKey="name"
                  >
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}