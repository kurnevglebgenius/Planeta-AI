"""One-time, server-side initial OWNER staging. Never run from a browser."""

import os
import sys
from uuid import UUID

import psycopg

from app.infrastructure.auth_admin import AuthAdmin


def main() -> int:
    email = os.environ.get("OWNER_BOOTSTRAP_EMAIL")
    display_name = os.environ.get("OWNER_BOOTSTRAP_DISPLAY_NAME")
    database_url = os.environ.get("BOOTSTRAP_DATABASE_URL")
    if not email or not display_name or not database_url:
        print("Bootstrap inputs are missing", file=sys.stderr)
        return 2

    with psycopg.connect(database_url, connect_timeout=5) as conn:
        status = conn.execute("select status from app_private.bootstrap_state where singleton").fetchone()
    if status is None or status[0] != "unused":
        print("Initial OWNER bootstrap has already been staged", file=sys.stderr)
        return 1

    # Auth sends a private invitation. Password setup and TOTP verification
    # happen in Supabase Auth; the business profile remains inactive meanwhile.
    admin = AuthAdmin()
    user_id: UUID = admin.invite(email)
    try:
        with psycopg.connect(database_url, connect_timeout=5) as conn:
            conn.execute("select app_private.stage_initial_owner(%s, %s)", (user_id, display_name))
    except Exception:
        admin.delete_new_invite(user_id)
        raise
    print("Initial OWNER staged; MFA verification is required for activation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
