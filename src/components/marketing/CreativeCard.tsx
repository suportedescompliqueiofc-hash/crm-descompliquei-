import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, Trash2, Users, DollarSign, ImageIcon } from "lucide-react";
import { Creative } from "@/hooks/useMarketing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreativeDetailsModal } from "./CreativeDetailsModal";

interface CreativeCardProps {
  creative: Creative;
  onEditName: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function CreativeCard({ creative, onEditName, onDelete }: CreativeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-all duration-200 group flex flex-col h-full">
        {/* Thumbnail Section */}
        <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setIsModalOpen(true)}>
          {creative.thumbnail_url ? (
            <img 
              src={creative.thumbnail_url} 
              alt={creative.custom_name || creative.title || "Criativo"} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
              <span className="text-xs">Sem imagem</span>
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/60 text-white hover:bg-black/70 backdrop-blur-sm">
              {creative.source_app || "N/A"}
            </Badge>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-4 flex-1">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-semibold text-base line-clamp-1" title={creative.custom_name || creative.title || "Sem título"}>
              {creative.custom_name || creative.title || "Sem título"}
            </h3>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 min-h-[2.5em]">
            {creative.body || "Sem descrição disponível."}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-primary/5 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-primary text-xs font-medium mb-0.5">
                <Users className="h-3 w-3" /> Leads
              </div>
              <span className="text-lg font-bold text-foreground">{creative.stats?.leads_count || 0}</span>
            </div>
            <div className="bg-green-50 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-green-700 text-xs font-medium mb-0.5">
                <DollarSign className="h-3 w-3" /> Vendas
              </div>
              <span className="text-lg font-bold text-foreground">{creative.stats?.sales_count || 0}</span>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="p-3 bg-muted/30 border-t flex justify-between items-center text-xs text-muted-foreground">
          <span>{format(new Date(creative.created_at), "dd/MM/yy", { locale: ptBR })}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsModalOpen(true)} title="Ver Detalhes">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsModalOpen(true)} title="Editar Nome">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(creative.id)} title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <CreativeDetailsModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        creative={creative} 
        onEditName={onEditName}
      />
    </>
  );
}