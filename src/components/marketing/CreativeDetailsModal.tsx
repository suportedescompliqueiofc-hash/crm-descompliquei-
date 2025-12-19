import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Save, Users, DollarSign, Target, Calendar } from "lucide-react";
import { Criativo } from "@/hooks/useMarketing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreativeDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criativo: Criativo;
  onEditName: (id: string, name: string) => void;
}

export function CreativeDetailsModal({ open, onOpenChange, criativo, onEditName }: CreativeDetailsModalProps) {
  const [nomePersonalizado, setNomePersonalizado] = useState("");

  useEffect(() => {
    if (open) {
      setNomePersonalizado(criativo.nome || "");
    }
  }, [open, criativo]);

  const handleSave = () => {
    onEditName(criativo.id, nomePersonalizado);
  };

  const taxaConversao = criativo.stats?.contagem_leads 
    ? ((criativo.stats.contagem_vendas / criativo.stats.contagem_leads) * 100).toFixed(1) 
    : "0.0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Anúncio
            {criativo.plataforma && <Badge variant="outline">{criativo.plataforma}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Header Image & Basic Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative rounded-lg overflow-hidden border bg-muted aspect-square md:aspect-auto">
              {criativo.url_thumbnail ? (
                <img 
                  src={criativo.url_thumbnail} 
                  alt="Thumbnail" 
                  className="w-full h-full object-contain bg-black/5"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome de Identificação</Label>
                <div className="flex gap-2">
                  <Input 
                    id="name" 
                    value={nomePersonalizado} 
                    onChange={(e) => setNomePersonalizado(e.target.value)} 
                    placeholder="Ex: Vídeo Depoimento - Julho"
                  />
                  <Button onClick={handleSave} size="icon" variant="outline"><Save className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Defina um nome fácil para identificar este criativo nos relatórios.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título Original (Meta)</Label>
                <p className="text-sm font-medium border p-2 rounded-md bg-muted/20 min-h-[2.5rem]">
                  {criativo.titulo || "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Origem</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{criativo.aplicativo || "Desconhecido"}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> 
                    {format(new Date(criativo.criado_em), "PPP", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Performance do Criativo</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-3 bg-card flex flex-col items-center justify-center text-center">
                <Users className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{criativo.stats?.contagem_leads || 0}</span>
                <span className="text-xs text-muted-foreground">Leads Gerados</span>
              </div>
              <div className="border rounded-lg p-3 bg-card flex flex-col items-center justify-center text-center">
                <DollarSign className="h-5 w-5 text-green-600 mb-1" />
                <span className="text-2xl font-bold">{criativo.stats?.contagem_vendas || 0}</span>
                <span className="text-xs text-muted-foreground">Contratos Fechados</span>
              </div>
              <div className="border rounded-lg p-3 bg-card flex flex-col items-center justify-center text-center">
                <Target className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-2xl font-bold">{taxaConversao}%</span>
                <span className="text-xs text-muted-foreground">Conversão</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ad Content */}
          <div className="space-y-2">
            <Label>Texto do Anúncio (Copy)</Label>
            <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border max-h-40 overflow-y-auto">
              {criativo.conteudo || "Nenhum texto disponível."}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {criativo.url_midia ? (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href={criativo.url_midia} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Anúncio Original
              </a>
            </Button>
          ) : <div />}
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}