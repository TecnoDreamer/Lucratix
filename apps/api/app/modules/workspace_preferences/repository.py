import uuid

from sqlalchemy.orm import Session

from app.models.user_workspace_preference import UserWorkspacePreference


def get_preference(
    db: Session, *, user_id: uuid.UUID, organization_id: uuid.UUID
) -> UserWorkspacePreference | None:
    return (
        db.query(UserWorkspacePreference)
        .filter(
            UserWorkspacePreference.user_id == user_id,
            UserWorkspacePreference.organization_id == organization_id,
        )
        .one_or_none()
    )


def upsert_quick_access(
    db: Session,
    *,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    quick_access: list[dict[str, object]] | None,
) -> UserWorkspacePreference:
    """Uma linha por usuario+organizacao — mesmo padrao de
    `targets.repository.upsert_target`. `quick_access=None` e "restaurar
    padrao" (ver docstring do model)."""
    existing = get_preference(db, user_id=user_id, organization_id=organization_id)
    if existing is not None:
        existing.quick_access = quick_access
        db.flush()
        return existing

    record = UserWorkspacePreference(
        user_id=user_id, organization_id=organization_id, quick_access=quick_access
    )
    db.add(record)
    db.flush()
    return record
