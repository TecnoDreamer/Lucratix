"""Painel de Super Admin (RF-001, RF-012, persona "Administrador(a) da
Plataforma" — docs/product/personas.md). Tudo aqui atras de
`require_platform_admin` (app/core/deps.py) — nunca de `get_organization_context`,
que continua sendo o unico ponto de aplicacao do isolamento multi-tenant
(RNF-002) para dado de negocio. Este modulo gerencia QUEM tem acesso a
QUAL organizacao, nao o dado de dentro delas — ver nota de escopo em
docs/security/ACCESS_CONTROL.md.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.client_ip import get_client_ip
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import require_platform_admin
from app.core.rate_limit import (
    enforce_rate_limits,
    membership_invite_rate_limiter,
    platform_user_create_rate_limiter,
)
from app.models.membership import Membership
from app.models.user import User
from app.modules.auth.service import create_user_with_reset_token
from app.modules.memberships import repository as memberships_repository
from app.modules.memberships.service import (
    CannotRevokeHigherRoleError,
    MembershipAlreadyExistsError,
    NameRequiredForNewUserError,
    grant_access,
    revoke_access,
)
from app.modules.organizations import repository as organizations_repository
from app.modules.platform_admin import repository
from app.schemas.membership import MembershipInvite, MembershipRoleUpdate, MembershipWithUserRead
from app.schemas.platform_admin import (
    PlatformOrganizationRead,
    PlatformUserCreate,
    PlatformUserCreateResponse,
    PlatformUserRead,
    PlatformUserUpdate,
)

router = APIRouter(prefix="/api/v1/platform", tags=["platform-admin"])
settings = get_settings()


def _membership_read(
    membership: Membership, user: User, *, dev_token: str | None = None
) -> MembershipWithUserRead:
    return MembershipWithUserRead(
        id=membership.id,
        user_id=membership.user_id,
        organization_id=membership.organization_id,
        role=membership.role,
        status=membership.status,
        created_at=membership.created_at,
        user_name=user.name,
        user_email=user.email,
        dev_token=dev_token,
    )


def _user_read(user: User, organization_count: int) -> PlatformUserRead:
    return PlatformUserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        is_platform_admin=user.is_platform_admin,
        organization_count=organization_count,
    )


def _require_organization(db: Session, organization_id: uuid.UUID) -> None:
    if organizations_repository.get_organization(db, organization_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organizacao nao encontrada")


@router.get("/organizations")
def list_organizations(
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[PlatformOrganizationRead]:
    return [
        PlatformOrganizationRead(
            id=org.id,
            name=org.name,
            created_at=org.created_at,
            owner_name=owner_name,
            owner_email=owner_email,
            member_count=member_count,
        )
        for org, owner_name, owner_email, member_count in repository.list_organizations_with_owner_and_count(
            db
        )
    ]


@router.get("/organizations/{organization_id}/memberships")
def list_organization_memberships(
    organization_id: uuid.UUID,
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[MembershipWithUserRead]:
    _require_organization(db, organization_id)
    return [
        _membership_read(m, u)
        for m, u in memberships_repository.list_memberships_with_user(db, organization_id)
    ]


@router.post("/organizations/{organization_id}/memberships", status_code=status.HTTP_201_CREATED)
def grant_organization_access(
    organization_id: uuid.UUID,
    data: MembershipInvite,
    request: Request,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> MembershipWithUserRead:
    # RNF-005: mesmo criterio de memberships/router.py::invite_member —
    # ver core/rate_limit.py.
    enforce_rate_limits(
        [(membership_invite_rate_limiter, f"{get_client_ip(request)}:{admin.id}")],
        detail="Muitos convites em pouco tempo. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.membership_invite",
    )
    _require_organization(db, organization_id)
    try:
        membership, user, raw_token = grant_access(
            db, organization_id=organization_id, email=data.email, role=data.role, name=data.name
        )
    except NameRequiredForNewUserError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except MembershipAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    record_audit(
        db,
        action="membership.granted_by_platform_admin",
        entity="membership",
        entity_id=membership.id,
        user_id=admin.id,
        organization_id=organization_id,
    )
    db.commit()
    dev_token = raw_token if (raw_token and not settings.is_production) else None
    return _membership_read(membership, user, dev_token=dev_token)


@router.patch("/organizations/{organization_id}/memberships/{membership_id}")
def update_organization_membership_role(
    organization_id: uuid.UUID,
    membership_id: uuid.UUID,
    data: MembershipRoleUpdate,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> MembershipWithUserRead:
    membership = memberships_repository.get_membership(db, organization_id, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership nao encontrada")

    membership.role = data.role
    record_audit(
        db,
        action="membership.role_updated_by_platform_admin",
        entity="membership",
        entity_id=membership.id,
        user_id=admin.id,
        organization_id=organization_id,
    )
    db.commit()
    user = db.get(User, membership.user_id)
    assert user is not None
    return _membership_read(membership, user)


@router.delete(
    "/organizations/{organization_id}/memberships/{membership_id}", status_code=status.HTTP_204_NO_CONTENT
)
def revoke_organization_membership(
    organization_id: uuid.UUID,
    membership_id: uuid.UUID,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> None:
    membership = memberships_repository.get_membership(db, organization_id, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership nao encontrada")

    # actor_role=None: Super Admin nao tem papel dentro da organizacao, pode
    # revogar qualquer papel (inclusive Proprietario) — ver
    # memberships/service.py::revoke_access.
    try:
        revoke_access(db, membership=membership)
    except CannotRevokeHigherRoleError as exc:  # pragma: no cover - actor_role=None nunca levanta isto
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    record_audit(
        db,
        action="membership.revoked_by_platform_admin",
        entity="membership",
        entity_id=membership_id,
        user_id=admin.id,
        organization_id=organization_id,
    )
    db.commit()


@router.get("/users")
def list_users(
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[PlatformUserRead]:
    return [_user_read(u, count) for u, count in repository.list_users_with_organization_count(db)]


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    data: PlatformUserCreate,
    request: Request,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformUserCreateResponse:
    # RNF-005: ja atras de require_platform_admin, mas sem limite nenhum
    # contra criacao de conta em massa (ver core/rate_limit.py).
    enforce_rate_limits(
        [(platform_user_create_rate_limiter, f"{get_client_ip(request)}:{admin.id}")],
        detail="Muitas contas criadas em pouco tempo. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.platform_user_create",
    )
    created = create_user_with_reset_token(db, name=data.name, email=data.email)
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ja existe uma conta com este e-mail"
        )
    user, raw_token = created

    record_audit(
        db,
        action="user.created_by_platform_admin",
        entity="user",
        entity_id=user.id,
        user_id=admin.id,
    )
    db.commit()
    dev_token = raw_token if not settings.is_production else None
    return PlatformUserCreateResponse(user=_user_read(user, 0), dev_token=dev_token)


@router.patch("/users/{user_id}")
def update_user(
    user_id: uuid.UUID,
    data: PlatformUserUpdate,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformUserRead:
    user = repository.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado")

    is_self = user.id == admin.id
    if is_self and data.is_platform_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao e possivel remover o proprio acesso de Super Admin",
        )
    if is_self and data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao e possivel desativar a propria conta",
        )

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(user, field, value)

    for field in changes:
        record_audit(
            db,
            action=f"user.{field}_updated_by_platform_admin",
            entity="user",
            entity_id=user.id,
            user_id=admin.id,
        )
    db.commit()

    organization_count = repository.count_organizations_for_user(db, user.id)
    return _user_read(user, organization_count)
