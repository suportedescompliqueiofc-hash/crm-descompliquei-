import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Clock, Upload, Plus, X, MessageSquare, Mic, ImageIcon, Video, FileText, CheckCircle2, FileCheck } from "lucide-react";
import { CadenceStep } from "@/hooks/useCadences";
import { useRef } from "react";

interface CadenceStepCardProps {
  step: CadenceStep;
  isLast: boolean;
  onUpdate: (updates: Partial<CadenceStep>) => void;
  onDelete: () => void;
}

export function CadenceStepCard({ step, isLast, onUpdate, onDelete }: CadenceStepCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStepIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'imagem': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Círculo com número do passo */}
      <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold z-10 shadow-sm">
        {step.posicao_ordem}
      </div>

      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5 flex gap-4">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tempo de Espera */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" /> Tempo de Espera
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min="1" 
                    value={step.tempo_espera} 
                    onChange={e => onUpdate({ tempo_espera: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <Select 
                    value={step.unidade_tempo} 
                    onValueChange={v => onUpdate({ unidade_tempo: v as any })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutos">Minutos</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                      <SelectItem value="dias">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  {step.tempo_espera} {step.unidade_tempo} após o passo anterior
                </p>
              </div>

              {/* Tipo de Mensagem */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                  {getStepIcon(step.tipo_mensagem)} Tipo de Mensagem
                </div>
                <Select 
                  value={step.tipo_mensagem} 
                  onValueChange={v => onUpdate({ tipo_mensagem: v as any, temp_file: null, arquivo_path: null })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conteúdo / Mídia */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Conteúdo / Legenda</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] text-primary hover:text-primary/80 gap-1"
                  onClick={() => onUpdate({ conteudo: (step.conteudo || "") + "{{nome_lead}}" })}
                >
                  <Plus className="h-3 w-3" /> Inserir {"{{nome_lead}}"}
                </Button>
              </div>
              
              {step.tipo_mensagem !== 'texto' && (
                <div className="mb-3">
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {step.temp_file ? (
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" /> {step.temp_file.name}
                        <button onClick={(e) => { e.stopPropagation(); onUpdate({ temp_file: null }); }} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ) : step.arquivo_path ? (
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                        <FileCheck className="h-4 w-4" /> Arquivo atual salvo
                        <span className="text-[9px] opacity-60 truncate max-w-[150px]">({step.arquivo_path.split('/').pop()})</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Clique para anexar mídia</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={e => onUpdate({ temp_file: e.target.files?.[0] })}
                    accept={
                      step.tipo_mensagem === 'imagem' ? 'image/*' :
                      step.tipo_mensagem === 'audio' ? 'audio/*' :
                      step.tipo_mensagem === 'video' ? 'video/*' :
                      step.tipo_mensagem === 'pdf' ? 'application/pdf' : '*'
                    }
                  />
                </div>
              )}

              <Textarea 
                placeholder="Digite a mensagem..." 
                value={step.conteudo || ""} 
                onChange={e => onUpdate({ conteudo: e.target.value })}
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>

          {/* Ação Excluir */}
          <div className="flex flex-col justify-center border-l pl-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive transition-colors h-10 w-10"
              onClick={onDelete}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}