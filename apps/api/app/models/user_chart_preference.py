import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserChartPreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Personalização de UM gráfico, por usuário+organização (redesign do
    Funil, PR3) — mesmo desenho de `UserWorkspacePreference`
    (`app/models/user_workspace_preference.py`).

    `preferences_json` é NULLABLE de propósito: `NULL` significa "usuário
    nunca configurou este gráfico, usar o preset padrão" — diferente de um
    valor salvo que por acaso é igual ao padrão de hoje. `chart_key`
    identifica qual gráfico (`"funnel-stages"`, `"stage-conversion"`, ver
    `app/schemas/chart_preference.py::CHART_PREFERENCE_SCHEMAS`) — várias
    linhas por usuário+organização, uma por gráfico personalizável.

    `schema_version` existe para permitir mudar o formato de
    `preferences_json` no futuro sem quebrar preferências já salvas —
    metadado de diagnóstico (qual versão do formato escreveu aquela linha),
    não uma branch de código hoje: a proteção de fato contra um formato que
    uma versão futura não reconhece mais já vem da validação estrutural (o
    schema Pydantic e o sanitizador no frontend, `lib/chart-preferences.ts`,
    exigem exatamente os campos/tipos do formato atual) — um `preferences_json`
    de um formato futuro simplesmente não bate com essa validação e cai pro
    preset padrão, sem precisar comparar número de versão nenhum.
    """

    __tablename__ = "user_chart_preferences"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "organization_id", "chart_key", name="uq_user_chart_preferences_user_org_chart"
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    chart_key: Mapped[str] = mapped_column(String(64), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    preferences_json: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
