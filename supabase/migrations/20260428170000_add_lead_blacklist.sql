create table if not exists public.lead_blacklist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  telefone text not null,
  telefone_normalizado text not null,
  motivo text,
  blocked_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, telefone_normalizado)
);

create index if not exists idx_lead_blacklist_org on public.lead_blacklist (organization_id);
create index if not exists idx_lead_blacklist_phone on public.lead_blacklist (telefone_normalizado);

create or replace function public.normalize_crm_phone(phone_input text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text := regexp_replace(coalesce(phone_input, ''), '\D', '', 'g');
begin
  if cleaned = '' then
    return cleaned;
  end if;

  if length(cleaned) in (10, 11) and left(cleaned, 2) <> '55' then
    cleaned := '55' || cleaned;
  end if;

  return cleaned;
end;
$$;

create or replace function public.set_lead_blacklist_phone_fields()
returns trigger
language plpgsql
as $$
begin
  new.telefone := regexp_replace(coalesce(new.telefone, ''), '\D', '', 'g');
  new.telefone_normalizado := public.normalize_crm_phone(new.telefone);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_lead_blacklist_phone_fields on public.lead_blacklist;
create trigger trg_lead_blacklist_phone_fields
before insert or update on public.lead_blacklist
for each row
execute function public.set_lead_blacklist_phone_fields();

create or replace function public.prevent_blacklisted_leads()
returns trigger
language plpgsql
as $$
declare
  normalized_phone text;
begin
  if new.organization_id is null or new.telefone is null then
    return new;
  end if;

  normalized_phone := public.normalize_crm_phone(new.telefone);

  if exists (
    select 1
    from public.lead_blacklist lb
    where lb.organization_id = new.organization_id
      and lb.telefone_normalizado = normalized_phone
  ) then
    raise exception 'Este número está bloqueado permanentemente na blacklist do CRM.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_blacklisted_leads on public.leads;
create trigger trg_prevent_blacklisted_leads
before insert or update of telefone, organization_id on public.leads
for each row
execute function public.prevent_blacklisted_leads();

create or replace function public.blacklist_lead_permanently(
  p_lead_id uuid,
  p_reason text default 'Bloqueado manualmente pelo CRM.'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_lead record;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select id, organization_id, telefone
  into v_lead
  from public.leads
  where id = p_lead_id
    and organization_id = public.get_my_org_id();

  if not found then
    raise exception 'Lead não encontrado para esta organização.';
  end if;

  insert into public.lead_blacklist (
    organization_id,
    telefone,
    telefone_normalizado,
    motivo,
    blocked_by
  )
  values (
    v_lead.organization_id,
    v_lead.telefone,
    public.normalize_crm_phone(v_lead.telefone),
    p_reason,
    v_user_id
  )
  on conflict (organization_id, telefone_normalizado)
  do update set
    telefone = excluded.telefone,
    motivo = excluded.motivo,
    blocked_by = excluded.blocked_by,
    updated_at = now();

  delete from public.message_attachments
  where message_id in (
    select id from public.mensagens where lead_id = v_lead.id
  );

  delete from public.mensagens where lead_id = v_lead.id;
  delete from public.leads_tags where lead_id = v_lead.id;
  delete from public.lead_stage_history where lead_id = v_lead.id;
  delete from public.notificacoes where lead_id = v_lead.id;
  delete from public.vendas where lead_id = v_lead.id;
  delete from public.atividades where lead_id = v_lead.id;
  delete from public.scheduled_quick_messages where lead_id = v_lead.id;
  delete from public.lead_cadencias where lead_id = v_lead.id;
  delete from public.cadencia_logs where lead_id = v_lead.id;
  update public.ai_execution_logs set lead_id = null where lead_id = v_lead.id;

  delete from public.leads where id = v_lead.id;
end;
$$;

grant execute on function public.blacklist_lead_permanently(uuid, text) to authenticated;

alter table public.lead_blacklist enable row level security;

drop policy if exists "lead_blacklist_select_policy" on public.lead_blacklist;
create policy "lead_blacklist_select_policy"
on public.lead_blacklist
for select
to authenticated
using (organization_id = public.get_my_org_id());

drop policy if exists "lead_blacklist_insert_policy" on public.lead_blacklist;
create policy "lead_blacklist_insert_policy"
on public.lead_blacklist
for insert
to authenticated
with check (organization_id = public.get_my_org_id());

drop policy if exists "lead_blacklist_update_policy" on public.lead_blacklist;
create policy "lead_blacklist_update_policy"
on public.lead_blacklist
for update
to authenticated
using (organization_id = public.get_my_org_id())
with check (organization_id = public.get_my_org_id());

drop policy if exists "lead_blacklist_delete_policy" on public.lead_blacklist;
create policy "lead_blacklist_delete_policy"
on public.lead_blacklist
for delete
to authenticated
using (organization_id = public.get_my_org_id());

drop trigger if exists update_lead_blacklist_updated_at on public.lead_blacklist;
create trigger update_lead_blacklist_updated_at
before update on public.lead_blacklist
for each row
execute function public.update_updated_at_column();
