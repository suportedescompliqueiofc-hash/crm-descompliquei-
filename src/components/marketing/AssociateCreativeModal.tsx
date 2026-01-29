import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Link } from "lucide-react";
import { Criativo } from "@/hooks/useMarketing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AssociateCreativeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCreative: Criativo | null;
  availableCreatives: Criativo[];
  onConfirm: (targetId: string) => void;
}

export function AssociateCreativeModal({ 
  open, 
  onOpenChange, 
  sourceCreative, 
  availableCreatives, 
  onConfirm 
}: AssociateCreativeModalProps) {
  const [targetId, setTargetId] = useState<string>("");

  const filteredCreatives = useMemo(() => {
    // Remove o próprio criativo da lista para evitar auto-seleção
    return availableCreatives.filter(c => c.id !== sourceCreative?.id);
  }, [availableCreatives, sourceCreative]);

  const handleConfirm = () => {
    if (targetId) {
      onConfirm(targetId);
      onOpenChange(false);
      setTargetId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Associar Criativo
          </DialogTitle>
          <DialogDescription>
            Unifique as métricas desta campanha importada com um criativo existente no CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/30 p-3 rounded border">
            <Label className="text-xs text-muted-foreground">Origem (Métricas)</Label>
            <p className="font-medium text-sm truncate">{sourceCreative?.nome || "Campanha Selecionada"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gasto: R$ {sourceCreative?.platform_metrics?.spend.toFixed(2)} | Leads: {sourceCreative?.stats?.contagem_leads}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Destino (Criativo Interno)</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o criativo..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCreatives.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome || c.titulo || "Sem Nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O criativo selecionado receberá as métricas de gasto e impressões. O registro original será removido para evitar duplicidade.
            </p>
          </div>

          <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription className="text-xs">
              Esta ação mescla os dados e remove a campanha importada da lista, mantendo apenas o criativo unificado.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!targetId}>Confirmar Associação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}