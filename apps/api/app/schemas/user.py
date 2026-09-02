import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.password_policy import MAX_LENGTH as _PASSWORD_MAX_LENGTH

# Sem `min_length` aqui de proposito: o minimo de 8 caracteres e só UM dos 4
# requisitos da politica de senha forte (app/core/password_policy.py), que
# roda inteira no corpo da rota (auth/router.py::_enforce_password_policy) e
# reporta TODOS os requisitos faltando de uma vez. Se o `min_length` ficasse
# aqui, o Pydantic rejeitaria a senha curta ANTES da rota rodar — com o 422
# generico do FastAPI, mascarando os outros requisitos que tambem faltam
# (RN: "quando varios requisitos falharem, permita mostrar todos"). Só
# `max_length` fica no schema: e uma defesa contra payload gigante (custo de
# hashing do Argon2), não parte do feedback de UX — rejeitar cedo, antes de
# rodar qualquer logica, e o comportamento certo aqui.
NewPassword = Annotated[str, Field(max_length=_PASSWORD_MAX_LENGTH)]


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: NewPassword


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: NewPassword


class PasswordChange(BaseModel):
    current_password: str
    new_password: NewPassword


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
    locale: str | None


class UserLocaleUpdate(BaseModel):
    locale: Literal["pt-BR", "en", "es"]
