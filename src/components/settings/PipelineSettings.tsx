import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Shield, GripVertical, Sparkles, Target } from "lucide-react";
import { useStagesManager } from "@/hooks/useStagesManager";
import { Stage } from "@/hooks/useStages";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/useProfile";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const SortableStageRow = ({ 
  stage, 
  onEdit, 
  onDelete, 
  onToggleFunnel 
}: { 
  stage: Stage; 
  onEdit: (stage: Stage) => void; 
  onDelete: (stage: Stage) => void;
  onToggleFunnel: (id: number, current: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as 'relative',
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="font-medium flex items-center gap-2">
        <span {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </span>
        {stage.nome}
      </TableCell>
      <TableCell>
        <Badge style={{ backgroundColor: stage.cor, color: 'white' }}>
          {stage.nome}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onToggleFunnel(stage.id, !!stage.em_funil)}
          className={cn(
            "h-9 w-9 rounded-full transition-all",
            stage.em_funil ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-muted-foreground/40"
          )}
          title={stage.em_funil ? "Etapa faz parte do funil" : "Definir como etapa do funil"}
        >
          <Target className={cn("h-5 w-5", stage.em_funil && "animate-pulse")} />
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(stage)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(stage)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export function PipelineSettings() {
  const { stages, isLoading: isLoadingStages, createStage, updateStage, deleteStage, updateStagesOrder, toggleFunnelStage } = useStagesManager();
  const { role, isLoading: isLoadingProfile } = useProfile();
  const [localStages, setLocalStages] = useState<Stage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isDeleting, setIsDeleting] = useState<Stage | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#cccccc");
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  if (isLoadingProfile || isLoadingStages) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground animate-pulse">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }



  const openModal = (stage: Stage | null = null) => {
    if (stage) {
      setEditingStage(stage);
      setStageName(stage.nome);
      setStageColor(stage.cor);
    } else {
      setEditingStage(null);
      setStageName("");
      setStageColor("#cccccc");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!stageName.trim()) return;
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, nome: stageName, cor: stageColor });
    } else {
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.posicao_ordem), 0);
      createStage.mutate({ nome: stageName, cor: stageColor, posicao_ordem: maxOrder + 1, em_funil: false } as any);
    }
    setIsModalOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over!.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        const updates = newOrder.map((stage, index) => ({
          id: stage.id,
          posicao_ordem: index + 1,
        }));
        
        updateStagesOrder.mutate(updates);
        return newOrder;
      });
    }
  };

  const handleSeedStages = async () => {
    if (!confirm("Isso irá apagar as etapas atuais e redefinir para o Padrão. Continuar?")) return;
    setIsResetting(true);
    try {
      await supabase.functions.invoke('seed-stages');
      toast.success("Etapas padronizadas!");
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Etapas do Pipeline</CardTitle>
          <CardDescription>Gerencie as etapas do seu funil. Clique no alvo para definir quais etapas entram nas métricas de conversão real.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSeedStages} disabled={isResetting}>
            <Sparkles className="h-4 w-4 text-primary" />
            Padrão
          </Button>
          <Button className="gap-2" onClick={() => openModal()}>
            <Plus className="h-4 w-4" />
            Nova Etapa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Visualização</TableHead>
                <TableHead className="text-center">No Funil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={localStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {isLoadingStages ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                ) : localStages.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Nenhuma etapa criada.</TableCell></TableRow>
                ) : (
                  localStages.map((stage) => (
                    <SortableStageRow 
                      key={stage.id} 
                      stage={stage} 
                      onEdit={openModal}
                      onDelete={setIsDeleting}
                      onToggleFunnel={(id, curr) => toggleFunnelStage({ id, incluir: !curr })}
                    />
                  ))
                )}
              </TableBody>
            </SortableContext>
          </Table>
        </DndContext>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStage ? "Editar Etapa" : "Nova Etapa"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Nome</Label><Input value={stageName} onChange={(e) => setStageName(e.target.value)} /></div>
            <div><Label>Cor</Label><div className="flex items-center gap-2 mt-2"><Input type="color" value={stageColor} onChange={(e) => setStageColor(e.target.value)} className="w-12 h-10 p-1" /><Input value={stageColor} onChange={(e) => setStageColor(e.target.value)} /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta etapa?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (isDeleting) deleteStage.mutate(isDeleting.id); setIsDeleting(null); }} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}