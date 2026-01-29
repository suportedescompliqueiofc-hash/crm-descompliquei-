import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { Plus, Trash2, MessageSquare, Mic, Image as ImageIcon, Video, FileText, Upload, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QuickMessagesPage() {
  const { quickMessages, isLoading, createQuickMessage, deleteQuickMessage, isCreating } = useQuickMessages();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const [formData, setFormData] = useState({
    titulo: "",
    conteudo: "",
    tipo: "texto",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuickMessage({
      ...formData,
      file
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setFormData({ titulo: "", conteudo: "", tipo: "texto" });
        setFile(null);
      }
    });
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'imagem': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredMessages = activeTab === "all" 
    ? quickMessages 
    : quickMessages.filter(m => m.tipo === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Mensagens Rápidas
          </h1>
          <p className="text-muted-foreground mt-1">Crie atalhos para enviar mensagens frequentes com um clique.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Mensagem Rápida</DialogTitle>
              <DialogDescription>Configure o conteúdo que será enviado ao clicar no botão.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Título do Botão *</Label>
                <Input 
                  placeholder="Ex: Boas Vindas, Pix, Localização" 
                  value={formData.titulo} 
                  onChange={e => setFormData({...formData, titulo: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Mensagem</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={v => setFormData({...formData, tipo: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'texto' && (
                <div className="space-y-2">
                  <Label>Conteúdo *</Label>
                  <Textarea 
                    placeholder="Digite a mensagem..." 
                    className="h-32" 
                    value={formData.conteudo} 
                    onChange={e => setFormData({...formData, conteudo: e.target.value})} 
                    required={formData.tipo === 'texto'}
                  />
                </div>
              )}

              {formData.tipo !== 'texto' && (
                <div className="space-y-2">
                  <Label>Arquivo de Mídia *</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">{file ? file.name : "Clique para selecionar arquivo"}</span>
                  </div>
                  <Input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept={
                      formData.tipo === 'imagem' ? 'image/*' :
                      formData.tipo === 'audio' ? 'audio/*' :
                      formData.tipo === 'video' ? 'video/*' :
                      formData.tipo === 'pdf' ? 'application/pdf' : '*'
                    }
                  />
                  <div className="space-y-2">
                    <Label>Legenda (Opcional)</Label>
                    <Input 
                        placeholder="Texto junto com a mídia..." 
                        value={formData.conteudo} 
                        onChange={e => setFormData({...formData, conteudo: e.target.value})} 
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isCreating}>{isCreating ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="texto">Texto</TabsTrigger>
          <TabsTrigger value="imagem">Imagens</TabsTrigger>
          <TabsTrigger value="audio">Áudios</TabsTrigger>
          <TabsTrigger value="video">Vídeos</TabsTrigger>
          <TabsTrigger value="pdf">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-10 text-muted-foreground">Carregando mensagens...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-muted/10">
                <Zap className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma mensagem rápida encontrada.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <Card key={msg.id} className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        {msg.titulo}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                        {getIcon(msg.tipo)} <span className="capitalize">{msg.tipo}</span>
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteQuickMessage(msg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {msg.conteudo || (msg.arquivo_path ? "Conteúdo de Mídia" : "Sem conteúdo")}
                    </p>
                    {msg.arquivo_path && (
                      <Badge variant="outline" className="mt-2 text-[10px] truncate max-w-full">
                        Anexo: {msg.arquivo_path.split('/').pop()}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}