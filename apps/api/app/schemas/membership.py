import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.membership import MembershipRole, MembershipStatus


class MembershipInvite(BaseModel):
    email: EmailStr
    role: MembershipRole
    # So obrigatorio quando o e-mail ainda nao tem conta na plataforma (RF-001):
    # nesse caso a conta e criada na hora (ver memberships/service.py::grant_access).
    # Um e-mail que ja tem conta ignora este campo.
    name: str | None = None


class MembershipRoleUpdate(BaseModel):
    role: MembershipRole


class MembershipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    organization_id: uuid.UUID
    role: MembershipRole
    status: MembershipStatus
    created_at: datetime


class MembershipWithUserRead(MembershipRead):
    user_name: str
    user_email: str
    # Preenchido só quando a conta foi criada agora nesta chamada (usuário
    # não existia antes) e fora de produção — mesmo padrão de `dev_token` do
    # fluxo de "esqueci minha senha" (ver auth/router.py). Continua um campo
    # a mais no mesmo objeto (não um envelope) para não quebrar quem já lê
    # `membership.id`/`membership.role` direto da resposta de POST.
    dev_token: str | None = None
