-- 1. Identificar e mesclar todos os leads duplicados pelo número de telefone
DO $$ 
DECLARE 
    r RECORD;
    kept_lead_id UUID;
BEGIN
    FOR r IN 
        SELECT organization_id, telefone, array_agg(id ORDER BY criado_em ASC) as lead_ids
        FROM public.leads
        GROUP BY organization_id, telefone
        HAVING count(id) > 1
    LOOP
        -- Mantém o lead mais antigo (que provavelmente tem as mensagens atreladas a ele)
        kept_lead_id := r.lead_ids[1]; 
        
        -- Atualiza todas as mensagens para apontarem para o lead mantido
        UPDATE public.mensagens SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        
        -- Atualiza as etiquetas (removendo conflitos para não dar erro)
        DELETE FROM public.leads_tags WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]) 
            AND tag_id IN (SELECT tag_id FROM public.leads_tags WHERE lead_id = kept_lead_id);
        UPDATE public.leads_tags SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        
        -- Atualiza todo o resto do sistema
        UPDATE public.lead_stage_history SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        UPDATE public.vendas SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        UPDATE public.atividades SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        UPDATE public.notificacoes SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        UPDATE public.scheduled_quick_messages SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        
        -- Atualiza os fluxos de automação (Cadências)
        DELETE FROM public.lead_cadencias WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)])
            AND cadencia_id IN (SELECT cadencia_id FROM public.lead_cadencias WHERE lead_id = kept_lead_id);
        UPDATE public.lead_cadencias SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        UPDATE public.cadencia_logs SET lead_id = kept_lead_id WHERE lead_id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
        
        -- Exclui definitivamente as cópias vazias do lead
        DELETE FROM public.leads WHERE id = ANY(r.lead_ids[2:array_length(r.lead_ids, 1)]);
    END LOOP;
END $$;

-- 2. Criar a trava de segurança (UNIQUE constraint)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_organization_id_telefone_key;
ALTER TABLE public.leads ADD CONSTRAINT leads_organization_id_telefone_key UNIQUE (organization_id, telefone);