-- Supabase manages privileges on auth schema. Run these narrow audit/stamp
-- triggers as their trusted owner so auth.uid() works for the RLS command role.
-- The functions only stamp NEW rows and do not accept callable arguments.
alter function app_private.stamp_profile() security definer;
alter function app_private.stamp_location() security definer;
alter function app_private.stamp_membership() security definer;
