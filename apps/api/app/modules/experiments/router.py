import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.experiments import repository
from app.modules.experiments.analysis import VariantInput, summarize_experiment
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentRead,
    ExperimentResultRead,
    ExperimentVariantResultUpdate,
    ExperimentVariantSummaryRead,
)
from app.schemas.metrics import MetricResultRead

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/experiments", tags=["experiments"])


@router.get("")
def list_experiments(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[ExperimentRead]:
    return [ExperimentRead.model_validate(e) for e in repository.list_experiments(db, ctx.organization_id)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_experiment(
    data: ExperimentCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExperimentRead:
    payload = data.model_dump()
    variant_names = [v["name"] for v in payload.pop("variants")]
    experiment = repository.create_experiment(
        db, organization_id=ctx.organization_id, variant_names=variant_names, **payload
    )
    record_audit(
        db,
        action="experiment.created",
        entity="experiment",
        entity_id=experiment.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ExperimentRead.model_validate(experiment)


@router.get("/{experiment_id}")
def get_experiment(
    experiment_id: uuid.UUID,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> ExperimentRead:
    experiment = repository.get_experiment(db, ctx.organization_id, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experimento nao encontrado")
    return ExperimentRead.model_validate(experiment)


@router.patch("/{experiment_id}/variants/{variant_id}")
def update_variant_result(
    experiment_id: uuid.UUID,
    variant_id: uuid.UUID,
    data: ExperimentVariantResultUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExperimentRead:
    variant = repository.get_variant(db, ctx.organization_id, experiment_id, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante nao encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)

    record_audit(
        db,
        action="experiment_variant.result_updated",
        entity="experiment_variant",
        entity_id=variant.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()

    experiment = repository.get_experiment(db, ctx.organization_id, experiment_id)
    assert experiment is not None
    return ExperimentRead.model_validate(experiment)


@router.get("/{experiment_id}/result")
def get_experiment_result(
    experiment_id: uuid.UUID,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> ExperimentResultRead:
    """RF-025, RN-013: nunca declara vencedor apenas por diferenca bruta."""
    experiment = repository.get_experiment(db, ctx.organization_id, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experimento nao encontrado")

    summary = summarize_experiment(
        [VariantInput(v.name, v.sample_size, v.conversions) for v in experiment.variants]
    )
    return ExperimentResultRead(
        variants=[
            ExperimentVariantSummaryRead(
                name=v.name,
                sample_size=v.sample_size,
                conversions=v.conversions,
                conversion_rate=MetricResultRead.from_result(v.conversion_rate),
            )
            for v in summary.variants
        ],
        has_sufficient_sample=summary.has_sufficient_sample,
        leading_variant_name=summary.leading_variant_name,
        note=summary.note,
    )
