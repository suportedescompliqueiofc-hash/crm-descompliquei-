import { UserPlus, TrendingUp, DollarSign, Tag, AlertTriangle, RefreshCw, Megaphone, Users, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useStages } from "@/hooks/useStages";
import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";

// Componente de Tooltip Personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg outline-none">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <div 
              className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]" 
              style={{ 
                backgroundColor: entry.color, 
                boxShadow: `0 0 4px ${entry.color}` 
              }} 
            />
            <span className="text-sm text-muted-foreground capitalize">{entry.name}:</span>
            <span className="text-sm font-bold text-foreground">
              {entry.name === 'Faturamento' 
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}`
                : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return stages.map((stage, index) => ({
      name: stage.nome,
      value: stageCounts[stage.posicao_ordem] || 0,
      color: stage.cor || COLORS[index % COLORS.length],
    })).filter(s => s.value > 0);
  }, [metrics?.leadsByStage, stages]);

  const GRADIENTS = (
    <defs>
      <linearGradient id="colorCaptados" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
      </linearGradient>
      <linearGradient id="colorConvertidos" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
      </linearGradient>
    </defs>
  );

  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-96 gap-4 p-4 text-center">
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
    { title: "Leads Marketing", value: (metrics.marketingLeads || 0).toString(), icon: Megaphone, description: "Anúncios (Ads)" },
    { title: "Leads Orgânico", value: (metrics.organicLeads || 0).toString(), icon: Users, description: "Indicação, Manual..." },
    { title: "Taxa Conversão", value: `${metrics.conversionRate}%`, icon: TrendingUp, description: "Vendas fechadas" },
    { title: "Faturamento", value: `R$ ${metrics.faturamentoTotal.toLocaleString('pt-BR')}`, icon: DollarSign, description: "Vendas fechadas" },
    { title: "Taxa de MQL", value: `${metrics.mqlRate}%`, icon: Tag, description: `${metrics.mqlCount} leads qualificados` },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Painel de Controle</h1>
          <p className="text-sm text-muted-foreground mt-1">Desempenho do seu escritório.</p>
        </div>
        <div className="w-full md:w-auto"><DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {metricsData.map((metric) => (
          <Card key={metric.title} className="p-0 overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1">
              <CardTitle className="text-[10px] sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary opacity-60" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold truncate">{metric.value}</div>
              <p className="hidden sm:block text-[10px] text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="col-span-1 shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="p-4"><CardTitle className="text-base sm:text-lg">Evolução de Leads</CardTitle></CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.leadsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  {GRADIENTS}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="captados" name="Captados" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorCaptados)" />
                  <Area type="monotone" dataKey="convertidos" name="Convertidos" stroke="#10b981" strokeWidth={2} fill="url(#colorConvertidos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="p-4"><CardTitle className="text-base sm:text-lg">Distribuição do Funil</CardTitle></CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stageDistribution} 
                    cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" nameKey="name" stroke="hsl(var(--card))" strokeWidth={2}
                  >
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" formatter={(value) => <span className="text-[10px] font-medium ml-1 truncate max-w-[80px] inline-block">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}