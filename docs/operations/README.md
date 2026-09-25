# Operations

Local setup and development checks are documented in the root README.

## Development Auth setup

Apply reviewed migrations to a clean development Supabase project. In the
project's Authentication settings, disable public user signups, retain the
email/password provider, enable TOTP enrollment/verification, and set the Site
URL and allowed invite redirect URL to the development web origin. Verify
`/auth/v1/settings` reports `disable_signup: true` before issuing invitations.
These hosted Auth settings are not represented by SQL migrations.

Provision a strong password for the migration-created `planeta_api_login` role
through secure operator input and store its connection string only in the API
secret manager. The role has no direct table grants and must `SET LOCAL ROLE
planeta_api` for each verified request. Keep the Supabase secret key exclusively
in the API runtime; it is used only for Auth Admin calls. The browser receives
only the publishable key and development URL.

## Initial OWNER

After the Auth migration is applied, run `python -m tools.bootstrap_owner`
once from `services/api` with `OWNER_BOOTSTRAP_EMAIL`,
`OWNER_BOOTSTRAP_DISPLAY_NAME`, `BOOTSTRAP_DATABASE_URL`, `SUPABASE_URL`, and
`SUPABASE_SECRET_KEY` supplied through secure operator input. The command sends
an Auth invite and stages an inactive OWNER profile. The invited person sets a
password and enrolls/verifies TOTP. Only their verified `aal2` session can call
`POST /v1/bootstrap/activate`, which atomically activates that profile and
permanently completes the one-time bootstrap state. No production identity or
password is committed to the repository.

Employee disable changes `profiles.is_active` first, immediately denying new
protected API/RLS reads even with an unexpired token, then bans the Auth user.
If the Auth Admin call fails, the API returns an error and an operator must retry
the same status command to reconcile the Auth ban. Re-enable similarly requires
both the profile update and Auth unban. Realtime is limited to future generic
invalidation; no protected row payload is published by these migrations.

Production deployment and recovery procedures require later reviewed decisions.
