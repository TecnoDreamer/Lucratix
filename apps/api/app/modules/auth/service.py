import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import send_email
from app.core.security import generate_opaque_token, hash_opaque_token, hash_password, verify_password
from app.core.sessions import revoke_active_session_for_user
from app.models.email_verification_token import EmailVerificationToken
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.user import UserRegister

PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)
EMAIL_VERIFICATION_TOKEN_TTL = timedelta(days=2)


def _verification_email_html(raw_token: str) -> str:
    link = f"{get_settings().frontend_base_url}/confirmar-email?token={raw_token}"
    return (
        "<p>Confirme seu e-mail na Lucratix clicando no link abaixo:</p>"
        f'<p><a href="{link}">{link}</a></p>'
        "<p>O link expira em 48 horas. Se você não criou essa conta, ignore este e-mail.</p>"
    )


def _issue_email_verification_token(db: Session, user: User) -> str:
    raw_token, token_hash = generate_opaque_token()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + EMAIL_VERIFICATION_TOKEN_TTL,
        )
    )
    return raw_token


def register_user(db: Session, data: UserRegister) -> tuple[bool, str | None]:
    """Cria o usuario se o e-mail ainda nao existir.

    Retorna `(criado, dev_token)`. `criado=False` se o e-mail ja existia — o
    router NUNCA deve expor esse booleano na resposta HTTP (RN-012/RF-001):
    a resposta ao cliente e identica em ambos os casos. `dev_token` (RF-001)
    e o token bruto de verificacao de e-mail, so quando um usuario novo foi
    de fato criado — quem chama decide se expoe (fora de producao, quando
    `send_email` nao tem provedor configurado, mesmo padrao de
    `request_password_reset`).
    """
    existing = db.query(User).filter(User.email == data.email).one_or_none()
    if existing is not None:
        return False, None

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.flush()

    raw_token = _issue_email_verification_token(db, user)
    sent = send_email(
        to=user.email,
        subject="Confirme seu e-mail na Lucratix",
        html=_verification_email_html(raw_token),
    )
    return True, (None if sent else raw_token)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _password_link_email_html(raw_token: str, intro: str) -> str:
    link = f"{get_settings().frontend_base_url}/redefinir-senha?token={raw_token}"
    return (
        f"<p>{intro}</p>"
        f'<p><a href="{link}">{link}</a></p>'
        "<p>O link expira em 1 hora e só pode ser usado uma vez.</p>"
    )


def _password_changed_email_html(intro: str) -> str:
    return (
        f"<p>{intro}</p>"
        "<p>Se você não fez essa alteração, ela pode ter sido feita por outra pessoa com acesso "
        "à sua conta.</p>"
    )


def _issue_password_reset_token(db: Session, user: User) -> str:
    """Gera e persiste um token de definicao/redefinicao de senha para um
    usuario ja resolvido — extraido de `request_password_reset` para ser
    reaproveitado por `create_user_with_reset_token` (RF-001, conta criada
    por um admin: o funcionario define a propria senha pelo mesmo fluxo de
    "esqueci minha senha", nunca recebe uma senha em texto puro)."""
    raw_token, token_hash = generate_opaque_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + PASSWORD_RESET_TOKEN_TTL,
        )
    )
    return raw_token


def request_password_reset(db: Session, email: str) -> str | None:
    """RF-004. Retorna o token bruto SOMENTE quando o e-mail existe E o envio
    de verdade falhou/nao esta configurado — dai o chamador decide se expoe
    como `dev_token` (RN-012: a resposta HTTP ao cliente e identica nos dois
    casos "e-mail nao existe" e "e-mail existe e foi enviado", nenhum dos
    dois vaza nada)."""
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None or not user.is_active:
        return None
    raw_token = _issue_password_reset_token(db, user)
    sent = send_email(
        to=user.email,
        subject="Redefinir sua senha na Lucratix",
        html=_password_link_email_html(raw_token, "Clique no link abaixo para escolher uma nova senha."),
    )
    return None if sent else raw_token


def create_user_with_reset_token(
    db: Session, *, name: str, email: str
) -> tuple[User, str | None] | None:
    """RF-001 ("Ator: ... ou PLATFORM_ADMIN convidando") — cria uma conta sem
    senha utilizavel (placeholder aleatorio, nunca comunicado a ninguem) e ja
    devolve um token de definicao de senha, reaproveitando o mesmo mecanismo
    de "esqueci minha senha" (nenhum model/endpoint novo). Retorna None se o
    e-mail ja existir — o chamador decide a mensagem de erro. O `str | None`
    interno segue a mesma regra de `request_password_reset`: só vem
    preenchido (`dev_token`) quando o envio de verdade falhou/não está
    configurado."""
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        return None

    user = User(name=name, email=email, password_hash=hash_password(secrets.token_urlsafe(32)))
    db.add(user)
    db.flush()
    raw_token = _issue_password_reset_token(db, user)
    sent = send_email(
        to=user.email,
        subject="Você foi convidado para a Lucratix",
        html=_password_link_email_html(raw_token, "Clique no link abaixo para definir sua senha e acessar."),
    )
    return user, (None if sent else raw_token)


def confirm_password_reset(db: Session, raw_token: str, new_password: str) -> User | None:
    """RF-004. Retorna None se o token for invalido, expirado ou ja usado —
    ou o usuario cuja senha foi trocada, em caso de sucesso (o router usa
    isso para auditar com entity_id/user_id corretos).

    RN-013 + auditoria de hardening (2026-09): reset revoga qualquer sessao
    ativa do usuario (`revoke_active_session_for_user`) — se a conta estava
    comprometida, a sessao do atacante nao sobrevive ao reset, em vez de
    valer ate expirar sozinha. Tambem notifica por e-mail que a senha
    mudou, pro dono legitimo perceber se nao foi ele."""
    token_hash = hash_opaque_token(raw_token)
    record = (
        db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).one_or_none()
    )
    if record is None or record.used_at is not None:
        return None
    if record.expires_at < datetime.now(UTC):
        return None

    user = db.get(User, record.user_id)
    if user is None:
        return None

    user.password_hash = hash_password(new_password)
    record.used_at = datetime.now(UTC)
    revoke_active_session_for_user(db, user.id)
    send_email(
        to=user.email,
        subject="Sua senha foi redefinida na Lucratix",
        html=_password_changed_email_html("Sua senha foi redefinida com sucesso via link de recuperação."),
    )
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    """RF-005. Retorna False se a senha atual informada estiver incorreta.

    Nao revoga a sessao atual (ao contrario de `confirm_password_reset`) —
    e a propria sessao do ator legitimo fazendo a troca; revoga-la deslogaria
    a pessoa certa por uma acao que ela mesma causou, sem ganho de seguranca."""
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    send_email(
        to=user.email,
        subject="Sua senha foi alterada na Lucratix",
        html=_password_changed_email_html("Sua senha foi alterada com sucesso."),
    )
    return True


def confirm_email_verification(db: Session, raw_token: str) -> User | None:
    """RF-001. Retorna None se o token for invalido, expirado ou ja usado —
    ou o usuario verificado, em caso de sucesso (o router usa isso para
    auditar com entity_id/user_id corretos)."""
    token_hash = hash_opaque_token(raw_token)
    record = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == token_hash)
        .one_or_none()
    )
    if record is None or record.used_at is not None:
        return None
    if record.expires_at < datetime.now(UTC):
        return None

    user = db.get(User, record.user_id)
    if user is None:
        return None

    user.email_verified_at = datetime.now(UTC)
    record.used_at = datetime.now(UTC)
    return user


def resend_verification_email(db: Session, email: str) -> str | None:
    """RF-001. Mesma regra de `request_password_reset`: token bruto só volta
    quando o e-mail existe, ainda não foi verificado, E o envio de verdade
    falhou/não está configurado (RN-012 — resposta HTTP sempre genérica)."""
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None or not user.is_active or user.email_verified_at is not None:
        return None
    raw_token = _issue_email_verification_token(db, user)
    sent = send_email(
        to=user.email,
        subject="Confirme seu e-mail na Lucratix",
        html=_verification_email_html(raw_token),
    )
    return None if sent else raw_token
