import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.experiment import Experiment, ExperimentVariant


def list_experiments(db: Session, organization_id: uuid.UUID) -> list[Experiment]:
    return (
        db.query(Experiment)
        .options(joinedload(Experiment.variants))
        .filter(Experiment.organization_id == organization_id)
        .order_by(Experiment.created_at.desc())
        .all()
    )


def get_experiment(db: Session, organization_id: uuid.UUID, experiment_id: uuid.UUID) -> Experiment | None:
    return (
        db.query(Experiment)
        .options(joinedload(Experiment.variants))
        .filter(Experiment.id == experiment_id, Experiment.organization_id == organization_id)
        .one_or_none()
    )


def create_experiment(
    db: Session, *, organization_id: uuid.UUID, variant_names: list[str], **fields: object
) -> Experiment:
    experiment = Experiment(organization_id=organization_id, **fields)
    experiment.variants = [ExperimentVariant(name=name) for name in variant_names]
    db.add(experiment)
    db.flush()
    return experiment


def get_variant(
    db: Session, organization_id: uuid.UUID, experiment_id: uuid.UUID, variant_id: uuid.UUID
) -> ExperimentVariant | None:
    return (
        db.query(ExperimentVariant)
        .join(Experiment)
        .filter(
            ExperimentVariant.id == variant_id,
            ExperimentVariant.experiment_id == experiment_id,
            Experiment.organization_id == organization_id,
        )
        .one_or_none()
    )
