import { useState } from "react";
import { Megaphone, Search, Users, Target, DollarSign, BarChart2, ArrowUpRight, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ChartGradients, CustomChartTooltip, CHART_COLORS, glassCardClass } from "@/components/charts/ChartTheme";
import { cn } from "@/lib/utils";

export default function Marketing() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  
  const { criativos, isLoading: isLoadingCreatives, atualizarNomeCriativo, deletarCriativo } = useMarketing(dateRange);
  const { reports, isLoading: isLoadingReports } = useReports(dateRange);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("creatives");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const criativosFiltrados = (criativos || []).filter(c => {
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

  const COLORS = [CHART_COLORS.teal, CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.pink, CHART_COLORS.amber];

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '0';
    return typeof val === 'number' ? val.toLocaleString('pt-BR', { notation: "compact" }) : val;
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Marketing
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">Performance e gestão de criativos.</p>
        </div>
        <div className="bg-white/50 dark:bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/20">
          <DateRangePicker date={dateRange} setDate={setDateRange} className="border-none shadow-none" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1 rounded-2xl backdrop-blur-sm">
            <TabsTrigger value="creatives" className="gap-2 rounded-xl capitalize"><Megaphone className="h-4 w-4"/> Criativos</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-xl capitalize"><BarChart2 className="h-4 w-4"/> Performance</TabsTrigger>
          </TabsList>
          {activeTab === 'creatives' && (
            <div className="relative w-full sm:w-72 animate-in fade-in zoom-in-95 duration-300">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar criativo..." 
                className="pl-10 bg-white/50 dark:bg-black/20 border-white/20 rounded-xl" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          )}
        </div>

        <TabsContent value="creatives" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoadingCreatives ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-3xl" />)}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <Card className={cn(glassCardClass, "border-dashed border-2")}>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Megaphone className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-1">Nenhum criativo encontrado</h3>
                <p className="text-muted-foreground">Tente buscar outro termo ou ajuste os filtros.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {criativosFiltrados.map((criativo) => (
                // Nota: O CreativeCard ainda usa o Card padrão, podemos envolver em um div para efeito se necessário,
                // mas para manter consistência, deixaremos o componente interno gerenciar seu estilo.
                <div key={criativo.id} className="transition-transform hover:-translate-y-1 duration-300">
                   <CreativeCard criativo={criativo} onEditName={(id, nome) => atualizarNomeCriativo({ id, nome })} onDelete={setDeleteId} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoadingReports ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              {/* KPIs Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={cn(glassCardClass, "border-l-8 border-l-teal-400 relative overflow-hidden")}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="h-24 w-24 text-teal-400" /></div>
                  <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 font-medium text-teal-600"><Users className="h-4 w-4" /> Volume de Leads</CardDescription><CardTitle className="text-4xl font-extrabold">{reports?.marketing?.kpis?.totalMarketingLeads ?? 0}</CardTitle></CardHeader>
                </Card>

                <Card className={cn(glassCardClass, "border-l-8 border-l-amber-400 relative overflow-hidden")}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="h-24 w-24 text-amber-400" /></div>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-amber-600"><Trophy className="h-4 w-4" /> Melhor Criativo</CardDescription>
                    <CardTitle className="text-xl font-bold truncate max-w-[80%]">{reports?.marketing?.kpis?.bestCreative?.criativo || 'N/A'}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-6 pt-0">
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground uppercase font-bold">Vendas</span><span className="font-bold text-2xl">{reports?.marketing?.kpis?.bestCreative?.conversions ?? 0}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground uppercase font-bold">Taxa</span><span className="font-bold text-2xl text-emerald-600">{(reports?.marketing?.kpis?.bestCreative?.conversionRate || 0).toFixed(1)}%</span></div>
                  </CardContent>
                </Card>

                <Card className={cn(glassCardClass, "border-l-8 border-l-blue-500 relative overflow-hidden")}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="h-24 w-24 text-blue-500" /></div>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-blue-600"><DollarSign className="h-4 w-4" /> Canal Top Receita</CardDescription>
                    <CardTitle className="text-xl font-bold truncate">{reports?.marketing?.kpis?.bestSource?.name || 'N/A'}</CardTitle>
                  </CardHeader>
                  <CardContent><div className="flex items-end gap-2"><span className="text-3xl font-extrabold text-foreground">R$ {formatValue(reports?.marketing?.kpis?.bestSource?.totalValue)}</span></div></CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className={cn(glassCardClass, "lg:col-span-2")}>
                  <CardHeader><CardTitle>Performance por Criativo</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reports?.marketing?.charts?.leadsVsConversionsByCreative || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <ChartGradients />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                        <XAxis dataKey="name" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                        <YAxis stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend />
                        <Bar dataKey="Leads" fill="url(#colorTeal)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Conversões" fill="url(#colorPurple)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className={glassCardClass}>
                  <CardHeader><CardTitle>Receita por Origem</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={reports?.marketing?.charts?.revenueBySourceData || []} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={90} 
                          paddingAngle={4}
                          stroke="none"
                        >
                          {(reports?.marketing?.charts?.revenueBySourceData || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-md" />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} content={<CustomChartTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className={cn(glassCardClass, "overflow-hidden")}>
                <CardHeader className="bg-white/5 border-b border-white/10 flex flex-row items-center justify-between"><CardTitle>Detalhamento de Performance</CardTitle><Button variant="outline" size="sm" className="h-8 text-xs rounded-lg"><ArrowUpRight className="h-3 w-3 mr-1" /> Exportar</Button></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow className="border-b-white/10"><TableHead>Origem</TableHead><TableHead>Criativo</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead>Conversão</TableHead><TableHead className="text-right">Faturamento</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(reports?.marketing?.performanceTable || []).length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum dado disponível.</TableCell></TableRow>
                      ) : (
                        reports?.marketing?.performanceTable.map((item, i) => (
                          <TableRow key={i} className="border-b-white/5 hover:bg-white/5 transition-colors">
                            <TableCell><Badge variant="outline" className="border-white/20">{item.origem}</Badge></TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{item.criativo}</TableCell>
                            <TableCell className="text-right">{item.leads}</TableCell>
                            <TableCell className="text-right">{item.conversions}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(item.conversionRate, 100)}%` }}></div>
                                </div>
                                <span className="text-xs">{item.conversionRate.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-500">R$ {item.totalValue.toLocaleString('pt-BR')}</TableCell>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Excluir criativo?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o criativo da lista. Os leads vinculados manterão seu histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive rounded-xl">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}