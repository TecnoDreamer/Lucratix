"""Schemas do painel de Super Admin (`app/modules/platform_admin/`). RF-001,
RF-012, persona "Administrador(a) da Plataforma" (docs/product/personas.md).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PlatformOrganizationRead(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    owner_name: str | None
    owner_email: str | None
    member_count: int


class PlatformUserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    is_active: bool
    is_platform_admin: bool
    organization_count: int


class PlatformUserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr


class PlatformUserCreateResponse(BaseModel):
    user: PlatformUserRead
    # Fora de producao apenas — mesmo padrao de dev_token do restante da
    # plataforma (ver auth/router.py, memberships/router.py). Em producao,
    # nao existe servico de e-mail configurado: o admin precisa copiar o
    # link e enviar manualmente ate essa lacuna ser fechada.
    dev_token: str | None = None


class PlatformUserUpdate(BaseModel):
    is_active: bool | None = None
    is_platform_admin: bool | None = None
