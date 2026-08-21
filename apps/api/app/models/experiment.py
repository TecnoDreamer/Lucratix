import uuid
from datetime import date
from enum import StrEnum

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ExperimentStatus(StrEnum):
    DRAFT = "draft"
    RUNNING = "running"
    FINISHED = "finished"


class Experiment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """RF-024: experimento de CRO/A-B testing."""

    __tablename__ = "experiments"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    hypothesis: Mapped[str] = mapped_column(String(2000), nullable=False)
    page_or_process: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_metric: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ExperimentStatus] = mapped_column(
        SAEnum(ExperimentStatus, name="experiment_status"),
        default=ExperimentStatus.DRAFT,
        nullable=False,
    )

    variants: Mapped[list["ExperimentVariant"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan"
    )


class ExperimentVariant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """RF-025: variante de um experimento, com amostra e conversoes."""

    __tablename__ = "experiment_variants"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    conversions: Mapped[int | None] = mapped_column(Integer, nullable=True)

    experiment: Mapped["Experiment"] = relationship(back_populates="variants")
