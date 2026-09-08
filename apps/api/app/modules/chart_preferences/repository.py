import uuid

from sqlalchemy.orm import Session

from app.models.user_chart_preference import UserChartPreference


def get_preference(
    db: Session, *, user_id: uuid.UUID, organization_id: uuid.UUID, chart_key: str
) -> UserChartPreference | None:
    return (
        db.query(UserChartPreference)
        .filter(
            UserChartPreference.user_id == user_id,
            UserChartPreference.organization_id == organization_id,
            UserChartPreference.chart_key == chart_key,
        )
        .one_or_none()
    )


def upsert_preferences(
    db: Session,
    *,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    chart_key: str,
    preferences: dict[str, object] | None,
) -> UserChartPreference:
    """Uma linha por usuario+organizacao+chart_key — mesmo padrao de
    `workspace_preferences.repository.upsert_quick_access`.
    `preferences=None` e "restaurar padrao" (ver docstring do model)."""
    existing = get_preference(db, user_id=user_id, organization_id=organization_id, chart_key=chart_key)
    if existing is not None:
        existing.preferences_json = preferences
        db.flush()
        return existing

    record = UserChartPreference(
        user_id=user_id,
        organization_id=organization_id,
        chart_key=chart_key,
        preferences_json=preferences,
    )
    db.add(record)
    db.flush()
    return record
