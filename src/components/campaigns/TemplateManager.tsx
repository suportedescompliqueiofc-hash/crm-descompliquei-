import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Copy, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMessageTemplates, MessageTemplate } from "@/hooks/useMessageTemplates";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const availableVariables = [
  "primeiro_nome",
  "nome_lead",
  "telefone",
  "email",
  "origem",
  "data_ultimo_contato",
  "idade",
  "genero",
  "nome_escritorio",
  "dias_sem_contato",
];

export function TemplateManager() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    conteudo: "",
  });

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        nome: editingTemplate.nome,
        categoria: editingTemplate.categoria,
        conteudo: editingTemplate.conteudo,
      });
    } else {
      setFormData({ nome: "", categoria: "", conteudo: "" });
    }
  }, [editingTemplate]);

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const handleSave = () => {
    const variables = extractVariables(formData.conteudo);
    
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, ...formData, variaveis: variables });
    } else {
      createTemplate({ ...formData, variaveis: variables });
    }
    setIsModalOpen(false);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      deleteTemplate(id);
    }
  };

  const handleDuplicate = (template: MessageTemplate) => {
    const { nome, categoria, conteudo, variaveis } = template;
    createTemplate({ nome: `${nome} (Cópia)`, categoria, conteudo, variaveis });
  };

  const handleSeedTemplates = async () => {
    setIsSeeding(true);
    const { error } = await supabase.functions.invoke('seed-templates');
    if (error) {
      toast.error('Erro ao adicionar templates de exemplo.', { closeButton: true });
    } else {
      toast.success('Templates de exemplo adicionados com sucesso!', { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ['message_templates'] });
    }
    setIsSeeding(false);
  };

  if (isLoading) {
    return <div>Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Biblioteca de Templates</h2>
          <p className="text-muted-foreground">Crie e gerencie seus templates de mensagens para campanhas e automações.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedTemplates} disabled={isSeeding} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isSeeding ? 'Adicionando...' : 'Adicionar Exemplos'}
          </Button>
          <Button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base mb-2">{template.nome}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {template.categoria}
                  </Badge>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-md min-h-[100px] max-h-[150px] overflow-y-auto">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {template.conteudo}
                </p>
              </div>

              {Array.isArray(template.variaveis) && template.variaveis.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Variáveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variaveis.map((variable: string) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Criado em {new Date(template.criado_em).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Crie mensagens padronizadas para agilizar sua comunicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Template *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Follow-up Orçamento"
                />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Follow-up"
                />
              </div>
            </div>

            <div>
              <Label>Conteúdo da Mensagem *</Label>
              <Textarea
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Digite a mensagem usando variáveis como {{nome_lead}}..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">💡 Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs cursor-pointer" 
                    onClick={() => setFormData({ ...formData, conteudo: formData.conteudo + `{{${v}}}` })}>
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? "Salvar Alterações" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}