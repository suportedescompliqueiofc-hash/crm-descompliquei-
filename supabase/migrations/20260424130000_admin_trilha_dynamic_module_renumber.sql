begin;

alter table public.platform_block_responses
  drop constraint if exists platform_block_responses_module_id_fkey;
alter table public.platform_block_responses
  add constraint platform_block_responses_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade
  on delete cascade;

alter table public.platform_materiais
  drop constraint if exists platform_materiais_module_id_fkey;
alter table public.platform_materiais
  add constraint platform_materiais_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade;

alter table public.platform_module_blocks
  drop constraint if exists platform_module_blocks_module_id_fkey;
alter table public.platform_module_blocks
  add constraint platform_module_blocks_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade
  on delete cascade;

alter table public.platform_module_progress_detail
  drop constraint if exists platform_module_progress_detail_module_id_fkey;
alter table public.platform_module_progress_detail
  add constraint platform_module_progress_detail_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade;

alter table public.platform_modules
  drop constraint if exists platform_modules_prerequisite_module_id_fkey;
alter table public.platform_modules
  add constraint platform_modules_prerequisite_module_id_fkey
  foreign key (prerequisite_module_id) references public.platform_modules(id)
  on update cascade
  on delete set null;

alter table public.platform_progress
  drop constraint if exists platform_progress_module_id_fkey;
alter table public.platform_progress
  add constraint platform_progress_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade;

alter table public.platform_uploads
  drop constraint if exists platform_uploads_module_id_fkey;
alter table public.platform_uploads
  add constraint platform_uploads_module_id_fkey
  foreign key (module_id) references public.platform_modules(id)
  on update cascade;

create or replace function public.platform_admin_renumber_modules()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  create temporary table tmp_platform_module_map on commit drop as
  with ordered_pillars as (
    select
      p.id,
      row_number() over (order by p.ordem_index, p.nome, p.id) as pillar_pos
    from public.platform_pilares p
  ),
  ordered_modules as (
    select
      m.id as old_id,
      coalesce(
        m.pilar_id,
        (
          select op.id
          from ordered_pillars op
          where op.pillar_pos = m.pillar
          limit 1
        )
      ) as pilar_id,
      row_number() over (
        partition by coalesce(
          m.pilar_id,
          (
            select op.id
            from ordered_pillars op
            where op.pillar_pos = m.pillar
            limit 1
          )
        )
        order by m.order_index, m.title, m.id
      ) as module_pos
    from public.platform_modules m
  )
  select
    om.old_id,
    om.pilar_id,
    op.pillar_pos,
    om.module_pos,
    op.pillar_pos::text || '.' || om.module_pos::text as new_id,
    '__tmp__' || replace(gen_random_uuid()::text, '-', '') as temp_id
  from ordered_modules om
  join ordered_pillars op on op.id = om.pilar_id;

  update public.platform_modules m
  set
    pilar_id = map.pilar_id,
    pillar = map.pillar_pos,
    order_index = map.module_pos
  from tmp_platform_module_map map
  where m.id = map.old_id;

  update public.platform_modules m
  set id = map.temp_id
  from tmp_platform_module_map map
  where m.id = map.old_id
    and map.old_id is distinct from map.new_id;

  update public.platform_modules m
  set id = map.new_id
  from tmp_platform_module_map map
  where m.id = map.temp_id;
end;
$$;

grant execute on function public.platform_admin_renumber_modules() to authenticated;

commit;
