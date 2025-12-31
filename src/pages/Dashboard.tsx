import { UserPlus, TrendingUp, DollarSign, MessageSquare, Users, Tag, UserCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useStages } from "@/hooks/useStages";
import { useMemo, useState } from "react";
import { formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Activity } from "@/hooks/useActivities";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const today = new Date();
  const initialDateRange: DateRange = { 
    from: startOfMonth(today), 
    to: endOfMonth(today) 
  };
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

    return stages.map(stage => ({
      name: stage.nome,
      value: stageCounts[stage.id] || 0,
      color: stage.cor,
    })).filter(s => s.value > 0);
  }, [metrics?.leadsByStage, stages]);

  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold">Erro ao carregar o painel</h3>
        <p className="text-muted-foreground max-w-md text-center">
          Não foi possível buscar os dados. Isso pode ocorrer se sua conta não estiver totalmente configurada.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const metricsData = [
    {
      title: "Novos Contatos",
      value: metrics.totalContatos.toString(),
      description: "Contatos criados no período",
      icon: UserPlus,
    },
    {
      title: "Novos Leads",
      value: (metrics.totalNovosLeads + metrics.totalPacientes).toString(),
      description: "Total de leads qualificados",
      icon: Tag,
    },
    {
      title: "Taxa de Conversão",
      value: `${metrics.conversionRate}%`,
      description: "Dos contatos criados no período",
      icon: TrendingUp,
    },
    {
      title: "Faturamento Total",
      value: `R$ ${metrics.faturamentoTotal.toLocaleString('pt-BR')}`,
      description: "Vendas realizadas no período",
      icon: DollarSign,
    },
    {
      title: "Total de Atividades",
      value: metrics.activities.length.toString(),
      description: "Interações registradas",
      icon: MessageSquare,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead': return '👤';
      case 'stage': return '📊';
      case 'appointment': return '📅';
      case 'message': return '💬';
      case 'conversion': return '🎉';
      default: return '📌';
    }
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
          <p className="text-muted-foreground mt-1">Visão geral da performance no período selecionado.</p>
        </div>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricsData.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Contatos Captados vs. Convertidos</CardTitle>
            <CardDescription>Evolução diária no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="captados" name="Captados" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="convertidos" name="Convertidos" stroke="hsl(var(--success))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Distribuição por Etapa</CardTitle>
            <CardDescription>Contatos criados no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={stageDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name">
                  {stageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Source Performance & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top 5 Origens de Contatos</CardTitle>
            <CardDescription>Canais com maior volume de captação</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.sourceChartData} layout="vertical" margin={{ right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Bar dataKey="leads" name="Contatos" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas interações registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {metrics.activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-center text-muted-foreground mt-4">Nenhuma atividade no período</p>
                </div>
              ) : (
                metrics.activities.slice(0, 7).map((activity: Activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="text-xl mt-1">{getActivityIcon(activity.tipo)}</div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{activity.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(activity.criado_em)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}