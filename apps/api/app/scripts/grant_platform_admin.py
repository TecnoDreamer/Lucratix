"""Bootstrap do primeiro Super Admin (PLATFORM_ADMIN, RN-009).

Problema do ovo-e-galinha: conceder Super Admin a alguem exige... um Super
Admin (`app/modules/platform_admin/router.py::update_user` so aceita
`require_platform_admin`). Este script existe justamente para nao precisar
de autopromocao via API — precisa de acesso ao servidor/banco (fora da
aplicacao), a mesma postura de qualquer bootstrap administrativo.

Uso (da raiz de apps/api, com o mesmo DATABASE_URL do ambiente-alvo):
    python -m app.scripts.grant_platform_admin email@exemplo.com

O e-mail precisa corresponder a uma conta ja cadastrada (registre-se
normalmente pela tela de login antes de rodar isto).
"""

import sys

from app.core.database import SessionLocal
from app.models.user import User


def grant(email: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one_or_none()
        if user is None:
            print(f"Nenhuma conta encontrada com o e-mail {email!r} — cadastre-se primeiro.")
            sys.exit(1)
        if user.is_platform_admin:
            print(f"{email} ja e Super Admin — nada a fazer.")
            return
        user.is_platform_admin = True
        db.commit()
        print(f"{email} agora e Super Admin (is_platform_admin=True).")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python -m app.scripts.grant_platform_admin email@exemplo.com")
        sys.exit(1)
    grant(sys.argv[1])
