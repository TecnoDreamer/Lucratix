"""Autenticação alternativa por API key para os endpoints de leitura de
analytics documentados em `docs/analytics/POWER_BI.md` — ferramentas
externas (Power BI, Looker Studio, automação de cliente) não guardam
cookie de sessão (`access_token`, `HttpOnly`, pensado pro SPA), então
precisam de um jeito de autenticar que não dependa de navegador. Ver
`docs/security/API_KEYS.md` para a arquitetura completa e
`app/modules/api_keys/` para criação/revogação da própria chave.
"""

import uuid
from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, Path, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import (
    OrganizationContext,
    get_current_user,
    get_organization_context,
    get_organization_context_allow_frozen,
)
from app.core.security import hash_opaque_token
from app.models.membership import Membership, MembershipRole, MembershipStatus, role_rank
from app.models.organization import Organization
from app.models.user import User
from app.modules.api_keys import repository as api_keys_repository

_INVALID_API_KEY_DETAIL = "Chave de API invalida ou revogada"
_BEARER_PREFIX = "Bearer "


def _resolve_api_key_context(
    organization_id: uuid.UUID, raw_key: str, db: Session
) -> OrganizationContext:
    api_key = api_keys_repository.get_active_by_hash(db, hash_opaque_token(raw_key))
    if api_key is None or api_key.organization_id != organization_id:
        # Mesma mensagem pros dois casos (chave inexistente/revogada E chave
        # valida de OUTRA organizacao) — nunca revela que uma chave "existe,
        # so que e de outra empresa" (RNF-002, mesmo espirito de RN-012).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_API_KEY_DETAIL
        )

    # Papel resolvido AO VIVO pela membership de quem criou a chave, nunca
    # um snapshot do momento da criacao — se essa pessoa for rebaixada ou
    # removida da organizacao depois, a chave perde/ganha acesso
    # automaticamente, sem precisar caçar chaves orfas.
    row = (
        db.query(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .filter(
            Membership.user_id == api_key.created_by_user_id,
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_API_KEY_DETAIL
        )
    membership, organization = row

    api_keys_repository.touch_last_used(db, api_key)
    db.commit()

    creator = db.get(User, api_key.created_by_user_id)
    # FK com ondelete=CASCADE garante que a chave e apagada junto se o
    # usuario for apagado — nunca None aqui na pratica, so pro type checker.
    assert creator is not None

    return OrganizationContext(
        user=creator,
        organization_id=organization_id,
        role=membership.role,
        organization=organization,
    )


def _check_role_or_403(ctx: OrganizationContext, minimum_role: MembershipRole) -> OrganizationContext:
    if role_rank(ctx.role) > role_rank(minimum_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Papel insuficiente para esta operacao",
        )
    return ctx


def require_role_or_api_key(
    minimum_role: MembershipRole,
) -> Callable[..., OrganizationContext]:
    """Mesma checagem de papel de `app.core.deps.require_role`, mas aceita
    tambem uma API key (header `Authorization: Bearer <chave>`) no lugar do
    cookie de sessao — uso restrito aos endpoints de leitura de analytics
    documentados em `docs/analytics/POWER_BI.md`. Header presente tenta SO a
    chave (nunca cai pro cookie silenciosamente: uma chave invalida e um 401
    explicito, nao um fallback confuso pra sessao); header ausente usa a
    sessao normal, comportamento identico a `require_role` de hoje."""

    def _dependency(
        request: Request,
        organization_id: uuid.UUID = Path(...),
        authorization: str | None = Header(default=None),
        access_token: str | None = Cookie(default=None),
        db: Session = Depends(get_db),
    ) -> OrganizationContext:
        if authorization is not None:
            if not authorization.startswith(_BEARER_PREFIX):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_API_KEY_DETAIL
                )
            raw_key = authorization[len(_BEARER_PREFIX) :].strip()
            ctx = _resolve_api_key_context(organization_id, raw_key, db)
            return _check_role_or_403(ctx, minimum_role)

        # Sem header -- mesma cadeia de `require_role`/`get_organization_context`,
        # chamada diretamente (essas funcoes aceitam argumentos explicitos
        # tao bem quanto os marcadores Depends/Cookie/Path que usam como
        # default) para nao declarar `Depends(get_organization_context)`
        # como parametro, o que exigiria cookie mesmo quando uma API key
        # valida foi enviada.
        current_user = get_current_user(access_token=access_token, db=db)
        ctx = get_organization_context(
            request=request,
            ctx=get_organization_context_allow_frozen(
                organization_id=organization_id, current_user=current_user, db=db
            ),
        )
        return _check_role_or_403(ctx, minimum_role)

    return _dependency
