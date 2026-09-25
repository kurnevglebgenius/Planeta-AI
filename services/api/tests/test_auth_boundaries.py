"""Critical API authorization paths with current profile state on each request."""

from uuid import UUID

from fastapi.testclient import TestClient

from app.core.auth import Identity, Workforce, get_token_verifier
from app.infrastructure.auth_admin import get_auth_admin
from app.infrastructure.workforce import get_workforce_repository
from app.main import create_app

OWNER = UUID("00000000-0000-0000-0000-000000000101")
SELLER = UUID("00000000-0000-0000-0000-000000000102")
SALON_A = UUID("00000000-0000-0000-0000-000000000201")
SALON_B = UUID("00000000-0000-0000-0000-000000000202")


class FakeVerifier:
    def verify(self, token: str) -> Identity:
        if token == "owner-aal2":
            return Identity(OWNER, "aal2", {"sub": str(OWNER), "aal": "aal2"})
        if token == "owner-aal1":
            return Identity(OWNER, "aal1", {"sub": str(OWNER), "aal": "aal1"})
        return Identity(SELLER, "aal1", {"sub": str(SELLER), "aal": "aal1"})


class FakeRepository:
    def __init__(self) -> None:
        self.active = {OWNER: True, SELLER: True}
        self.bootstrap_pending = True

    def load(self, identity: Identity) -> Workforce | None:
        if not self.active[identity.user_id]:
            return None
        return Workforce(
            identity,
            "Fixture",
            frozenset({"OWNER", "SELLER"} if identity.user_id == OWNER else {"SELLER"}),
            frozenset({SALON_B}),
            frozenset(),
        )

    def list_employees(self, identity: Identity) -> list[dict[str, object]]:
        return [{"id": OWNER, "is_active": self.active[OWNER]}]

    def set_active(self, identity: Identity, user_id: UUID, active: bool) -> None:
        self.active[user_id] = active

    def activate_initial_owner(self, identity: Identity) -> bool:
        if not self.bootstrap_pending or identity.user_id != OWNER or identity.aal != "aal2":
            return False
        self.bootstrap_pending = False
        return True


class FakeAuthAdmin:
    def __init__(self) -> None:
        self.disabled: list[tuple[UUID, bool]] = []

    def set_disabled(self, user_id: UUID, disabled: bool) -> None:
        self.disabled.append((user_id, disabled))


def test_protected_boundaries_and_immediate_disable() -> None:
    app = create_app()
    repo = FakeRepository()
    admin = FakeAuthAdmin()
    app.dependency_overrides[get_token_verifier] = FakeVerifier
    app.dependency_overrides[get_workforce_repository] = lambda: repo
    app.dependency_overrides[get_auth_admin] = lambda: admin
    with TestClient(app) as client:
        assert client.get("/v1/me").status_code == 401
        assert client.get("/v1/employees", headers={"Authorization": "Bearer seller"}).status_code == 403
        assert client.get("/v1/employees", headers={"Authorization": "Bearer owner-aal1"}).status_code == 403
        assert client.get("/v1/employees", headers={"Authorization": "Bearer owner-aal2"}).status_code == 200

        owner = {"Authorization": "Bearer owner-aal2"}
        seller = {"Authorization": "Bearer seller"}
        assert client.put(f"/v1/employees/{SELLER}/status", headers=owner, json={"is_active": False}).status_code == 204
        assert admin.disabled == [(SELLER, True)]
        # The same still-valid bearer is checked against fresh profile state.
        assert client.get("/v1/me", headers=seller).status_code == 403
        assert client.get(f"/v1/files/{OWNER}", headers=seller).status_code == 403
        assert client.put(f"/v1/employees/{OWNER}/status", headers=seller, json={"is_active": False}).status_code == 403


def test_bootstrap_activation_requires_mfa_and_is_one_time() -> None:
    app = create_app()
    repo = FakeRepository()
    app.dependency_overrides[get_token_verifier] = FakeVerifier
    app.dependency_overrides[get_workforce_repository] = lambda: repo
    with TestClient(app) as client:
        assert client.post("/v1/bootstrap/activate", headers={"Authorization": "Bearer owner-aal1"}).status_code == 403
        assert client.post("/v1/bootstrap/activate", headers={"Authorization": "Bearer seller"}).status_code == 403
        assert client.post("/v1/bootstrap/activate", headers={"Authorization": "Bearer owner-aal2"}).status_code == 204
        assert client.post("/v1/bootstrap/activate", headers={"Authorization": "Bearer owner-aal2"}).status_code == 403


def test_owner_seller_has_salon_scope_without_owner_mfa() -> None:
    app = create_app()
    repo = FakeRepository()
    app.dependency_overrides[get_token_verifier] = FakeVerifier
    app.dependency_overrides[get_workforce_repository] = lambda: repo
    with TestClient(app) as client:
        password_only = {"Authorization": "Bearer owner-aal1"}
        response = client.get("/v1/me", headers=password_only)
        assert response.status_code == 200
        assert response.json()["roles"] == ["OWNER", "SELLER"]
        assert response.json()["salon_ids"] == [str(SALON_B)]
        assert response.json()["owner_mfa_verified"] is False
        workforce = repo.load(Identity(OWNER, "aal1", {}))
        assert workforce is not None
        assert workforce.can_access_salon(SALON_B)
        assert not workforce.can_access_salon(SALON_A)
        assert client.get("/v1/employees", headers=password_only).status_code == 403
        assert client.get("/v1/employees", headers={"Authorization": "Bearer owner-aal2"}).status_code == 200
