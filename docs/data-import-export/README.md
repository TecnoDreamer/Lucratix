# Importação/Exportação de Dados

Quatro domínios completos, ponta a ponta (importação + exportação + frontend): **Financeiro**,
**Funil**, **Produtos** e **Marketing**. Todos os domínios reais que existiam no schema antes deste
módulo estão cobertos — não há mais nenhum pendente. Decisão de escopo confirmada com o usuário — ver
histórico das PRs.

- [ARCHITECTURE.md](ARCHITECTURE.md) — decisões e por quê (processamento síncrono, sem storage de
  arquivo, arquitetura por adaptadores, sugestão de mapeamento, validação, serialização, permissões,
  auditoria, frontend).
- [IMPORT_FORMATS.md](IMPORT_FORMATS.md) — formatos de arquivo aceitos na importação (CSV/XLSX/JSON),
  limites, e como data/número são interpretados.

## Endpoints

### Importação

Sob `/api/v1/organizations/{organization_id}/imports`, exigindo papel `ANALYST` ou superior (é escrita):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/domains` | Domínios disponíveis (import e export) e seus campos |
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

### Exportação

Sob `/api/v1/organizations/{organization_id}/exports`, exigindo só membership ativa na organização
(é leitura — mesmo nível de `GET /financials`, `VIEWER` incluso):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/{domain}?format=csv\|xlsx\|json&date_from=&date_to=` | Baixa os dados do domínio no formato pedido |

## Frontend

Página `organizations/[id]/central-de-dados` (nova entrada de sidebar "Central de Dados", sem `minRole`)
— `ExportPanel` sempre visível, `ImportWizard` + histórico só para `ANALYST`+. Ver
[ARCHITECTURE.md](ARCHITECTURE.md#frontend--central-de-dados).

## Testes

Backend:

- `tests/unit/test_import_parsers.py`, `test_import_transform.py`, `test_import_mapping.py`,
  `test_import_validation.py`, `test_import_file_validation.py`, `test_export_serializers.py` — funções
  puras, sem banco.
- `tests/api/test_imports.py` — fluxo completo via API (upload → mapeamento → preview → confirmação →
  banco), reprocessamento (skip/update), templates, histórico, erros.
- `tests/api/test_exports.py` — download em CSV/XLSX/JSON, filtro por intervalo de datas, permissão de
  `VIEWER`.
- `tests/security/test_import_security.py`, `test_export_security.py` — arquivo malicioso (tamanho,
  extensão, ZIP falso, JSON malformado/aninhado demais), isolamento entre organizações, RBAC.
- `tests/unit/test_import_domains.py` — `normalize_natural_key_value` e o registro de domínios.
- `tests/fixtures/imports/` — arquivos de exemplo (`valid.csv`, `invalid.csv`, `duplicates.csv`,
  `valid.json`, `invalid.json`, `aliases.xlsx`) usados pelos testes de importação (domínio Financeiro;
  Funil, Produtos e Marketing usam conteúdo inline nos próprios testes, por ser pequeno).

Frontend (`apps/web/src/`):

- `lib/api.spec.ts` — `postForm`/`del`/`downloadFile` novos no cliente HTTP.
- `components/export-panel.spec.tsx`, `components/import-wizard.spec.tsx` — cada componente isolado,
  incluindo a troca de domínio (`lib/data-domains.ts`).
- `app/organizations/[id]/central-de-dados/page.spec.tsx` — composição, RBAC (`VIEWER` vs `ANALYST`+),
  histórico paginado.
