# Database tests

`npm run test:db` creates in-memory PostgreSQL databases with PGlite, stubs only the Supabase Auth schema/functions, then applies the actual migrations and neutral seed. It checks constraints, role/location scope, RLS, disabled-user denial, OWNER continuity, workforce audit immutability, and one-time pending OWNER activation after MFA. No cloud project or credential is used.

This is a fast foundation regression test. Before deployment, also rebuild a clean Supabase development database from migrations and run the role matrix there; PGlite does not replace a full Supabase integration test or concurrent-session test.
