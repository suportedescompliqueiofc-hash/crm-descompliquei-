import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, TrendingUp, Users, DollarSign, Clock, Filter, Target, CreditCard, BarChart2, Tag, ArrowRight, ArrowDown
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LabelList, AreaChart, Area
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
import { ChartGradients, CustomChartTooltip, CHART_COLORS, glassCardClass } from "@/components/charts/ChartTheme";
import { cn } from "@/lib/utils";

export default function Reports() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ posicao_pipeline: "Todos", origem: "Todos", genero: "Todos", idade: "", tagId: "Todos" });
  
  const { toast } = useToast();
  const { reports, isLoading } = useReports(dateRange, filters);
  const { stages } = useStages();
  const { allSources } = useLeadSources();
  const { availableTags } = useTags();

  const handleFilterChange = (filterName: string, value: string) => setFilters(prev => ({ ...prev, [filterName]: value }));

  const handleExport = () => {
    if (!reports) return;
    const { kpis } = reports;
    const csvContent = "data:text/csv;charset=utf-8," + "Métrica,Valor\n" + `Total de Leads,${kpis.totalLeads}\n` + `Taxa de Conversão,${kpis.conversionRate}%\n` + `Ticket Médio,R$ ${kpis.ticketMedio.toLocaleString('pt-BR')}\n` + `Tempo Médio no Funil,${kpis.tempoMedioFunil} dias\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${dateRange?.from ? format(dateRange.from, 'yyyyMMdd') : 'custom'}.csv`);
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

  const periodDisplay = dateRange?.from && dateRange.to ? `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}` : 'Período Selecionado';
  
  // Neon Colors for Pie Charts
  const PIE_COLORS = [CHART_COLORS.teal, CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.pink, CHART_COLORS.amber];

  return (
    <div className="space-y-8 p-2">
      {/* Header com Animação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Relatórios</h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">Análise profunda de dados e tendências.</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="bg-white/50 dark:bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/20">
             <DateRangePicker date={dateRange} setDate={setDateRange} className="border-none shadow-none" />
          </div>
          <Button variant="outline" className="rounded-xl border-white/20 hover:bg-white/10" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/20 border-none" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {showFilters && (
        <Card className={cn(glassCardClass, "animate-in fade-in slide-in-from-top-4 duration-300")}>
          <CardHeader>
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
            <CardDescription>Refine os dados para uma análise precisa.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Etapa do Funil</Label>
                <Select value={filters.posicao_pipeline} onValueChange={(v) => handleFilterChange('posicao_pipeline', v)}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Etapas</SelectItem>
                    {stages.map(stage => <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Origem</Label><Select value={filters.origem} onValueChange={(v) => handleFilterChange('origem', v)}><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{allSources.map(origem => <SelectItem key={origem} value={origem}>{origem}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Gênero</Label><Select value={filters.genero} onValueChange={(v) => handleFilterChange('genero', v)}><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
              <div><Label>Idade</Label><Input type="number" className="rounded-lg" value={filters.idade} onChange={(e) => handleFilterChange('idade', e.target.value)} placeholder="Idade exata" /></div>
              <div><Label>Etiqueta</Label><Select value={filters.tagId} onValueChange={(v) => handleFilterChange('tagId', v)}><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas as Etiquetas</SelectItem>{availableTags.map(tag => (<SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-2xl backdrop-blur-sm">
          {["overview", "funnel", "conversions", "financial"].map(tab => (
            <TabsTrigger key={tab} value={tab} className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm capitalize">
              {tab === 'overview' ? 'Visão Geral' : tab === 'funnel' ? 'Funil Real' : tab === 'conversions' ? 'Conversões' : 'Financeiro'}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className={cn(glassCardClass, "border-l-8 border-l-teal-400")}>
              <CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-teal-600 font-medium"><Users className="h-4 w-4" />Novos Contatos</CardDescription><CardTitle className="text-4xl font-extrabold">{reports?.kpis?.totalContatos ?? 0}</CardTitle></CardHeader>
            </Card>
            <Card className={cn(glassCardClass, "border-l-8 border-l-blue-500")}>
              <CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-blue-600 font-medium"><Tag className="h-4 w-4" />Novos Leads</CardDescription><CardTitle className="text-4xl font-extrabold">{reports?.kpis?.totalNovosLeads ?? 0}</CardTitle></CardHeader>
            </Card>
            <Card className={cn(glassCardClass, "border-l-8 border-l-purple-500")}>
              <CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-purple-600 font-medium"><TrendingUp className="h-4 w-4" />Taxa de Conversão</CardDescription><CardTitle className="text-4xl font-extrabold">{reports?.kpis?.conversionRate ?? 0}%</CardTitle></CardHeader>
            </Card>
            <Card className={cn(glassCardClass, "border-l-8 border-l-emerald-500")}>
              <CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-emerald-600 font-medium"><DollarSign className="h-4 w-4" />Ticket Médio</CardDescription><CardTitle className="text-4xl font-extrabold">R$ {(reports?.kpis?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</CardTitle></CardHeader>
            </Card>
            <Card className={cn(glassCardClass, "border-l-8 border-l-amber-500")}>
              <CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-amber-600 font-medium"><Clock className="h-4 w-4" />Tempo Médio no Funil</CardDescription><CardTitle className="text-4xl font-extrabold">{reports?.kpis?.tempoMedioFunil ?? 0} dias</CardTitle></CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={cn(glassCardClass, "lg:col-span-2")}>
              <CardHeader><CardTitle>Captados vs Convertidos</CardTitle><CardDescription>Evolução natural no tempo</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={reports?.charts?.leadsCapturedData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <ChartGradients />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                    <XAxis dataKey="day" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} className="text-muted-foreground opacity-60" />
                    <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} className="text-muted-foreground opacity-60" />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="captados" stroke={CHART_COLORS.teal} fillOpacity={1} fill="url(#colorTeal)" strokeWidth={3} name="Captados" />
                    <Area type="monotone" dataKey="convertidos" stroke={CHART_COLORS.blue} fillOpacity={1} fill="url(#colorBlue)" strokeWidth={3} name="Convertidos" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={glassCardClass}>
              <CardHeader><CardTitle>Por Origem</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={reports?.charts?.sourceData || []} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="source" type="category" stroke="currentColor" fontSize={11} width={80} tickLine={false} axisLine={false} className="text-foreground font-medium" />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="leads" fill="url(#colorPurple)" radius={[0, 4, 4, 0]} barSize={24} name="Leads">
                        <LabelList dataKey="leads" position="right" style={{ fill: 'currentColor', fontSize: '11px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={glassCardClass}>
            <CardHeader><CardTitle>Top 10 Criativos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-white/10"><TableHead>Criativo</TableHead><TableHead>Origem</TableHead><TableHead>Leads</TableHead><TableHead>Conversão</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(reports?.charts?.topCreativesData || []).map((item, i) => (
                    <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell><Badge variant="outline" className="border-white/20">{item.origin}</Badge></TableCell>
                      <TableCell>{item.leads}</TableCell>
                      <TableCell><Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">{item.conversion}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Jornada do Cliente (Acumulado)</CardTitle>
              <CardDescription>Fluxo visual com comportamento natural.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={reports?.funnel?.funnelData || []} 
                    layout="vertical"
                    margin={{ top: 20, right: 120, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={CHART_COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="etapa" 
                      type="category" 
                      width={180} 
                      tick={{ fontSize: 13, fill: 'currentColor', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar 
                      dataKey="quantidade" 
                      barSize={32} 
                      radius={[0, 16, 16, 0]} // Barras super arredondadas
                    >
                      {reports?.funnel?.funnelData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity duration-300" />
                      ))}
                      <LabelList 
                        dataKey="quantidade" 
                        position="right" 
                        formatter={(val: number) => `${val}`}
                        style={{ fill: 'currentColor', fontWeight: 'bold', fontSize: '14px' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className={cn(glassCardClass, "lg:col-span-2")}>
              <CardHeader><CardTitle>Conversões por Origem</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={reports?.conversions?.charts?.conversoesPorOrigemData || []} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      innerRadius={50}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {(reports?.conversions?.charts?.conversoesPorOrigemData || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="drop-shadow-md" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className={cn(glassCardClass, "lg:col-span-3")}>
              <CardHeader>
                <CardTitle>Valor Convertido</CardTitle>
                <CardDescription>Evolução diária</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reports?.conversions?.charts?.valorConvertidoPorDia || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="day" stroke="currentColor" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
                    <YAxis stroke="currentColor" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} content={<CustomChartTooltip />} />
                    <Bar dataKey="valor" fill="url(#colorTeal)" name="Valor" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={cn(glassCardClass, "lg:col-span-2")}>
              <CardHeader><CardTitle>Evolução do Faturamento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={reports?.financial?.faturamentoPorDia || []}>
                    <ChartGradients />
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="day" stroke="currentColor" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
                    <YAxis stroke="currentColor" className="text-xs text-muted-foreground" tickFormatter={(value) => `R$${value/1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.teal} fill="url(#colorTeal)" strokeWidth={3} name="Faturamento" activeDot={{ r: 6, strokeWidth: 0, fill: "white", stroke: CHART_COLORS.teal }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className={glassCardClass}>
              <CardHeader><CardTitle>Métodos de Pagamento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie 
                      data={reports?.financial?.metodosPagamentoData || []} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={5}
                      stroke="none"
                    >
                      {(reports?.financial?.metodosPagamentoData || []).map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="drop-shadow-lg" />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} content={<CustomChartTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}