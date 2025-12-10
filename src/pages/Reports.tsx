import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  Filter,
  Target,
  CreditCard,
  BarChart2,
  Radio,
  Tag,
  UserCheck
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStages } from "@/hooks/useStages"; // Para obter etapas
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useLeadSources } from "@/hooks/useLeadSources";
import { useTags } from "@/hooks/useTags";

export default function Reports() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ etapa_id: "Todos", origem: "Todos", genero: "Todos", idade: "", tagId: "Todos" });
  
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

  if (isLoading || !reports) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }
  
  const periodDisplay = dateRange?.from && dateRange.to ? `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}` : 'Período Selecionado';
  const chartTooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' };
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise completa de performance e resultados</p>
        </div>
        <div className="flex gap-3 items-start">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filtros Avançados</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {showFilters && (
        <Card className="shadow-sm animate-fade-in">
          <CardHeader><CardTitle className="text-lg">Filtros Avançados</CardTitle><CardDescription>Aplique filtros para refinar os dados dos relatórios.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div><Label>Etapa do Funil</Label><Select value={filters.etapa_id} onValueChange={(v) => handleFilterChange('etapa_id', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas as Etapas</SelectItem>{stages.map(stage => <SelectItem key={stage.id} value={stage.id.toString()}>{stage.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Origem</Label><Select value={filters.origem} onValueChange={(v) => handleFilterChange('origem', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{allSources.map(origem => <SelectItem key={origem} value={origem}>{origem}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Gênero</Label><Select value={filters.genero} onValueChange={(v) => handleFilterChange('genero', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
              <div><Label>Idade</Label><Input type="number" value={filters.idade} onChange={(e) => handleFilterChange('idade', e.target.value)} placeholder="Idade exata" /></div>
              <div>
                <Label>Etiqueta</Label>
                <Select value={filters.tagId} onValueChange={(v) => handleFilterChange('tagId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Etiquetas</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="funnel">Funil de Vendas</TabsTrigger>
          <TabsTrigger value="conversions">Conversões</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-accent"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" />Novos Contatos</CardDescription><CardTitle className="text-3xl font-bold">{reports.kpis.totalContatos}</CardTitle></CardHeader></Card>
            <Card className="border-l-4 border-l-primary"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Tag className="h-4 w-4" />Novos Leads</CardDescription><CardTitle className="text-3xl font-bold">{reports.kpis.totalNovosLeads}</CardTitle></CardHeader></Card>
            <Card className="border-l-4 border-l-success"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Novos Pacientes</CardDescription><CardTitle className="text-3xl font-bold">{reports.kpis.totalPacientes}</CardTitle></CardHeader></Card>
            <Card className="border-l-4 border-l-primary"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Taxa de Conversão</CardDescription><CardTitle className="text-3xl font-bold">{reports.kpis.conversionRate}%</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Baseado nos dados filtrados</p></CardContent></Card>
            <Card className="border-l-4 border-l-secondary"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Ticket Médio</CardDescription><CardTitle className="text-3xl font-bold">R$ {reports.kpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Vendas realizadas no período</p></CardContent></Card>
            <Card className="border-l-4 border-l-accent"><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Clock className="h-4 w-4" />Tempo Médio no Funil</CardDescription><CardTitle className="text-3xl font-bold">{reports.kpis.tempoMedioFunil} dias</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Para leads convertidos (filtrados)</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Captados vs Convertidos</CardTitle><CardDescription>Evolução no período: {periodDisplay}</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={reports.charts.leadsCapturedData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} /><Tooltip contentStyle={chartTooltipStyle} /><Legend /><Line type="monotone" dataKey="captados" stroke="hsl(var(--primary))" strokeWidth={2} name="Captados" /><Line type="monotone" dataKey="convertidos" stroke="hsl(var(--success))" strokeWidth={2} name="Convertidos" /></LineChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Por Origem</CardTitle><CardDescription>Distribuição de captação</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={reports.charts.sourceData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" stroke="hsl(var(--muted-foreground))" className="text-xs" /><YAxis dataKey="source" type="category" stroke="hsl(var(--muted-foreground))" className="text-xs" width={100} /><Tooltip contentStyle={chartTooltipStyle} /><Bar dataKey="leads" fill="hsl(var(--accent))" name="Leads" /></BarChart></ResponsiveContainer></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle>Top 10 Criativos por Performance</CardTitle><CardDescription>Campanhas com melhor desempenho</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Criativo</TableHead><TableHead>Origem</TableHead><TableHead>Leads Gerados</TableHead><TableHead>Taxa Conversão</TableHead><TableHead>Ticket Médio</TableHead></TableRow></TableHeader><TableBody>{reports.charts.topCreativesData.map((item, i) => <TableRow key={i}><TableCell className="font-medium">{item.name}</TableCell><TableCell><Badge variant="outline">{item.origin}</Badge></TableCell><TableCell>{item.leads}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{item.conversion}</Badge></TableCell><TableCell>{item.ticket}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6"><Card><CardHeader><CardTitle>Funil de Vendas</CardTitle><CardDescription>Visualização completa da jornada do lead</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={400}><BarChart data={reports.funnel.funnelData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" stroke="hsl(var(--muted-foreground))" className="text-xs" /><YAxis dataKey="etapa" type="category" stroke="hsl(var(--muted-foreground))" className="text-xs" width={150} /><Tooltip contentStyle={chartTooltipStyle} /><Legend /><Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Quantidade" /></BarChart></ResponsiveContainer></CardContent></Card></TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Total Convertido</CardDescription><CardTitle className="text-2xl font-bold">R$ {reports.conversions.kpis.totalConvertido.toLocaleString('pt-BR')}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Target className="h-4 w-4" />Leads Convertidos</CardDescription><CardTitle className="text-2xl font-bold">{reports.conversions.kpis.leadsConvertidos}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Taxa de Conversão</CardDescription><CardTitle className="text-2xl font-bold">{reports.conversions.kpis.conversionRate}%</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Ticket Médio</CardDescription><CardTitle className="text-2xl font-bold">R$ {reports.conversions.kpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Conversões por Origem</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={reports.conversions.charts.conversoesPorOrigemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label><Cell fill="hsl(var(--primary))" /><Cell fill="hsl(var(--secondary))" /><Cell fill="hsl(var(--accent))" /><Cell fill="hsl(var(--muted))" /></Pie><Tooltip contentStyle={chartTooltipStyle} /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
            <Card className="lg:col-span-3"><CardHeader><CardTitle>Valor Convertido</CardTitle><CardDescription>Evolução no período: {periodDisplay}</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={reports.conversions.charts.valorConvertidoPorDia}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" className="text-xs" /><YAxis stroke="hsl(var(--muted-foreground))" className="text-xs" /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={chartTooltipStyle} /><Bar dataKey="valor" fill="hsl(var(--success))" name="Valor" /></BarChart></ResponsiveContainer></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle>Últimas 5 Conversões</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Atendente</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{reports.conversions.tables.ultimasConversoes.map((lead) => <TableRow key={lead.id}><TableCell className="font-medium">{lead.nome}</TableCell><TableCell>{lead.atendente}</TableCell><TableCell>R$ {lead.valor?.toLocaleString('pt-BR')}</TableCell><TableCell>{format(parseISO(lead.atualizado_em), 'dd/MM/yyyy')}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4"/> Faturamento Total</CardDescription><CardTitle className="text-2xl font-bold">R$ {reports.financial.totalFaturado.toLocaleString('pt-BR')}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Valor total de contratos fechados no período</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><CreditCard className="h-4 w-4"/> Ticket Médio Real</CardDescription><CardTitle className="text-2xl font-bold">R$ {reports.financial.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Faturamento / Total de Vendas ({reports.financial.totalVendas})</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><BarChart2 className="h-4 w-4"/> Eficiência Negociação</CardDescription><CardTitle className="text-2xl font-bold">{reports.financial.taxaEficiencia.toFixed(1)}%</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">% do valor orçado que foi efetivamente fechado</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Vendas Realizadas</CardDescription><CardTitle className="text-2xl font-bold">{reports.financial.totalVendas}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Contratos assinados no período</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Evolução do Faturamento</CardTitle><CardDescription>Receita diária no período selecionado</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={reports.financial.faturamentoPorDia}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" className="text-xs" /><YAxis stroke="hsl(var(--muted-foreground))" className="text-xs" tickFormatter={(value) => `R$${value/1000}k`} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={chartTooltipStyle} /><Bar dataKey="valor" fill="hsl(var(--primary))" name="Faturamento" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Métodos de Pagamento</CardTitle><CardDescription>Distribuição do faturamento</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><PieChart><Pie data={reports.financial.metodosPagamentoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>{reports.financial.metodosPagamentoData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={chartTooltipStyle} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" />Leads de Marketing</CardDescription><CardTitle className="text-2xl font-bold">{reports.marketing.kpis.totalMarketingLeads}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Total de leads de fontes conhecidas</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Target className="h-4 w-4" />Melhor Criativo</CardDescription><CardTitle className="text-2xl font-bold truncate">{reports.marketing.kpis.bestCreative?.criativo || 'N/A'}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{reports.marketing.kpis.bestCreative?.conversions || 0} conversões</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2"><Radio className="h-4 w-4" />Melhor Origem</CardDescription><CardTitle className="text-2xl font-bold truncate">{reports.marketing.kpis.bestSource?.name || 'N/A'}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">R$ {reports.marketing.kpis.bestSource?.totalValue.toLocaleString('pt-BR') || '0,00'} em faturamento</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3"><CardHeader><CardTitle>Leads vs Conversões por Criativo</CardTitle><CardDescription>Top 10 criativos com maior volume de leads</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={reports.marketing.charts.leadsVsConversionsByCreative}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" className="text-xs" /><YAxis stroke="hsl(var(--muted-foreground))" className="text-xs" /><Tooltip contentStyle={chartTooltipStyle} /><Legend /><Bar dataKey="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="Conversões" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Faturamento por Origem</CardTitle><CardDescription>Distribuição da receita por canal</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><PieChart><Pie data={reports.marketing.charts.revenueBySourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>{reports.marketing.charts.revenueBySourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={chartTooltipStyle} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle>Tabela de Performance de Marketing</CardTitle><CardDescription>Análise detalhada por origem e criativo</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Criativo</TableHead><TableHead>Leads</TableHead><TableHead>Conversões</TableHead><TableHead>Taxa de Conversão</TableHead><TableHead>Faturamento</TableHead><TableHead>Ticket Médio</TableHead></TableRow></TableHeader><TableBody>{reports.marketing.performanceTable.map((item, i) => <TableRow key={i}><TableCell><Badge variant="outline">{item.origem}</Badge></TableCell><TableCell className="font-medium">{item.criativo}</TableCell><TableCell>{item.leads}</TableCell><TableCell>{item.conversions}</TableCell><TableCell>{item.conversionRate.toFixed(1)}%</TableCell><TableCell>R$ {item.totalValue.toLocaleString('pt-BR')}</TableCell><TableCell>R$ {item.avgTicket.toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}