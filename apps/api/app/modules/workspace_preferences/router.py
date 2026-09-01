from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import (
    OrganizationContext,
    get_organization_context,
    get_organization_context_allow_frozen,
)
from app.modules.workspace_preferences import repository
from app.schemas.workspace_preference import WorkspacePreferencesRead, WorkspacePreferencesUpdate

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/workspace-preferences",
    tags=["workspace-preferences"],
)


@router.get("")
def get_workspace_preferences(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> WorkspacePreferencesRead:
    """Qualquer membership ativa (inclusive VIEWER) pode ler — e uma
    preferencia pessoal de UI, nao um dado sensivel da organizacao. Nunca
    404 por ausencia de linha: usuario que nunca configurou recebe
    `quick_access: null` (ver docstring do model sobre NULL vs [])."""
    preference = repository.get_preference(
        db, user_id=ctx.user.id, organization_id=ctx.organization_id
    )
    if preference is None:
        return WorkspacePreferencesRead(
            organization_id=ctx.organization_id, quick_access=None, updated_at=None
        )
    return WorkspacePreferencesRead.model_validate(preference)


@router.patch("")
def update_workspace_preferences(
    data: WorkspacePreferencesUpdate,
    ctx: OrganizationContext = Depends(get_organization_context_allow_frozen),
    db: Session = Depends(get_db),
) -> WorkspacePreferencesRead:
    """Deliberadamente SEM `require_role`: e uma preferencia pessoal do
    usuario que fez a request (nunca escreve dado de outro membro nem da
    organizacao em si), mesma categoria do tema claro/escuro — exigir
    ANALYST+ impediria um VIEWER de personalizar a propria tela. Sem
    `record_audit` pelo mesmo motivo: reordenar cards nao tem valor de
    auditoria/compliance e poluiria a trilha lida por admins em
    /organizations/{id}/audit.

    Deliberadamente `get_organization_context_allow_frozen` (nao o
    `get_organization_context` de sempre): e' preferencia pessoal de UI, nao
    dado da organizacao — congelar uma empresa nao deveria impedir o usuario
    de reordenar os proprios cards de acesso rapido (ver core/deps.py).
    """
    if "quick_access" not in data.model_fields_set:
        # Nenhum campo enviado: no-op, devolve o estado atual sem tocar no banco.
        return get_workspace_preferences(ctx=ctx, db=db)

    quick_access = (
        [item.model_dump() for item in data.quick_access]
        if data.quick_access is not None
        else None
    )
    record = repository.upsert_quick_access(
        db,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
        quick_access=quick_access,
    )
    db.commit()
    return WorkspacePreferencesRead.model_validate(record)
