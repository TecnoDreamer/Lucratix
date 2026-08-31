import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=255)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=255)


class EmailVerificationConfirm(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    is_platform_admin: bool
    email_verified: bool
