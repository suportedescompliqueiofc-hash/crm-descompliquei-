import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders, QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { Plus, Trash2, MessageSquare, Mic, Image as ImageIcon, Video, FileText, Upload, Zap, FolderPlus, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function QuickMessagesPage() {
  const { quickMessages, isLoading: isLoadingMsgs, createQuickMessage, deleteQuickMessage, isCreating: isCreatingMsg } = useQuickMessages();
  const { folders, isLoading: isLoadingFolders, createFolder, deleteFolder } = useQuickMessageFolders();
  
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // States para Formulário de Mensagem
  const [msgFormData, setMsgFormData] = useState({
    titulo: "",
    conteudo: "",
    tipo: "texto",
    folder_id: "none",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States para Formulário de Pasta
  const [folderFormData, setFolderFormData] = useState({
    name: "",
    color: "#3b82f6", // Azul padrão
  });

  const handleMsgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuickMessage({
      ...msgFormData,
      folder_id: msgFormData.folder_id === "none" ? null : msgFormData.folder_id,
      file
    }, {
      onSuccess: () => {
        setIsMsgModalOpen(false);
        setMsgFormData({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
        setFile(null);
      }
    });
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderFormData.name) return;
    createFolder.mutate(folderFormData, {
      onSuccess: () => {
        setIsFolderModalOpen(false);
        setFolderFormData({ name: "", color: "#3b82f6" });
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

  const getMessagesByFolder = (folderId: string | null) => {
    return filteredMessages.filter(m => (m.folder_id || null) === folderId);
  };

  const renderMessageCard = (msg: QuickMessage) => (
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
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Mensagens Rápidas
          </h1>
          <p className="text-muted-foreground mt-1">Crie atalhos e organize suas mensagens em pastas.</p>
        </div>
        
        <div className="flex gap-2">
          {/* Nova Pasta */}
          <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="h-4 w-4" /> Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Pasta</DialogTitle>
                <DialogDescription>Organize suas mensagens em categorias.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFolderSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome da Pasta</Label>
                  <Input 
                    placeholder="Ex: Boas Vindas" 
                    value={folderFormData.name} 
                    onChange={e => setFolderFormData({...folderFormData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor da Pasta</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                        type="color" 
                        value={folderFormData.color} 
                        onChange={e => setFolderFormData({...folderFormData, color: e.target.value})} 
                        className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{folderFormData.color}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFolderModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar Pasta</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Nova Mensagem */}
          <Dialog open={isMsgModalOpen} onOpenChange={setIsMsgModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Mensagem Rápida</DialogTitle>
                <DialogDescription>Configure o conteúdo do botão.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMsgSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Título do Botão *</Label>
                  <Input 
                    placeholder="Ex: Pix" 
                    value={msgFormData.titulo} 
                    onChange={e => setMsgFormData({...msgFormData, titulo: e.target.value})} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select 
                        value={msgFormData.tipo} 
                        onValueChange={v => setMsgFormData({...msgFormData, tipo: v})}
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
                    <div className="space-y-2">
                        <Label>Pasta</Label>
                        <Select 
                        value={msgFormData.folder_id} 
                        onValueChange={v => setMsgFormData({...msgFormData, folder_id: v})}
                        >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sem Pasta</SelectItem>
                            {folders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                                        {folder.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>

                {msgFormData.tipo === 'texto' && (
                  <div className="space-y-2">
                    <Label>Conteúdo *</Label>
                    <Textarea 
                      placeholder="Digite a mensagem..." 
                      className="h-32" 
                      value={msgFormData.conteudo} 
                      onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} 
                      required={msgFormData.tipo === 'texto'}
                    />
                  </div>
                )}

                {msgFormData.tipo !== 'texto' && (
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
                        msgFormData.tipo === 'imagem' ? 'image/*' :
                        msgFormData.tipo === 'audio' ? 'audio/*' :
                        msgFormData.tipo === 'video' ? 'video/*' :
                        msgFormData.tipo === 'pdf' ? 'application/pdf' : '*'
                      }
                    />
                    <div className="space-y-2">
                      <Label>Legenda (Opcional)</Label>
                      <Input 
                          placeholder="Texto junto com a mídia..." 
                          value={msgFormData.conteudo} 
                          onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} 
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsMsgModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isCreatingMsg}>{isCreatingMsg ? 'Salvando...' : 'Salvar'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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

        <TabsContent value={activeTab} className="mt-6 space-y-8">
          {isLoadingMsgs || isLoadingFolders ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : (
            <>
                {/* Renderizar Pastas */}
                {folders.map(folder => {
                    const folderMessages = getMessagesByFolder(folder.id);
                    if (folderMessages.length === 0) return null; // Opcional: mostrar pastas vazias ou não

                    return (
                        <div key={folder.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: folder.color }} />
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {folder.name}
                                        <Badge variant="secondary" className="text-xs font-normal">{folderMessages.length}</Badge>
                                    </h3>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteFolder.mutate(folder.id)}
                                    title="Excluir Pasta (mantém mensagens)"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {folderMessages.map(renderMessageCard)}
                            </div>
                            <Separator className="mt-4" />
                        </div>
                    );
                })}

                {/* Renderizar Mensagens Sem Pasta */}
                {getMessagesByFolder(null).length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold text-lg">Sem Pasta</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getMessagesByFolder(null).map(renderMessageCard)}
                        </div>
                    </div>
                )}

                {filteredMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-muted/10">
                        <Zap className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">Nenhuma mensagem encontrada nesta categoria.</p>
                    </div>
                )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}