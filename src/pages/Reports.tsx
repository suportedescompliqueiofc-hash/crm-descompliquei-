import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, TrendingUp, TrendingDown, Users, DollarSign, Clock, Filter, BarChart2, Tag, ArrowUpRight, ArrowDownRight, ArrowRight,
  CreditCard, ShoppingCart, Percent, Wallet
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LabelList, AreaChart, Area
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useStages } from "@/hooks/useStages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useLeadSources } from "@/hooks/useLeadSources";
import { useTags } from "@/hooks/useTags";
import { Separator } from "@/components/ui/separator";

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
              {entry.name === 'Valor' || entry.name === 'Faturamento' 
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

export default function Reports() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [showFilters, setShowFilters] = useState(false);
  const [originFilter, setOriginFilter] = useState("Todos"); // Estado principal para as abas de origem
  
  // O estado 'filters' controla apenas os filtros AVANÇADOS (dentro do modal)
  const [filters, setFilters] = useState({ 
    posicao_pipeline: "Todos", 
    genero: "Todos", 
    idade: "", 
    tagId: "Todos" 
  });
  
  const { toast } = useToast();
  
  const { reports, isLoading } = useReports(dateRange, { ...filters, origem: originFilter });
  
  const { stages } = useStages();
  const { availableTags } = useTags();

  const handleFilterChange = (filterName: string, value: string) => setFilters(prev => ({ ...prev, [filterName]: value }));

  const handleExport = () => {
    if (!reports) return;
    const { kpis } = reports;
    const csvContent = "data:text/csv;charset=utf-8," + "Métrica,Valor\n" + `Total de Leads,${kpis.totalLeads}\n` + `Taxa de Conversão,${kpis.conversionRate}%\n` + `Ticket Médio,R$ ${kpis.ticketMedio.toLocaleString('pt-BR')}\n` + `Tempo Médio no Funil,${kpis.tempoMedioFunil} dias\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${originFilter}_${dateRange?.from ? format(dateRange.from, 'yyyyMMdd') : 'custom'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Relatório exportado", description: "O arquivo CSV foi baixado com sucesso!", closeButton: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }
  
  if (!reports) return null;

  const GRADIENTS = (
    <defs>
      <linearGradient id="colorCaptados" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
      </linearGradient>
      <linearGradient id="colorConvertidos" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
      </linearGradient>
      <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
      </linearGradient>
    </defs>
  );

  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios Detalhados</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de performance, funil e vendas.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="w-full md:w-auto"><DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" /></div>
          <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Button className="flex-1 md:flex-none" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {/* Tabs Principais de Origem */}
      <Tabs value={originFilter} onValueChange={setOriginFilter} className="w-full overflow-hidden">
        <div className="border-b pb-4 mb-2">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-none inline-flex h-10 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger value="Todos" className="px-4 text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="marketing" className="px-4 text-xs sm:text-sm">Marketing</TabsTrigger>
            <TabsTrigger value="organico" className="px-4 text-xs sm:text-sm">Orgânico</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {showFilters && (
        <Card className="animate-fade-in overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa do Funil</Label>
                <Select value={filters.posicao_pipeline} onValueChange={(v) => handleFilterChange('posicao_pipeline', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Etapas</SelectItem>
                    {stages.map(stage => <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Gênero</Label><Select value={filters.genero} onValueChange={(v) => handleFilterChange('genero', v)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Idade</Label><Input type="number" value={filters.idade} onChange={(e) => handleFilterChange('idade', e.target.value)} placeholder="Idade exata" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Etiqueta</Label><Select value={filters.tagId} onValueChange={(v) => handleFilterChange('tagId', v)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas as Etiquetas</SelectItem>{availableTags.map(tag => (<SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo das Abas Internas (Métricas) */}
      <Tabs defaultValue="overview" className="space-y-6 w-full overflow-hidden">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none h-10 p-1 bg-muted/20">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Resumo</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs sm:text-sm">Funil Real</TabsTrigger>
          <TabsTrigger value="conversions" className="text-xs sm:text-sm">Conversões</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4"><p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Total Leads</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.kpis?.totalContatos ?? 0}</div></Card>
            <Card className="p-3 sm:p-4"><p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Novos Leads</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.kpis?.totalNovosLeads ?? 0}</div></Card>
            <Card className="p-3 sm:p-4"><p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Conversão</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.kpis?.conversionRate ?? 0}%</div></Card>
            <Card className="p-3 sm:p-4"><p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Ticket Médio</p><div className="text-base sm:text-lg font-bold mt-1 truncate">R$ {(reports?.kpis?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div></Card>
            <Card className="p-3 sm:p-4 col-span-2 md:col-span-1"><p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Tempo Médio</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.kpis?.tempoMedioFunil ?? 0} d</div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-4"><CardTitle className="text-base">Captados vs Convertidos</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-[250px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reports?.charts?.leadsCapturedData || []} margin={{ left: -20, right: 10 }}>
                      {GRADIENTS}
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                      <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="captados" name="Captados" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorCaptados)" />
                      <Area type="monotone" dataKey="convertidos" name="Convertidos" stroke="#10b981" strokeWidth={2} fill="url(#colorConvertidos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-4"><CardTitle className="text-base">Leads por Fonte</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-[250px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports?.charts?.sourceData || []} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="source" type="category" width={80} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="leads" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Leads" barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="h-[400px] sm:h-[500px] w-full overflow-x-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={reports?.funnel?.funnelData || []} 
                    layout="vertical"
                    margin={{ top: 20, right: 50, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="etapa" type="category" width={110} tick={{ fontSize: 10 }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Bar dataKey="quantidade" barSize={32} radius={[0, 4, 4, 0]} name="Leads">
                      {reports?.funnel?.funnelData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || '#8b5cf6'} />
                      ))}
                      <LabelList dataKey="quantidade" position="right" style={{ fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports?.funnel?.detailedSteps?.map((step: any, index: number) => (
              <Card key={index} className="p-4 border-l-4" style={{ borderLeftColor: step.fill }}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Etapa {index + 1}</span>
                  <span className="font-bold text-xl">{step.quantidade}</span>
                </div>
                <h4 className="font-bold text-sm truncate mb-3">{step.etapa}</h4>
                <Separator className="my-2" />
                {index < reports.funnel.detailedSteps.length - 1 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><p className="text-[9px] text-muted-foreground uppercase">Conversão</p><p className="text-xs font-bold text-emerald-600">{step.conversionRate}%</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase">Perda</p><p className="text-xs font-bold text-red-500">{step.dropOffRate}%</p></div>
                  </div>
                ) : (
                    <div className="text-center py-1"><Badge className="bg-emerald-500 text-[9px] h-5">Fim do Funil</Badge></div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="overflow-hidden"><CardHeader className="p-4"><CardTitle className="text-base">Conversões por Fonte</CardTitle></CardHeader>
                    <CardContent className="p-2">
                        <div className="h-[250px] sm:h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={reports?.conversions?.charts?.conversoesPorOrigemData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={4}><Cell key="cell-1" fill="#8b5cf6"/><Cell key="cell-2" fill="#10b981"/><Cell key="cell-3" fill="#f59e0b"/></Pie><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden"><CardHeader className="p-4"><CardTitle className="text-base">Valor Convertido (Dia)</CardTitle></CardHeader>
                    <CardContent className="p-2">
                        <div className="h-[250px] sm:h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reports?.conversions?.charts?.valorConvertidoPorDia || []} margin={{ left: -10, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} /><XAxis dataKey="day" fontSize={9} /><YAxis fontSize={9} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} name="Valor" /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 text-center sm:text-left"><p className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento</p><div className="text-lg sm:text-xl font-bold mt-1 truncate">R$ {reports?.financial?.totalFaturado.toLocaleString('pt-BR')}</div></Card>
            <Card className="p-3 sm:p-4 text-center sm:text-left"><p className="text-[10px] uppercase font-bold text-muted-foreground">Vendas</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.financial?.totalVendas}</div></Card>
            <Card className="p-3 sm:p-4 text-center sm:text-left"><p className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Médio</p><div className="text-lg sm:text-xl font-bold mt-1 truncate">R$ {reports?.financial?.ticketMedio.toLocaleString('pt-BR')}</div></Card>
            <Card className="p-3 sm:p-4 text-center sm:text-left"><p className="text-[10px] uppercase font-bold text-muted-foreground">Eficiência</p><div className="text-xl sm:text-2xl font-bold mt-1">{reports?.financial?.taxaEficiencia.toFixed(1)}%</div></Card>
          </div>
          
          <Card className="overflow-hidden">
            <CardHeader className="p-4"><CardTitle className="text-base">Curva de Faturamento</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="h-[250px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reports?.financial?.faturamentoPorDia || []} margin={{ left: -10, right: 10 }}>
                    {GRADIENTS}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="day" fontSize={9} />
                    <YAxis fontSize={9} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} fill="url(#colorFaturamento)" fillOpacity={1} name="Faturamento" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}