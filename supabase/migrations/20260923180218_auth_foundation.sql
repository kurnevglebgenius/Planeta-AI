-- One-time OWNER activation and a dedicated login identity for trusted API SQL.
-- Provision the login password through a secret manager, never in a migration.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'planeta_api_login') then
    create role planeta_api_login login noinherit nobypassrls;
  end if;
end;
$$;
grant planeta_api to planeta_api_login with inherit false, set true;

create table app_private.bootstrap_state (
  singleton boolean primary key default true check (singleton),
  owner_id uuid unique references public.profiles (id) on delete restrict,
  status text not null default 'unused' check (status in ('unused', 'pending', 'complete')),
  staged_at timestamptz,
  completed_at timestamptz,
  check (
    (status = 'unused' and owner_id is null and staged_at is null and completed_at is null)
    or (status = 'pending' and owner_id is not null and staged_at is not null
        and completed_at is null)
    or (status = 'complete' and owner_id is not null and staged_at is not null
        and completed_at is not null)
  )
);
insert into app_private.bootstrap_state (singleton) values (true);

-- Called only from the one-time server-side bootstrap command with a privileged
-- migration/operations connection. Auth Admin creates the identity separately.
create function app_private.stage_initial_owner(p_owner_id uuid, p_display_name text)
returns void
language plpgsql set search_path = ''
as $$
begin
  perform 1 from app_private.bootstrap_state where singleton for update;
  if (select status from app_private.bootstrap_state where singleton) <> 'unused'
     or (select active_count from app_private.owner_guard where singleton) <> 0 then
    raise exception 'initial OWNER bootstrap already used' using errcode = '23514';
  end if;
  insert into public.profiles (id, display_name, is_active)
    values (p_owner_id, p_display_name, false);
  insert into public.profile_roles (profile_id, role_code)
    values (p_owner_id, 'OWNER');
  update app_private.bootstrap_state
     set owner_id = p_owner_id, status = 'pending', staged_at = now()
   where singleton;
end;
$$;

create function app_private.activate_initial_owner()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  staged_id uuid;
begin
  if auth.uid() is null or (auth.jwt() ->> 'aal') <> 'aal2'
     or (auth.jwt() ->> 'is_anonymous') = 'true' then
    return false;
  end if;
  select owner_id into staged_id
    from app_private.bootstrap_state
   where singleton and status = 'pending' for update;
  if staged_id is null or staged_id <> auth.uid() then return false; end if;
  update public.profiles set is_active = true
   where id = staged_id and not is_active;
  if not found then return false; end if;
  update app_private.bootstrap_state
     set status = 'complete', completed_at = now()
   where singleton;
  return true;
end;
$$;

revoke all on function app_private.stage_initial_owner(uuid, text),
  app_private.activate_initial_owner() from public, anon, authenticated, service_role;
grant execute on function app_private.activate_initial_owner() to planeta_api;
