import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.modules.workspace_preferences.registry import QUICK_ACCESS_CARD_IDS


class QuickAccessItem(BaseModel):
    id: str
    enabled: bool


class WorkspacePreferencesUpdate(BaseModel):
    """PATCH parcial: campo ausente = sem alteracao (mesmo espirito de
    `OrganizationUpdate`, via `model_fields_set`). `quick_access: null`
    explicito e "restaurar padrao" (grava NULL na coluna) — diferente de
    campo ausente, que nao mexe em nada."""

    quick_access: list[QuickAccessItem] | None = None

    @field_validator("quick_access")
    @classmethod
    def _validate_quick_access(
        cls, value: list[QuickAccessItem] | None
    ) -> list[QuickAccessItem] | None:
        if value is None:
            return value
        if len(value) > len(QUICK_ACCESS_CARD_IDS):
            raise ValueError("Lista de acessos rapidos maior que o numero de cards existentes.")
        ids = [item.id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError("Id de acesso rapido duplicado.")
        unknown = set(ids) - QUICK_ACCESS_CARD_IDS
        if unknown:
            raise ValueError(f"Id de acesso rapido desconhecido: {sorted(unknown)}")
        return value


class WorkspacePreferencesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: uuid.UUID
    quick_access: list[QuickAccessItem] | None
    updated_at: datetime | None
