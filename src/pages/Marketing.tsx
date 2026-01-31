import { useState } from "react";
import { Megaphone, Search, Users, Target, DollarSign, BarChart2, ArrowUpRight, Trophy, Upload, Facebook, Eye, MousePointerClick, Edit2, Trash2, Link as LinkIcon, Activity, PlusCircle, Calculator } from "lucide-react";
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
import { MarketingSpendModal } from "@/components/marketing/MarketingSpendModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Marketing() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  
  const { 
    criativos, 
    manualSpend, 
    totalSales,
    isLoading: isLoadingCreatives, 
    atualizarNomeCriativo, 
    deletarCriativo, 
    atualizarMetricasCriativo, 
    associarCriativo,
    adicionarInvestimentoManual,
    toggleAdSpendInclusion
  } = useMarketing(dateRange);
  
  const { reports, isLoading: isLoadingReports } = useReports(dateRange);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("meta");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
  
  // Estado para edição e associação
  const [selectedCampaign, setSelectedCampaign] = useState<Criativo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [creativeToAssociate, setCreativeToAssociate] = useState<Criativo | null>(null);

  // --- LÓGICA DE SEPARAÇÃO CORRIGIDA ---
  // Campanhas Meta: Apenas se tiver métricas E gasto maior que 0
  const campanhasMeta = (criativos || []).filter(c => c.platform_metrics && (c.platform_metrics.spend || 0) > 0);
  
  // Criativos Assets (Biblioteca): Se NÃO tiver métricas, OU métricas vazias, OU gasto zerado/indefinido
  const criativosAssets = (criativos || []).filter(c => !c.platform_metrics || !c.platform_metrics.spend || c.platform_metrics.spend === 0);

  // Cálculos Acumulados (Meta Ads)
  const metaSpend = campanhasMeta.reduce((acc, c) => {
    if (c.platform_metrics?.included_in_dashboard) {
        return acc + (c.platform_metrics.spend || 0);
    }
    return acc;
  }, 0);

  const metaSpendDisplay = campanhasMeta.reduce((acc, c) => acc + (c.platform_metrics?.spend || 0), 0);
  const totalResults = campanhasMeta.reduce((acc, c) => acc + (c.platform_metrics?.results || 0), 0);
  const totalReach = campanhasMeta.reduce((acc, c) => acc + (c.platform_metrics?.reach || 0), 0);
  const totalImpressions = campanhasMeta.reduce((acc, c) => acc + (c.platform_metrics?.impressions || 0), 0);
  const totalClicks = campanhasMeta.reduce((acc, c) => acc + (c.platform_metrics?.clicks || 0), 0);
  
  const avgCostPerResult = totalResults > 0 ? metaSpendDisplay / totalResults : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? metaSpendDisplay / totalClicks : 0;

  const totalInvestment = metaSpend + manualSpend;
  const cac = totalSales > 0 ? totalInvestment / totalSales : 0;

  const criativosFiltrados = criativosAssets.filter(c => {
    if (!searchTerm) return true; // Importante: Mostra todos se não houver busca
    
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
      associarCriativo({ campaignId: creativeToAssociate.id, creativeId: targetId });
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
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header Responsivo */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Gerencie seus criativos e acompanhe resultados.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" />
          </div>
          <Button variant="outline" className="gap-2 h-10 shadow-sm" onClick={() => setIsSpendModalOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* KPI Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Investimento Total</p>
              <h3 className="text-2xl font-bold text-primary truncate">{formatMoney(totalInvestment)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                Ads: {formatMoney(metaSpend)} + Manual: {formatMoney(manualSpend)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-30 flex-shrink-0" />
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Vendas (Período)</p>
              <h3 className="text-2xl font-bold truncate">{totalSales}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Base para cálculo do CAC</p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground opacity-30 flex-shrink-0" />
          </CardContent>
        </Card>

        <Card className={cn("shadow-sm sm:col-span-2 lg:col-span-1", cac > 0 ? "border-green-200 bg-green-50/50" : "")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">CAC Global</p>
              <h3 className="text-2xl font-bold text-green-700 truncate">{formatMoney(cac)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Custo de Aquisição de Cliente</p>
            </div>
            <Calculator className="h-8 w-8 text-green-600 opacity-30 flex-shrink-0" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Barra de Abas e Busca Adaptável */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <TabsList className="inline-flex w-full sm:w-auto bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="meta" className="gap-2 text-xs sm:text-sm"><Facebook className="h-4 w-4" /> Meta Ads</TabsTrigger>
              <TabsTrigger value="creatives" className="gap-2 text-xs sm:text-sm"><Megaphone className="h-4 w-4" /> Criativos</TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 text-xs sm:text-sm"><BarChart2 className="h-4 w-4" /> Relatórios</TabsTrigger>
            </TabsList>
          </div>
          
          {activeTab === 'creatives' && (
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar criativo..." 
                className="pl-10 h-10 shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          )}
        </div>

        {/* ABA: CAMPANHAS META (IMPORTADAS) */}
        <TabsContent value="meta" className="space-y-6 outline-none">
          <div className="flex justify-end">
            <Button variant="default" className="gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white w-full sm:w-auto h-10 shadow-sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4" /> Importar CSV Meta
            </Button>
          </div>

          <Card className="border-none shadow-none sm:border sm:shadow-sm">
            <CardHeader className="hidden sm:block">
              <CardTitle>Performance de Anúncios (Meta Ads)</CardTitle>
              <CardDescription>Métricas importadas do Gerenciador de Anúncios.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isLoadingCreatives ? (
                <div className="space-y-4 px-4 sm:px-0">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              ) : campanhasMeta.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <Facebook className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Nenhuma campanha importada</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Faça o upload do CSV do Gerenciador para ver os custos e resultados por criativo.
                  </p>
                  <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>Importar Agora</Button>
                </div>
              ) : (
                <>
                  {/* Visualização Mobile: Cards */}
                  <div className="grid grid-cols-1 gap-4 md:hidden px-4 mb-8">
                    {campanhasMeta.map((campanha) => {
                      const m = campanha.platform_metrics!;
                      const isIncluded = m.included_in_dashboard;
                      
                      return (
                        <div key={campanha.id} className="p-4 border rounded-xl bg-card shadow-sm space-y-4 hover:border-primary/30 transition-colors">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground truncate">{campanha.nome}</h4>
                              <p className="text-[10px] text-muted-foreground truncate italic">{campanha.titulo || '-'}</p>
                              {campanha.url_thumbnail && (
                                <Badge variant="secondary" className="mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[9px] h-5">
                                  <Eye className="h-3 w-3 mr-1" /> Visual Vinculado
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-9 w-9 rounded-full shrink-0", 
                                isIncluded ? "text-green-600 bg-green-50" : "text-muted-foreground/30 bg-muted/20"
                              )}
                              onClick={() => toggleAdSpendInclusion({ id: campanha.id, included: !isIncluded })}
                            >
                              <DollarSign className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed">
                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Gasto</span>
                              <span className="text-sm font-bold text-foreground">{formatMoney(m.spend)}</span>
                            </div>
                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Resultados</span>
                              <span className="text-sm font-bold text-primary">{m.results}</span>
                            </div>
                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Custo/Res</span>
                              <span className="text-sm font-bold text-amber-700">{formatMoney(m.cost_per_result)}</span>
                            </div>
                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">CTR</span>
                              <span className="text-sm font-bold text-green-600">{m.ctr.toFixed(2)}%</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center gap-2 pt-2">
                             <span className="text-[10px] text-muted-foreground">Fim: {formatDateDisplay(m.reporting_end)}</span>
                             <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleAssociateClick(campanha)}><LinkIcon className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(campanha)}><Edit2 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(campanha.id)}><Trash2 className="h-4 w-4" /></Button>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visualização Desktop: Tabela */}
                  <div className="hidden md:block rounded-md border overflow-hidden mb-8">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] text-center">Inc.</TableHead>
                          <TableHead className="w-[250px]">Campanha</TableHead>
                          <TableHead className="text-center w-[100px]">Data</TableHead>
                          <TableHead className="text-right">Gasto</TableHead>
                          <TableHead className="text-right">Resultados</TableHead>
                          <TableHead className="text-right">Custo/Res</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right w-[120px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campanhasMeta.map((campanha) => {
                          const m = campanha.platform_metrics!;
                          const isIncluded = m.included_in_dashboard;
                          return (
                            <TableRow key={campanha.id} className="group">
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn("h-8 w-8", isIncluded ? "text-green-600 bg-green-50" : "text-muted-foreground/30")}
                                  onClick={() => toggleAdSpendInclusion({ id: campanha.id, included: !isIncluded })}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-0.5 max-w-[230px]">
                                  <span className="truncate">{campanha.nome}</span>
                                  <span className="text-[10px] text-muted-foreground truncate">{campanha.titulo || '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{formatDateDisplay(m.reporting_end)}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(m.spend)}</TableCell>
                              <TableCell className="text-right"><Badge variant="secondary" className="font-bold">{m.results}</Badge></TableCell>
                              <TableCell className="text-right text-amber-700 font-medium">{formatMoney(m.cost_per_result)}</TableCell>
                              <TableCell className="text-right text-xs font-medium">{m.ctr.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleAssociateClick(campanha)}><LinkIcon className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(campanha)}><Edit2 className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(campanha.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Cards de Resumo Acumulado (Meta) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Gasto Acumulado</span>
                      <div className="text-xl font-bold">{formatMoney(metaSpendDisplay)}</div>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Resultados Totais</span>
                      <div className="text-xl font-bold">{totalResults}</div>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Custo Médio / Res</span>
                      <div className="text-xl font-bold text-amber-600">{formatMoney(avgCostPerResult)}</div>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">CTR Médio</span>
                      <div className="text-xl font-bold text-green-600">{avgCTR.toFixed(2)}%</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives" className="outline-none">
          {isLoadingCreatives ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 sm:px-0">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
            </div>
          ) : criativosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Megaphone className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <h3 className="text-lg font-semibold">Nenhum criativo manual</h3>
              <p className="text-sm text-muted-foreground">Cadastre criativos para usar em campanhas de WhatsApp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 sm:px-0">
              {criativosFiltrados.map((criativo) => (
                <CreativeCard key={criativo.id} criativo={criativo} onEditName={(id, nome) => atualizarNomeCriativo({ id, nome })} onDelete={setDeleteId} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 outline-none px-4 sm:px-0">
          {isLoadingReports ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Volume Leads</CardDescription><CardTitle className="text-2xl font-bold">{reports?.marketing?.kpis?.totalMarketingLeads ?? 0}</CardTitle></CardHeader>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> Melhor Criativo</CardDescription><CardTitle className="text-lg font-bold truncate">{reports?.marketing?.kpis?.bestCreative?.criativo || 'N/A'}</CardTitle></CardHeader>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /> Maior Receita</CardDescription><CardTitle className="text-lg font-bold truncate">{reports?.marketing?.kpis?.bestSource?.name || 'N/A'}</CardTitle></CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                  <CardHeader><CardTitle className="text-base">Leads vs Vendas por Criativo</CardTitle></CardHeader>
                  <CardContent className="h-[300px] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reports?.marketing?.charts?.leadsVsConversionsByCreative || []} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar dataKey="Leads" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Conversões" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader><CardTitle className="text-base">Distribuição de Receita</CardTitle></CardHeader>
                  <CardContent className="h-[300px] p-2">
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
                        <Tooltip formatter={(value: number) => formatMoney(value)} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <MetaImportModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} criativos={criativos || []} onImport={handleMetricsImport} />
      <MarketingSpendModal open={isSpendModalOpen} onOpenChange={setIsSpendModalOpen} onSave={adicionarInvestimentoManual} />

      {selectedCampaign && (
        <CreativeDetailsModal open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} criativo={selectedCampaign} onEditName={atualizarNomeCriativo} />
      )}

      {creativeToAssociate && (
        <AssociateCreativeModal open={isAssociateModalOpen} onOpenChange={setIsAssociateModalOpen} sourceCreative={creativeToAssociate} availableCreatives={criativosAssets} onConfirm={handleAssociateConfirm} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Excluir campanha?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá a campanha da lista. Os leads vinculados manterão seu histórico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0"><AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive rounded-xl">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}