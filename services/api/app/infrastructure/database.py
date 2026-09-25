"""Short-lived trusted SQL transactions with per-request verified claims."""

import json
from collections.abc import Iterator
from contextlib import contextmanager
from typing import cast
from uuid import UUID

import psycopg
from fastapi import HTTPException
from psycopg import Connection
from psycopg.rows import dict_row

from app.core.auth import Identity, Workforce
from app.core.config import get_settings


def _database_url() -> str:
    url = get_settings().database_url
    if url is None:
        raise HTTPException(status_code=503, detail="Database is not configured")
    return url.get_secret_value()


@contextmanager
def trusted_connection(identity: Identity) -> Iterator[Connection[dict[str, object]]]:
    """The login has no table rights; SET ROLE selects the RLS-bound command role."""
    with psycopg.connect(_database_url(), row_factory=dict_row, connect_timeout=5) as conn:
        with conn.transaction():
            conn.execute("set local role planeta_api")
            conn.execute("select set_config('request.jwt.claim.sub', %s, true)", (str(identity.user_id),))
            conn.execute(
                "select set_config('request.jwt.claims', %s, true)",
                (json.dumps(identity.claims, separators=(",", ":")),),
            )
            yield conn


def load_workforce(identity: Identity) -> Workforce | None:
    with trusted_connection(identity) as conn:
        profile = conn.execute(
            "select id, display_name from public.profiles where id = %s and is_active",
            (identity.user_id,),
        ).fetchone()
        if profile is None:
            return None
        roles = conn.execute(
            "select role_code from public.profile_roles where profile_id = %s", (identity.user_id,)
        ).fetchall()
        salons = conn.execute(
            "select salon_id from public.profile_salons where profile_id = %s", (identity.user_id,)
        ).fetchall()
        workshops = conn.execute(
            "select workshop_id from public.profile_workshops where profile_id = %s",
            (identity.user_id,),
        ).fetchall()
    return Workforce(
        identity=identity,
        display_name=str(profile["display_name"]),
        roles=frozenset(str(row["role_code"]) for row in roles),
        salon_ids=frozenset(cast(UUID, row["salon_id"]) for row in salons),
        workshop_ids=frozenset(cast(UUID, row["workshop_id"]) for row in workshops),
    )
