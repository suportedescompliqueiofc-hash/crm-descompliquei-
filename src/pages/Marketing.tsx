import { useState } from "react";
import { Megaphone, Search, Users, Target, DollarSign, BarChart2, ArrowUpRight, Trophy } from "lucide-react";
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
import { Button } from "@/components/ui/button";

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '0';
    return typeof val === 'number' ? val.toLocaleString('pt-BR', { notation: "compact" }) : val;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus criativos e acompanhe resultados.</p>
        </div>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="creatives">Criativos</TabsTrigger>
            <TabsTrigger value="reports">Performance</TabsTrigger>
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
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10">
              <Megaphone className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-1">Nenhum criativo encontrado</h3>
              <p className="text-muted-foreground">Tente buscar outro termo ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {criativosFiltrados.map((criativo) => (
                <div key={criativo.id}>
                   <CreativeCard criativo={criativo} onEditName={(id, nome) => atualizarNomeCriativo({ id, nome })} onDelete={setDeleteId} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {isLoadingReports ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" /> Volume de Leads</CardDescription><CardTitle className="text-3xl font-bold">{reports?.marketing?.kpis?.totalMarketingLeads ?? 0}</CardTitle></CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Melhor Criativo</CardDescription><CardTitle className="text-xl font-bold truncate max-w-[90%]">{reports?.marketing?.kpis?.bestCreative?.criativo || 'N/A'}</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-6 pt-0">
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Vendas</span><span className="font-bold">{reports?.marketing?.kpis?.bestCreative?.conversions ?? 0}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Taxa</span><span className="font-bold text-green-600">{(reports?.marketing?.kpis?.bestCreative?.conversionRate || 0).toFixed(1)}%</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Canal Top Receita</CardDescription><CardTitle className="text-xl font-bold truncate">{reports?.marketing?.kpis?.bestSource?.name || 'N/A'}</CardTitle></CardHeader>
                  <CardContent><div className="flex items-end gap-2"><span className="text-2xl font-bold">R$ {formatValue(reports?.marketing?.kpis?.bestSource?.totalValue)}</span></div></CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Performance por Criativo</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reports?.marketing?.charts?.leadsVsConversionsByCreative || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Leads" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Conversões" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
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
                          outerRadius={80} 
                        >
                          {(reports?.marketing?.charts?.revenueBySourceData || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Detalhamento</CardTitle><Button variant="outline" size="sm"><ArrowUpRight className="h-4 w-4 mr-2" /> Exportar</Button></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Criativo</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead>Conversão</TableHead><TableHead className="text-right">Faturamento</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(reports?.marketing?.performanceTable || []).length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum dado disponível.</TableCell></TableRow>
                      ) : (
                        reports?.marketing?.performanceTable.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell><Badge variant="outline">{item.origem}</Badge></TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{item.criativo}</TableCell>
                            <TableCell className="text-right">{item.leads}</TableCell>
                            <TableCell className="text-right">{item.conversions}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-xs">{item.conversionRate.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">R$ {item.totalValue.toLocaleString('pt-BR')}</TableCell>
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
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir criativo?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o criativo da lista. Os leads vinculados manterão seu histórico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}