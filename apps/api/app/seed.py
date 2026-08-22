"""Seed de desenvolvimento com dados exclusivamente ficticios (secao 32 do prompt mestre).

Uso: python -m app.seed

So a organizacao "Empresa Demo" recebe dados ricos (baseline, financeiro,
produtos, marketing, funil, experimento) — as demais ficam vazias de
proposito, uteis para testar empty states e isolamento entre empresas.
Idempotente: rodar de novo nao duplica nada.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.baseline import Baseline
from app.models.campaign import Campaign
from app.models.experiment import Experiment, ExperimentStatus, ExperimentVariant
from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.models.marketing_channel import MarketingChannel
from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.organization import Organization
from app.models.product import Product
from app.models.user import User

DEMO_USER_EMAIL = "demo@consultoria.exemplo"
DEMO_USER_PASSWORD = "TrocarEssaSenha123!"

DEMO_ORGANIZATIONS = ["Empresa Demo", "Loja Alpha", "Clinica Demo"]
RICH_ORG_NAME = "Empresa Demo"


def month_start(months_ago: int) -> date:
    today = date.today()
    total_months = today.year * 12 + (today.month - 1) - months_ago
    year, month = divmod(total_months, 12)
    return date(year, month + 1, 1)


def seed_rich_org_data(db: Session, org: Organization, user: User) -> None:
    """Preenche a organizacao demo principal com 3 meses de historico ficticio."""

    if db.query(Baseline).filter(Baseline.organization_id == org.id).first() is None:
        db.add(
            Baseline(
                organization_id=org.id,
                created_by=user.id,
                revenue=42000,
                profit=9800,
                margin=0.233,
                customer_count=310,
                cac=145.50,
                conversion_rate=0.024,
                average_ticket=135.48,
                marketing_investment=6200,
                leads=980,
                recurrence_rate=0.31,
                notes="Baseline inicial ficticio, capturado antes do acompanhamento.",
            )
        )
        print("Baseline ficticio criado para Empresa Demo.")

    if db.query(FinancialPeriod).filter(FinancialPeriod.organization_id == org.id).first() is None:
        financials = [
            # (meses atras, receita, custos, despesas, investimento em marketing)
            (2, 46000, 21000, 8500, 6000),
            (1, 51500, 22800, 8900, 7100),
            (0, 58200, 24500, 9300, 8400),
        ]
        for months_ago, revenue, costs, expenses, marketing_investment in financials:
            db.add(
                FinancialPeriod(
                    organization_id=org.id,
                    period=month_start(months_ago),
                    revenue=revenue,
                    costs=costs,
                    expenses=expenses,
                    marketing_investment=marketing_investment,
                    taxes=revenue * 0.06,
                )
            )
        print("3 periodos financeiros ficticios criados para Empresa Demo.")

    if db.query(Product).filter(Product.organization_id == org.id).first() is None:
        for name, category, price, cost in [
            ("Plano Essencial", "Assinatura", 129.90, 38.00),
            ("Plano Pro", "Assinatura", 249.90, 62.00),
            ("Consultoria Avulsa", "Servico", 890.00, 210.00),
        ]:
            db.add(
                Product(
                    organization_id=org.id, name=name, category=category, price=price, cost=cost
                )
            )
        print("3 produtos ficticios criados para Empresa Demo.")

    channels_by_name: dict[str, MarketingChannel] = {
        c.name: c
        for c in db.query(MarketingChannel).filter(MarketingChannel.organization_id == org.id).all()
    }
    if not channels_by_name:
        for name, ch_type in [
            ("Google Ads", "paid_search"),
            ("Instagram Ads", "paid_social"),
            ("Organico / SEO", "organic"),
        ]:
            channel = MarketingChannel(organization_id=org.id, name=name, type=ch_type)
            db.add(channel)
            db.flush()
            channels_by_name[name] = channel
        print("3 canais de marketing ficticios criados para Empresa Demo.")

    if (
        channels_by_name
        and db.query(Campaign).filter(Campaign.organization_id == org.id).first() is None
    ):
        campaigns = [
            ("Google Ads", "Busca - Marca", 2, 3200, 42000, 1850, 210, 48, 22, 9800),
            ("Instagram Ads", "Lancamento Plano Pro", 1, 2600, 65000, 2100, 145, 33, 15, 6400),
            ("Organico / SEO", "Blog - Conteudo evergreen", 0, 0, 18000, 3400, 260, 40, 18, 5100),
        ]
        for (
            channel_name,
            name,
            months_ago,
            investment,
            impressions,
            clicks,
            leads,
            opportunities,
            customers,
            attributed_revenue,
        ) in campaigns:
            db.add(
                Campaign(
                    organization_id=org.id,
                    channel_id=channels_by_name[channel_name].id,
                    name=name,
                    start_date=month_start(months_ago),
                    investment=investment,
                    impressions=impressions,
                    clicks=clicks,
                    leads=leads,
                    opportunities=opportunities,
                    customers=customers,
                    attributed_revenue=attributed_revenue,
                )
            )
        print("3 campanhas ficticias criadas para Empresa Demo.")

    if db.query(FunnelSnapshot).filter(FunnelSnapshot.organization_id == org.id).first() is None:
        funnel = [
            # (meses atras, impressoes, visitas, leads, mqls, sqls, oportunidades, clientes, recompras)
            (2, 120000, 8200, 610, 340, 180, 95, 41, 12),
            (1, 148000, 9700, 780, 420, 230, 118, 55, 17),
            (0, 165000, 11200, 905, 505, 280, 142, 63, 21),
        ]
        for (
            months_ago,
            impressions,
            visits,
            leads,
            mqls,
            sqls,
            opportunities,
            customers,
            repeat_purchases,
        ) in funnel:
            db.add(
                FunnelSnapshot(
                    organization_id=org.id,
                    period=month_start(months_ago),
                    impressions=impressions,
                    visits=visits,
                    leads=leads,
                    mqls=mqls,
                    sqls=sqls,
                    opportunities=opportunities,
                    customers=customers,
                    repeat_purchases=repeat_purchases,
                )
            )
        print("3 snapshots de funil ficticios criados para Empresa Demo.")

    if db.query(Experiment).filter(Experiment.organization_id == org.id).first() is None:
        experiment = Experiment(
            organization_id=org.id,
            hypothesis="Trocar o CTA de 'Saiba mais' para 'Comecar teste gratis' aumenta a conversao.",
            page_or_process="Landing page - Plano Pro",
            primary_metric="conversion_rate",
            start_date=month_start(1),
            status=ExperimentStatus.RUNNING,
        )
        db.add(experiment)
        db.flush()
        db.add_all(
            [
                ExperimentVariant(
                    experiment_id=experiment.id, name="Controle", sample_size=420, conversions=38
                ),
                ExperimentVariant(
                    experiment_id=experiment.id, name="Variante", sample_size=435, conversions=57
                ),
            ]
        )
        print("Experimento ficticio criado para Empresa Demo (amostra suficiente para RN-013).")


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
            if org is None:
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

            if org_name == RICH_ORG_NAME:
                seed_rich_org_data(db, org, user)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
