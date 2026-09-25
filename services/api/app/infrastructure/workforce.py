"""Owner commands use database RLS plus constraints/audit triggers."""

from typing import cast
from uuid import UUID

from fastapi import HTTPException
from psycopg import Connection, errors

from app.core.auth import Identity, Workforce
from app.infrastructure.database import load_workforce, trusted_connection


class WorkforceRepository:
    def load(self, identity: Identity) -> Workforce | None:
        return load_workforce(identity)

    def list_employees(self, identity: Identity) -> list[dict[str, object]]:
        with trusted_connection(identity) as conn:
            rows = conn.execute("""
                select p.id, p.display_name, p.is_active, p.locale,
                  array(select pr.role_code from public.profile_roles pr
                        where pr.profile_id = p.id order by pr.role_code) as roles,
                  array(select ps.salon_id from public.profile_salons ps
                        where ps.profile_id = p.id order by ps.salon_id) as salon_ids,
                  array(select pw.workshop_id from public.profile_workshops pw
                        where pw.profile_id = p.id order by pw.workshop_id) as workshop_ids
                from public.profiles p order by p.display_name, p.id
            """).fetchall()
        return [dict(row) for row in rows]

    def create_profile(
        self,
        identity: Identity,
        user_id: UUID,
        display_name: str,
        roles: set[str],
        salon_ids: set[UUID],
        workshop_ids: set[UUID],
    ) -> None:
        try:
            with trusted_connection(identity) as conn:
                conn.execute("insert into public.profiles (id,display_name) values (%s,%s)", (user_id, display_name))
                self._add_access(conn, user_id, roles, salon_ids, workshop_ids)
                conn.execute("update public.profiles set is_active=true where id=%s", (user_id,))
        except (errors.CheckViolation, errors.ForeignKeyViolation, errors.UniqueViolation) as exc:
            raise HTTPException(status_code=409, detail="Invalid employee assignment") from exc

    def replace_access(
        self,
        identity: Identity,
        user_id: UUID,
        display_name: str | None,
        roles: set[str],
        salon_ids: set[UUID],
        workshop_ids: set[UUID],
    ) -> None:
        try:
            with trusted_connection(identity) as conn:
                if display_name is not None:
                    changed = conn.execute(
                        "update public.profiles set display_name=%s where id=%s returning id",
                        (display_name, user_id),
                    ).fetchone()
                    if changed is None:
                        raise HTTPException(status_code=404, detail="Employee unavailable")
                existing_roles = {
                    cast(str, r["role_code"])
                    for r in conn.execute(
                        "select role_code from public.profile_roles where profile_id=%s", (user_id,)
                    ).fetchall()
                }
                existing_salons = {
                    cast(UUID, r["salon_id"])
                    for r in conn.execute(
                        "select salon_id from public.profile_salons where profile_id=%s", (user_id,)
                    ).fetchall()
                }
                existing_workshops = {
                    cast(UUID, r["workshop_id"])
                    for r in conn.execute(
                        "select workshop_id from public.profile_workshops where profile_id=%s", (user_id,)
                    ).fetchall()
                }
                self._add_access(
                    conn,
                    user_id,
                    roles - existing_roles,
                    salon_ids - existing_salons,
                    workshop_ids - existing_workshops,
                )
                for role in existing_roles - roles:
                    conn.execute(
                        "delete from public.profile_roles where profile_id=%s and role_code=%s", (user_id, role)
                    )
                for salon_id in existing_salons - salon_ids:
                    conn.execute(
                        "delete from public.profile_salons where profile_id=%s and salon_id=%s", (user_id, salon_id)
                    )
                for workshop_id in existing_workshops - workshop_ids:
                    conn.execute(
                        "delete from public.profile_workshops where profile_id=%s and workshop_id=%s",
                        (user_id, workshop_id),
                    )
        except (errors.CheckViolation, errors.ForeignKeyViolation, errors.UniqueViolation) as exc:
            raise HTTPException(status_code=409, detail="Invalid employee assignment") from exc

    def set_active(self, identity: Identity, user_id: UUID, active: bool) -> None:
        try:
            with trusted_connection(identity) as conn:
                result = conn.execute(
                    "update public.profiles set is_active=%s where id=%s returning id",
                    (active, user_id),
                ).fetchone()
                if result is None:
                    raise HTTPException(status_code=404, detail="Employee unavailable")
        except errors.CheckViolation as exc:
            raise HTTPException(status_code=409, detail="Last OWNER or assignment guard") from exc

    def activate_initial_owner(self, identity: Identity) -> bool:
        with trusted_connection(identity) as conn:
            row = conn.execute("select app_private.activate_initial_owner() as activated").fetchone()
        return bool(row and row["activated"])

    @staticmethod
    def _add_access(
        conn: Connection[dict[str, object]],
        user_id: UUID,
        roles: set[str],
        salon_ids: set[UUID],
        workshop_ids: set[UUID],
    ) -> None:
        for role in roles:
            conn.execute("insert into public.profile_roles (profile_id,role_code) values (%s,%s)", (user_id, role))
        for salon_id in salon_ids:
            conn.execute("insert into public.profile_salons (profile_id,salon_id) values (%s,%s)", (user_id, salon_id))
        for workshop_id in workshop_ids:
            conn.execute(
                "insert into public.profile_workshops (profile_id,workshop_id) values (%s,%s)", (user_id, workshop_id)
            )


def get_workforce_repository() -> WorkforceRepository:
    return WorkforceRepository()
