"""Convite e gestao de papel de membros de uma organizacao.

Limitacao conhecida (MVP): convite exige que o usuario convidado ja possua
uma conta cadastrada (RF-011 simplificado). Convite de usuario ainda sem
conta (com envio de e-mail e fluxo de "aceitar convite") fica para fase
futura — nao inventado aqui sem essa infraestrutura.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole, role_rank
from app.modules.memberships import repository
from app.schemas.membership import MembershipInvite, MembershipRead, MembershipRoleUpdate

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/memberships", tags=["memberships"]
)


def _ensure_can_assign_role(actor_role: MembershipRole, target_role: MembershipRole) -> None:
    """RN-009: um papel so pode atribuir a outro usuario um papel igual ou
    inferior ao proprio (rank igual ou maior, pois rank menor = mais privilegio).
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
) -> list[MembershipRead]:
    return [
        MembershipRead.model_validate(m)
        for m in repository.list_memberships(db, ctx.organization_id)
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def invite_member(
    data: MembershipInvite,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> MembershipRead:
    _ensure_can_assign_role(ctx.role, data.role)

    user = repository.find_user_by_email(db, data.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario precisa ter uma conta cadastrada antes de ser convidado",
        )

    try:
        membership = repository.add_membership(
            db, user_id=user.id, organization_id=ctx.organization_id, role=data.role
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuario ja possui membership nesta organizacao",
        ) from exc

    record_audit(
        db,
        action="membership.invited",
        entity="membership",
        entity_id=membership.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return MembershipRead.model_validate(membership)


@router.patch("/{membership_id}")
def update_membership_role(
    membership_id: uuid.UUID,
    data: MembershipRoleUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> MembershipRead:
    _ensure_can_assign_role(ctx.role, data.role)

    membership = repository.get_membership(db, ctx.organization_id, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership nao encontrada")

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
    return MembershipRead.model_validate(membership)
