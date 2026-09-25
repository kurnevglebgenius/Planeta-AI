# Migrations

Ordered SQL migrations are the sole schema authority. The workforce/access migration introduces only identity extensions, role/location memberships, RLS, and a privacy-minimized audit foundation. Order and customer schema remains deferred.

`planeta_api` is a `NOLOGIN` role for trusted FastAPI transactions. The Auth migration adds a dedicated `planeta_api_login` identity with permission to switch to that role. Provision its password outside Git and configure the API connection with that login. The API verifies JWTs and forwards trusted claims in each transaction. Browser `authenticated` sessions have scoped reads only.

An active OWNER requires an `aal2` JWT for company-wide access. The `app_private.owner_guard` row serializes OWNER removals; create the next active OWNER before removing an existing last one. The Auth migration adds a one-time pending OWNER staging and MFA activation function. Bootstrap is an operator action; recovery remains separate.
