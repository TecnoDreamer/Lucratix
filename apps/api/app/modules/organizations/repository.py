"""Camada de acesso a dado para Organization.

Toda leitura desta lista e sempre escopada a `user_id` (RF-009): um usuario
so ve organizacoes onde possui membership ativa. Leitura/escrita de uma
organizacao especifica depende de `OrganizationContext` (ver core/deps.py),
nunca de um `organization_id` cru sem cruzar com a membership do usuario.
"""

import uuid
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.organization import Organization, OrganizationStatus

# Ordem de precedencia dos caracteres de escape importa: escapar a propria
# barra primeiro, senao as barras adicionadas para escapar "%"/"_" nas
# proximas linhas seriam escapadas de novo.
_LIKE_ESCAPE_CHAR = "\\"


def _escape_like_term(term: str) -> str:
    escaped = term.replace(_LIKE_ESCAPE_CHAR, _LIKE_ESCAPE_CHAR * 2)
    escaped = escaped.replace("%", f"{_LIKE_ESCAPE_CHAR}%")
    escaped = escaped.replace("_", f"{_LIKE_ESCAPE_CHAR}_")
    return escaped


def _base_query(
    db: Session, user_id: uuid.UUID, *, search: str | None, status_filter: str
) -> Any:  # noqa: ANN401 — tipo exato do SQLAlchemy Query multi-coluna e' verboso demais pro mypy aqui
    query = (
        db.query(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .filter(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
    )
    if status_filter == "active":
        query = query.filter(Organization.status == OrganizationStatus.ACTIVE)
    elif status_filter == "frozen":
        query = query.filter(Organization.status == OrganizationStatus.FROZEN)
    # "all": sem filtro de status.

    trimmed = (search or "").strip()
    if trimmed:
        pattern = f"%{_escape_like_term(trimmed)}%"
        query = query.filter(
            or_(
                Organization.name.ilike(pattern, escape=_LIKE_ESCAPE_CHAR),
                Organization.trade_name.ilike(pattern, escape=_LIKE_ESCAPE_CHAR),
            )
        )
    return query


def list_organizations_for_user_page(
    db: Session,
    user_id: uuid.UUID,
    *,
    search: str | None = None,
    status_filter: str = "all",
    limit: int = 24,
    offset: int = 0,
) -> tuple[list[tuple[Organization, MembershipRole]], int]:
    """Busca (`ILIKE` parametrizado por nome/nome fantasia) + paginação
    server-side — antes esta função devolvia sempre a lista inteira do
    usuário, sem filtro nenhum, o que não escala para centenas de empresas
    (RF de evolução de "Suas empresas", 2026-09-01).

    Ordenação por `(name, id)`, não só `name`: sem o `id` como desempate,
    duas organizações com o mesmo nome podem trocar de posição entre duas
    páginas consecutivas, causando duplicata + linha pulada no "carregar
    mais" do frontend.
    """
    query = _base_query(db, user_id, search=search, status_filter=status_filter)
    total = query.count()
    rows = (
        query.order_by(Organization.name, Organization.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [(org, role) for org, role in rows], total


def list_organizations_for_user(db: Session, user_id: uuid.UUID) -> list[tuple[Organization, MembershipRole]]:
    """Sem paginação — usada só onde a lista completa das organizações do
    usuário é genuinamente necessária de uma vez (ex.: resolver o "Voltar"
    de Configurações contra a lista real de organizações, nunca confiando
    num id cru vindo da URL)."""
    rows = (
        db.query(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .filter(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
        .order_by(Organization.name, Organization.id)
        .all()
    )
    return [(org, role) for org, role in rows]


def list_organizations_by_ids_for_user(
    db: Session, user_id: uuid.UUID, organization_ids: list[uuid.UUID]
) -> list[tuple[Organization, MembershipRole]]:
    """Mesma escopagem por membership de sempre — um id que o usuário não
    pertence simplesmente não aparece no resultado (nunca 403, sem virar
    oráculo de existência de organização)."""
    rows = (
        db.query(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .filter(
            Membership.user_id == user_id,
            Membership.status == MembershipStatus.ACTIVE,
            Organization.id.in_(organization_ids),
        )
        .all()
    )
    return [(org, role) for org, role in rows]


def get_organization(db: Session, organization_id: uuid.UUID) -> Organization | None:
    return db.get(Organization, organization_id)


def create_organization_with_owner(
    db: Session, *, owner_id: uuid.UUID, **fields: object
) -> Organization:
    organization = Organization(**fields)
    db.add(organization)
    db.flush()

    membership = Membership(
        user_id=owner_id,
        organization_id=organization.id,
        role=MembershipRole.ORGANIZATION_OWNER,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.flush()
    return organization
