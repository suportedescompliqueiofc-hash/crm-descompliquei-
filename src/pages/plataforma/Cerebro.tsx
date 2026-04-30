import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, Stethoscope, Users, Target, Briefcase, 
  HelpCircle, GraduationCap, Plus, Trash2, Save, Loader2, CheckCircle2,
  BrainCircuit, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
// Simple local debounce implementation since lodash is not installed
function debounce(func: Function, wait: number) {
  let timeout: any;
  const debounced = function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      func();
    }
  };
  debounced.pending = () => !!timeout;
  return debounced;
}

type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type Procedure = { id: string; name: string; category: string; ticket: string; volume: string; potential: string };
type FAQ = { id: string; question: string; answer: string; category: string };
type Objection = { id: string; objection: string; answer: string; frequency: string };
type Material = { id: string; title: string; module_id: string; content: string; type: string };

const PHASES = [
  { id: 1 as Phase, icon: Building2, name: 'Identidade', desc: 'Quem você é e o que você representa' },
  { id: 2 as Phase, icon: Stethoscope, name: 'Procedimentos', desc: 'O que você oferece e como precifica' },
  { id: 3 as Phase, icon: Users, name: 'Paciente Ideal', desc: 'Para quem você trabalha — em detalhes' },
  { id: 4 as Phase, icon: Target, name: 'Posicionamento', desc: 'Por que você e não o concorrente' },
  { id: 5 as Phase, icon: Briefcase, name: 'Operação', desc: 'Como funciona o comercial da sua clínica hoje' },
  { id: 6 as Phase, icon: HelpCircle, name: 'FAQ & Objeções', desc: 'O que os pacientes sempre perguntam' },
  { id: 7 as Phase, icon: GraduationCap, name: 'Trilha C.L.A.R.O', desc: 'Adicione ao Cérebro o que você construiu na Trilha' },
];

export default function Cerebro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activePhase, setActivePhase] = useState<Phase>(1);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Use a ref to store the latest formData for the debounced saver to access without closure issues
  const formDataRef = useRef<any>(null);

  // Default initial state
  const initialFormState = {
    // Fase 1
    clinic_name: '', profissional_nome: '', specialty_principal: '', especialidades_complementares: [],
    cidade: '', estado: '', city_state: '', ano_fundacao: '', tamanho_equipe: '', descricao_profissional: '',
    proposito_clinica: '', limites_valores: '',
    // Fase 2
    anchor_procedure: '', anchor_why: '', anchor_resultado: '', anchor_ticket_atual: '', anchor_ticket_desejado: '',
    procedures: [] as Procedure[], posicionamento_preco: '', frequencia_desconto: '', objecao_preco_principal: '',
    // Fase 3
    icp_faixa_etaria: '', icp_genero: '', icp_nivel_socioeconomico: '', icp_localizacao: '', icp_profissao: '',
    icp_maior_dor: '', icp_maior_desejo: '', icp_maior_medo: '', icp_por_que_voce: '', icp_canais_chegada: [],
    icp_tempo_decisao: '', icp_influenciador_decisao: '', icp_objecao_pre_fechamento: '',
    // Fase 4
    especializacao_forte: '', diferencial_exclusivo: '', maior_case_resultado: '', descricao_one_liner: '',
    diferencial_atendimento: '', analise_concorrentes: '', voice_tone: '', tom_percebido: '', palavras_proibidas: '', palavras_identidade: '',
    // Fase 5
    working_hours: '', payment_methods: '', tempo_resposta_whatsapp: '', quem_faz_primeiro_atendimento: '',
    maior_falha_comercial: '', leads_por_mes: '', taxa_conversao_atual: '', meta_faturamento: '', faturamento_atual: '',
    // Fase 6
    faq: [] as FAQ[], objecoes_banco: [] as Objection[],
    // Fase 7
    materiais_adicionados: [] as string[]
  };

  const [formData, setFormData] = useState<any>(initialFormState);
  const activePhaseData = PHASES.find(p => p.id === activePhase) || PHASES[0];

  // Sync ref with state
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Carregamento — banco sempre tem prioridade sobre o localStorage
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);

        // Buscar dados do banco (fonte de verdade)
        const [cerebroResult, profileResult, matsResult] = await Promise.all([
          supabase.from('platform_cerebro').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('platform_users').select('clinic_name, specialty').eq('id', user.id).maybeSingle(),
          supabase.from('platform_materiais').select('*').eq('user_id', user.id)
        ]);

        if (cerebroResult.error) throw cerebroResult.error;
        if (matsResult.data) setMaterials(matsResult.data);

        const cerebro = cerebroResult.data;
        const userProfile = profileResult.data;

        if (cerebro) {
          // Começa com o estado inicial e sobrescreve com dados reais do banco
          const mappedData: any = { ...initialFormState };

          // Mapeia cada coluna do banco para o estado do formulário
          Object.keys(mappedData).forEach(key => {
            // Apenas sobrescreve se o valor do banco não for null/undefined
            // Strings vazias do banco SÃO consideradas válidas (usuário limpou o campo)
            if (cerebro[key] !== undefined && cerebro[key] !== null) {
              mappedData[key] = cerebro[key];
            }
          });

          // Campos que vivem em platform_users (não em platform_cerebro)
          mappedData.clinic_name = userProfile?.clinic_name || '';
          // specialty_principal: usa specialty_preset do banco ou o specialty do perfil
          mappedData.specialty_principal = cerebro.specialty_preset || userProfile?.specialty || mappedData.specialty_principal || '';

          // Garantir que arrays sejam sempre arrays (dados legados podem ter null)
          const arrayFields = ['procedures', 'faq', 'objecoes_banco', 'materiais_adicionados', 'especialidades_complementares', 'icp_canais_chegada'];
          arrayFields.forEach(f => {
            if (!Array.isArray(mappedData[f])) mappedData[f] = [];
          });

          setFormData(mappedData);
          // Atualizar backup local com os dados reais do banco
          localStorage.setItem(`cerebro_backup_${user.id}`, JSON.stringify(mappedData));
        } else {
          // Nenhum registro no banco ainda — tentar restaurar do localStorage
          const localBackup = localStorage.getItem(`cerebro_backup_${user.id}`);
          if (localBackup) {
            try {
              const parsed = JSON.parse(localBackup);
              parsed.clinic_name = userProfile?.clinic_name || parsed.clinic_name || '';
              setFormData(parsed);
            } catch {}
          } else {
            // Estado limpo com nome da clínica do perfil
            setFormData((prev: any) => ({ ...prev, clinic_name: userProfile?.clinic_name || '' }));
          }
        }
      } catch (err) {
        console.error("Error loading Cerebro:", err);
        // Em caso de erro, tentar o localStorage como fallback
        const localBackup = localStorage.getItem(`cerebro_backup_${user.id}`);
        if (localBackup) {
          try { setFormData(JSON.parse(localBackup)); } catch {}
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const saveToDb = async (dataToSave: any) => {
    if (!user) return;
    setSaveStatus('saving');
    
    // Lista de colunas reais na tabela platform_cerebro para evitar erro 400
    // NOTA: clinic_name e specialty_principal NÃO existem em platform_cerebro — ficam em platform_users
    const validColumns = [
      'user_id', 'profissional_nome', 'especialidades_complementares', 'cidade', 'estado', 
      'city_state', 'specialty_preset', 'ano_fundacao', 'tamanho_equipe', 'descricao_profissional', 
      'proposito_clinica', 'limites_valores', 'anchor_procedure', 'anchor_why', 
      'anchor_resultado', 'anchor_ticket_atual', 'anchor_ticket_desejado', 
      'procedures', 'posicionamento_preco', 'frequencia_desconto', 'objecao_preco_principal', 
      'icp_faixa_etaria', 'icp_genero', 'icp_nivel_socioeconomico', 'icp_localizacao', 
      'icp_profissao', 'icp_maior_dor', 'icp_maior_desejo', 'icp_maior_medo', 
      'icp_por_que_voce', 'icp_canais_chegada', 'icp_tempo_decisao', 
      'icp_influenciador_decisao', 'icp_objecao_pre_fechamento', 'especializacao_forte', 
      'diferencial_exclusivo', 'maior_case_resultado', 'descricao_one_liner', 
      'diferencial_atendimento', 'analise_concorrentes', 'voice_tone', 'tom_percebido', 
      'palavras_proibidas', 'palavras_identidade', 'working_hours', 'payment_methods', 
      'tempo_resposta_whatsapp', 'quem_faz_primeiro_atendimento', 'maior_falha_comercial', 
      'leads_por_mes', 'taxa_conversao_atual', 'meta_faturamento', 'faturamento_atual', 
      'faq', 'objecoes_banco', 'materiais_adicionados', 'updated_at'
    ];

    // Colunas com tipo numérico no banco — precisam ser null quando vazias, nunca string ""
    const numericColumns = [
      'ano_fundacao', 'anchor_ticket_atual', 'anchor_ticket_desejado',
      'leads_por_mes', 'meta_faturamento', 'faturamento_atual'
    ];

    const payload: any = {};
    validColumns.forEach(col => {
      if (dataToSave[col] !== undefined) {
        const val = dataToSave[col];
        if (numericColumns.includes(col)) {
          // Converte string vazia ou NaN para null para não quebrar o banco
          const num = Number(val);
          payload[col] = (val === '' || val === null || val === undefined || isNaN(num)) ? null : num;
        } else {
          payload[col] = val;
        }
      }
    });

    // Mapear campos do formulário para colunas do banco com nomes diferentes
    payload.specialty_preset = dataToSave.specialty_principal || null;
    // voice_tone sem valor = null (não string vazia, pois havia constraint)
    if (!payload.voice_tone || payload.voice_tone === '') payload.voice_tone = null;

    payload.user_id = user.id;
    payload.updated_at = new Date().toISOString();

    try {
      const { error } = await supabase.from('platform_cerebro').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      
      // Sync de nome da clínica e especialidade no perfil
      await supabase.from('platform_users').update({ 
        clinic_name: dataToSave.clinic_name || undefined, 
        specialty: dataToSave.specialty_principal || undefined,
        cerebro_complete: true
      }).eq('id', user.id);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      // Atualiza backup local após salvar com sucesso
      localStorage.setItem(`cerebro_backup_${user.id}`, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Error saving Cerebro:", e);
      setSaveStatus('idle');
    }
  };

  // Debounced save
  const debouncedSave = useCallback(
    debounce(() => {
      if (formDataRef.current) {
        saveToDb(formDataRef.current);
      }
    }, 3000),
    [user]
  );

  // Force save on unmount if pending
  useEffect(() => {
    return () => {
      if (debouncedSave.pending()) {
        debouncedSave.flush();
      }
    };
  }, [debouncedSave]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      debouncedSave();
      return newData;
    });
  };

  const handleManualSave = async () => {
    await saveToDb(formData);
    toast.success('Cérebro Central salvo com sucesso!');
  };

  const toggleArrayValue = (field: string, value: string) => {
    const current = Array.isArray(formData[field]) ? formData[field] : [];
    const isSelected = current.includes(value);
    const newValue = isSelected ? current.filter((v:any) => v !== value) : [...current, value];
    updateField(field, newValue);
  };

  const completeness = useMemo(() => {
    const essentialFields = [
      'clinic_name', 'profissional_nome', 'specialty_principal', 'cidade', 'proposito_clinica',
      'anchor_procedure', 'posicionamento_preco',
      'icp_faixa_etaria', 'icp_maior_dor', 'icp_maior_desejo',
      'diferencial_exclusivo', 'voice_tone',
      'working_hours', 'maior_falha_comercial'
    ];
    let filled = 0;
    essentialFields.forEach(f => {
      if (formData[f] && formData[f].toString().trim() !== '') filled++;
    });
    
    // Checks for lists
    if (formData.procedures?.length > 0) filled++;
    if (formData.faq?.length > 0) filled++;
    if (formData.objecoes_banco?.length > 0) filled++;
    
    const total = essentialFields.length + 3;
    return Math.round((filled / total) * 100);
  }, [formData]);

  const getBadgeInfo = () => {
    if (completeness <= 30) return { label: 'Básico', color: 'bg-muted text-muted-foreground' };
    if (completeness <= 60) return { label: 'Intermediário', color: 'bg-blue-500/20 text-blue-500' };
    if (completeness <= 85) return { label: 'Avançado', color: 'bg-amber-500/20 text-amber-500' };
    return { label: 'Completo', color: 'bg-emerald-500/20 text-emerald-500' };
  };

  const badgeInfo = getBadgeInfo();

  if (loading && !formData.clinic_name) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85D24] mb-4" />
        <p className="text-muted-foreground">Carregando sua memória estratégica...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-32">
      {/* HEADER */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
              <BrainCircuit className="w-8 h-8 text-[#E85D24]" /> Cérebro Central
            </h1>
            <p className="text-muted-foreground mt-1">A memória estratégica da sua clínica — quanto mais você preenche, mais inteligentes ficam suas IAs.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${badgeInfo.color} px-3 py-1 text-sm border-transparent uppercase tracking-wider`}>
              {badgeInfo.label} ({completeness}%)
            </Badge>
            <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-[#E85D24] transition-all duration-500" style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL NAV */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 border-b border-border/40">
        {PHASES.map((phase, index) => {
          const isActive = activePhase === phase.id;
          const Icon = phase.icon;
          return (
            <button
              key={phase.id}
              onClick={() => setActivePhase(PHASES[index].id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors border-b-2 ${
                isActive 
                  ? 'bg-card border-[#E85D24] text-foreground font-semibold' 
                  : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isActive ? 'bg-[#E85D24] text-white' : 'bg-secondary text-muted-foreground'}`}>
                {phase.id}
              </span>
              <Icon className="w-4 h-4" />
              <span>{phase.name}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENT BY PHASE */}
      <div className="min-h-[500px]">
        {/* HEADER DA FASE COM SETAS DE NAVEGAÇÃO */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-[#E85D24] mb-1">
              Fase {activePhaseData.id} — {activePhaseData.name}
            </h2>
            <p className="text-muted-foreground">{activePhaseData.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePhase(PHASES[Math.max(0, activePhase - 2)].id)}
              disabled={activePhase === 1}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium">{activePhase}/7</span>
            <button
              onClick={() => setActivePhase(PHASES[Math.min(PHASES.length - 1, activePhase)].id)}
              disabled={activePhase === 7}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FASE 1: IDENTIDADE */}
        {activePhase === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Nome da Clínica</label>
                  <Input value={formData.clinic_name} onChange={e => updateField('clinic_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Nome do Responsável/Profissional</label>
                  <Input value={formData.profissional_nome} onChange={e => updateField('profissional_nome', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Especialidade Principal</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.specialty_principal} onChange={e => updateField('specialty_principal', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Odontologia">Odontologia</option>
                    <option value="HOF">HOF</option>
                    <option value="Cirurgia Plástica">Cirurgia Plástica</option>
                    <option value="Dermatologia">Dermatologia</option>
                    <option value="Estética Avançada">Estética Avançada</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Especialidades Complementares</label>
                  <Input placeholder="Ex: Ortodontia, Preenchimento, etc" 
                    value={formData.especialidades_complementares?.join(', ') || ''} 
                    onChange={e => updateField('especialidades_complementares', e.target.value.split(',').map(s=>s.trim()))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Cidade</label>
                  <Input value={formData.cidade} onChange={e => updateField('cidade', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Estado (UF)</label>
                  <Input value={formData.estado} onChange={e => updateField('estado', e.target.value)} maxLength={2} placeholder="Ex: SP" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ano de Fundação</label>
                  <Input type="number" value={formData.ano_fundacao} onChange={e => updateField('ano_fundacao', Number(e.target.value) || '')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tamanho da Equipe</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.tamanho_equipe} onChange={e => updateField('tamanho_equipe', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Solo">Solo</option>
                    <option value="2-3 pessoas">2-3 pessoas</option>
                    <option value="4-10 pessoas">4-10 pessoas</option>
                    <option value="10+">10+</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Como você se descreve como profissional?</label>
                  <Textarea placeholder="Tom pessoal..." className="min-h-[80px]" value={formData.descricao_profissional} onChange={e => updateField('descricao_profissional', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Qual é o propósito maior da sua clínica?</label>
                  <Textarea placeholder="Nossa missão é..." className="min-h-[80px]" value={formData.proposito_clinica} onChange={e => updateField('proposito_clinica', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">O que você NÃO aceita na sua clínica?</label>
                  <Textarea placeholder="Limites, valores inegociáveis..." className="min-h-[80px]" value={formData.limites_valores} onChange={e => updateField('limites_valores', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 2: PROCEDIMENTOS */}
        {activePhase === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Procedimento Âncora</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Qual procedimento você mais quer vender?</label>
                  <Input value={formData.anchor_procedure} onChange={e => updateField('anchor_procedure', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Por que esse é o âncora?</label>
                  <Input value={formData.anchor_why} onChange={e => updateField('anchor_why', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Qual o resultado visual/físico que ele gera?</label>
                  <Textarea className="min-h-[80px]" value={formData.anchor_resultado} onChange={e => updateField('anchor_resultado', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ticket Médio Atual (R$)</label>
                  <Input type="number" value={formData.anchor_ticket_atual} onChange={e => updateField('anchor_ticket_atual', Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ticket que Deseja Cobrar (R$)</label>
                  <Input type="number" value={formData.anchor_ticket_desejado} onChange={e => updateField('anchor_ticket_desejado', Number(e.target.value) || 0)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground uppercase tracking-wider text-sm">Lista de Procedimentos</CardTitle>
                <Button onClick={() => updateField('procedures', [...formData.procedures, { id: Date.now().toString(), name: '', category: '', ticket: '', volume: '', potential: '' }])} variant="outline" size="sm" className="border-[#E85D24] text-[#E85D24] hover:bg-[#E85D24]/10">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.procedures.map((proc: any) => (
                  <div key={proc.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start border border-border p-4 rounded-lg relative">
                    <Button variant="ghost" size="icon" onClick={() => updateField('procedures', formData.procedures.filter((p:any) => p.id !== proc.id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="md:col-span-2 space-y-1"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Nome</span><Input placeholder="Toxina" value={proc.name} onChange={e => updateField('procedures', formData.procedures.map((p:any) => p.id === proc.id ? { ...p, name: e.target.value } : p))} /></div>
                    <div className="space-y-1"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Categoria</span><Input placeholder="Injetável" value={proc.category} onChange={e => updateField('procedures', formData.procedures.map((p:any) => p.id === proc.id ? { ...p, category: e.target.value } : p))} /></div>
                    <div className="space-y-1"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Ticket</span><Input placeholder="R$" value={proc.ticket} onChange={e => updateField('procedures', formData.procedures.map((p:any) => p.id === proc.id ? { ...p, ticket: e.target.value } : p))} /></div>
                    <div className="space-y-1"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Vol. Mensal</span><Input placeholder="Qtd" value={proc.volume} onChange={e => updateField('procedures', formData.procedures.map((p:any) => p.id === proc.id ? { ...p, volume: e.target.value } : p))} /></div>
                    <div className="space-y-1 pr-6"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Potencial</span><Input placeholder="Alto/Baixo" value={proc.potential} onChange={e => updateField('procedures', formData.procedures.map((p:any) => p.id === proc.id ? { ...p, potential: e.target.value } : p))} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
               <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Posicionamento de Preço</CardTitle></CardHeader>
               <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Como você se posiciona?</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.posicionamento_preco} onChange={e => updateField('posicionamento_preco', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Acessível">Acessível</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Premium">Premium</option>
                      <option value="Ultra Premium">Ultra Premium</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Você dá desconto?</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.frequencia_desconto} onChange={e => updateField('frequencia_desconto', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Nunca">Nunca</option>
                      <option value="Raramente">Raramente</option>
                      <option value="Às vezes">Às vezes</option>
                      <option value="Com frequência">Com frequência</option>
                    </select>
                 </div>
                 <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Qual objeção de preço você mais recebe?</label>
                    <Textarea value={formData.objecao_preco_principal} onChange={e => updateField('objecao_preco_principal', e.target.value)} />
                 </div>
               </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 3: ICP */}
        {activePhase === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Perfil Demográfico</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Faixa etária predominante</label><Input value={formData.icp_faixa_etaria} onChange={e => updateField('icp_faixa_etaria', e.target.value)} placeholder="Ex: 30-45 anos" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Gênero predominante</label><Input value={formData.icp_genero} onChange={e => updateField('icp_genero', e.target.value)} placeholder="Ex: Feminino (90%)" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Perfil socioeconômico</label><Input value={formData.icp_nivel_socioeconomico} onChange={e => updateField('icp_nivel_socioeconomico', e.target.value)} placeholder="Ex: Classe A e B" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Localização principal</label><Input value={formData.icp_localizacao} onChange={e => updateField('icp_localizacao', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">Profissão predominante dos pacientes</label><Input value={formData.icp_profissao} onChange={e => updateField('icp_profissao', e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Perfil Psicográfico</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">Qual é a maior dor do seu paciente ideal ANTES do procedimento?</label><Textarea value={formData.icp_maior_dor} onChange={e => updateField('icp_maior_dor', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">Qual é o maior desejo do seu paciente ideal?</label><Textarea value={formData.icp_maior_desejo} onChange={e => updateField('icp_maior_desejo', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">O que ele teme que dê errado?</label><Textarea value={formData.icp_maior_medo} onChange={e => updateField('icp_maior_medo', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">O que faz ele escolher VOCÊ em vez do concorrente?</label><Textarea value={formData.icp_por_que_voce} onChange={e => updateField('icp_por_que_voce', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Como ele chegou até você?</label>
                  <div className="flex flex-wrap gap-4">
                    {['Indicação', 'Instagram', 'Google', 'Tráfego Pago', 'Evento'].map(opt => (
                      <div key={opt} className="flex items-center space-x-2">
                        <Checkbox id={`chan-${opt}`} checked={formData.icp_canais_chegada?.includes(opt)} onCheckedChange={() => toggleArrayValue('icp_canais_chegada', opt)} />
                        <label htmlFor={`chan-${opt}`} className="text-sm leading-none">{opt}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Comportamento de Compra</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Tempo da primeira consulta ao fechamento</label><Input value={formData.icp_tempo_decisao} onChange={e => updateField('icp_tempo_decisao', e.target.value)} placeholder="Ex: Imediato, 1 semana..." /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Quem influencia a decisão?</label>
                  <Input value={formData.icp_influenciador_decisao} onChange={e => updateField('icp_influenciador_decisao', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">Maior objeção antes de fechar</label><Textarea value={formData.icp_objecao_pre_fechamento} onChange={e => updateField('icp_objecao_pre_fechamento', e.target.value)} /></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 4: POSICIONAMENTO E DIFERENCIAL */}
        {activePhase === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardContent className="pt-6 grid grid-cols-1 gap-6">
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Qual é a sua especialização mais forte?</label><Textarea value={formData.especializacao_forte} onChange={e => updateField('especializacao_forte', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">O que você faz que nenhum concorrente faz?</label><Textarea value={formData.diferencial_exclusivo} onChange={e => updateField('diferencial_exclusivo', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Qual é o seu maior case de resultado?</label><Textarea value={formData.maior_case_resultado} onChange={e => updateField('maior_case_resultado', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Como descreveria sua clínica em 1 frase para um paciente frio?</label><Input value={formData.descricao_one_liner} onChange={e => updateField('descricao_one_liner', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Qual o diferencial da sua experiência de atendimento?</label><Textarea value={formData.diferencial_atendimento} onChange={e => updateField('diferencial_atendimento', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Quem são seus concorrentes diretos e o que te diferencia deles?</label><Textarea value={formData.analise_concorrentes} onChange={e => updateField('analise_concorrentes', e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-foreground uppercase tracking-wider text-sm">Tom de Voz</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'Técnica e Clínica', label: 'Técnica/Evidências' },
                    { id: 'Acolhedora e Próxima', label: 'Acolhedora/Próxima' },
                    { id: 'Premium e Exclusiva', label: 'Premium/Sofisticada' },
                    { id: 'Educativa e Transparente', label: 'Educativa/Transparente' }
                  ].map(tone => (
                    <div 
                      key={tone.id} onClick={() => updateField('voice_tone', tone.id)}
                      className={`border p-4 rounded-lg cursor-pointer transition-colors text-center ${formData.voice_tone === tone.id ? 'border-[#E85D24] bg-[#E85D24]/10 shadow-sm' : 'border-border bg-background hover:bg-muted'}`}
                    >
                      <span className={`font-semibold ${formData.voice_tone === tone.id ? 'text-[#E85D24]' : 'text-foreground'}`}>{tone.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Palavras que definem a clínica</label><Textarea value={formData.palavras_identidade} onChange={e => updateField('palavras_identidade', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Palavras que NUNCA usaria</label><Textarea value={formData.palavras_proibidas} onChange={e => updateField('palavras_proibidas', e.target.value)} /></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 5: OPERAÇÃO COMERCIAL */}
        {activePhase === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Horários de funcionamento</label><Input value={formData.working_hours} onChange={e => updateField('working_hours', e.target.value)} placeholder="Ex: Seg a Sex, 09h as 18h" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Formas de Pagamento Aceitas</label><Input value={formData.payment_methods} onChange={e => updateField('payment_methods', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Tempo médio de resposta no WhatsApp</label><Input value={formData.tempo_resposta_whatsapp} onChange={e => updateField('tempo_resposta_whatsapp', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Quem faz o 1º atendimento?</label><Input value={formData.quem_faz_primeiro_atendimento} onChange={e => updateField('quem_faz_primeiro_atendimento', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-muted-foreground">Qual é a maior falha do seu comercial hoje?</label><Textarea value={formData.maior_falha_comercial} onChange={e => updateField('maior_falha_comercial', e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Leads por mês</label><Input type="number" value={formData.leads_por_mes} onChange={e => updateField('leads_por_mes', Number(e.target.value) || 0)} /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Taxa de conversão estimada</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.taxa_conversao_atual} onChange={e => updateField('taxa_conversao_atual', e.target.value)}>
                    <option value="">Selecione...</option><option value="0-10%">0-10%</option><option value="10-20%">10-20%</option><option value="20-30%">20-30%</option><option value="30-50%">30-50%</option><option value="50%+">50%+</option>
                  </select>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Faturamento médio atual</label><Input type="number" value={formData.faturamento_atual} onChange={e => updateField('faturamento_atual', Number(e.target.value) || 0)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">Meta de faturamento</label><Input type="number" value={formData.meta_faturamento} onChange={e => updateField('meta_faturamento', Number(e.target.value) || 0)} /></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 6: FAQ E OBJEÇÕES */}
        {activePhase === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-foreground uppercase tracking-wider text-sm">FAQ Dinâmico</CardTitle>
                <Button onClick={() => updateField('faq', [...formData.faq, { id: Date.now().toString(), question: '', answer: '', category: '' }])} variant="outline" size="sm" className="border-[#E85D24] text-[#E85D24] hover:bg-[#E85D24]/10">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.faq.map((item: any) => (
                  <div key={item.id} className="grid grid-cols-1 gap-3 p-4 border border-border rounded-lg relative">
                    <Button variant="ghost" size="icon" onClick={() => updateField('faq', formData.faq.filter((f:any) => f.id !== item.id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="space-y-1 w-full md:w-3/4"><span className="text-[10px] text-muted-foreground uppercase font-bold">Pergunta</span><Input value={item.question} onChange={e => updateField('faq', formData.faq.map((f:any) => f.id === item.id ? { ...f, question: e.target.value } : f))} /></div>
                    <div className="space-y-1 w-full md:w-1/2"><span className="text-[10px] text-muted-foreground uppercase font-bold">Categoria</span><Input placeholder="Sobre preço, resultado..." value={item.category} onChange={e => updateField('faq', formData.faq.map((f:any) => f.id === item.id ? { ...f, category: e.target.value } : f))} /></div>
                    <div className="space-y-1"><span className="text-[10px] text-muted-foreground uppercase font-bold">Resposta Ideal</span><Textarea value={item.answer} onChange={e => updateField('faq', formData.faq.map((f:any) => f.id === item.id ? { ...f, answer: e.target.value } : f))} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-foreground uppercase tracking-wider text-sm">Banco de Objeções</CardTitle>
                <Button onClick={() => updateField('objecoes_banco', [...formData.objecoes_banco, { id: Date.now().toString(), objection: '', answer: '', frequency: '' }])} variant="outline" size="sm" className="border-[#E85D24] text-[#E85D24] hover:bg-[#E85D24]/10">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Objeção
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.objecoes_banco.map((item: any) => (
                  <div key={item.id} className="grid grid-cols-1 gap-3 p-4 border border-border rounded-lg relative">
                    <Button variant="ghost" size="icon" onClick={() => updateField('objecoes_banco', formData.objecoes_banco.filter((o:any) => o.id !== item.id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="space-y-1 w-full md:w-3/4"><span className="text-[10px] text-muted-foreground uppercase font-bold">Objeção</span><Input value={item.objection} onChange={e => updateField('objecoes_banco', formData.objecoes_banco.map((o:any) => o.id === item.id ? { ...o, objection: e.target.value } : o))} /></div>
                    <div className="space-y-1 w-full md:w-1/2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Frequência</span>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.frequency} onChange={e => updateField('objecoes_banco', formData.objecoes_banco.map((o:any) => o.id === item.id ? { ...o, frequency: e.target.value } : o))}>
                        <option value="">Selecione...</option><option value="Muito comum">Muito comum</option><option value="Comum">Comum</option><option value="Rara">Rara</option>
                      </select>
                    </div>
                    <div className="space-y-1"><span className="text-[10px] text-muted-foreground uppercase font-bold">Resposta de Alta Conversão</span><Textarea value={item.answer} onChange={e => updateField('objecoes_banco', formData.objecoes_banco.map((o:any) => o.id === item.id ? { ...o, answer: e.target.value } : o))} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* FASE 7: MATERIAIS */}
        {activePhase === 7 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-[#E85D24]/10 border border-[#E85D24]/20 rounded-xl">
              <h3 className="text-lg font-bold text-[#E85D24] mb-2">Tudo que você construiu nas aulas pode enriquecer o Cérebro Central.</h3>
              <p className="text-muted-foreground">Selecione os materiais que quer incluir como contexto adicional para as IAs. {formData.materiais_adicionados?.length || 0} materiais enriquecendo seu Cérebro hoje.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.length === 0 ? (
                <div className="col-span-full p-8 text-center border border-dashed rounded-xl">
                  <p className="text-muted-foreground mb-4">Você ainda não tem materiais gerados na Trilha.</p>
                  <Button onClick={() => navigate('/plataforma/trilha')} variant="outline" className="border-[#E85D24] text-[#E85D24]">Ir para Trilha</Button>
                </div>
              ) : (
                materials.map(mat => {
                  const isAdded = formData.materiais_adicionados?.includes(mat.id);
                  return (
                    <Card key={mat.id} className={`border ${isAdded ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base line-clamp-1">{mat.title}</CardTitle>
                        <CardDescription>Módulo {mat.module_id}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{mat.content}</p>
                        <Button 
                          onClick={() => toggleArrayValue('materiais_adicionados', mat.id)}
                          variant={isAdded ? "outline" : "default"}
                          className={`w-full ${isAdded ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10' : 'bg-[#E85D24] hover:bg-[#E85D24]/90'}`}
                        >
                          {isAdded ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Adicionado ao Cérebro</> : <><Plus className="w-4 h-4 mr-2" /> Adicionar ao Cérebro</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER FIXED BUTTON */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 border-t border-border bg-background/80 backdrop-blur-md z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${badgeInfo.color} px-3 py-1 border-transparent`}>{completeness}% Completo</Badge>
          {saveStatus === 'saving' && <span className="text-muted-foreground text-xs flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Salvando...</span>}
          {saveStatus === 'saved' && <span className="text-emerald-500 text-xs flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Salvo com sucesso</span>}
        </div>
        <Button 
          onClick={handleManualSave}
          disabled={saveStatus === 'saving'}
          className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white font-bold"
        >
          {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Agora
        </Button>
      </div>
    </div>
  );
}
