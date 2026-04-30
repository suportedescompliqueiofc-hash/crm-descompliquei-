import { useState, useRef, useEffect } from "react";
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects, DragStartEvent, DragOverEvent, DragEndEvent, DropAnimation 
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { SortableFolder } from "@/components/quick-messages/SortableFolder";
import { SortableMessageCard } from "@/components/quick-messages/SortableMessageCard";
import { createPortal } from "react-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function QuickMessagesPage() {
  const { quickMessages, isLoading: isLoadingMsgs, createQuickMessage, updateQuickMessage, deleteQuickMessage, isCreating: isCreatingMsg, updateMessagesOrder } = useQuickMessages();
  const { folders, isLoading: isLoadingFolders, createFolder, deleteFolder, updateFoldersOrder } = useQuickMessageFolders();
  
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [localFolders, setLocalFolders] = useState<QuickMessageFolder[]>([]);
  const [localMessages, setLocalMessages] = useState<QuickMessage[]>([]);
  const [msgToDelete, setMsgToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<QuickMessage | null>(null);

  useEffect(() => { setLocalFolders(folders); }, [folders]);
  useEffect(() => { setLocalMessages(quickMessages); }, [quickMessages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const [msgFormData, setMsgFormData] = useState({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderFormData, setFolderFormData] = useState({ name: "", color: "#3b82f6" });

  const handleOpenCreateMsg = () => {
    setEditingMessage(null);
    setMsgFormData({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
    setFile(null);
    setIsMsgModalOpen(true);
  };

  const handleEditMessage = (message: QuickMessage) => {
    setEditingMessage(message);
    setMsgFormData({ titulo: message.titulo, conteudo: message.conteudo || "", tipo: message.tipo, folder_id: message.folder_id || "none" });
    setFile(null);
    setIsMsgModalOpen(true);
  };

  const handleMsgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...msgFormData, file };
    if (editingMessage) {
      updateQuickMessage({ id: editingMessage.id, ...payload }, { onSuccess: () => setIsMsgModalOpen(false) });
    } else {
      createQuickMessage(payload, { onSuccess: () => setIsMsgModalOpen(false) });
    }
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFolder.mutate(folderFormData, { onSuccess: () => setIsFolderModalOpen(false) });
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setActiveItem(e.active.data.current?.type === "Folder" ? e.active.data.current.folder : e.active.data.current?.message);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.data.current?.type !== "Message") return;
    const activeId = active.id;
    const overId = over.id;
    const activeMsg = localMessages.find(m => m.id === activeId);
    const overMsg = localMessages.find(m => m.id === overId);
    const overFolder = localFolders.find(f => f.id === overId);
    if (!activeMsg) return;

    if (overMsg && activeMsg.folder_id !== overMsg.folder_id) {
      setLocalMessages(prev => {
        const activeIdx = prev.findIndex(i => i.id === activeId);
        const newItems = [...prev];
        newItems[activeIdx] = { ...newItems[activeIdx], folder_id: overMsg.folder_id };
        return arrayMove(newItems, activeIdx, prev.findIndex(i => i.id === overId));
      });
    } else if (overFolder && activeMsg.folder_id !== overFolder.id) {
        setLocalMessages(prev => {
            const activeIdx = prev.findIndex(i => i.id === activeId);
            const newItems = [...prev];
            newItems[activeIdx] = { ...newItems[activeIdx], folder_id: overFolder.id };
            return newItems;
        });
    } else if (overId === "uncategorized" && activeMsg.folder_id !== null) {
        setLocalMessages(prev => {
            const activeIdx = prev.findIndex(i => i.id === activeId);
            const newItems = [...prev];
            newItems[activeIdx] = { ...newItems[activeIdx], folder_id: null };
            return newItems;
        });
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over) {
        if (active.data.current?.type === "Folder" && active.id !== over.id) {
            const oldIdx = localFolders.findIndex(f => f.id === active.id);
            const newIdx = localFolders.findIndex(f => f.id === over.id);
            const newOrder = arrayMove(localFolders, oldIdx, newIdx);
            setLocalFolders(newOrder);
            updateFoldersOrder.mutate(newOrder.map((f, i) => ({ id: f.id, position: i + 1 })));
        } else if (active.data.current?.type === "Message") {
            const activeIdx = localMessages.findIndex(m => m.id === active.id);
            const overIdx = localMessages.findIndex(m => m.id === over.id);
            let newMsgs = [...localMessages];
            if (active.id !== over.id && overIdx !== -1) newMsgs = arrayMove(newMsgs, activeIdx, overIdx);
            setLocalMessages(newMsgs);
            updateMessagesOrder.mutate(newMsgs.map((m, i) => ({ id: m.id, position: i + 1, folder_id: m.folder_id || null })));
        }
    }
    setActiveId(null);
    setActiveItem(null);
  };

  const getMessagesByFolder = (fid: string | null) => localMessages.filter(m => (m.folder_id || null) === fid);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" /> Mensagens Rápidas
          </h1>
          <p className="text-muted-foreground mt-1">Crie e organize suas mensagens rápidas por pastas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsFolderModalOpen(true)} className="gap-2"><FolderPlus className="h-4 w-4" /> Nova Pasta</Button>
          <Button onClick={handleOpenCreateMsg} className="gap-2"><Plus className="h-4 w-4" /> Nova Mensagem</Button>
        </div>
      </div>

      <Dialog open={isMsgModalOpen} onOpenChange={setIsMsgModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMessage ? "Editar" : "Criar"} Mensagem Rápida</DialogTitle>
            <DialogDescription>Ajuste o título, tipo e conteúdo da mensagem.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMsgSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
                <Label>Título do Botão</Label>
                <Input value={msgFormData.titulo} onChange={e => setMsgFormData({...msgFormData, titulo: e.target.value})} required placeholder="Ex: Boas-vindas" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo de Conteúdo</Label>
                    <Select value={msgFormData.tipo} onValueChange={v => setMsgFormData({...msgFormData, tipo: v as any})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="texto">Texto</SelectItem><SelectItem value="imagem">Imagem</SelectItem><SelectItem value="audio">Áudio</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Pasta</Label>
                    <Select value={msgFormData.folder_id} onValueChange={v => setMsgFormData({...msgFormData, folder_id: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Sem Pasta</SelectItem>{folders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
            </div>

            {msgFormData.tipo === 'texto' ? (
                <div className="space-y-2"><Label>Mensagem</Label><Textarea value={msgFormData.conteudo} onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} className="h-32" required placeholder="Digite o conteúdo da mensagem..." /></div>
            ) : (
                <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" /><span className="text-sm font-medium">{file ? file.name : "Clique para anexar arquivo"}</span>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                    <div className="space-y-2"><Label>Legenda (Opcional)</Label><Input value={msgFormData.conteudo} onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} placeholder="Legenda da mídia..." /></div>
                </div>
            )}
            <DialogFooter><Button type="submit" disabled={isCreatingMsg} className="w-full sm:w-auto">{isCreatingMsg ? 'Salvando...' : 'Salvar Alterações'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>Crie uma pasta para organizar suas mensagens rápidas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFolderSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Pasta</Label>
              <Input 
                value={folderFormData.name} 
                onChange={e => setFolderFormData({...folderFormData, name: e.target.value})} 
                required 
                placeholder="Ex: Boas-vindas" 
              />
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={folderFormData.color} 
                  onChange={e => setFolderFormData({...folderFormData, color: e.target.value})} 
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={folderFormData.color} 
                  onChange={e => setFolderFormData({...folderFormData, color: e.target.value})} 
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFolderModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? 'Criando...' : 'Criar Pasta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <SortableContext items={localFolders.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {localFolders.map(f => (<SortableFolder key={f.id} folder={f} messages={getMessagesByFolder(f.id)} onDeleteFolder={setFolderToDelete} onEditMessage={handleEditMessage} onDeleteMessage={setMsgToDelete} />))}
          </SortableContext>
          {getMessagesByFolder(null).length > 0 && (
              <div className="mt-8"><div className="flex items-center gap-2 mb-3"><Folder className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">Sem Pasta</h3></div>
              <SortableContext id="uncategorized" items={getMessagesByFolder(null).map(m => m.id)} strategy={verticalListSortingStrategy}><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 border border-dashed rounded-xl bg-muted/5">{getMessagesByFolder(null).map(m => (<SortableMessageCard key={m.id} message={m} onEdit={handleEditMessage} onDelete={setMsgToDelete} />))}</div></SortableContext></div>
          )}
          {createPortal(<DragOverlay dropAnimation={defaultDropAnimationSideEffects as any}>{activeId && activeItem ? (activeItem.name ? <div className="bg-background border p-4 rounded shadow-xl"><h3>{activeItem.name}</h3></div> : <div className="w-[280px]"><SortableMessageCard message={activeItem} onEdit={() => {}} onDelete={() => {}} /></div>) : null}</DragOverlay>, document.body)}
        </DndContext>
      </div>
      
      <AlertDialog open={!!msgToDelete} onOpenChange={() => setMsgToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir mensagem?</AlertDialogTitle><AlertDialogDescription>A mensagem será removida permanentemente da sua biblioteca.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (msgToDelete) { deleteQuickMessage(msgToDelete); setMsgToDelete(null); } }} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}