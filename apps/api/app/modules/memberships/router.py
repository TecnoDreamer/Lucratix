"""Convite e gestao de papel de membros de uma organizacao (RF-001, RF-012).

O e-mail convidado nao precisa mais ter conta previa: se nao existir, uma e
criada na hora (`memberships/service.py::grant_access`, que reaproveita
`auth.service.create_user_with_reset_token`) — a pessoa define a propria
senha pelo mesmo fluxo de "esqueci minha senha" (`/redefinir-senha`), nunca
recebe senha em texto puro. Envio de e-mail continua nao implementado (mesma
limitacao herdada do "esqueci minha senha"): fora de producao, a resposta
devolve `dev_token` para o admin copiar o link e mandar manualmente.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import Membership, MembershipRole, role_rank
from app.models.user import User
from app.modules.memberships import repository
from app.modules.memberships.service import (
    CannotRevokeHigherRoleError,
    MembershipAlreadyExistsError,
    NameRequiredForNewUserError,
    grant_access,
    revoke_access,
)
from app.schemas.membership import MembershipInvite, MembershipRoleUpdate, MembershipWithUserRead

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/memberships", tags=["memberships"]
)
settings = get_settings()


def _read(membership: Membership, user: User, *, dev_token: str | None = None) -> MembershipWithUserRead:
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


def _ensure_can_assign_role(actor_role: MembershipRole, target_role: MembershipRole) -> None:
    """RN-009: um papel so pode atribuir a outro usuario um papel igual ou
    inferior ao proprio (rank igual ou maior, pois rank menor = mais privilegio).
    Tambem usada para bloquear ALTERAR quem ja tem papel superior ao ator.
    """
    if role_rank(target_role) < role_rank(actor_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nao e possivel atribuir um papel superior ao seu proprio",
        )


@router.get("")
def list_memberships(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[MembershipWithUserRead]:
    return [_read(m, u) for m, u in repository.list_memberships_with_user(db, ctx.organization_id)]


@router.post("", status_code=status.HTTP_201_CREATED)
def invite_member(
    data: MembershipInvite,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> MembershipWithUserRead:
    _ensure_can_assign_role(ctx.role, data.role)

    try:
        membership, user, raw_token = grant_access(
            db, organization_id=ctx.organization_id, email=data.email, role=data.role, name=data.name
        )
    except NameRequiredForNewUserError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except MembershipAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    record_audit(
        db,
        action="membership.invited" if raw_token is None else "membership.invited_new_account",
        entity="membership",
        entity_id=membership.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    dev_token = raw_token if (raw_token and not settings.is_production) else None
    return _read(membership, user, dev_token=dev_token)


@router.patch("/{membership_id}")
def update_membership_role(
    membership_id: uuid.UUID,
    data: MembershipRoleUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> MembershipWithUserRead:
    _ensure_can_assign_role(ctx.role, data.role)

    membership = repository.get_membership(db, ctx.organization_id, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership nao encontrada")
    # Tambem nao pode ALTERAR quem ja tem papel superior ao proprio (mesma
    # razao de _ensure_can_assign_role, do outro lado da operacao).
    _ensure_can_assign_role(ctx.role, membership.role)

    membership.role = data.role
    record_audit(
        db,
        action="membership.role_updated",
        entity="membership",
        entity_id=membership.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    user = db.get(User, membership.user_id)
    assert user is not None
    return _read(membership, user)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_membership(
    membership_id: uuid.UUID,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> None:
    membership = repository.get_membership(db, ctx.organization_id, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership nao encontrada")
    if membership.user_id == ctx.user.id:
        # Evita lockout acidental — sem fluxo de "sair da organizacao" nesta
        # rodada, a propria membership so pode ser removida por outra pessoa
        # com papel suficiente (ou pelo Super Admin, sem essa restricao).
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao e possivel revogar a propria membership por aqui",
        )

    try:
        revoke_access(db, membership=membership, actor_role=ctx.role)
    except CannotRevokeHigherRoleError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    record_audit(
        db,
        action="membership.revoked",
        entity="membership",
        entity_id=membership_id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
