import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Plus, ChevronDown, Sparkles } from "lucide-react";
import { CadenceStep, useCadences } from "@/hooks/useCadences";
import { CadenceStepCard } from "./CadenceStepCard";

interface CadenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CadenceModal({ open, onOpenChange }: CadenceModalProps) {
  const { createCadence, isCreating } = useCadences();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [passos, setPassos] = useState<CadenceStep[]>([]);

  const handleAddStep = () => {
    const nextPos = passos.length + 1;
    setPassos([...passos, {
      posicao_ordem: nextPos,
      tempo_espera: nextPos === 1 ? 1 : 24, // Sugestão: 1 min/hora/dia se primeiro, senão 24
      unidade_tempo: nextPos === 1 ? 'minutos' : 'horas',
      tipo_mensagem: 'texto',
      conteudo: '',
      arquivo_path: null
    }]);
  };

  const updateStep = (index: number, updates: Partial<CadenceStep>) => {
    const newPassos = [...passos];
    newPassos[index] = { ...newPassos[index], ...updates };
    setPassos(newPassos);
  };

  const deleteStep = (index: number) => {
    const newPassos = passos
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, posicao_ordem: i + 1 }));
    setPassos(newPassos);
  };

  const handleSave = () => {
    if (!nome || passos.length === 0) return;
    createCadence({ nome, descricao, passos }, {
      onSuccess: () => {
        onOpenChange(false);
        setNome("");
        setDescricao("");
        setPassos([]);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Nova Cadência
          </DialogTitle>
          <DialogDescription>Construa seu fluxo de mensagens automáticas.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pt-2 space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Nome da Cadência *</Label>
                  <Input 
                    placeholder="Ex: Recuperação de Lead" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Descrição (Interna)</Label>
                  <Input 
                    placeholder="Objetivo deste fluxo..." 
                    value={descricao} 
                    onChange={e => setDescricao(e.target.value)} 
                    className="h-11"
                  />
                </div>
              </div>

              {/* Fluxograma */}
              <div className="flex flex-col items-center space-y-4 pb-10">
                <div className="bg-primary/10 text-primary border border-primary/20 px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[2px]">
                  Início do Fluxo
                </div>

                <div className="w-[2px] h-6 bg-muted-foreground/20 relative">
                  <ChevronDown className="absolute -bottom-2 -left-[7px] h-4 w-4 text-muted-foreground/20" />
                </div>

                <div className="w-full max-w-2xl space-y-6">
                  {passos.map((step, idx) => (
                    <div key={idx} className="space-y-4">
                      <CadenceStepCard 
                        step={step} 
                        isLast={idx === passos.length - 1} 
                        onUpdate={(upd) => updateStep(idx, upd)}
                        onDelete={() => deleteStep(idx)}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-[2px] h-6 bg-muted-foreground/20 relative">
                          <ChevronDown className="absolute -bottom-2 -left-[7px] h-4 w-4 text-muted-foreground/20" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button 
                    variant="outline" 
                    className="w-full h-14 border-dashed bg-muted/5 hover:bg-muted/20 text-muted-foreground hover:text-primary transition-all group"
                    onClick={handleAddStep}
                  >
                    <Plus className="mr-2 h-4 w-4 group-hover:scale-125 transition-transform" /> 
                    Adicionar Passo {passos.length + 1}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            className="bg-primary hover:bg-primary/90 gap-2 min-w-[140px]" 
            onClick={handleSave}
            disabled={isCreating || !nome || passos.length === 0}
          >
            <Save className="h-4 w-4" />
            {isCreating ? "Salvando..." : "Salvar Fluxo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}