import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.membership import MembershipRole, MembershipStatus


class MembershipInvite(BaseModel):
    email: EmailStr
    role: MembershipRole


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
