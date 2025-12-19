import { useState } from "react";
import { Megaphone, Search, Users, Target, Radio, DollarSign, BarChart2 } from "lucide-react";
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

  const chartTooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' };
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#FF8042'];

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
          <TabsList>
            <TabsTrigger value="creatives">Criativos de Anúncios</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><BarChart2 className="h-4 w-4"/> Relatórios</TabsTrigger>
            <TabsTrigger value="campaigns" disabled>Campanhas (Em breve)</TabsTrigger>
          </TabsList>

          {activeTab === 'creatives' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar criativo..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="creatives" className="space-y-6">
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
            <Card className="border-dashed">
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

        <TabsContent value="reports" className="space-y-6">
          {isLoadingReports || !reports ? (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : (
            <>
              {/* KPIs de Marketing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Leads de Marketing
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {reports.marketing.kpis.totalMarketingLeads}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Total de leads de fontes conhecidas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Melhor Criativo
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold truncate">
                      {reports.marketing.kpis.bestCreative?.criativo || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {reports.marketing.kpis.bestCreative?.conversions || 0} conversões
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      Melhor Origem
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold truncate">
                      {reports.marketing.kpis.bestSource?.name || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      R$ {reports.marketing.kpis.bestSource?.totalValue.toLocaleString('pt-BR') || '0,00'} em faturamento
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Leads vs Conversões por Criativo</CardTitle>
                    <CardDescription>Top 10 criativos com maior volume de leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={reports.marketing.charts.leadsVsConversionsByCreative}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" className="text-xs" />
                        <YAxis stroke="hsl(var(--muted-foreground))" className="text-xs" />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend />
                        <Bar dataKey="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Conversões" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Faturamento por Origem</CardTitle>
                    <CardDescription>Distribuição da receita por canal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie 
                          data={reports.marketing.charts.revenueBySourceData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={100} 
                          paddingAngle={5}
                        >
                          {reports.marketing.charts.revenueBySourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={chartTooltipStyle} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle>Tabela de Performance de Marketing</CardTitle>
                  <CardDescription>Análise detalhada por origem e criativo</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Criativo</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Conversões</TableHead>
                        <TableHead>Taxa de Conversão</TableHead>
                        <TableHead>Faturamento</TableHead>
                        <TableHead>Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.marketing.performanceTable.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum dado disponível para o período selecionado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.marketing.performanceTable.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell><Badge variant="outline">{item.origem}</Badge></TableCell>
                            <TableCell className="font-medium">{item.criativo}</TableCell>
                            <TableCell>{item.leads}</TableCell>
                            <TableCell>{item.conversions}</TableCell>
                            <TableCell>{item.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>R$ {item.totalValue.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>R$ {item.avgTicket.toLocaleString('pt-BR')}</TableCell>
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