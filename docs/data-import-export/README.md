# Importação/Exportação de Dados

Corte vertical mínimo (2026-08-29): domínio **Financeiro**, só importação, ponta a ponta. Decisão de
escopo confirmada com o usuário — ver histórico da PR.

- [ARCHITECTURE.md](ARCHITECTURE.md) — decisões e por quê (processamento síncrono, sem storage de
  arquivo, arquitetura por adaptadores, sugestão de mapeamento, validação, permissões, auditoria).
- [IMPORT_FORMATS.md](IMPORT_FORMATS.md) — formatos de arquivo aceitos (CSV/XLSX/JSON), limites, e como
  data/número são interpretados.

## Endpoints

Todos sob `/api/v1/organizations/{organization_id}/imports`, exigindo papel `ANALYST` ou superior:

| Método | Rota | Descrição |
|---|---|---|
| GET | `/domains` | Domínios disponíveis para importação e seus campos |
| POST | `/mapping-templates` | Salva um mapeamento reutilizável |
| GET | `/mapping-templates` | Lista mapeamentos salvos |
| POST | `` | Upload do arquivo — cria o job, devolve sugestão de mapeamento |
| GET | `/{job_id}` | Detalhe do job |
| PUT | `/{job_id}/mapping` | Confirma o mapeamento de campos e roda a validação |
| GET | `/{job_id}/preview` | Preview paginado das linhas validadas |
| POST | `/{job_id}/confirm` | Confirma a importação — grava no domínio real |
| GET | `/{job_id}/errors` | Lista paginada de erros por linha |
| GET | `` | Histórico de imports da organização |
| DELETE | `/{job_id}` | Cancela um job ainda não concluído |

## Testes

- `tests/unit/test_import_parsers.py`, `test_import_transform.py`, `test_import_mapping.py`,
  `test_import_validation.py`, `test_import_file_validation.py` — funções puras, sem banco.
- `tests/api/test_imports.py` — fluxo completo via API (upload → mapeamento → preview → confirmação →
  banco), reprocessamento (skip/update), templates, histórico, erros.
- `tests/security/test_import_security.py` — arquivo malicioso (tamanho, extensão, ZIP falso, JSON
  malformado/aninhado demais), isolamento entre organizações, RBAC.
- `tests/fixtures/imports/` — arquivos de exemplo (`valid.csv`, `invalid.csv`, `duplicates.csv`,
  `valid.json`, `invalid.json`, `aliases.xlsx`) usados pelos testes acima.
