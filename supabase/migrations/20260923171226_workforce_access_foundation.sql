-- Phase 1 workforce/access foundation. No Auth users or business data are provisioned here.
-- Run through the reviewed migration identity, never through a browser session.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated, service_role;

-- This non-login role is reserved for a future FastAPI database connection that
-- forwards claims only after verifying a workforce JWT. Browser roles cannot assume it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'planeta_api') then
    create role planeta_api nologin noinherit nobypassrls;
  end if;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  locale text not null default 'ru' check (length(btrim(locale)) between 2 and 35),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deactivated_at timestamptz,
  deactivated_by uuid,
  constraint profiles_active_not_deactivated check
    (not is_active or (deactivated_at is null and deactivated_by is null))
);

create table public.roles (
  code text primary key check (code in ('OWNER', 'SELLER', 'PRODUCTION')),
  created_at timestamptz not null default now()
);

insert into public.roles (code) values ('OWNER'), ('SELLER'), ('PRODUCTION');

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_code text not null references public.roles (code) on update restrict on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid,
  primary key (profile_id, role_code)
);

create table public.profile_salons (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on update restrict on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid,
  primary key (profile_id, salon_id)
);

create table public.profile_workshops (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  workshop_id uuid not null references public.workshops (id) on update restrict on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid,
  primary key (profile_id, workshop_id)
);

create index profile_roles_role_profile_idx on public.profile_roles (role_code, profile_id);
create index profile_salons_salon_profile_idx on public.profile_salons (salon_id, profile_id);
create index profile_workshops_workshop_profile_idx
  on public.profile_workshops (workshop_id, profile_id);

-- A single guarded row serializes OWNER removals. The first owner is added only
-- by a separate, controlled bootstrap step; this migration creates no identity.
create table app_private.owner_guard (
  singleton boolean primary key default true check (singleton),
  active_count integer not null check (active_count >= 0)
);
insert into app_private.owner_guard (singleton, active_count) values (true, 0);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_kind text not null check (actor_kind in ('workforce', 'system')),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  change_data jsonb not null default '{}'::jsonb,
  reason text,
  correlation_id text,
  source text not null check (source in ('api', 'system')),
  metadata_version integer not null default 1 check (metadata_version > 0)
);
create index audit_events_entity_time_idx
  on public.audit_events (entity_type, entity_id, occurred_at desc);
create index audit_events_actor_time_idx
  on public.audit_events (actor_id, occurred_at desc) where actor_id is not null;

create function app_private.current_profile_active()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous') <> 'true', true)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active
    );
$$;

create function app_private.current_has_role(p_role text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app_private.current_profile_active()
    and exists (
      select 1 from public.profile_roles pr
      where pr.profile_id = auth.uid() and pr.role_code = p_role
    );
$$;

create function app_private.current_owner_authorized()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app_private.current_has_role('OWNER')
    and (auth.jwt() ->> 'aal') = 'aal2';
$$;

create function app_private.current_salon_scope(p_salon_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app_private.current_owner_authorized()
    or (
      app_private.current_has_role('SELLER')
      and exists (
        select 1 from public.profile_salons ps
        where ps.profile_id = auth.uid() and ps.salon_id = p_salon_id
      )
    );
$$;

create function app_private.current_workshop_scope(p_workshop_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app_private.current_owner_authorized()
    or (
      app_private.current_has_role('PRODUCTION')
      and exists (
        select 1 from public.profile_workshops pw
        where pw.profile_id = auth.uid() and pw.workshop_id = p_workshop_id
      )
    );
$$;

create function app_private.stamp_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.updated_at := now();
    new.updated_by := auth.uid();
    new.deactivated_at := null;
    new.deactivated_by := null;
  else
    if new.id is distinct from old.id then
      raise exception 'profile identity is immutable' using errcode = '23514';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := auth.uid();
    if old.is_active and not new.is_active then
      new.deactivated_at := now();
      new.deactivated_by := auth.uid();
    elsif not old.is_active and new.is_active then
      new.deactivated_at := null;
      new.deactivated_by := null;
    else
      new.deactivated_at := old.deactivated_at;
      new.deactivated_by := old.deactivated_by;
    end if;
  end if;
  return new;
end;
$$;

create function app_private.stamp_location()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    if new.id is distinct from old.id or new.code is distinct from old.code then
      raise exception 'location identity is immutable' using errcode = '23514';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create function app_private.stamp_membership()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.assigned_at := now();
  new.assigned_by := auth.uid();
  return new;
end;
$$;

create function app_private.reject_immutable_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'immutable workforce record: %', tg_table_name using errcode = '23514';
end;
$$;

create trigger stamp_profile before insert or update on public.profiles
  for each row execute function app_private.stamp_profile();
create trigger reject_profile_delete before delete on public.profiles
  for each row execute function app_private.reject_immutable_change();
create trigger stamp_salon before insert or update on public.salons
  for each row execute function app_private.stamp_location();
create trigger stamp_workshop before insert or update on public.workshops
  for each row execute function app_private.stamp_location();
create trigger reject_salon_delete before delete on public.salons
  for each row execute function app_private.reject_immutable_change();
create trigger reject_workshop_delete before delete on public.workshops
  for each row execute function app_private.reject_immutable_change();
create trigger reject_role_change before update or delete on public.roles
  for each row execute function app_private.reject_immutable_change();
create trigger reject_membership_update before update on public.profile_roles
  for each row execute function app_private.reject_immutable_change();
create trigger reject_salon_membership_update before update on public.profile_salons
  for each row execute function app_private.reject_immutable_change();
create trigger reject_workshop_membership_update before update on public.profile_workshops
  for each row execute function app_private.reject_immutable_change();
create trigger stamp_role_membership before insert on public.profile_roles
  for each row execute function app_private.stamp_membership();
create trigger stamp_salon_membership before insert on public.profile_salons
  for each row execute function app_private.stamp_membership();
create trigger stamp_workshop_membership before insert on public.profile_workshops
  for each row execute function app_private.stamp_membership();
create trigger reject_audit_change before update or delete on public.audit_events
  for each row execute function app_private.reject_immutable_change();

-- The UPDATE on one guard row is atomic and serializes simultaneous attempts to
-- remove different owners. A negative delta may never reduce the count to zero.
create function app_private.adjust_active_owner_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  delta integer := 0;
  profile_active boolean;
begin
  if tg_table_name = 'profiles' then
    if old.is_active is distinct from new.is_active
       and exists (
         select 1 from public.profile_roles pr
         where pr.profile_id = new.id and pr.role_code = 'OWNER'
       ) then
      delta := case when new.is_active then 1 else -1 end;
    end if;
  elsif tg_table_name = 'profile_roles' then
    if tg_op = 'INSERT' and new.role_code = 'OWNER' then
      select p.is_active into profile_active from public.profiles p where p.id = new.profile_id;
      if profile_active then delta := 1; end if;
    elsif tg_op = 'DELETE' and old.role_code = 'OWNER' then
      select p.is_active into profile_active from public.profiles p where p.id = old.profile_id;
      if profile_active then delta := -1; end if;
    end if;
  end if;

  if delta <> 0 then
    update app_private.owner_guard
       set active_count = active_count + delta
     where singleton and active_count + delta >= 1;
    if not found then
      raise exception 'cannot remove the last active OWNER' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;

create trigger count_owner_profile_status after update of is_active on public.profiles
  for each row execute function app_private.adjust_active_owner_count();
create trigger count_owner_role_add after insert on public.profile_roles
  for each row execute function app_private.adjust_active_owner_count();
create trigger count_owner_role_remove after delete on public.profile_roles
  for each row execute function app_private.adjust_active_owner_count();

-- Deferred checks allow the API to assign role and locations in one transaction.
-- Active SELLER/PRODUCTION profiles must finish that transaction with a scope.
create function app_private.validate_profile_access(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  active boolean;
  has_owner boolean;
  has_seller boolean;
  has_production boolean;
begin
  select p.is_active into active from public.profiles p where p.id = p_profile_id;
  if not found then return; end if;

  select
    coalesce(bool_or(role_code = 'OWNER'), false),
    coalesce(bool_or(role_code = 'SELLER'), false),
    coalesce(bool_or(role_code = 'PRODUCTION'), false)
  into has_owner, has_seller, has_production
  from public.profile_roles where profile_id = p_profile_id;

  if has_production and (has_seller or has_owner) then
    raise exception 'PRODUCTION cannot be combined with another role' using errcode = '23514';
  end if;
  if not has_seller and exists (
    select 1 from public.profile_salons where profile_id = p_profile_id
  ) then
    raise exception 'salon assignment requires SELLER' using errcode = '23514';
  end if;
  if not has_production and exists (
    select 1 from public.profile_workshops where profile_id = p_profile_id
  ) then
    raise exception 'workshop assignment requires PRODUCTION' using errcode = '23514';
  end if;
  if active then
    if not (has_owner or has_seller or has_production) then
      raise exception 'active profile requires a role' using errcode = '23514';
    end if;
    if has_seller and not exists (
      select 1 from public.profile_salons where profile_id = p_profile_id
    ) then
      raise exception 'active SELLER requires a salon' using errcode = '23514';
    end if;
    if has_production and not exists (
      select 1 from public.profile_workshops where profile_id = p_profile_id
    ) then
      raise exception 'active PRODUCTION requires a workshop' using errcode = '23514';
    end if;
  end if;
end;
$$;

create function app_private.check_profile_access_trigger()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'profiles' then
    perform app_private.validate_profile_access(new.id);
  elsif tg_op = 'DELETE' then
    perform app_private.validate_profile_access(old.profile_id);
  else
    perform app_private.validate_profile_access(new.profile_id);
  end if;
  return null;
end;
$$;

create constraint trigger validate_profile_after_insert
  after insert on public.profiles deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_profile_after_update
  after update on public.profiles deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_roles_after_insert
  after insert on public.profile_roles deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_roles_after_delete
  after delete on public.profile_roles deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_salons_after_insert
  after insert on public.profile_salons deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_salons_after_delete
  after delete on public.profile_salons deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_workshops_after_insert
  after insert on public.profile_workshops deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();
create constraint trigger validate_workshops_after_delete
  after delete on public.profile_workshops deferrable initially deferred
  for each row execute function app_private.check_profile_access_trigger();

-- Curated audit metadata only: never copy names, credentials, or full table rows.
create function app_private.audit_workforce_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  target_id uuid;
  event_action text;
  safe_change jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'profiles' then
    target_id := new.id;
    if tg_op = 'INSERT' then
      event_action := 'PROFILE_CREATED';
      safe_change := jsonb_build_object('is_active', new.is_active);
    elsif old.is_active is distinct from new.is_active then
      event_action := case when new.is_active then 'PROFILE_REACTIVATED'
                           else 'PROFILE_DEACTIVATED' end;
      safe_change := jsonb_build_object('before_active', old.is_active,
                                       'after_active', new.is_active);
    else
      event_action := 'PROFILE_UPDATED';
      safe_change := jsonb_build_object('changed_fields', 'profile_metadata');
    end if;
  elsif tg_table_name = 'profile_roles' then
    target_id := case when tg_op = 'INSERT' then new.profile_id else old.profile_id end;
    event_action := case when tg_op = 'INSERT' then 'ROLE_ASSIGNED' else 'ROLE_REMOVED' end;
    safe_change := jsonb_build_object('role',
      case when tg_op = 'INSERT' then new.role_code else old.role_code end);
  elsif tg_table_name = 'profile_salons' then
    target_id := case when tg_op = 'INSERT' then new.profile_id else old.profile_id end;
    event_action := case when tg_op = 'INSERT' then 'SALON_ASSIGNED' else 'SALON_REMOVED' end;
    safe_change := jsonb_build_object('salon_id',
      case when tg_op = 'INSERT' then new.salon_id else old.salon_id end);
  elsif tg_table_name = 'profile_workshops' then
    target_id := case when tg_op = 'INSERT' then new.profile_id else old.profile_id end;
    event_action := case when tg_op = 'INSERT' then 'WORKSHOP_ASSIGNED'
                         else 'WORKSHOP_REMOVED' end;
    safe_change := jsonb_build_object('workshop_id',
      case when tg_op = 'INSERT' then new.workshop_id else old.workshop_id end);
  elsif tg_table_name = 'salons' or tg_table_name = 'workshops' then
    target_id := new.id;
    event_action := upper(left(tg_table_name, length(tg_table_name) - 1)) || '_'
      || case when tg_op = 'INSERT' then 'CREATED' else 'UPDATED' end;
    safe_change := jsonb_build_object('code', new.code, 'is_active', new.is_active);
  end if;

  insert into public.audit_events
    (actor_kind, actor_id, action, entity_type, entity_id, change_data, correlation_id, source)
  values
    (case when auth.uid() is null then 'system' else 'workforce' end,
     auth.uid(), event_action, tg_table_name, target_id, safe_change,
     nullif(current_setting('app.request_id', true), ''),
     case when auth.uid() is null then 'system' else 'api' end);
  return null;
end;
$$;

create trigger audit_profiles after insert or update on public.profiles
  for each row execute function app_private.audit_workforce_change();
create trigger audit_roles after insert or delete on public.profile_roles
  for each row execute function app_private.audit_workforce_change();
create trigger audit_profile_salons after insert or delete on public.profile_salons
  for each row execute function app_private.audit_workforce_change();
create trigger audit_profile_workshops after insert or delete on public.profile_workshops
  for each row execute function app_private.audit_workforce_change();
create trigger audit_salons after insert or update on public.salons
  for each row execute function app_private.audit_workforce_change();
create trigger audit_workshops after insert or update on public.workshops
  for each row execute function app_private.audit_workforce_change();

-- All exposed tables default to no browser access until the explicit grants and
-- policies below. No workforce table is added to a Realtime publication.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.salons enable row level security;
alter table public.workshops enable row level security;
alter table public.profile_roles enable row level security;
alter table public.profile_salons enable row level security;
alter table public.profile_workshops enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.profiles, public.roles, public.salons, public.workshops,
  public.profile_roles, public.profile_salons, public.profile_workshops,
  public.audit_events from public, anon, authenticated, service_role;
grant usage on schema public to planeta_api;
grant usage on schema auth to planeta_api;
grant execute on function auth.uid(), auth.jwt() to planeta_api;
grant usage on schema app_private to authenticated, planeta_api;
revoke all on all functions in schema app_private from public, anon, authenticated, service_role;
grant execute on function app_private.current_profile_active(),
  app_private.current_has_role(text), app_private.current_owner_authorized(),
  app_private.current_salon_scope(uuid), app_private.current_workshop_scope(uuid)
  to authenticated, planeta_api;

grant select on public.profiles, public.roles, public.salons, public.workshops,
  public.profile_roles, public.profile_salons, public.profile_workshops
  to authenticated, planeta_api;
grant select on public.audit_events to planeta_api;
grant insert, update on public.profiles, public.salons, public.workshops to planeta_api;
grant insert, delete on public.profile_roles, public.profile_salons,
  public.profile_workshops to planeta_api;

create policy profiles_read on public.profiles for select
  to authenticated, planeta_api
  using ((select app_private.current_profile_active()) and
         (id = (select auth.uid()) or (select app_private.current_owner_authorized())));
create policy profiles_insert on public.profiles for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy profiles_update on public.profiles for update to planeta_api
  using ((select app_private.current_owner_authorized()))
  with check (true);

create policy roles_read on public.roles for select to authenticated, planeta_api
  using ((select app_private.current_profile_active()));

create policy salons_read on public.salons for select to authenticated, planeta_api
  using (app_private.current_salon_scope(id));
create policy salons_insert on public.salons for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy salons_update on public.salons for update to planeta_api
  using ((select app_private.current_owner_authorized()))
  with check ((select app_private.current_owner_authorized()));

create policy workshops_read on public.workshops for select to authenticated, planeta_api
  using (app_private.current_workshop_scope(id));
create policy workshops_insert on public.workshops for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy workshops_update on public.workshops for update to planeta_api
  using ((select app_private.current_owner_authorized()))
  with check ((select app_private.current_owner_authorized()));

create policy profile_roles_read on public.profile_roles for select
  to authenticated, planeta_api
  using ((select app_private.current_profile_active()) and
         (profile_id = (select auth.uid()) or (select app_private.current_owner_authorized())));
create policy profile_roles_insert on public.profile_roles for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy profile_roles_delete on public.profile_roles for delete to planeta_api
  using ((select app_private.current_owner_authorized()));

create policy profile_salons_read on public.profile_salons for select
  to authenticated, planeta_api
  using ((select app_private.current_profile_active()) and
         (profile_id = (select auth.uid()) or (select app_private.current_owner_authorized())));
create policy profile_salons_insert on public.profile_salons for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy profile_salons_delete on public.profile_salons for delete to planeta_api
  using ((select app_private.current_owner_authorized()));

create policy profile_workshops_read on public.profile_workshops for select
  to authenticated, planeta_api
  using ((select app_private.current_profile_active()) and
         (profile_id = (select auth.uid()) or (select app_private.current_owner_authorized())));
create policy profile_workshops_insert on public.profile_workshops for insert to planeta_api
  with check ((select app_private.current_owner_authorized()));
create policy profile_workshops_delete on public.profile_workshops for delete to planeta_api
  using ((select app_private.current_owner_authorized()));

create policy audit_events_owner_read on public.audit_events for select to planeta_api
  using ((select app_private.current_owner_authorized()));
