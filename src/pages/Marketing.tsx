import { useState } from "react";
import { Megaphone, Search, Users, Target, Radio, DollarSign, BarChart2, ArrowUpRight, Trophy, MousePointerClick } from "lucide-react";
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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#FF8042'];

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '0';
    return typeof val === 'number' ? val.toLocaleString('pt-BR', { notation: "compact" }) : val;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="creatives" className="gap-2"><Megaphone className="h-4 w-4"/> Criativos</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><BarChart2 className="h-4 w-4"/> Relatórios & Performance</TabsTrigger>
          </TabsList>
          {activeTab === 'creatives' && (
            <div className="relative w-full sm:w-72 animate-fade-in">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar criativo..." className="pl-10 bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          )}
        </div>

        <TabsContent value="creatives" className="space-y-6 animate-fade-in">
          {isLoadingCreatives ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <Card className="border-dashed bg-muted/20"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Megaphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" /><h3 className="text-lg font-semibold mb-1">Nenhum criativo encontrado</h3></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {criativosFiltrados.map((criativo) => (
                <CreativeCard key={criativo.id} criativo={criativo} onEditName={(id, nome) => atualizarNomeCriativo({ id, nome })} onDelete={setDeleteId} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 animate-fade-in">
          {isLoadingReports || !reports ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden border-l-4 border-l-primary">
                  <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 font-medium text-primary"><Users className="h-4 w-4" /> Volume de Leads</CardDescription><CardTitle className="text-3xl font-bold">{reports.marketing.kpis.totalMarketingLeads || 0}</CardTitle></CardHeader>
                </Card>

                <Card className="relative overflow-hidden border-l-4 border-l-accent">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-accent"><Trophy className="h-4 w-4" /> Melhor Criativo</CardDescription>
                    <CardTitle className="text-xl font-bold truncate">{reports.marketing.kpis.bestCreative?.criativo || 'N/A'}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Vendas</span><span className="font-bold text-lg">{reports.marketing.kpis.bestCreative?.conversions || 0}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Taxa</span><span className="font-bold text-lg text-emerald-600">{(reports.marketing.kpis.bestCreative?.conversionRate || 0).toFixed(1)}%</span></div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-l-4 border-l-secondary">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 font-medium text-secondary"><DollarSign className="h-4 w-4" /> Canal Mais Rentável</CardDescription>
                    <CardTitle className="text-xl font-bold truncate">{reports.marketing.kpis.bestSource?.name || 'N/A'}</CardTitle>
                  </CardHeader>
                  <CardContent><div className="flex items-end gap-2"><span className="text-2xl font-bold text-foreground">R$ {formatValue(reports.marketing.kpis.bestSource?.totalValue)}</span></div></CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader><CardTitle>Performance por Criativo</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reports.marketing.charts.leadsVsConversionsByCreative} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" className="text-[10px]" />
                        <YAxis stroke="hsl(var(--muted-foreground))" className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Conversões" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader><CardTitle>Receita por Origem</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reports.marketing.charts.revenueBySourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                          {reports.marketing.charts.revenueBySourceData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between"><CardTitle>Detalhamento de Performance</CardTitle><Button variant="outline" size="sm" className="h-8 text-xs"><ArrowUpRight className="h-3 w-3 mr-1" /> Exportar</Button></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Criativo</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead>Conversão</TableHead><TableHead className="text-right">Faturamento</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {reports.marketing.performanceTable.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum dado disponível.</TableCell></TableRow>
                      ) : (
                        reports.marketing.performanceTable.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell><Badge variant="outline">{item.origem}</Badge></TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{item.criativo}</TableCell>
                            <TableCell className="text-right">{item.leads}</TableCell>
                            <TableCell className="text-right">{item.conversions}</TableCell>
                            <TableCell>{item.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-bold">R$ {item.totalValue.toLocaleString('pt-BR')}</TableCell>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir criativo?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o criativo da lista. Os leads vinculados manterão seu histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}