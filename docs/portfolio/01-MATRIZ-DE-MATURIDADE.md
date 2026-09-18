# Matriz de maturidade — Lucratix

> Entregável da **Etapa 3** do prompt mestre de portfólio/inteligência competitiva. Base para todo material público: nada aqui é opinião — cada status aponta evidência no repositório.

| | |
|---|---|
| **Data da auditoria** | 2026-09-18 |
| **Commit auditado** | `4f6f8a6` (`main`) |
| **Método** | leitura do código, dos testes, dos workflows de CI e da documentação; contagens obtidas por comando (seção 2). Produção **não** foi acessada. |
| **Relação com outros docs** | Complementa [`DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`](../../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md) (guia do produto) e [`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md) (divergências). Este arquivo responde outra pergunta: *o que pode ser mostrado ao público sem exagerar?* |

## 1. Legenda

**Status** (os únicos permitidos em material público, conforme o prompt mestre):

| Status | Significado aqui |
|---|---|
| `IMPLEMENTADO` | Existe no código, é alcançável pela API/UI e tem teste automatizado. |
| `PARCIAL` | Existe, mas com limitação relevante e documentada (ex.: campo coletado que não alimenta nenhum indicador). |
| `EM DESENVOLVIMENTO` | Trabalho iniciado, ainda não mergeado em `main`. *(Nenhum item nesta data.)* |
| `PLANEJADO` | Consta no roadmap/escopo, sem código. |
| `PROPOSTO` | Existe apenas como documento de arquitetura/pesquisa. |
| `EXPERIMENTAL` | Existe mas sem garantia de contrato. *(Nenhum item nesta data.)* |
| `NÃO VERIFICADO` | Não foi possível comprovar nesta auditoria — **não** afirmar em público. |

**Pronto para portfólio?**
`Sim` = pode ser apresentado como funcionalidade, com evidência e screenshot viáveis.
`Sim, com ressalva` = pode ser apresentado, **desde que** a ressalva da coluna Observações acompanhe.
`Não` = não apresentar como funcionalidade (motivo na coluna Observações).

## 2. Números verificados

Todo número que o portfólio citar deve vir desta tabela (ou ser remedido). Nenhum é estimativa.

| Item | Valor | Como foi obtido | Data |
|---|---|---|---|
| Módulos de API (`apps/api/app/modules/`) | **20** | `ls` do diretório | 2026-09-18 |
| Tabelas (modelos SQLAlchemy) | **21** | `ls apps/api/app/models` (excluindo `mixins`) | 2026-09-18 |
| Migrations Alembic | **19** (`0001` … `0019`) | `ls apps/api/alembic/versions` | 2026-09-18 |
| Telas (`page.tsx`) | **26** | `find apps/web/src/app -name page.tsx` | 2026-09-18 |
| Testes de backend | **736** coletados | `pytest --collect-only -q` | 2026-09-18 |
| Testes de backend — última execução completa | **730 passaram, 0 falhas** (suíte anterior a +6 testes do L-05, que passaram no CI) | `pytest -q` contra Postgres 16 (Docker) | 2026-09-10 |
| Testes E2E (Playwright, chromium) | **56 testes em 20 arquivos** | `npx playwright test --list` | 2026-09-18 |
| Testes de frontend (Vitest) | **513 testes em 70 arquivos, todos passando** | `npx vitest run` (execução completa, sem erros de worker) | 2026-09-18 |
| Chaves de i18n | **773**, idênticas em `pt-BR`/`en`/`es` | `npm run check:i18n` (gate de CI) | 2026-09-10 |
| ADRs | **9** | `ls docs/adr` | 2026-09-18 |
| Documentos `.md` em `docs/` | **100** | `find docs -name '*.md'` | 2026-09-18 |
| Workflows de CI | **4** (`backend-ci`, `security-ci`, `frontend-ci`, `e2e-ci`) → **5 jobs** | `.github/workflows/` | 2026-09-18 |
| Histórico do repositório | **155 commits** em `main`, ~**80 PRs** squash-merged, de **2026-08-21 a 2026-09-18 (~4 semanas)** | `git rev-list --count`, `git log` | 2026-09-18 |
| Assistência de IA no desenvolvimento | Trailers `Co-Authored-By: Claude` presentes no histórico (173 ocorrências em mensagens de commit) | `git log --format=%B` | 2026-09-18 |

Cobertura de código: o CI executa `pytest --cov=app --cov-report=term-missing` (`.github/workflows/backend-ci.yml`), mas **não impõe limite mínimo** e o percentual **não foi capturado** nesta auditoria → `NÃO VERIFICADO`. Não citar percentual de cobertura.

## 3. Módulos de produto

| Módulo | Status | Evidência (onde) | Testes | Documentação | Pronto p/ portfólio? | Observações |
|---|---|---|---|---|---|---|
| **Autenticação** (cadastro, login, refresh, logout, recuperação/troca de senha, verificação de e-mail, idioma) | `IMPLEMENTADO` | `apps/api/app/modules/auth/`; telas `/login`, `/register`, `/esqueci-senha`, `/redefinir-senha`, `/confirmar-email`, `/conta/configuracoes` | api: `auth_flow`, `password_reset`, `email_verification`; unit: `password_policy`, `security`, `opaque_tokens`; e2e: `auth`, `password_reset`, `account_settings` | [`security/AUTHENTICATION.md`](../security/AUTHENTICATION.md), [`security/POLITICA_DE_SENHAS.md`](../security/POLITICA_DE_SENHAS.md) | Sim, com ressalva | Sem MFA (`PROPOSTO`, [`security/MFA.md`](../security/MFA.md)). E-mail transacional depende de `RESEND_API_KEY`; sem chave devolve `dev_token` fora de produção → envio real de e-mail **`NÃO VERIFICADO`**. `/auth/refresh` não rotaciona o refresh token (L-13). |
| **Sessão única + logout por inatividade** | `IMPLEMENTADO` | `app/core/sessions.py`, `models/session.py` (RN-016); `idle-logout-watcher.tsx` (15 min) | integration: `sessions`, `single_active_session`; e2e: `single_active_session`; vitest: `idle-logout-watcher.spec` | [`business-rules.md` RN-016](../requirements/business-rules.md) | Sim | Diferencial técnico demonstrável (login em outro dispositivo encerra a sessão anterior). |
| **Organizações (multiempresa)** — criar/editar, congelar/reativar, logotipo, resumo de KPIs por card | `IMPLEMENTADO` | `modules/organizations/`; telas `/organizations`, `/organizations/[id]` | api: `organizations_list`, `organizations_summary`, `organization_lifecycle`, `organization_logo`; e2e: `organizations`, `organization_lifecycle`, `switch_organization`, `brand-logo` | [`docs/organizations/`](../organizations/README.md) | Sim, com ressalva | Logotipo depende de 3 variáveis Cloudinary; sem elas responde 503. |
| **Multi-tenancy / isolamento** | `IMPLEMENTADO` | `app/core/deps.py::get_organization_context`; filtro por `organization_id`; não-membro recebe **404** | integration: `multi_tenant_isolation`; security: `authorization`; e2e: `multi_tenant_isolation`; teste estrutural parametrizado cobre todo endpoint de escrita org-scoped | [ADR-0003](../adr/0003-estrategia-multi-tenancy.md), [`security/threat-model.md`](../security/threat-model.md) | Sim | Principal requisito de segurança do produto. **Afirmar "comprovado por teste automatizado", não "100% seguro".** |
| **Controle de acesso (RBAC)** | `IMPLEMENTADO` | `require_role` em `deps.py`; hierarquia `OWNER > ADMIN > ANALYST > VIEWER`; `PLATFORM_ADMIN` como flag global | security: `authorization`; unit: `membership_role_hierarchy`; e2e: `permissions` | [`security/ACCESS_CONTROL.md`](../security/ACCESS_CONTROL.md), RN-009, RN-010 | Sim | Hierarquia **linear** — não há permissão por módulo (o desenho de "acesso por módulo" existe só como plano, não implementado). |
| **Membros da empresa** (convidar, trocar papel, revogar) | `PARCIAL` | API: `modules/memberships/`. UI: apenas em `/admin/organizations/[id]` (Super Admin) | api: `memberships` | [`security/ACCESS_CONTROL.md`](../security/ACCESS_CONTROL.md) | Não (como UI) | **Não existe tela de equipe para o admin da própria empresa** — só o Super Admin gerencia membros pela UI. Apresentar como capacidade de API, não de interface. |
| **Super Admin (plataforma)** | `IMPLEMENTADO` | `modules/platform_admin/`; telas `/admin`, `/admin/organizations`, `/admin/users` | api: `platform_admin`; security: `authorization` | [`security/ACCESS_CONTROL.md`](../security/ACCESS_CONTROL.md) | Sim, com ressalva | Não toca em dado de negócio (só acesso). Mostrar apenas com dados fictícios. |
| **Chaves de API** (leitura de analytics para BI externo) | `IMPLEMENTADO` | `modules/api_keys/`; `api-keys-section.tsx` | api: `api_keys`; unit: `api_key_auth`; vitest: `api-keys-section.spec` | [`security/API_KEYS.md`](../security/API_KEYS.md), [`analytics/POWER_BI.md`](../analytics/POWER_BI.md) | Sim, com ressalva | É o **mecanismo** que permite a Power BI/Looker Studio ler dados. **Não há conector nem embedding pronto** — Power BI/Looker aparecem como pesquisa (`PROPOSTO`). Nunca escrever "integra com Power BI". |
| **Auditoria** (trilha de eventos) | `IMPLEMENTADO` | `modules/audit/`, `app/core/audit.py`; tela `/organizations/[id]/audit` | api: `audit_logs`; security: `export_security` | [`security/LOGS_E_AUDITORIA.md`](../security/LOGS_E_AUDITORIA.md) | Sim, com ressalva | Append-only **por convenção de código**, sem trigger no banco (L-19). Não escrever "imutável no banco". |
| **Baseline** (situação inicial, histórico) | `IMPLEMENTADO` | `modules/baselines/`; RN-002; [ADR-0005](../adr/0005-baseline-append-only.md) | api: `baselines`; e2e: `baseline_and_dashboard` | ADR-0005 | Sim, com ressalva | Comparação antes × depois só cobre 4 métricas (`revenue`, `profit`, `margin`, `cac`); 6 colunas do baseline nunca são lidas (L-07) → comparação `PARCIAL`. |
| **Produtos/serviços** | `PARCIAL` | `modules/products/`; tela `/products` | api: `products` | RN-014 | Sim, com ressalva | É **cadastro**. Não há modelo de vendas, nem análise por produto (mais vendido, lucratividade por produto). Não sugerir o contrário. |
| **Financeiro** (mensal: receita, custos, despesas, investimento, impostos; lucro/margem derivados) | `IMPLEMENTADO` | `modules/financials/`; tela `/financials`; validação de faixa (RN-017) | api: `financials`; e2e: `financials_and_campaigns` | [`analytics/metrics-catalog.md`](../analytics/metrics-catalog.md) (em atualização, L-03) | Sim | Granularidade sempre **mensal**. |
| **Marketing** (canais e campanhas) | `IMPLEMENTADO` | `modules/marketing/`; tela `/marketing` | api: `marketing`, `analytics_marketing`, `analytics_marketing_by_channel`; unit: `marketing_service` | — | Sim, com ressalva | `campaigns.opportunities` é coletado e não alimenta nenhum indicador (L-06). |
| **Funil** (8 etapas, agregado e por canal) | `IMPLEMENTADO` | `modules/funnels/`; tela `/funnel`; `funnel-*-chart.tsx` | api: `funnels`, `analytics_funnel*`; unit: `funnel_analytics`; e2e: `funnel_personalization` | [`docs/funnel/`](../funnel/README.md) | Sim | Módulo mais completo em UX (análise de gargalo, evolução, por canal, personalização de gráfico). |
| **Analytics** (Dashboard + Visão Executiva: KPIs, séries, comparação, metas, correlação, marketing) | `IMPLEMENTADO` | `modules/analytics/`, `modules/targets/`; telas `/dashboard`, `/analytics` | api: `analytics_executive`, `analytics_correlation`, `analytics_targets`; unit: `analytics_service`, `correlation_service`, `targets_service`; e2e: `analytics` | [`docs/analytics/`](../analytics/ARCHITECTURE.md) | Sim | 7 KPIs executivos + 7 de marketing (ver guia principal §7). |
| **Motor de métricas** (fórmulas puras) | `IMPLEMENTADO` | `app/modules/metrics/engine.py` — sem ORM/HTTP; `MetricResult{value,is_applicable,reason}` | unit: `metrics_engine` (72 testes) | RN-003, RN-004 | Sim | Diferencial de engenharia: nunca divide por zero, nunca trata ausência como `0`. `ltv()`, `retention_rate()`, `churn_rate()` existem no motor mas **nenhuma tela as usa** (L-02) — **não citar LTV/Churn como funcionalidade**. |
| **Experimentos A/B (CRO)** | `PARCIAL` | `modules/experiments/`; tela `/experiments`; teste Z de duas proporções | unit: `experiment_analysis`; api: `experiments` | RN-013 | Sim, com ressalva | O `status` do experimento nunca sai de `draft` (L-08) — não há ciclo de vida. Resultado/significância funcionam. |
| **Relatórios PDF** (básico, executivo, funil) | `IMPLEMENTADO` | `modules/reports/` (ReportLab, server-side) | api: `reports_basic_pdf`, `reports_executive_pdf`, `reports_funnel_pdf`; e2e: `reports` | [`docs/reports/`](../reports/PDF_INFRAESTRUTURA.md) | Sim | Só **um** tipo de relatório de negócio: o executivo/funil/básico. Tipos como "vendas", "por produto" e "prejuízos" **não existem** (dependem de modelo de vendas). |
| **Central de Dados — importação** (CSV/XLSX/JSON, 4 domínios) | `IMPLEMENTADO` | `modules/imports/`; `import-wizard.tsx`; fluxo upload → mapeamento → preview → confirmação | unit: `import_*` (6 arquivos); api: `imports`, `demo_data_import`; security: `import_security` | [`docs/data-import-export/`](../data-import-export/README.md) | Sim | Limites: 5 MB / 2000 linhas; síncrono, sem fila. |
| **Central de Dados — exportação** (5 domínios) | `IMPLEMENTADO` | `modules/exports/`; `export-panel.tsx` | api: `exports`; unit: `export_serializers`; security: `export_security` | idem | Sim | Auditoria exige `ADMIN`. |
| **Glossário** (definições de métricas) | `IMPLEMENTADO` | tela `/glossario`; `metric-help.tsx`; `metric-definitions.ts` | vitest: `glossario.spec`, `metric-help.spec` | — | Sim | Componente de educação do usuário, diferencial de UX defensável. |
| **Personalização** (acessos rápidos na Home; configuração dos gráficos do funil, persistida por usuário+empresa+gráfico) | `IMPLEMENTADO` | `modules/workspace_preferences/`, `modules/chart_preferences/`; `chart-settings-dialog.tsx` | api: `workspace_preferences`, `chart_preferences`; e2e: `quick_access_preferences`, `funnel_personalization` | [`docs/workspace/`](../workspace/README.md), [`docs/charts/PERSONALIZACAO_DE_GRAFICOS.md`](../charts/PERSONALIZACAO_DE_GRAFICOS.md) | Sim, com ressalva | Personalização de **gráficos** só existe no Funil. |
| **Página pública "Sobre"** | `IMPLEMENTADO` | tela `/sobre` | e2e: `sobre` (inclui "sem scroll horizontal em telas pequenas") | [`docs/branding/`](../branding/LUCRATIX_BRAND.md) | Sim | Única página pública além de login/cadastro. |

## 4. Capacidades transversais

| Capacidade | Status | Evidência | Testes / verificação | Pronto p/ portfólio? | Observações |
|---|---|---|---|---|---|
| **Internacionalização** (pt-BR, en, es) | `IMPLEMENTADO` | `apps/web/messages/`; 773 chaves; gate `check:i18n` no `frontend-ci` | `check:i18n` (paridade de chaves); vitest: `locale-switcher`, `locale-sync` | Sim, com ressalva | O gate valida **paridade de chaves**, não a **qualidade** da tradução en/es — revisão humana `NÃO VERIFICADO`. |
| **Tema claro/escuro** | `IMPLEMENTADO` | 57 arquivos `.tsx` com variantes `dark:`; `theme-watcher.tsx`; impressão força tema claro ([ADR-0007](../adr/0007-relatorios-html-print-css.md)) | vitest de componentes | Sim | — |
| **Design system** | `PARCIAL` | [`docs/design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md); componentes compartilhados em `apps/web/src/components/` (`ui.tsx`, `segmented-control`, `confirm-dialog`…) | vitest de componentes | Sim, com ressalva | Sistema de componentes **próprio e documentado**, sem Storybook/catálogo público. Não afirmar "design system completo". |
| **Gráficos** | `IMPLEMENTADO` | Recharts (Funil) + SVG artesanal (Analytics) — [`docs/analytics/CHART_DECISIONS.md`](../analytics/CHART_DECISIONS.md) | vitest: `*-chart.spec` | Sim | **Recharts é a única biblioteca de gráficos** (não há ApexCharts). |
| **Acessibilidade** | `PARCIAL` | [`docs/charts/ACESSIBILIDADE.md`](../charts/ACESSIBILIDADE.md); atributos ARIA em 21 componentes | Sem axe/Lighthouse/pa11y no repositório ou no CI | Não (como conformidade) | Há **práticas** de acessibilidade, mas **conformidade WCAG `NÃO VERIFICADA`** — não escrever "acessível conforme WCAG". |
| **Responsividade / mobile** | `PARCIAL` | menu em gaveta abaixo do breakpoint `lg`; e2e da página Sobre verifica ausência de scroll horizontal | e2e em viewport mobile só na página Sobre | Sim, com ressalva | Auditoria de layout documentada ([`auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md`](../auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md)); sem teste automatizado de todas as telas em mobile. Não há app nativo. |
| **Segurança de aplicação** | `IMPLEMENTADO` | Argon2; JWT em cookie `HttpOnly`/`SameSite=Lax`/`Secure`; 18 rate limiters em 3 dimensões; cabeçalhos de segurança; RN-017 (validação de faixa) | security: `authorization`, `rate_limiting`, `import_security`, `export_security`; CI: `bandit`, `pip-audit`, `npm audit` | Sim, com ressalva | Ver seção 5. Rate limit é in-memory / réplica única. Projeto está em **pré-produção** ([`SECURITY.md`](../../SECURITY.md)). |
| **CI/CD** | `IMPLEMENTADO` | 4 workflows / 5 jobs: `backend` (ruff, mypy, migrations, pytest+cov), `backend-security` (bandit, pip-audit), `frontend` (eslint, tsc, vitest, `check:i18n`, build), `frontend-security` (`npm audit --omit=dev`), `e2e` (Playwright) | Execução visível em cada PR | Sim, com ressalva | Os checks **executam em toda PR**; a **obrigatoriedade técnica** (branch protection) **não está disponível** no plano atual do GitHub para repositório privado (`HTTP 403` na consulta) — é garantida por processo ([`CONTRIBUTING.md`](../../CONTRIBUTING.md)), não por bloqueio da plataforma. |
| **Deploy** | `NÃO VERIFICADO` (produção) | Dockerfiles (`apps/api`, `apps/web`); `docker-compose.yml`; previews da Vercel aparecem como check de PR; documentação cita Railway (API) | Check "Vercel" nas PRs | Não | Não foi acessado ambiente de produção nesta auditoria. Não afirmar disponibilidade, URL pública nem uptime. |
| **Observabilidade** | `PLANEJADO` | Apenas o endpoint `GET /health` (`app/main.py`). Sem logging estruturado, métricas ou rastreio de erros (nenhum uso de `logging` em `apps/api/app`; sem Sentry/OpenTelemetry nas dependências) | — | Não | Item da Fase 18 (hardening). Não listar como capacidade. |
| **Integrações externas de dados** (GA4, Google Ads, Meta Ads, CRM, ERP) | `PLANEJADO` | Issue aberta [#26](https://github.com/TecnoDreamer/Lucratix/issues/26) (`EPIC-013`), bloqueada até validação em uso real ([`product/hypotheses.md`](../product/hypotheses.md) H5) | — | Não | **Todo dado entra por digitação ou planilha.** Vale como item de roadmap, nunca como funcionalidade. |
| **Exclusão/exportação self-service de dados pessoais (LGPD)** | `PLANEJADO` | Issue aberta [#25](https://github.com/TecnoDreamer/Lucratix/issues/25) (`EPIC-014`) | — | Não | Só processo manual hoje (RNF-018). Não afirmar conformidade LGPD. |
| **MFA** | `PROPOSTO` | [`security/MFA.md`](../security/MFA.md) | — | Não | Documento de arquitetura, sem código. |
| **Billing / planos / cobrança** | `PLANEJADO` | Declarado fora de escopo em [`product/out-of-scope.md`](../product/out-of-scope.md) | — | Não | Não existe. Qualquer referência a planos no material de mercado é **hipótese comercial**, não produto. |
| **Acesso por módulo** (restringir empresa/usuário a certos módulos) | `PROPOSTO` | Desenho em plano interno (2 PRs); nenhuma linha de código | — | Não | Só existe hierarquia de papéis. Não apresentar como funcionalidade. |

## 5. O que pode e o que não pode ser dito sobre segurança

Só controles **verificados** entram no portfólio (regra do prompt mestre §7.12).

| Pode dizer (com evidência) | Não dizer |
|---|---|
| Senhas com Argon2; política de senha forte aplicada em registro, reset e troca | "100% seguro", "à prova de invasão" |
| Sessão única por conta, revogada no servidor a cada login | "Conforme LGPD" / "certificado" / "auditado por terceiros" |
| Isolamento entre empresas **comprovado por teste automatizado** (404 para não-membro) | "Impossível vazar dado entre empresas" |
| Rate limiting em 3 dimensões (IP, conta, combinada) em endpoints sensíveis | "Proteção contra DDoS" (é limitador in-memory, réplica única) |
| Trilha de auditoria com 50 identificadores de ação (inclui bloqueios por rate limit) | "Auditoria imutável" (é append-only por convenção, sem trigger — L-19) |
| Varredura automática de dependências e SAST no CI (`bandit`, `pip-audit`, `npm audit`) | "Sem vulnerabilidades" (um advisory crítico do Next.js foi encontrado e corrigido em 2026-09-10 — [#130](https://github.com/TecnoDreamer/Lucratix/pull/130); o histórico é parte do processo, não algo a esconder) |
| Aviso de escopo: projeto em pré-produção | Qualquer número de usuários, clientes ou empresas atendidas |

## 6. Pontos que **não** podem aparecer como resultado

Conforme `SECURITY.md`, o projeto está em **pré-produção, sem usuários finais reais**. Portanto **não existem** — e não devem ser escritos — clientes, casos de sucesso, ganho de receita, redução de CAC, ROI medido ou depoimentos. O que existe é **produto funcional, testado e documentado**, demonstrável com dados fictícios (`test-data/demo-company/`).

O repositório é **privado**. Portanto qualquer "showcase no GitHub" exige decisão explícita de tornar público (ou de criar um repositório de vitrine separado) — ver [`02-INVENTARIO-DE-EVIDENCIAS.md`](02-INVENTARIO-DE-EVIDENCIAS.md), seção 4.

## 7. Divergências descobertas nesta auditoria

Itens em que a documentação existente estava mais otimista do que a evidência, encontrados ao montar esta matriz:

1. **"5 gates obrigatórios"** ([`DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`](../../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md) §15) — os 5 jobs executam em toda PR, mas a obrigatoriedade por branch protection **não** pôde ser confirmada (recurso indisponível no plano). Redação correta: "5 jobs de CI executados em toda PR; merge condicionado por processo".
2. **"Hoje não há validação de faixa"** (mesmo doc, §8) — desatualizado desde a [#133](https://github.com/TecnoDreamer/Lucratix/pull/133) (L-05, RN-017). Corrigido no mesmo PR que introduz esta matriz.
3. **Gestão de membros** — o guia principal lista `memberships` como módulo sem ressalva; a UI só existe para o Super Admin (seção 3, linha "Membros da empresa").

## 8. Limitações desta auditoria

- Produção, Vercel e Railway **não** foram acessados; nada aqui atesta disponibilidade.
- Cobertura percentual, conformidade WCAG, desempenho (Lighthouse/carga) e qualidade das traduções en/es **não** foram medidos.
- A suíte de backend não foi reexecutada nesta data (Docker Desktop indisponível no ambiente); vale a execução de 2026-09-10 (730 ✓) mais a coleta de 2026-09-18 (736 testes) e o CI verde das PRs seguintes.
