import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import (
    OrganizationContext,
    get_organization_context,
    get_organization_context_allow_frozen,
)
from app.models.user_chart_preference import UserChartPreference
from app.modules.chart_preferences import repository
from app.schemas.chart_preference import (
    CHART_PREFERENCE_SCHEMAS,
    ChartPreferencesRead,
    ChartPreferencesUpdate,
)

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/chart-preferences/{chart_key}",
    tags=["chart-preferences"],
)


def _read(
    organization_id: uuid.UUID, chart_key: str, preference: UserChartPreference | None
) -> ChartPreferencesRead:
    if preference is None:
        return ChartPreferencesRead(
            organization_id=organization_id, chart_key=chart_key, preferences=None, updated_at=None
        )
    return ChartPreferencesRead(
        organization_id=organization_id,
        chart_key=chart_key,
        preferences=preference.preferences_json,
        updated_at=preference.updated_at,
    )


@router.get("")
def get_chart_preferences(
    chart_key: str,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> ChartPreferencesRead:
    """Qualquer membership ativa (inclusive VIEWER) pode ler — preferencia
    pessoal de UI, nao dado sensivel da organizacao. Nunca 404 por linha
    ausente (usuario que nunca configurou recebe `preferences: null`) nem
    por `chart_key` desconhecido aqui (so falha no PATCH, que e onde
    escrever algo de verdade importaria)."""
    preference = repository.get_preference(
        db, user_id=ctx.user.id, organization_id=ctx.organization_id, chart_key=chart_key
    )
    return _read(ctx.organization_id, chart_key, preference)


@router.patch("")
def update_chart_preferences(
    chart_key: str,
    data: ChartPreferencesUpdate,
    ctx: OrganizationContext = Depends(get_organization_context_allow_frozen),
    db: Session = Depends(get_db),
) -> ChartPreferencesRead:
    """Deliberadamente SEM `require_role`/`record_audit`, mesmo racional de
    `workspace_preferences.router`: preferencia pessoal de UI, nunca dado da
    organizacao nem dos outros membros. `get_organization_context_allow_frozen`:
    empresa congelada nao deveria impedir reconfigurar a propria tela.

    `chart_key` fora do registro -> 404 (nunca aceita persistir preferencia
    de um grafico que nao existe). Corpo que nao bate com o schema daquele
    `chart_key` -> 422 (seção 12 do prompt: "valide com schema/allowlist,
    nunca repasse configuracao arbitraria").

    Campo `preferences` ausente do corpo (nao apenas `null`) e no-op —
    mesmo `model_fields_set` de `workspace_preferences.router`."""
    schema = CHART_PREFERENCE_SCHEMAS.get(chart_key)
    if schema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grafico desconhecido")

    if "preferences" not in data.model_fields_set:
        preference = repository.get_preference(
            db, user_id=ctx.user.id, organization_id=ctx.organization_id, chart_key=chart_key
        )
        return _read(ctx.organization_id, chart_key, preference)

    validated: dict[str, object] | None = None
    if data.preferences is not None:
        try:
            validated = schema.model_validate(data.preferences).model_dump()
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors()
            ) from exc

    record = repository.upsert_preferences(
        db,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
        chart_key=chart_key,
        preferences=validated,
    )
    db.commit()
    return _read(ctx.organization_id, chart_key, record)
