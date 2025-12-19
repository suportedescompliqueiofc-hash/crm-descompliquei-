import { useState } from "react";
import { Megaphone, Search, Users, Target, Radio, DollarSign, BarChart2, ArrowUpRight, Trophy, MousePointerClick } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativeCard } from "@/components/marketing/CreativeCard";
import { useMarketing } from "@/hooks/useMarketing";
import { useReports } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // Assumindo que este componente existe ou usando div simples

export default function Marketing() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  
  // Hooks existentes
  const { criativos, isLoading: isLoadingCreatives, atualizarNomeCriativo, deletarCriativo } = useMarketing();
  
  // Hook de Relatórios para a nova aba
  const { reports, isLoading: isLoadingReports } = useReports(dateRange);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("creatives");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const criativosFiltrados = criativos.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      (c.nome && c.nome.toLowerCase().includes(search)) ||
      (c.titulo && c.titulo.toLowerCase().includes(search)) ||
      (c.conteudo && c.conteudo.toLowerCase().includes(search))
    );
  });

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deletarCriativo(deleteId);
      setDeleteId(null);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#FF8042'];

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Marketing
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus criativos e acompanhe a performance dos anúncios.</p>
        </div>
        <div className="flex gap-3 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="creatives" className="gap-2">
                <Megaphone className="h-4 w-4"/> Criativos
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
                <BarChart2 className="h-4 w-4"/> Relatórios & Performance
            </TabsTrigger>
          </TabsList>

          {activeTab === 'creatives' && (
            <div className="relative w-full sm:w-72 animate-fade-in">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar criativo..." 
                className="pl-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="creatives" className="space-y-6 animate-fade-in">
          {isLoadingCreatives ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-1">Nenhum criativo encontrado</h3>
                <p className="text-muted-foreground max-w-md">
                  Os criativos aparecerão aqui automaticamente quando novos leads chegarem através dos seus anúncios integrados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {criativosFiltrados.map((criativo) => (
                <CreativeCard 
                  key={criativo.id} 
                  criativo={criativo} 
                  onEditName={(id, nome) => atualizarNomeCriativo({ id, nome })}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 animate-fade-in">
          {isLoadingReports || !reports ? (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : (
            <>
              {/* KPIs de Marketing - Design Tecnológico */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                  <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-primary">
                      <Users className="h-4 w-4" />
                      Volume de Leads
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                      {reports.marketing.kpis.totalMarketingLeads}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Total de leads captados via marketing</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all">
                  <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-accent">
                      <Trophy className="h-4 w-4" />
                      Melhor Criativo
                    </CardDescription>
                    <CardTitle className="text-xl font-bold tracking-tight truncate" title={reports.marketing.kpis.bestCreative?.criativo || 'N/A'}>
                      {reports.marketing.kpis.bestCreative?.criativo || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Conversões</span>
                        <span className="font-bold text-lg">{reports.marketing.kpis.bestCreative?.conversions || 0}</span>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Taxa</span>
                        <span className="font-bold text-lg text-emerald-600">
                            {reports.marketing.kpis.bestCreative?.conversionRate ? reports.marketing.kpis.bestCreative.conversionRate.toFixed(1) : 0}%
                        </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-l-4 border-l-secondary shadow-sm hover:shadow-md transition-all">
                  <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-secondary/10 to-transparent pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-secondary">
                      <DollarSign className="h-4 w-4" />
                      Canal Mais Rentável
                    </CardDescription>
                    <CardTitle className="text-xl font-bold tracking-tight truncate" title={reports.marketing.kpis.bestSource?.name || 'N/A'}>
                      {reports.marketing.kpis.bestSource?.name || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-foreground">
                            R$ {reports.marketing.kpis.bestSource?.totalValue.toLocaleString('pt-BR', { notation: "compact" }) || '0'}
                        </span>
                        <span className="text-xs text-muted-foreground mb-1.5">faturados</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos Detalhados */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <Card className="lg:col-span-2 shadow-sm flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Performance por Criativo</CardTitle>
                            <CardDescription>Comparativo de volume de leads vs. vendas efetivas</CardDescription>
                        </div>
                        <BarChart2 className="h-5 w-5 text-muted-foreground"/>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={reports.marketing.charts.leadsVsConversionsByCreative} 
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        barGap={0}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            className="text-xs" 
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            className="text-xs" 
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                        <Legend 
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} 
                            iconType="circle"
                        />
                        <Bar 
                            dataKey="Leads" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]} 
                            name="Leads Captados"
                            maxBarSize={50}
                        />
                        <Bar 
                            dataKey="Conversões" 
                            fill="hsl(var(--success))" 
                            radius={[4, 4, 0, 0]} 
                            name="Vendas Fechadas"
                            maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Receita por Origem</CardTitle>
                            <CardDescription>Participação no faturamento</CardDescription>
                        </div>
                        <DollarSign className="h-5 w-5 text-muted-foreground"/>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={reports.marketing.charts.revenueBySourceData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={90} 
                          paddingAngle={2}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        >
                          {reports.marketing.charts.revenueBySourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                color: 'hsl(var(--foreground))'
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela Detalhada Tecnológica */}
              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Detalhamento de Performance</CardTitle>
                        <CardDescription>Análise granular por origem e criativo</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Exportar Dados
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[150px]">Origem</TableHead>
                        <TableHead className="w-[250px]">Criativo</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="w-[180px]">Taxa de Conversão</TableHead>
                        <TableHead className="text-right">Ticket Médio</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.marketing.performanceTable.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                                <MousePointerClick className="h-8 w-8 opacity-20" />
                                <p>Nenhum dado disponível para o período selecionado.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.marketing.performanceTable.map((item, i) => (
                          <TableRow key={i} className="hover:bg-muted/40 transition-colors">
                            <TableCell>
                                <Badge variant="outline" className="font-normal bg-background">
                                    {item.origem}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[200px]" title={item.criativo}>{item.criativo}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{item.leads}</TableCell>
                            <TableCell className="text-right font-mono">{item.conversions}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${Math.min(item.conversionRate, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium w-10 text-right">{item.conversionRate.toFixed(1)}%</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                                {item.avgTicket > 0 ? `R$ ${item.avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground font-mono">
                                R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir criativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o criativo da lista. Os leads vinculados a ele manterão seu histórico, mas o vínculo visual será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}