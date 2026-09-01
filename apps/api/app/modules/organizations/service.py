"""Ciclo de vida de uma organização — encerrar (congelar) e reativar.

Encerrar NUNCA apaga: só muda `status` e grava quem/quando/por que — todo o
histórico (baselines, financeiro, marketing, produtos, importações,
auditoria) permanece intacto e legível (RN de "não usar `deleted=true` para
representar encerramento comercial"). O bloqueio de ESCRITA numa organização
congelada é aplicado em `core/deps.py::_ensure_organization_writable` — este
módulo só muda o estado, não decide quem pode escrever o quê.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.organization import Organization, OrganizationStatus


class OrganizationAlreadyFrozenError(Exception):
    def __init__(self) -> None:
        super().__init__("Esta empresa já está encerrada.")


class OrganizationAlreadyActiveError(Exception):
    def __init__(self) -> None:
        super().__init__("Esta empresa já está ativa.")


def freeze_organization(
    db: Session, *, organization_id: uuid.UUID, closed_by: uuid.UUID, reason: str | None
) -> Organization:
    """`with_for_update()` releem a linha dentro da transação antes de checar
    o estado — evita que duas chamadas concorrentes (dois admins clicando
    "Encerrar" ao mesmo tempo) apliquem o congelamento duas vezes ou
    sobrescrevam `closed_at`/`closed_by` um do outro."""
    organization = db.query(Organization).filter(Organization.id == organization_id).with_for_update().one()
    if organization.status is OrganizationStatus.FROZEN:
        raise OrganizationAlreadyFrozenError()

    organization.status = OrganizationStatus.FROZEN
    organization.closed_at = datetime.now(UTC)
    organization.closed_by = closed_by
    organization.closure_reason = reason.strip() if reason and reason.strip() else None
    db.flush()
    return organization


def reactivate_organization(db: Session, *, organization_id: uuid.UUID) -> Organization:
    """Mesma linha, mesmo id — nunca cria um registro novo. O histórico
    permanente do congelamento (quem/quando/por que) já vive no audit log
    (append-only), então limpar estas 3 colunas aqui não perde informação."""
    organization = db.query(Organization).filter(Organization.id == organization_id).with_for_update().one()
    if organization.status is OrganizationStatus.ACTIVE:
        raise OrganizationAlreadyActiveError()

    organization.status = OrganizationStatus.ACTIVE
    organization.closed_at = None
    organization.closed_by = None
    organization.closure_reason = None
    db.flush()
    return organization
