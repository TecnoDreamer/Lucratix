"""Seed de desenvolvimento com dados exclusivamente ficticios (secao 32 do prompt mestre).

Uso: python -m app.seed
"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.organization import Organization
from app.models.user import User

DEMO_USER_EMAIL = "demo@consultoria.exemplo"
DEMO_USER_PASSWORD = "TrocarEssaSenha123!"

DEMO_ORGANIZATIONS = ["Empresa Demo", "Loja Alpha", "Clinica Demo"]


def run() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEMO_USER_EMAIL).one_or_none()
        if user is None:
            user = User(
                name="Consultor Demo",
                email=DEMO_USER_EMAIL,
                password_hash=hash_password(DEMO_USER_PASSWORD),
            )
            db.add(user)
            db.flush()
            print(f"Usuario demo criado: {DEMO_USER_EMAIL} / {DEMO_USER_PASSWORD}")
        else:
            print("Usuario demo ja existia, reaproveitando.")

        for org_name in DEMO_ORGANIZATIONS:
            org = db.query(Organization).filter(Organization.name == org_name).one_or_none()
            if org is not None:
                continue
            org = Organization(name=org_name, currency="BRL", timezone="America/Sao_Paulo")
            db.add(org)
            db.flush()
            db.add(
                Membership(
                    user_id=user.id,
                    organization_id=org.id,
                    role=MembershipRole.ORGANIZATION_OWNER,
                    status=MembershipStatus.ACTIVE,
                )
            )
            print(f"Organizacao demo criada: {org_name}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
