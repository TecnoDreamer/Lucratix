"""Concessao de acesso a uma organizacao — usada tanto pelo convite por-empresa
(`memberships/router.py`, ator ORGANIZATION_ADMIN+) quanto pelo painel de
Super Admin (`platform_admin/router.py`, ator PLATFORM_ADMIN). RF-001/RF-012:
se o e-mail informado nao corresponde a nenhuma conta, uma e criada na hora
(sem exigir que a pessoa se cadastre sozinha primeiro) via
`auth.service.create_user_with_reset_token` — reaproveitado, nao duplicado.
"""

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole, role_rank
from app.models.user import User
from app.modules.auth.service import create_user_with_reset_token
from app.modules.memberships import repository


class MembershipAlreadyExistsError(Exception):
    def __init__(self) -> None:
        super().__init__("Usuario ja possui membership nesta organizacao")


class NameRequiredForNewUserError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "Este e-mail ainda nao tem conta na plataforma — informe o nome para criar uma"
        )


class CannotRevokeHigherRoleError(Exception):
    def __init__(self) -> None:
        super().__init__("Nao e possivel revogar alguem com papel superior ao seu")


def grant_access(
    db: Session,
    *,
    organization_id: uuid.UUID,
    email: str,
    role: MembershipRole,
    name: str | None = None,
) -> tuple[Membership, User, str | None]:
    """Devolve (membership, user, raw_reset_token). `raw_reset_token` so vem
    preenchido quando a conta foi criada agora nesta chamada — uma conta que
    ja existia nunca tem a senha mexida por este fluxo."""
    user = repository.find_user_by_email(db, email)
    raw_token: str | None = None

    if user is None:
        if not name or not name.strip():
            raise NameRequiredForNewUserError()
        created = create_user_with_reset_token(db, name=name.strip(), email=email)
        # created so e None se o e-mail ja existir — impossivel aqui, acabamos
        # de checar find_user_by_email; guarda so para o type checker.
        assert created is not None
        user, raw_token = created

    try:
        membership = repository.add_membership(
            db, user_id=user.id, organization_id=organization_id, role=role
        )
    except IntegrityError as exc:
        db.rollback()
        raise MembershipAlreadyExistsError() from exc

    return membership, user, raw_token


def revoke_access(
    db: Session, *, membership: Membership, actor_role: MembershipRole | None = None
) -> None:
    """RN-009 estendida: nao revoga alguem com papel de rank menor (mais
    privilegiado) que o do ator. `actor_role=None` (Super Admin, que nao tem
    papel dentro da organizacao) pula essa checagem — Super Admin pode
    revogar qualquer papel, inclusive Proprietario. Chamador (router) decide
    se o ator e a propria pessoa sendo revogada (bloqueado ali — evita
    lockout acidental, nenhum "sair da organizacao" nesta rodada)."""
    if actor_role is not None and role_rank(membership.role) < role_rank(actor_role):
        raise CannotRevokeHigherRoleError()
    db.delete(membership)
