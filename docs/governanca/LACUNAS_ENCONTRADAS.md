# Lacunas encontradas

Registro de divergências, código órfão e pontos que pedem decisão, levantados na auditoria de documentação de 2026-09-10 (Fases 0–16 do roadmap concluídas).

> Este documento **não corrige** nada — documenta a lacuna e propõe uma ação. Cada item cita a evidência no código para quem for validar.

## Classificação

| Nível | Significado |
|---|---|
| `CRÍTICO` | Risco de dado errado, vazamento ou quebra de contrato de segurança em produção. |
| `ALTO` | Documentação/regra em conflito direto com a implementação, ou código que promete algo que não entrega. |
| `MÉDIO` | Inconsistência real, sem risco imediato, que confunde quem lê o código ou os docs. |
| `BAIXO` | Defasagem pontual (números, nomes) ou detalhe não documentado. |
| `MELHORIA` | Não é erro; é reforço que valeria a pena. |

Nenhum item `CRÍTICO` foi encontrado.

> **Atualização (2026-09-15):** quatro itens já foram corrigidos desde o levantamento — L-01 ([#132](https://github.com/TecnoDreamer/Lucratix/pull/132)), L-04 ([#131](https://github.com/TecnoDreamer/Lucratix/pull/131)), L-05 ([#133](https://github.com/TecnoDreamer/Lucratix/pull/133)) e L-09 ([#129](https://github.com/TecnoDreamer/Lucratix/pull/129)), todos já em `main`. Marcados `✅ RESOLVIDO` abaixo; o texto original de cada um foi mantido como registro histórico da lacuna. (O repositório foi transferido de `AleksGustavo/marketing-intelligence-platform` para `TecnoDreamer/Lucratix` em 2026-09-14 — os links de PR abaixo já apontam para o destino novo.)

---

## ALTO

### L-01 — `RN-013` nomeia duas regras diferentes — ✅ RESOLVIDO ([#132](https://github.com/TecnoDreamer/Lucratix/pull/132))
- **Evidência:** `docs/requirements/business-rules.md` lista `RN-013 — Experimento não declara vencedor automaticamente`. Mas o código cita `RN-013` também para **sessão única por conta**: `apps/api/app/models/session.py:13`, `apps/api/app/core/sessions.py:1`, `apps/api/app/core/security.py:84`, `apps/api/app/modules/auth/router.py:3,109,214`, `apps/api/alembic/versions/0007_sessions.py:1`. E ainda no sentido de experimento em `apps/api/app/modules/experiments/analysis.py:1` e `apps/api/app/seed.py:208`.
- **Impacto:** a matriz de rastreabilidade fica ambígua; um leitor não sabe qual regra `RN-013` designa.
- **Ação:** em `business-rules.md`, dar um código próprio para "sessão única por conta" (ex.: `RN-016`) e reatribuir as citações de `apps/api/app/core/*` e `models/session.py`. Manter `RN-013` só para a regra de experimento. Atualizar as docstrings afetadas num PR de follow-up.
- **Feito:** `business-rules.md` ganhou `RN-016 — Sessão única por conta`; `RN-013` recebeu uma nota de desambiguação. As ~18 citações de sentido "sessão" (código, testes, docs de segurança) foram reatribuídas para `RN-016`; as de sentido "experimento" permanecem `RN-013`.

### L-02 — `ltv()`, `retention_rate()`, `churn_rate()` são código órfão — ✅ DECISÃO REGISTRADA (2026-09-23)
- **Evidência:** definidos em `apps/api/app/modules/metrics/engine.py` (`ltv` linhas ~117-130, `retention_rate` ~169-172, `churn_rate` ~175-179). `grep` por chamadas: nenhuma rota, service, schema ou relatório os invoca. Não existe fonte de dados para `purchase_frequency` nem `retention_time` em nenhum model. `retention_rate` só é usada internamente por `churn_rate`, que também não é exposta.
- **Impacto:** `docs/analytics/metrics-catalog.md` apresenta LTV, Retenção e Churn como métricas do produto (com seção própria). Um usuário/cliente espera vê-las na tela.
- **Ação:** decidir e registrar num ADR — (a) remover as três funções do `engine.py` e a seção correspondente do catálogo, marcando LTV/Churn como `PLANEJADO` em `docs/product/out-of-scope.md`; ou (b) manter como base para uma rodada futura e marcar explicitamente no catálogo como "definido no motor, ainda sem tela nem entrada de dados".
- **Decidido:** opção (b) — código mantido (serve de base pronta pra quando existir um modelo de vendas/clientes). `docs/analytics/metrics-catalog.md` (seções LTV/Retenção/Churn) e `docs/product/out-of-scope.md` atualizados com o status real; `engine.py` ganhou comentário apontando as duas fontes. Nenhuma linha de lógica mudou.

### L-03 — `docs/analytics/metrics-catalog.md` é da era de planejamento
- **Evidência:** o arquivo diz `"a decidir em ADR na Fase 13"` (CAC), chama Margem/ROI/CTR de `"percentual"` (são razões 0–1, `×100` só na renderização — `apps/api/app/core/formatting.py::format_percentage`), lista LTV/Retenção/Churn como implementadas (ver L-02) e não menciona o `MetricResult` nem o arquivo real `apps/api/app/modules/metrics/engine.py`.
- **Impacto:** o documento que deveria ser a fonte única das fórmulas não bate com o código.
- **Ação:** reescrever `metrics-catalog.md` alinhado 100% ao `engine.py` (fórmula verbatim por KPI, condição de `is_applicable=False`, onde cada uma é consumida, quais são código órfão). Fora do escopo mínimo desta rodada — é o item central do "truth-up completo".

---

## MÉDIO

### L-04 — Fórmula de `profit` duplicada — ✅ RESOLVIDO ([#131](https://github.com/TecnoDreamer/Lucratix/pull/131))
- **Evidência:** `apps/api/app/modules/metrics/engine.py::profit()` e `apps/api/app/schemas/financial_period.py::FinancialPeriodRead.profit` (`@computed_field`, linhas ~28-36) implementavam `revenue - (costs or 0) - (expenses or 0) - (taxes or 0)` independentemente. O mesmo valia para `margin`.
- **Impacto:** uma mudança na regra de lucro precisa ser feita em dois lugares; nada garante que fiquem em sincronia.
- **Ação:** fazer `FinancialPeriodRead.profit`/`margin` chamarem `engine.profit`/`engine.margin` (o motor é puro, sem ORM — importável do schema). Fica como sugestão de refactor num PR próprio.
- **Feito:** `FinancialPeriodRead.profit`/`margin` agora delegam para `engine.profit`/`engine.margin`, mesmo padrão já usado em `apps/api/app/schemas/marketing.py`. Sem mudança de comportamento; validado por `test_financials.py` (CI e localmente contra Docker).

### L-05 — Sem validação de faixa em nenhum input numérico — ✅ RESOLVIDO ([#133](https://github.com/TecnoDreamer/Lucratix/pull/133))
- **Evidência:** `apps/api/app/schemas/{financial_period,funnel_snapshot,marketing,target}.py` — todos os campos numéricos eram `float | None = None` / `int | None = None`, sem `Field(ge=...)` nem `field_validator`. `targets.value` era `float` sem `ge`. Aceitava receita negativa, `impressions = -5`, meta zero.
- **Impacto:** dado absurdo entra no banco e propaga para os KPIs (que só se protegem de divisão por zero, não de negativo).
- **Ação:** adicionar `Field(ge=0)` nos campos de contagem e monetários onde negativo não faz sentido (avaliar caso a caso — `attributed_revenue` negativo pode ser estorno legítimo). Registrar a decisão de cada campo. PR de backend próprio.
- **Feito:** `Field(ge=0)` adicionado caso a caso em `financial_period.py` (5 campos), `funnel_snapshot.py` (8 etapas) e `marketing.py` (investimento + 5 contagens da campanha). Decisão registrada em `RN-017` (`business-rules.md`). Duas exceções deliberadas, sem `ge=0`: `campaigns.attributed_revenue` (estorno/chargeback pode ser negativo) e `targets.value` (meta de `PROFIT`/`MARGIN` pode ser negativa).

### L-06 — `campaigns.opportunities` é coluna morta
- **Evidência:** `apps/api/app/models/campaign.py` tem `opportunities Integer`; `apps/api/app/modules/imports/domains.py` aceita o cabeçalho; mas `AggregatedCampaigns` (`apps/api/app/modules/analytics/marketing_service.py`) não soma `opportunities` e nenhuma métrica de marketing o usa.
- **Impacto:** o usuário preenche/importa um campo que não influencia nada.
- **Ação:** decidir — (a) remover a coluna e o alias de import; ou (b) usá-lo em alguma métrica (ex.: taxa lead→oportunidade por campanha). Registrar no catálogo de métricas como "coletado, não usado" enquanto pendente.

### L-07 — 6 colunas de `baselines` nunca são lidas
- **Evidência:** `apps/api/app/models/baseline.py` armazena `customer_count`, `conversion_rate`, `average_ticket`, `marketing_investment`, `leads`, `recurrence_rate` — settáveis via `POST /baselines`. Mas `GET /dashboard/compare-to-baseline` só aceita `metric ∈ {revenue, profit, margin, cac}` (`apps/api/app/modules/analytics/router.py:69`) e `/reports/basic` só compara `revenue`/`profit`.
- **Impacto:** o usuário registra um baseline "completo" mas só 4 dos 10 indicadores são comparáveis.
- **Ação:** ampliar `_BaselineMetric` para incluir `conversion_rate`/`average_ticket`/`recurrence_rate` (a métrica atual já é calculada no dashboard), ou documentar no manual que só 4 entram na comparação e por quê.

### L-08 — `experiment.status` nunca sai de `draft`
- **Evidência:** `apps/api/app/models/experiment.py` — enum `experiment_status (draft/running/finished)`, `default=DRAFT`. Nenhuma rota em `apps/api/app/modules/experiments/router.py` altera `status` (só `POST` cria, `PATCH .../variants/...` atualiza variante).
- **Impacto:** todo experimento fica `draft` para sempre; o campo é inútil na prática.
- **Ação:** adicionar `PATCH /experiments/{id}` que aceite `status`, com auditoria; ou remover a coluna se o ciclo de vida do experimento não for do MVP. Registrar decisão.

### L-09 — `check:i18n` não roda no CI — ✅ RESOLVIDO ([#129](https://github.com/TecnoDreamer/Lucratix/pull/129))
- **Evidência:** `apps/web/package.json` tem o script `check:i18n` (`node scripts/check-i18n-keys.mjs`, 773 chaves), mas `.github/workflows/frontend-ci.yml` rodava `lint → typegen → tsc → test → build` — não `check:i18n`. Uma chave faltando em `en.json`/`es.json` passava no CI e renderizava a chave crua em produção.
- **Impacto:** regressão de i18n silenciosa.
- **Ação:** adicionar um step `npm run check:i18n` ao job `frontend` do `frontend-ci.yml`. Mudança de 2 linhas — pode ser um PR isolado.
- **Feito:** step `npm run check:i18n` adicionado ao job `frontend`, depois de "Unit tests" e antes de "Build".

### L-10 — `docs/architecture/overview.md` lista módulos que não existem
- **Evidência:** a tabela de módulos de back-end cita `users`, `clients`, `integrations`, `security` como módulos e separa `metrics`/`analytics` de um jeito que não corresponde a `apps/api/app/modules/` (real: `analytics`, `api_keys`, `audit`, `auth`, `baselines`, `chart_preferences`, `experiments`, `exports`, `financials`, `funnels`, `imports`, `marketing`, `memberships`, `metrics`, `organizations`, `platform_admin`, `products`, `reports`, `targets`, `workspace_preferences`).
- **Impacto:** documento de arquitetura desatualizado.
- **Ação:** atualizar a tabela para a lista real. Parte do "truth-up completo".

---

## BAIXO

### L-11 — `docs/testing/strategy.md` com números defasados
- **Evidência:** diz `"78 unit tests (as of 2026-08-21)"` e `"8 E2E scenarios"`. Real hoje: `tests/unit/` = 27 arquivos, `tests/api/` = 33, `tests/integration/` = 3, `tests/security/` = 4, `tests/e2e/` = 21 specs, `apps/web/src/**/*.spec.*` = 69.
- **Ação:** atualizar a fotografia de cobertura e o mapa de qual camada roda em qual pipeline.

### L-12 — `domain-model.md` cita entidades removidas
- **Evidência:** `docs/architecture/domain-model.md` descreve `MetricDefinition` e `MetricSnapshot` (marcadas como nunca implementadas), mas `docs/database/er-diagram.md` já as removeu. Meio-consistente.
- **Ação:** alinhar `domain-model.md` ao ER diagram (remover as duas ou movê-las para uma seção "considerado e descartado").

### L-13 — `/auth/refresh` não rotaciona o refresh token
- **Evidência:** `apps/api/app/modules/auth/router.py` (docstring de `refresh`, ~linhas 208-217): emite só um `access_token` novo, o `refresh_token` permanece. Desvio já registrado em `docs/adr/0004-estrategia-autenticacao.md`.
- **Impacto:** um refresh token vazado vale 7 dias mesmo após um refresh legítimo. Aceitável para o estágio pré-produção, mas ausente do `docs/security/AUTHENTICATION.md` consolidado.
- **Ação:** adicionar uma linha em `AUTHENTICATION.md` referenciando o desvio de ADR-0004; considerar rotação numa rodada de hardening.

### L-14 — `import_jobs.status` é `String(30)`, não enum PG
- **Evidência:** `apps/api/app/models/import_job.py` — `status: Mapped[str] = mapped_column(String(30), ...)`, enquanto `membership_role`, `membership_status`, `organization_status`, `experiment_status`, `target_metric` são enums PG de verdade.
- **Impacto:** o banco não impede um valor de status inválido em `import_jobs`.
- **Ação:** documentar como decisão consciente em `docs/database/schema-notes.md` (o `ImportJobStatus` Python já restringe na aplicação), ou migrar para enum PG numa migration futura.

### L-15 — `cnpj` sem validação de formato; `currency` sem allowlist
- **Evidência:** `apps/api/app/schemas/organization.py` — `cnpj: str | None = Field(default=None, max_length=32)` (sem regex/dígito verificador); `currency: str = Field(default="BRL", min_length=3, max_length=3)` (qualquer 3 caracteres).
- **Impacto:** `cnpj = "abc"` e `currency = "XYZ"` são aceitos.
- **Ação:** adicionar `field_validator` de CNPJ (formato + dígitos) e um allowlist ISO-4217 curto para `currency` (BRL/USD/EUR...). PR de backend próprio.

### L-16 — `PATCH /auth/locale` não grava auditoria
- **Evidência:** `apps/api/app/modules/auth/router.py` — o handler de locale seta `current_user.locale` e faz `commit`, sem `record_audit`. `RNF-009` diz "toda criação/alteração/exclusão de dado de organização gera registro de auditoria" — locale é dado de **usuário**, não de organização, então tecnicamente fora do RNF, mas a exceção não está escrita em lugar nenhum.
- **Ação:** registrar em `docs/security/LOGS_E_AUDITORIA.md` a lista de mutações deliberadamente **não** auditadas (locale, preferências de workspace, preferências de gráfico) e o motivo (preferência pessoal de UI, sem valor forense).

### L-17 — `ADR-0007` diverge da implementação de relatórios
- **Evidência:** `docs/adr/0007-relatorios-html-print-css.md` decide "relatórios via HTML + `@media print`". O código gera PDF com **ReportLab** (`apps/api/app/modules/reports/pdf_builder.py`), decisão registrada em `docs/reports/PDF_INFRAESTRUTURA.md` — mas o ADR não foi marcado como superado.
- **Ação:** adicionar status `Substituído por docs/reports/PDF_INFRAESTRUTURA.md` no cabeçalho do ADR-0007 (ou um ADR-0010 que o supere formalmente).

### L-18 — `README.md` da raiz com status defasado
- **Evidência:** `README.md:5` — `"Status atual: fundação técnica, banco de dados, autenticação e multi-tenancy implementados (Fases 4–7)... Front-end Next.js escafoldado, telas de negócio ainda pendentes."` O produto tem todas as telas de negócio (Fases 0–16 concluídas, `docs/product/roadmap.md`).
- **Ação:** atualizar o parágrafo de status e a seção "Documentação" do `README.md` (incluir link para `DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`). Parte do "truth-up completo".

---

## MELHORIA

### L-19 — Append-only só por convenção de código
- **Evidência:** `baselines`, `audit_logs`, `import_errors` são "append-only" — mas isso é garantido apenas por **ausência** de método `update`/`delete` nos repositories (`apps/api/app/modules/baselines/repository.py:1-3`, `apps/api/app/core/audit.py:17`). Não há trigger, `REVOKE`, nem constraint no Postgres.
- **Impacto:** um `UPDATE`/`DELETE` acidental (script, console, migration futura) não é barrado pelo banco.
- **Ação:** avaliar uma regra `BEFORE UPDATE OR DELETE` ou `REVOKE UPDATE, DELETE` para o papel da aplicação nessas 3 tabelas. Registrar em `docs/security/data-classification.md` / `threat-model.md`.

### L-20 — `logo_upload_rate_limiter` sem `Retry-After` nem auditoria
- **Evidência:** é o único limiter chamado direto via `.check()` (`apps/api/app/modules/organizations/router.py`), não via `enforce_rate_limits` — então o 429 não traz header `Retry-After` e não gera linha `rate_limit` na auditoria, ao contrário dos outros 17.
- **Ação:** padronizar via `enforce_rate_limits` (com `action="auth.rate_limited.logo_upload"`), ou documentar a exceção em `docs/security/RATE_LIMITING.md`.

### L-21 — Sem MRR / taxa de crescimento — ✅ DECISÃO REGISTRADA (2026-09-23)
- **Evidência:** `grep` por `mrr`, `growth` no `engine.py` e services: nada. Para um produto de BI de receita, MRR e crescimento MoM são KPIs esperados.
- **Ação:** avaliar se entram numa rodada futura; registrar em `docs/product/out-of-scope.md` se for decisão de não fazer agora.
- **Decidido:** fora de escopo por ora — nenhum código construído agora. Registrado em `docs/product/out-of-scope.md`, com a nota de que "MRR" de verdade primeiro exige decidir o que conta como receita recorrente no dado atual (não há modelo de assinatura/plano hoje).

---

## Resumo por severidade

| Nível | Itens |
|---|---|
| CRÍTICO | — |
| ALTO | ~~L-01~~ ✅, ~~L-02~~ ✅, L-03 |
| MÉDIO | ~~L-04~~ ✅, ~~L-05~~ ✅, L-06, L-07, L-08, ~~L-09~~ ✅, L-10 |
| BAIXO | L-11, L-12, L-13, L-14, L-15, L-16, L-17, L-18 |
| MELHORIA | L-19, L-20, ~~L-21~~ ✅ |

Nenhuma correção foi aplicada na rodada original de auditoria — cada item era candidato a uma issue ou PR próprio. Desde então, L-01, L-04, L-05 e L-09 já foram corrigidos (ver notas "Feito" em cada item), e L-02/L-21 já têm decisão de produto registrada (ver notas "Decidido" em cada item, 2026-09-23) — os demais seguem em aberto, L-06, L-07 e L-08 (decisão de produto pendente).
