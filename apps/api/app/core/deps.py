"""Dependencias de autenticacao e autorizacao.

`get_organization_context` e o ponto central de aplicacao do RNF-002
(isolamento multi-tenant): toda rota que le/escreve dado de uma organizacao
DEVE depender dele (diretamente ou via `require_role`), nunca confiar em
um `organization_id` de path/body sem cruzar com a membership ativa do
usuario autenticado. Ver docs/security/threat-model.md e ADR-0003.

E' tambem, desde a PR de ciclo de vida de organizacao (2026-09-01), o
UNICO ponto que bloqueia escrita numa organizacao CONGELADA
(`_ensure_organization_writable`) — toda rota de escrita com escopo de
organizacao no projeto passa por aqui (direto ou via `require_role`), entao
o bloqueio se aplica automaticamente a todo modulo (financeiro, marketing,
funil, produtos, experimentos, metas, importacoes, memberships, a propria
organizacao) sem precisar tocar em nenhum deles.

Duas excecoes deliberadas, e so essas duas — cada uma nomeada explicitamente
(`get_organization_context_allow_frozen` / `require_role_allow_frozen`) pra
ficar facil de encontrar todo bypass com um grep:
1. Os proprios endpoints de congelar/reativar (precisam funcionar SOBRE
   uma organizacao ja congelada).
2. `PATCH /workspace-preferences` — preferencia pessoal de UI (ver
   modules/workspace_preferences/router.py), nao dado da organizacao;
   congelar uma empresa nao deveria impedir um usuario de reordenar os
   proprios cards de acesso rapido.

`require_org_admin_or_platform_admin` e uma dependency SEPARADA (nao
`get_organization_context`) para os endpoints de logo — um Super Admin da
plataforma nao tem membership na organizacao, entao `get_organization_context`
(por design) devolveria 404 pra ele. Essa dependency aplica o bloqueio de
escrita ela mesma, ja que nao passa por `get_organization_context`.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, Path, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import SESSION_REVOKED_DETAIL, InvalidTokenError, TokenType, decode_token
from app.core.sessions import SessionInvalidError, SessionRevokedError, get_active_session
from app.models.membership import Membership, MembershipRole, MembershipStatus, role_rank
from app.models.organization import Organization, OrganizationStatus
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
    organization: Organization


_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def _ensure_organization_writable(organization: Organization, method: str) -> None:
    """Bloqueia qualquer escrita (metodo nao-seguro) numa organizacao
    CONGELADA. Leitura sempre liberada, em qualquer estado — e o que
    garante que um deep link pra uma organizacao congelada nunca vira 404
    pra quem ainda tem acesso a ela (requisito explicito do ciclo de vida:
    congelar nunca apaga nem esconde historico)."""
    if method not in _SAFE_METHODS and organization.status is OrganizationStatus.FROZEN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta empresa está encerrada. Reative-a para voltar a registrar dados.",
        )


def _load_organization_context(
    organization_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationContext:
    """RN-001/RN-008: usuario so opera em organizacao onde tem membership ativa.

    Retorna 404 (nao 403) quando a organizacao nao existe OU quando o usuario
    nao tem membership nela — deliberado para nao revelar a um usuario nao
    autorizado se um determinado organization_id existe (ver ADR/threat-model).

    NAO aplica o bloqueio de organizacao congelada sozinha — quem quer esse
    bloqueio usa `get_organization_context` (abaixo). Exportada tambem como
    `get_organization_context_allow_frozen` para os dois casos que
    deliberadamente precisam ignorar o bloqueio (ver docstring do modulo).
    """
    row = (
        db.query(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .filter(
            Membership.user_id == current_user.id,
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organizacao nao encontrada"
        )
    membership, organization = row
    return OrganizationContext(
        user=current_user,
        organization_id=organization_id,
        role=membership.role,
        organization=organization,
    )


# Alias exportado deliberadamente — grep por "allow_frozen" acha todo bypass
# do bloqueio de escrita em organizacao congelada de uma vez.
get_organization_context_allow_frozen = _load_organization_context


def get_organization_context(
    request: Request,
    ctx: OrganizationContext = Depends(_load_organization_context),
) -> OrganizationContext:
    """Mesma resolucao de `_load_organization_context`, mais o bloqueio de
    escrita em organizacao congelada — este e o nome que toda rota
    (direto ou via `require_role`) deve usar por padrao."""
    _ensure_organization_writable(ctx.organization, request.method)
    return ctx


def _check_role(ctx: OrganizationContext, minimum_role: MembershipRole) -> OrganizationContext:
    if role_rank(ctx.role) > role_rank(minimum_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Papel insuficiente para esta operacao",
        )
    return ctx


def require_role(
    minimum_role: MembershipRole,
) -> Callable[[OrganizationContext], OrganizationContext]:
    """Dependency factory: exige que o papel do usuario na organizacao seja
    igual ou superior (rank menor ou igual) a `minimum_role` (RN-009, RN-010).
    """

    def _dependency(
        ctx: OrganizationContext = Depends(get_organization_context),
    ) -> OrganizationContext:
        return _check_role(ctx, minimum_role)

    return _dependency


def require_role_allow_frozen(
    minimum_role: MembershipRole,
) -> Callable[[OrganizationContext], OrganizationContext]:
    """Mesma checagem de papel de `require_role`, mas SEM o bloqueio de
    organizacao congelada — uso restrito aos endpoints de congelar/reativar,
    que precisam funcionar sobre uma organizacao ja congelada (reativar) ou
    prestes a ser congelada de novo (409 com a mensagem especifica do
    proprio endpoint, nao o 409 generico de `_ensure_organization_writable`).
    """

    def _dependency(
        ctx: OrganizationContext = Depends(get_organization_context_allow_frozen),
    ) -> OrganizationContext:
        return _check_role(ctx, minimum_role)

    return _dependency


@dataclass(frozen=True)
class OrganizationAdminContext:
    user: User
    organization: Organization
    role: MembershipRole | None
    via_platform_admin: bool


def require_org_admin_or_platform_admin(
    request: Request,
    organization_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationAdminContext:
    """Autorizacao dos endpoints de logotipo da organizacao: ORGANIZATION_OWNER/
    ORGANIZATION_ADMIN (via membership normal) OU Super Admin da plataforma
    (`User.is_platform_admin`) — que nao tem membership na organizacao, entao
    `get_organization_context`/`require_role` (por design) devolveriam 404
    pra ele. Deliberadamente uma dependency separada, so para estes 2
    endpoints — nunca um bypass geral de `get_organization_context`
    (ver docstring do modulo e platform_admin/router.py).

    Ordem de resolucao preserva o nao-vazamento de existencia de organizacao:
    organizacao inexistente -> 404; membro com papel insuficiente -> 403
    (ele ja sabe que a organizacao existe); nem membro nem admin da
    plataforma -> 404 (mesma nao-revelacao de sempre).
    """
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organizacao nao encontrada"
        )

    membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == current_user.id,
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .one_or_none()
    )
    if membership is not None:
        if role_rank(membership.role) > role_rank(MembershipRole.ORGANIZATION_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Papel insuficiente para esta operacao",
            )
        _ensure_organization_writable(organization, request.method)
        return OrganizationAdminContext(
            user=current_user, organization=organization, role=membership.role, via_platform_admin=False
        )

    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organizacao nao encontrada"
        )
    _ensure_organization_writable(organization, request.method)
    return OrganizationAdminContext(
        user=current_user, organization=organization, role=None, via_platform_admin=True
    )


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
