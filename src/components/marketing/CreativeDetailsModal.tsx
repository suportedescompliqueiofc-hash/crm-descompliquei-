import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Save, Users, DollarSign, Target, Calendar, TrendingUp, CreditCard } from "lucide-react";
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

  const stats = criativo.stats || { contagem_leads: 0, contagem_vendas: 0, faturamento: 0 };
  
  const taxaConversao = stats.contagem_leads > 0 
    ? ((stats.contagem_vendas / stats.contagem_leads) * 100).toFixed(1) 
    : "0.0";
    
  const ticketMedio = stats.contagem_vendas > 0 
    ? stats.faturamento / stats.contagem_vendas 
    : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Anúncio
            {criativo.plataforma && <Badge variant="outline" className="capitalize">{criativo.plataforma}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Header Image & Basic Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video bg-black/5 flex items-center justify-center">
              {criativo.url_thumbnail ? (
                <img 
                  src={criativo.url_thumbnail} 
                  alt="Thumbnail" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <span className="text-sm">Sem pré-visualização</span>
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
                <p className="text-sm font-medium border p-2 rounded-md bg-muted/20 min-h-[2.5rem] line-clamp-2" title={criativo.titulo || ""}>
                  {criativo.titulo || "N/A"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2">
                <div>
                  <span className="block font-semibold mb-1">Origem</span>
                  <Badge variant="secondary" className="capitalize">{criativo.aplicativo || "Desconhecido"}</Badge>
                </div>
                <div>
                  <span className="block font-semibold mb-1">Data de Criação</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> 
                    {format(new Date(criativo.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Performance Financeira
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card Leads */}
              <div className="border rounded-lg p-4 bg-card flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Leads</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{stats.contagem_leads}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Total captado</p>
                </div>
              </div>

              {/* Card Vendas */}
              <div className="border rounded-lg p-4 bg-card flex flex-col justify-between hover:border-green-500/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium uppercase">Vendas</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{stats.contagem_vendas}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 hover:bg-green-100">
                      {taxaConversao}% conv.
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card Faturamento (Agora estilo padrão e menor) */}
              <div className="border rounded-lg p-4 bg-card flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium uppercase">Faturamento</span>
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(stats.faturamento)}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Total gerado</p>
                </div>
              </div>

              {/* Card Ticket Médio (Separado) */}
              <div className="border rounded-lg p-4 bg-card flex flex-col justify-between hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium uppercase">Ticket Médio</span>
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(ticketMedio)}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Por venda</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Content */}
          {criativo.conteudo && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Texto do Anúncio (Copy)</Label>
              <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border max-h-40 overflow-y-auto font-mono text-xs">
                {criativo.conteudo}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between border-t pt-4">
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