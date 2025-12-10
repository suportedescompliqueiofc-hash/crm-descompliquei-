import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, TrendingUp, ShoppingCart, Percent, Pencil, Trash2 } from "lucide-react";
import { useVendas, Venda } from "@/hooks/useVendas";
import { VendaModal } from "@/components/vendas/VendaModal";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Vendas() {
  const today = new Date();
  const initialDateRange: DateRange = { 
    from: startOfMonth(today), 
    to: endOfMonth(today) 
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const { vendas, isLoading, deleteVenda } = useVendas(dateRange);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [isDeleting, setIsDeleting] = useState<Venda | null>(null);

  const metrics = useMemo(() => {
    if (isLoading || vendas.length === 0) {
      return { totalFaturado: 0, ticketMedio: 0, vendasNoPeriodo: 0, taxaConversao: 0 };
    }

    const totalFaturado = vendas.reduce((acc, venda) => acc + venda.valor_fechado, 0);
    const ticketMedio = totalFaturado / vendas.length;
    
    const vendasNoPeriodo = vendas.length;

    const vendasComOrcamento = vendas.filter(v => v.valor_orcado && v.valor_orcado > 0);
    const totalOrcado = vendasComOrcamento.reduce((acc, v) => acc + (v.valor_orcado || 0), 0);
    const totalFechadoDeOrcados = vendasComOrcamento.reduce((acc, v) => acc + v.valor_fechado, 0);
    const taxaConversao = totalOrcado > 0 ? (totalFechadoDeOrcados / totalOrcado) * 100 : 0;

    return { totalFaturado, ticketMedio, vendasNoPeriodo, taxaConversao };
  }, [vendas, isLoading]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleEdit = (venda: Venda) => {
    setEditingVenda(venda);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    if (!open) {
      setEditingVenda(null);
    }
    setIsModalOpen(open);
  };

  const handleDeleteRequest = (venda: Venda) => {
    setIsDeleting(venda);
  };

  const confirmDelete = () => {
    if (isDeleting) {
      deleteVenda(isDeleting.id);
    }
    setIsDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground mt-1">Controle de contratos e faturamento.</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button onClick={() => handleCloseModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Registrar Venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Faturamento Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(metrics.totalFaturado)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Ticket Médio</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Vendas (Período)</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">+{metrics.vendasNoPeriodo}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Conversão (Orçado x Fechado)</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.taxaConversao.toFixed(1)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>Todos os contratos fechados registrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor Fechado</TableHead>
                <TableHead>Data Fechamento</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Valor Orçado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vendas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma venda registrada no período.</TableCell></TableRow>
              ) : (
                vendas.map(venda => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium">{venda.leads?.nome || 'Cliente não encontrado'}</TableCell>
                    <TableCell className="font-semibold text-success">{formatCurrency(venda.valor_fechado)}</TableCell>
                    <TableCell>{format(parseISO(venda.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell><Badge variant="outline">{venda.forma_pagamento || 'N/A'}</Badge></TableCell>
                    <TableCell>{venda.valor_orcado ? formatCurrency(venda.valor_orcado) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(venda)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteRequest(venda)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VendaModal 
        open={isModalOpen} 
        onOpenChange={handleCloseModal} 
        venda={editingVenda}
      />

      {/* AlertDialog para Confirmação de Exclusão */}
      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a venda de {isDeleting?.leads?.nome || 'este cliente'} no valor de {isDeleting?.valor_fechado ? formatCurrency(isDeleting.valor_fechado) : 'R$ 0,00'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Sim, excluir venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}