-- Migração para suporte a mensagens agendadas

CREATE TABLE IF NOT EXISTS public.scheduled_quick_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  quick_message_id UUID NOT NULL REFERENCES public.mensagens_rapidas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.scheduled_quick_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "scheduled_quick_messages_select_policy" ON public.scheduled_quick_messages
FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

CREATE POLICY "scheduled_quick_messages_insert_policy" ON public.scheduled_quick_messages
FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "scheduled_quick_messages_update_policy" ON public.scheduled_quick_messages
FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

CREATE POLICY "scheduled_quick_messages_delete_policy" ON public.scheduled_quick_messages
FOR DELETE TO authenticated USING (organization_id = get_my_org_id());