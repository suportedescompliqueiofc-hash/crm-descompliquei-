import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GitMerge, MoreVertical, Trash2, Calendar, Layout, MessageSquare, ArrowRight } from "lucide-react";
import { CadenceModal } from "@/components/cadences/CadenceModal";
import { useCadences, Cadence } from "@/hooks/useCadences";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Cadences() {
  const { cadences, isLoading, deleteCadence } = useCadences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cadenceToDelete, setCadenceToDelete] = useState<Cadence | null>(null);

  const confirmDelete = () => {
    if (cadenceToDelete) {
      deleteCadence(cadenceToDelete.id);
      setCadenceToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GitMerge className="h-8 w-8 text-primary" />
            Cadência de Follow-Up
          </h1>
          <p className="text-muted-foreground mt-1">Crie fluxos automáticos de mensagens para nutrir seus leads.</p>
        </div>
        
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 shadow-md h-10">
          <Plus className="h-4 w-4" /> Nova Cadência
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : cadences.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/5 flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted p-4 rounded-full mb-4">
            <GitMerge className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <CardTitle className="text-muted-foreground mb-2">Nenhuma cadência criada ainda.</CardTitle>
          <Button variant="link" onClick={() => setIsModalOpen(true)} className="text-primary font-bold underline-offset-4">Criar a primeira</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cadences.map(cadence => (
            <Card key={cadence.id} className="group hover:border-primary/50 transition-all duration-300 shadow-sm relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setCadenceToDelete(cadence)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="pb-4">
                <Badge variant="outline" className="w-fit mb-2 text-[10px] uppercase font-bold tracking-widest bg-primary/5 text-primary border-primary/20">
                  Fluxo de Mensagens
                </Badge>
                <CardTitle className="text-lg line-clamp-1">{cadence.nome}</CardTitle>
                <CardDescription className="line-clamp-2 h-10">{cadence.descricao || "Sem descrição."}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-t border-dashed pt-4 mt-auto">
                    <div className="flex items-center gap-1.5">
                        <Layout className="h-3.5 w-3.5" /> {cadence.passos?.length || 0} Passos
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> {format(new Date(cadence.criado_em), "dd/MM/yy", { locale: ptBR })}
                    </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between group/path cursor-default">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm">1</div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm opacity-60">2</div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm opacity-30">...</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary hover:bg-primary/10">Ver Detalhes</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CadenceModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <AlertDialog open={!!cadenceToDelete} onOpenChange={() => setCadenceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cadência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá permanentemente o fluxo "{cadenceToDelete?.nome}". Leads que estão atualmente neste fluxo deixarão de receber as mensagens agendadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Excluir Permanentemente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}