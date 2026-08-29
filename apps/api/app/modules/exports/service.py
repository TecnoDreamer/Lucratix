"""Orquestra a exportação (le do domínio -> serializa -> devolve bytes +
metadados de download), espelhando `imports/service.py` do lado contrário do
pipeline. Nenhuma regra de negócio no router — só tradução HTTP.
"""

import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.modules.exports.readers import DOMAIN_READERS
from app.modules.exports.serializers import CONTENT_TYPES, build_filename, serialize
from app.modules.imports.domains import get_domain
from app.modules.imports.security import ALLOWED_FORMATS, MAX_ROWS
from app.modules.imports.service import DomainNotFoundError


class UnsupportedExportFormatError(Exception):
    def __init__(self, file_format: str):
        self.message = f'Formato "{file_format}" não é suportado para exportação.'
        super().__init__(self.message)


class ExportTooLargeError(Exception):
    def __init__(self, total: int):
        self.message = (
            f"A exportação tem {total} linhas, acima do limite de {MAX_ROWS} para download direto "
            "— filtre por um intervalo de datas menor."
        )
        super().__init__(self.message)


def export_domain(
    db: Session,
    *,
    organization_id: uuid.UUID,
    domain_key: str,
    file_format: str,
    date_from: date | None,
    date_to: date | None,
) -> tuple[bytes, str, str]:
    """Devolve (conteúdo, content_type, nome_do_arquivo)."""
    domain = get_domain(domain_key)
    if domain is None:
        raise DomainNotFoundError(domain_key)

    if file_format not in ALLOWED_FORMATS:
        raise UnsupportedExportFormatError(file_format)

    reader = DOMAIN_READERS.get(domain_key)
    if reader is None:
        raise DomainNotFoundError(domain_key)

    rows = reader(db, organization_id, date_from, date_to)
    # Mesmo teto de MAX_ROWS da importação (processamento síncrono, sem fila
    # de jobs — ver docs/data-import-export/ARCHITECTURE.md): sem evidência
    # de organização real perto desse volume, mas o teto existe pelo mesmo
    # motivo estrutural dos dois lados do módulo.
    if len(rows) > MAX_ROWS:
        raise ExportTooLargeError(len(rows))

    content = serialize(file_format, domain, rows)
    filename = build_filename(domain_key, file_format, date_from, date_to)
    return content, CONTENT_TYPES[file_format], filename


__all__ = [
    "DomainNotFoundError",
    "UnsupportedExportFormatError",
    "ExportTooLargeError",
    "export_domain",
]
