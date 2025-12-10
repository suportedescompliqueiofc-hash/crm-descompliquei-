import { useState } from "react";
import { Plus, X, Tag as TagIcon, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags, useLeadTags, TAG_COLORS } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  leadId: string;
}

export function TagManager({ leadId }: TagManagerProps) {
  const { availableTags, createTag } = useTags();
  const { leadTags, addTagToLead, removeTagFromLead } = useLeadTags(leadId);
  
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState("slate");

  // Filtra tags que ainda não estão no lead
  const assignedTagIds = new Set(leadTags.map(t => t.id));

  const handleSelectTag = (tagId: string) => {
    if (assignedTagIds.has(tagId)) {
      removeTagFromLead.mutate(tagId);
    } else {
      addTagToLead.mutate(tagId);
    }
  };

  const handleCreateTag = () => {
    if (!searchValue.trim()) return;
    setIsCreating(true);
    createTag.mutate(
      { name: searchValue.trim(), color: selectedColor },
      {
        onSuccess: (newTag) => {
          if (newTag) {
            addTagToLead.mutate(newTag.id);
          }
          setSearchValue("");
          setIsCreating(false);
          // Opcional: fechar após criar
          // setOpen(false); 
        },
        onSettled: () => setIsCreating(false)
      }
    );
  };

  const getColorStyle = (colorName: string) => {
    const color = TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0];
    return `${color.bg} ${color.text} ${color.border} hover:${color.bg}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {leadTags.map(tag => (
        <Badge 
          key={tag.id} 
          variant="outline" 
          className={cn("gap-1 pr-1 font-normal border transition-all", getColorStyle(tag.color))}
        >
          {tag.name}
          <button 
            onClick={() => removeTagFromLead.mutate(tag.id)}
            className="hover:bg-black/10 rounded-full p-0.5 ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground border border-dashed hover:border-solid gap-1 rounded-full">
            <Plus className="h-3 w-3" />
            Etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[240px]" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar ou criar..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty className="p-2">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">Nenhuma etiqueta encontrada.</p>
                  {searchValue && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-medium">Criar "{searchValue}" com cor:</p>
                      <div className="flex flex-wrap gap-1">
                        {TAG_COLORS.map(color => (
                          <button
                            key={color.name}
                            onClick={() => setSelectedColor(color.name)}
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-transform hover:scale-110",
                              color.selector, // USANDO A CLASSE EXPLÍCITA AQUI
                              selectedColor === color.name ? "ring-2 ring-offset-1 ring-primary" : ""
                            )}
                            title={color.label}
                          >
                            {selectedColor === color.name && <Check className="h-3 w-3 text-white" />}
                          </button>
                        ))}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full h-7 text-xs mt-2" 
                        onClick={handleCreateTag}
                        disabled={isCreating}
                      >
                        {isCreating ? 'Criando...' : 'Criar e Adicionar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CommandEmpty>
              
              <CommandGroup heading="Disponíveis">
                {availableTags.map(tag => {
                  const isSelected = assignedTagIds.has(tag.id);
                  const tagColor = TAG_COLORS.find(c => c.name === tag.color) || TAG_COLORS[0];
                  
                  return (
                    <CommandItem 
                      key={tag.id} 
                      value={tag.name}
                      onSelect={() => handleSelectTag(tag.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", tagColor.selector)} />
                        <span>{tag.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}