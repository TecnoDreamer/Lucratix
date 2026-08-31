import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import (
    generate_password_reset_token,
    hash_password,
    hash_password_reset_token,
    verify_password,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.user import UserRegister

PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)


def register_user(db: Session, data: UserRegister) -> bool:
    """Cria o usuario se o e-mail ainda nao existir.

    Retorna True se um usuario novo foi criado, False se o e-mail ja existia.
    O router NUNCA deve expor esse booleano na resposta HTTP (RN-012/RF-001):
    a resposta ao cliente e identica em ambos os casos.
    """
    existing = db.query(User).filter(User.email == data.email).one_or_none()
    if existing is not None:
        return False

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.flush()
    return True


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _issue_password_reset_token(db: Session, user: User) -> str:
    """Gera e persiste um token de definicao/redefinicao de senha para um
    usuario ja resolvido — extraido de `request_password_reset` para ser
    reaproveitado por `create_user_with_reset_token` (RF-001, conta criada
    por um admin: o funcionario define a propria senha pelo mesmo fluxo de
    "esqueci minha senha", nunca recebe uma senha em texto puro)."""
    raw_token, token_hash = generate_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + PASSWORD_RESET_TOKEN_TTL,
        )
    )
    return raw_token


def request_password_reset(db: Session, email: str) -> str | None:
    """RF-004. Retorna o token bruto SOMENTE para o chamador decidir se expoe
    (ex.: em ambiente de desenvolvimento, sem servico de e-mail — ver
    auth/router.py). Retorna None se o e-mail nao existir; a resposta HTTP
    ao cliente deve ser identica nos dois casos (RN-012).
    """
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None or not user.is_active:
        return None
    return _issue_password_reset_token(db, user)


def create_user_with_reset_token(db: Session, *, name: str, email: str) -> tuple[User, str] | None:
    """RF-001 ("Ator: ... ou PLATFORM_ADMIN convidando") — cria uma conta sem
    senha utilizavel (placeholder aleatorio, nunca comunicado a ninguem) e ja
    devolve um token de definicao de senha, reaproveitando o mesmo mecanismo
    de "esqueci minha senha" (nenhum model/endpoint novo). Retorna None se o
    e-mail ja existir — o chamador decide a mensagem de erro."""
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        return None

    user = User(name=name, email=email, password_hash=hash_password(secrets.token_urlsafe(32)))
    db.add(user)
    db.flush()
    raw_token = _issue_password_reset_token(db, user)
    return user, raw_token


def confirm_password_reset(db: Session, raw_token: str, new_password: str) -> bool:
    """RF-004. Retorna False se o token for invalido, expirado ou ja usado."""
    token_hash = hash_password_reset_token(raw_token)
    record = (
        db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).one_or_none()
    )
    if record is None or record.used_at is not None:
        return False
    if record.expires_at < datetime.now(UTC):
        return False

    user = db.get(User, record.user_id)
    if user is None:
        return False

    user.password_hash = hash_password(new_password)
    record.used_at = datetime.now(UTC)
    return True


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    """RF-005. Retorna False se a senha atual informada estiver incorreta."""
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    return True
