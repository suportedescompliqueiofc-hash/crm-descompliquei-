import { useState } from "react";
import { Megaphone, Search, Users, Target, DollarSign, BarChart2, ArrowUpRight, Trophy, Upload, Facebook, Eye, MousePointerClick, Edit2, Trash2, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativeCard } from "@/components/marketing/CreativeCard";
import { useMarketing, MetaMetrics, Criativo } from "@/hooks/useMarketing";
import { useReports } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaImportModal } from "@/components/marketing/MetaImportModal";
import { CreativeDetailsModal } from "@/components/marketing/CreativeDetailsModal";
import { AssociateCreativeModal } from "@/components/marketing/AssociateCreativeModal";
import { toast } from "sonner";

export default function Marketing() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  
  const { criativos, isLoading: isLoadingCreatives, atualizarNomeCriativo, deletarCriativo, atualizarMetricasCriativo, associarCriativo } = useMarketing(dateRange);
  const { reports, isLoading: isLoadingReports } = useReports(dateRange);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("meta");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Estado para edição e associação
  const [selectedCampaign, setSelectedCampaign] = useState<Criativo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [creativeToAssociate, setCreativeToAssociate] = useState<Criativo | null>(null);

  // --- LÓGICA DE SEPARAÇÃO ---
  const campanhasMeta = (criativos || []).filter(c => c.platform_metrics && c.platform_metrics.spend > 0);
  const criativosAssets = (criativos || []).filter(c => !c.platform_metrics || c.platform_metrics.spend === 0);

  const criativosFiltrados = criativosAssets.filter(c => {
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

  const handleEditClick = (campaign: Criativo) => {
    setSelectedCampaign(campaign);
    setIsDetailsModalOpen(true);
  };

  const handleAssociateClick = (campaign: Criativo) => {
    setCreativeToAssociate(campaign);
    setIsAssociateModalOpen(true);
  };

  const handleAssociateConfirm = (targetId: string) => {
    if (creativeToAssociate) {
      associarCriativo({ sourceId: creativeToAssociate.id, targetId });
    }
  };

  const handleMetricsImport = async (data: { id: string; metrics: MetaMetrics }[]) => {
    let successCount = 0;
    for (const item of data) {
      try {
        await atualizarMetricasCriativo({ id: item.id, metrics: item.metrics });
        successCount++;
      } catch (e) {
        console.error("Falha ao atualizar métricas:", e);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} criativos atualizados com sucesso!`);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '0';
    return typeof val === 'number' ? val.toLocaleString('pt-BR', { notation: "compact" }) : val;
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateDisplay = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '-';
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus criativos e acompanhe resultados.</p>
        </div>
        <div className="flex gap-2 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="meta" className="gap-2"><Facebook className="h-4 w-4" /> Campanhas Meta</TabsTrigger>
            <TabsTrigger value="creatives" className="gap-2"><Megaphone className="h-4 w-4" /> Criativos (WhatsApp)</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><BarChart2 className="h-4 w-4" /> Performance Geral</TabsTrigger>
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

        {/* ABA: CAMPANHAS META (IMPORTADAS) */}
        <TabsContent value="meta" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="default" className="gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4" /> Importar CSV do Gerenciador
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance de Anúncios (Meta Ads)</CardTitle>
              <CardDescription>
                Métricas importadas do Gerenciador de Anúncios. Dados baseados na última importação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCreatives ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : campanhasMeta.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <BarChart2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Nenhuma campanha importada</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    Importe seu arquivo CSV do Meta Ads para visualizar os custos e resultados por criativo aqui.
                  </p>
                  <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                    Importar Agora
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[280px]">Campanha / Criativo</TableHead>
                        <TableHead className="text-center w-[120px]">Início</TableHead>
                        <TableHead className="text-center w-[120px]">Término</TableHead>
                        <TableHead className="text-right">Valor Usado</TableHead>
                        <TableHead className="text-right">Resultados</TableHead>
                        <TableHead className="text-right">Custo p/ Res.</TableHead>
                        <TableHead className="text-right">Alcance</TableHead>
                        <TableHead className="text-right">Impressões</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right w-[140px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campanhasMeta.map((campanha) => {
                        const m = campanha.platform_metrics!;
                        return (
                          <TableRow key={campanha.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">{campanha.nome}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[260px]" title={campanha.titulo || ''}>
                                  Original: {campanha.titulo || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatDateDisplay(m.reporting_start)}
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatDateDisplay(m.reporting_end)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatMoney(m.spend)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-bold">{m.results}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-amber-700 font-medium">
                              {formatMoney(m.cost_per_result)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {m.reach.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {m.impressions.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={m.ctr > 1 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                {m.ctr.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatMoney(m.cpc)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                  onClick={() => handleAssociateClick(campanha)} 
                                  title="Associar a Criativo do CRM"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(campanha)} title="Editar">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(campanha.id)} title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives" className="space-y-6">
          {/* ... (mantido igual) ... */}
          {isLoadingCreatives ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10">
              <Megaphone className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-1">Nenhum criativo encontrado</h3>
              <p className="text-muted-foreground">Aqui aparecem apenas os criativos cadastrados manualmente para o CRM/WhatsApp.</p>
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
          {/* ... (mantido igual) ... */}
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

      <MetaImportModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen} 
        criativos={criativos || []} 
        onImport={handleMetricsImport} 
      />

      {selectedCampaign && (
        <CreativeDetailsModal
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          criativo={selectedCampaign}
          onEditName={atualizarNomeCriativo}
        />
      )}

      {creativeToAssociate && (
        <AssociateCreativeModal
          open={isAssociateModalOpen}
          onOpenChange={setIsAssociateModalOpen}
          sourceCreative={creativeToAssociate}
          availableCreatives={criativosAssets} // Passa apenas os criativos internos/manuais como opção de destino
          onConfirm={handleAssociateConfirm}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir campanha?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá a campanha e seus dados importados da lista. Os leads vinculados manterão seu histórico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}