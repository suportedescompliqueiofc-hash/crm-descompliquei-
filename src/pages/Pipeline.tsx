import { useState } from "react";
import { MessageSquare, FileText, Phone, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LeadModal } from "@/components/leads/LeadModal";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useStages } from "@/hooks/useStages";
import { formatDistanceToNow, subDays, startOfMonth, endOfMonth, format, isToday, isPast, isFuture, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function StageColumn({ stage, leads, onCardClick, onUpdateLead }: { stage: { id: number; nome: string; cor: string; }; leads: Lead[]; onCardClick: (lead: Lead) => void; onUpdateLead: (leadId: string, updates: Partial<Lead>) => void }) {
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div className="w-80 flex-shrink-0">
      <Card className="h-full shadow-sm bg-muted/50">
        <CardHeader className={`bg-card rounded-t-lg border-l-4`} style={{ borderColor: stage.cor }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{stage.nome}</CardTitle>
            <Badge variant="secondary">
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent 
          ref={setNodeRef}
          className="p-4 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto"
        >
          <SortableContext 
            items={leads.map(l => l.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            {leads.map(lead => (
              <LeadCard 
                key={lead.id} 
                lead={lead}
                onClick={() => onCardClick(lead)}
                onUpdateLead={onUpdateLead}
              />
            ))}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}

function LeadCard({ lead, onClick, onUpdateLead }: { lead: Lead; onClick: () => void; onUpdateLead: (leadId: string, updates: Partial<Lead>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: lead.id.toString() 
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const lastContactTime = lead.ultimo_contato 
    ? formatDistanceToNow(new Date(lead.ultimo_contato), { locale: ptBR, addSuffix: true })
    : 'Nunca contatado';

  const handleDateSelect = (date: Date | undefined) => {
    setIsCalendarOpen(false);
    if (date) {
        // Ajusta para o meio do dia para evitar problemas de fuso horário ao salvar apenas a data
        const adjustedDate = new Date(date);
        adjustedDate.setHours(12, 0, 0, 0);
        onUpdateLead(lead.id, { agendamento: adjustedDate.toISOString() });
    } else {
        onUpdateLead(lead.id, { agendamento: null as any }); // Remove o agendamento
    }
  };

  const getScheduleBadge = () => {
    if (!lead.agendamento) return null;
    const date = parseISO(lead.agendamento);
    const isLate = isPast(date) && !isToday(date);
    const isForToday = isToday(date);

    return (
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
        isLate ? "bg-red-50 text-red-700 border-red-200" : 
        isForToday ? "bg-green-50 text-green-700 border-green-200" : 
        "bg-blue-50 text-blue-700 border-blue-200"
      )}>
        <CalendarIcon className="h-3 w-3" />
        {format(date, "dd/MM", { locale: ptBR })}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Card 
        className="shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing bg-card"
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                {getScheduleBadge()}
              </div>
              <p className="text-xs text-muted-foreground">{lead.telefone}</p>
            </div>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {lead.nome?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <p className="text-sm text-foreground line-clamp-2 min-h-[40px]">
            {lead.resumo ? lead.resumo : <span className="text-muted-foreground italic">Nenhum resumo disponível.</span>}
          </p>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="outline" className="text-xs font-normal max-w-[120px] truncate">
              {lead.origem || 'Sem origem'}
            </Badge>
            
            <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-7 w-7", lead.agendamento ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                            onClick={(e) => { e.stopPropagation(); }}
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                        <Calendar
                            mode="single"
                            selected={lead.agendamento ? parseISO(lead.agendamento) : undefined}
                            onSelect={handleDateSelect}
                            initialFocus
                            locale={ptBR}
                        />
                        {lead.agendamento && (
                            <div className="p-2 border-t text-center">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full text-xs h-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDateSelect(undefined)}
                                >
                                    Remover Agendamento
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-sm text-muted-foreground">{lastContactTime}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Pipeline() {
  // Inicializa o período para 'Mês Atual'
  const today = new Date();
  const initialDateRange: DateRange = { 
    from: startOfMonth(today), 
    to: endOfMonth(today) 
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  
  const { leads, isLoading: leadsLoading, updateLead } = useLeads(dateRange);
  const { stages, isLoading: stagesLoading } = useStages();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !active) {
      return;
    }

    const leadId = active.id as string;
    
    const overContainerId = (over.id as string).startsWith('stage-')
      ? (over.id as string)
      : over.data.current?.sortable?.containerId;

    if (!overContainerId) {
      return;
    }

    const newStageId = parseInt(overContainerId.replace('stage-', ''), 10);

    if (isNaN(newStageId)) {
      return;
    }
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.etapa_id === newStageId) {
      return;
    }

    updateLead({ id: leadId, etapa_id: newStageId });
  };

  const handleCardClick = (lead: Lead) => {
    setViewingLead(lead);
    setModalOpen(true);
  };

  const handleUpdateLead = (leadId: string, updates: Partial<Lead>) => {
    updateLead({ id: leadId, ...updates });
  };

  const activeLead = activeId ? leads.find(l => l.id.toString() === activeId) : null;

  if (leadsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipeline de Vendas</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie seu funil</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Leads</p>
              <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const stageLeads = leads.filter(l => l.etapa_id === stage.id);
              
              return (
                <StageColumn 
                  key={stage.id} 
                  stage={stage} 
                  leads={stageLeads}
                  onCardClick={handleCardClick}
                  onUpdateLead={handleUpdateLead}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeLead && (
            <Card className="w-80 shadow-lg opacity-90">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{activeLead.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activeLead.telefone}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                      {activeLead.nome?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {activeLead.resumo || <span className="text-muted-foreground italic">Nenhum resumo disponível.</span>}
                </p>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Lead Modal */}
      <LeadModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setViewingLead(null); // Limpa o lead selecionado ao fechar
        }}
        lead={viewingLead}
        mode="view"
      />
    </div>
  );
}