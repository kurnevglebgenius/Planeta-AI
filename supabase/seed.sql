-- Local/development reference data only. Never apply automatically to production.
-- No users, employee identities, credentials, customer records, or real locations.

insert into public.salons (code, name)
values ('SALON_A', 'SALON_A'), ('SALON_B', 'SALON_B')
on conflict (code) do nothing;

insert into public.workshops (code, name)
values ('WORKSHOP_MAIN', 'WORKSHOP_MAIN')
on conflict (code) do nothing;
