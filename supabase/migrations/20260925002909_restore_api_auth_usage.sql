-- The workforce stamp trigger calls auth.uid() under the API command role.
-- Supabase-managed auth schema can ignore this grant; the following migration
-- makes those trigger functions run under their trusted owner in that case.
grant usage on schema auth to planeta_api;
