"""Chaves de API por organização — autenticam ferramentas externas de
analytics (Power BI, Looker Studio, automação de cliente) que não guardam
cookie de sessão. Ver docs/security/API_KEYS.md e app/core/api_key_auth.py
(onde a chave é de fato validada nos endpoints de leitura)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.client_ip import get_client_ip
from app.core.database import get_db
from app.core.deps import OrganizationContext, require_role
from app.core.rate_limit import api_key_create_rate_limiter, enforce_rate_limits
from app.models.membership import MembershipRole
from app.modules.api_keys import repository
from app.modules.api_keys.service import create_api_key, revoke_api_key
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyRead

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/api-keys", tags=["api-keys"])


@router.get("")
def list_api_keys(
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> list[ApiKeyRead]:
    return [
        ApiKeyRead.model_validate(k) for k in repository.list_by_organization(db, ctx.organization_id)
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_api_key_route(
    data: ApiKeyCreate,
    request: Request,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> ApiKeyCreated:
    # RNF-005: mesmo raciocinio de convite de membro — sessao de admin
    # comprometida nao deveria conseguir gerar chaves em massa.
    enforce_rate_limits(
        [(api_key_create_rate_limiter, f"{get_client_ip(request)}:{ctx.user.id}")],
        detail="Muitas chaves criadas em pouco tempo. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.api_key_create",
    )

    api_key, raw_key = create_api_key(
        db, organization_id=ctx.organization_id, created_by_user_id=ctx.user.id, name=data.name
    )
    record_audit(
        db,
        action="api_key.created",
        entity="api_key",
        entity_id=api_key.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ApiKeyCreated(**ApiKeyRead.model_validate(api_key).model_dump(), raw_key=raw_key)


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key_route(
    api_key_id: uuid.UUID,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> None:
    api_key = repository.get_by_id(db, ctx.organization_id, api_key_id)
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chave nao encontrada")

    revoke_api_key(db, api_key)
    record_audit(
        db,
        action="api_key.revoked",
        entity="api_key",
        entity_id=api_key.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
