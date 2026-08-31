"""Dependencias de autenticacao e autorizacao.

`get_organization_context` e o ponto central de aplicacao do RNF-002
(isolamento multi-tenant): toda rota que le/escreve dado de uma organizacao
DEVE depender dele (diretamente ou via `require_role`), nunca confiar em
um `organization_id` de path/body sem cruzar com a membership ativa do
usuario autenticado. Ver docs/security/threat-model.md e ADR-0003.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import SESSION_REVOKED_DETAIL, InvalidTokenError, TokenType, decode_token
from app.core.sessions import SessionInvalidError, SessionRevokedError, get_active_session
from app.models.membership import Membership, MembershipRole, MembershipStatus, role_rank
from app.models.user import User

_INVALID_SESSION_DETAIL = "Sessao invalida ou expirada"


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Nao autenticado"
        )
    try:
        payload = decode_token(access_token, TokenType.ACCESS)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_SESSION_DETAIL
        ) from exc

    try:
        get_active_session(db, payload.session_id)
    except SessionRevokedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_REVOKED_DETAIL
        ) from exc
    except SessionInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_SESSION_DETAIL
        ) from exc

    user = db.get(User, payload.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_SESSION_DETAIL
        )
    return user


@dataclass(frozen=True)
class OrganizationContext:
    user: User
    organization_id: uuid.UUID
    role: MembershipRole


def get_organization_context(
    organization_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationContext:
    """RN-001/RN-008: usuario so opera em organizacao onde tem membership ativa.

    Retorna 404 (nao 403) quando a organizacao nao existe OU quando o usuario
    nao tem membership nela — deliberado para nao revelar a um usuario nao
    autorizado se um determinado organization_id existe (ver ADR/threat-model).
    """
    membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == current_user.id,
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .one_or_none()
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organizacao nao encontrada"
        )
    return OrganizationContext(
        user=current_user, organization_id=organization_id, role=membership.role
    )


def require_role(
    minimum_role: MembershipRole,
) -> Callable[[OrganizationContext], OrganizationContext]:
    """Dependency factory: exige que o papel do usuario na organizacao seja
    igual ou superior (rank menor ou igual) a `minimum_role` (RN-009, RN-010).
    """

    def _dependency(
        ctx: OrganizationContext = Depends(get_organization_context),
    ) -> OrganizationContext:
        if role_rank(ctx.role) > role_rank(minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Papel insuficiente para esta operacao",
            )
        return ctx

    return _dependency


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """RN-009: PLATFORM_ADMIN e um papel global (`User.is_platform_admin`), fora
    do escopo de qualquer organizacao — por isso e uma dependency separada de
    `require_role`/`get_organization_context` (que sempre giram em torno de uma
    membership numa organizacao especifica), nunca um bypass silencioso deles.
    Ver app/modules/platform_admin/router.py.
    """
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores da plataforma",
        )
    return current_user
