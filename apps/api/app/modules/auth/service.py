from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserRegister


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
