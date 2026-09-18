# Documentação principal — Lucratix

Guia mestre do produto. Leia este arquivo primeiro; ele orienta e aponta para os documentos aprofundados em [`docs/`](docs/README.md). Não repete o conteúdo deles.

> **Escopo desta documentação:** descreve o sistema **real** encontrado no repositório em 2026-09-10 (Fases 0–16 do [roadmap](docs/product/roadmap.md) concluídas). Divergências entre a implementação e a documentação de referência estão catalogadas em [`docs/governanca/LACUNAS_ENCONTRADAS.md`](docs/governanca/LACUNAS_ENCONTRADAS.md).

---

## 1. O que é a Lucratix

Plataforma de Business Intelligence, Marketing Analytics, Growth e CRO para **consultorias e profissionais de marketing** acompanharem, de forma isolada por cliente, a ligação entre **investimento em marketing** e **resultado financeiro real** (faturamento, lucro, margem, CAC, ROAS, conversão, recorrência), com **baseline histórico** e comparação **antes × depois**.

O dado é **inserido manualmente ou importado por planilha** — não há integração automática com GA4, Ads, CRM ou ERP (ver §12). Cada empresa/cliente é uma "organização" com dados totalmente isolados dos demais.

Público, problema e proposta de valor: [`docs/product/`](docs/product/) (`vision.md`, `problem.md`, `value-proposition.md`, `personas.md`).

## 2. Status do produto

| Fase | Estado |
|---|---|
| 0–16 (fundação, auth, multi-tenancy, empresas, baseline, produtos, financeiro, marketing, funil, métricas/analytics, experimentos, relatórios PDF, import/export, Super Admin, i18n, personalização) | **Concluídas** |
| 17 — Integrações externas (GA4/Ads/CRM) | Não iniciada — `status:blocked` até validação em uso real ([`hypotheses.md`](docs/product/hypotheses.md) H5) |
| 18 — Hardening / performance | Não iniciada |

Fora de escopo declarado: integrações automáticas, atribuição avançada, LTV preditivo, MFA, billing/planos — [`docs/product/out-of-scope.md`](docs/product/out-of-scope.md), [`docs/security/MFA.md`](docs/security/MFA.md).

## 3. Arquitetura em uma página

- **Monólito modular** (uma API FastAPI, sem microsserviços) — [ADR-0001](docs/adr/0001-monolito-modular.md).
- **Stack:** Next.js 16 (App Router, i18n por cookie) + FastAPI/Python 3.12 + PostgreSQL 16 + SQLAlchemy/Alembic — [ADR-0002](docs/adr/0002-stack-tecnologica.md). Detalhe em [`docs/architecture/overview.md`](docs/architecture/overview.md).
- **Multi-tenancy:** shared DB + shared schema, coluna `organization_id` obrigatória, filtro centralizado na camada de repositório; acesso de não-membro devolve **404, não 403** (não revela existência de organização) — [ADR-0003](docs/adr/0003-estrategia-multi-tenancy.md), [`docs/security/threat-model.md`](docs/security/threat-model.md). Ponto único de aplicação: `apps/api/app/core/deps.py::get_organization_context`.
- **Camada de métricas pura:** `apps/api/app/modules/metrics/engine.py` — sem SQLAlchemy, sem FastAPI. Contrato: nunca divide por zero, nunca trata dado ausente como `0`; devolve `MetricResult{value, is_applicable, reason}` (RN-003, RN-004, RNF-011, RNF-012).
- **Front-end:** o navegador só fala com a origem do Next; em produção `/api/*` é reescrito para o backend (Railway) mantendo o cookie de sessão same-origin. Gráficos: SVG artesanal no Analytics, Recharts só no Funil — [`docs/analytics/CHART_DECISIONS.md`](docs/analytics/CHART_DECISIONS.md).

## 4. Módulos e status

Todos `IMPLEMENTADO`. Papel mínimo para **escrever**; leitura é liberada para qualquer membro ativo salvo indicação.

| Módulo | Para que serve | Escrita exige | Doc de referência |
|---|---|---|---|
| **auth** | cadastro, login, refresh, logout, recuperação/troca de senha, verificação de e-mail, idioma | — | [`docs/security/AUTHENTICATION.md`](docs/security/AUTHENTICATION.md) |
| **organizations** | criar/editar empresa, congelar/reativar, logotipo, resumo de KPIs por card | `ORGANIZATION_ADMIN` | [`docs/organizations/`](docs/organizations/README.md) |
| **memberships** | convidar usuário (cria a conta na hora), trocar papel, revogar — **API completa; a interface existe só para o Super Admin** (`/admin/organizations/[id]`), não há tela de equipe para o admin da própria empresa | `ORGANIZATION_ADMIN` | [`docs/security/ACCESS_CONTROL.md`](docs/security/ACCESS_CONTROL.md) |
| **api_keys** | chave de API por organização para BI externo (Power BI/Looker), leitura de analytics | `ORGANIZATION_ADMIN` | [`docs/security/API_KEYS.md`](docs/security/API_KEYS.md), [`docs/analytics/POWER_BI.md`](docs/analytics/POWER_BI.md) |
| **audit** | consultar trilha de auditoria (append-only) | leitura: `ORGANIZATION_ADMIN` | [`docs/security/LOGS_E_AUDITORIA.md`](docs/security/LOGS_E_AUDITORIA.md) |
| **baselines** | registrar snapshot da situação da empresa (histórico, nunca editável) | `ANALYST` | [ADR-0005](docs/adr/0005-baseline-append-only.md) |
| **products** | cadastrar produto/serviço (inativa, nunca deleta) | `ANALYST` | — |
| **financials** | dados financeiros por mês (`revenue`, `costs`, `expenses`, `marketing_investment`, `taxes`); lucro/margem são derivados | `ANALYST` | [`docs/analytics/metrics-catalog.md`](docs/analytics/metrics-catalog.md) |
| **marketing** | canais e campanhas (investimento, impressões, cliques, leads, clientes, receita atribuída) | `ANALYST` | — |
| **funnels** | 8 etapas fixas do funil por mês (agregado e por canal) | `ANALYST` | [`docs/funnel/`](docs/funnel/README.md) |
| **analytics** | dashboard mensal + visão executiva por intervalo (KPIs, séries, metas, correlação, marketing, funil) | `ANALYST` (dashboard: `VIEWER`) | [`docs/analytics/ARCHITECTURE.md`](docs/analytics/ARCHITECTURE.md) |
| **experiments** | experimentos A/B de CRO com teste de significância | `ANALYST` | [`docs/diagrams/sequence/experiments-and-integration.md`](docs/diagrams/sequence/experiments-and-integration.md) |
| **reports** | relatório básico (JSON) + 3 PDFs (básico, executivo, funil) | `ANALYST` | [`docs/reports/`](docs/reports/) |
| **imports** | importar planilha (CSV/XLSX/JSON) nos 4 domínios: Financeiro, Funil, Produtos, Marketing | `ANALYST` | [`docs/data-import-export/`](docs/data-import-export/README.md) |
| **exports** | exportar dado dos 5 domínios (inclui Auditoria, que exige `ADMIN`) | `VIEWER` | [`docs/data-import-export/`](docs/data-import-export/README.md) |
| **targets** | metas mensais para os 7 KPIs executivos | `ANALYST` | — |
| **workspace_preferences** / **chart_preferences** | acessos rápidos configuráveis na Home; personalização dos gráficos do funil por usuário | qualquer membro | [`docs/workspace/`](docs/workspace/README.md), [`docs/charts/PERSONALIZACAO_DE_GRAFICOS.md`](docs/charts/PERSONALIZACAO_DE_GRAFICOS.md) |
| **platform_admin** | Super Admin global: quem tem acesso a qual empresa; nunca toca no dado de negócio | `is_platform_admin` (flag global) | [`docs/security/ACCESS_CONTROL.md`](docs/security/ACCESS_CONTROL.md) |

## 5. Jornada do usuário

```
Cadastro/login → seleciona/cria empresa → registra baseline → cadastra produtos
→ lança dados financeiros e de funil por mês → cadastra canais/campanhas
→ Dashboard (KPIs do mês) → Visão Executiva (intervalo, comparação, metas, correlação)
→ Funil (conversão/abandono por etapa, gargalo) → Experimentos → Relatórios/Exportações → decisão
```

Detalhe passo a passo em [`docs/product/user-journey.md`](docs/product/user-journey.md). Diagramas de sequência em [`docs/diagrams/sequence/`](docs/diagrams/sequence/).

## 6. Fluxo de dados

```
Entrada manual (formulário)  ─┐
Importação de planilha ───────┼─→  repositório (grava por organization_id)
                              │        │
                              │        ▼
                              │   camada de serviço  ──→  metrics/engine.py (fórmulas puras)
                              │        │
                              │        ▼
                              └─→   API (JSON com MetricResult)  ──→  UI (telas/gráficos)
                                                                 └──→  reports (PDF ReportLab)
```

- Import: arquivo é parseado **uma vez** no upload, linhas cruas ficam em JSONB (`import_jobs.raw_rows`), sem storage de arquivo, sem fila — processamento síncrono. Fluxo: upload → (seleção de aba, se xlsx) → mapeamento de colunas → preview → confirmar (`skip`/`update` para duplicados). Formatos e limites (5 MB / 2000 linhas): [`docs/data-import-export/IMPORT_FORMATS.md`](docs/data-import-export/IMPORT_FORMATS.md).
- Granularidade sempre **mensal** (`period` = dia 1 do mês) para financeiro, funil e metas.

## 7. KPIs — resumo

**Dashboard / Visão Executiva (7):** Receita, Lucro, Margem, CAC, Taxa de Conversão, Ticket Médio, Recorrência.
**Marketing (7):** ROAS, ROI, CTR, CPC, CPM, CPL, CPA.
**Funil:** 8 valores de etapa + 7 taxas de conversão + 7 de abandono (`1 − conversão`) + gargalo.
**Comparações:** período vs. período anterior equivalente; período vs. **baseline** (só `revenue`, `profit`, `margin`, `cac`).
**Correlação:** Pearson entre 2 dos 7 KPIs executivos (mín. 3 meses com ambos aplicáveis).
**Experimento:** taxa de conversão por variante + p-valor (teste Z de duas proporções, α = 0,05, n ≥ 30).

Regras invariáveis:
- Todo KPI "percentual" é guardado como **razão 0–1**; o `×100` acontece só na renderização.
- Dado ausente ou denominador zero → `is_applicable = false` com motivo explícito — **nunca `0`, nunca exceção** (RN-003, RN-004).
- Comparar dois pontos no tempo **não implica causalidade** (RN-007).

Fórmula exata de cada KPI, campos de origem e condição de "não aplicável": [`docs/analytics/metrics-catalog.md`](docs/analytics/metrics-catalog.md) *(catálogo em atualização — ver [L-03](docs/governanca/LACUNAS_ENCONTRADAS.md))*. Implementação: `apps/api/app/modules/metrics/engine.py`.

## 8. Como alimentar (o que preencher, de onde tirar)

| Tela | Você preenche | Onde tirar o dado | Unidade |
|---|---|---|---|
| **Financeiro** | receita, custos, despesas, investimento em marketing, impostos — por mês | ERP / contabilidade / extrato / planilha de fechamento | moeda da empresa |
| **Funil** | impressões, visitas, leads, MQLs, SQLs, oportunidades, clientes, recompras — por mês (agregado ou por canal) | ferramentas de site/ads/CRM do cliente (leitura manual) | contagem inteira |
| **Marketing → Campanhas** | investimento, impressões, cliques, leads, clientes, receita atribuída, datas | painéis de Ads / relatório da agência | moeda / contagem |
| **Produtos** | nome, categoria, preço, custo | catálogo do cliente | moeda |
| **Baseline** | os indicadores conhecidos no início do acompanhamento | fechamento do mês zero | conforme o indicador |
| **Metas** | valor-alvo mensal por KPI (moeda em valor cheio, ou taxa como razão 0–1) | plano do cliente | conforme o KPI |

Import por planilha aceita cabeçalhos em português e variações (aliases) — a lista completa por domínio está em `apps/api/app/modules/imports/domains.py` e resumida em [`docs/data-import-export/IMPORT_FORMATS.md`](docs/data-import-export/IMPORT_FORMATS.md). Dado de exemplo determinístico: [`test-data/demo-company/`](test-data/demo-company/README.md).

> Contagens e valores monetários de entrada rejeitam negativo (422) — [RN-017](docs/requirements/business-rules.md#rn-017), corrigido em L-05. Exceções deliberadas: `campaigns.attributed_revenue` (estorno) e `targets.value` (meta de lucro/margem). Alguns campos coletados ainda não influenciam nenhum KPI — ver [L-06](docs/governanca/LACUNAS_ENCONTRADAS.md), [L-07](docs/governanca/LACUNAS_ENCONTRADAS.md).

## 9. Como interpretar

Para cada indicador/gráfico, a leitura correta responde: **o que aconteceu**, **por que importa**, **o que investigar junto**, **que conclusão NÃO tirar só disso**.

- **Mais vendido ≠ maior receita ≠ maior lucro ≠ maior margem** — quatro perguntas diferentes.
- Um KPI vazio ("não aplicável") quase sempre significa **falta de dado de base** para aquele mês, não resultado ruim.
- Variação vs. período anterior mostra correlação temporal, nunca causa.
- Gargalo do funil = a menor taxa de conversão **aplicável** entre etapas consecutivas — é onde perde mais gente proporcionalmente, não em número absoluto.
- Experimento sem `n ≥ 30` por variante ou sem significância (`p ≥ 0,05`): **não declare vencedor** (RN-013).

Glossário da plataforma: tela "Glossário" de cada empresa; fonte em `apps/web/src/domain/metrics/metric-definitions.ts`.

## 10. Relatórios

| Endpoint | Formato | Conteúdo |
|---|---|---|
| `GET /reports/basic?period=` | JSON | 7 KPIs do mês + comparação com baseline (receita/lucro) + marketing do mês (se houver campanha) |
| `GET /reports/basic/pdf?period=` | PDF | 3 seções: KPIs do período, comparação com baseline, marketing do período |
| `GET /reports/executive/pdf?date_from&date_to` | PDF | KPIs executivos + variação, evolução mensal, progresso de metas, marketing, marketing por canal |
| `GET /reports/funnel/pdf?date_from&date_to` | PDF | sumário executivo determinístico, visão das etapas, conversão/abandono, comparação com período anterior, evolução, segmentação por canal, definições |

PDF gerado com **ReportLab** (server-side, wheel puro) — [`docs/reports/PDF_INFRAESTRUTURA.md`](docs/reports/PDF_INFRAESTRUTURA.md). Rodapé em toda página: identificação + "dado exclusivo de {empresa}, não compartilhar".

## 11. Segurança — resumo

- **Senhas:** Argon2, nunca reversível. Política forte (8+ caracteres, 1 maiúscula, 1 especial, 3+ números) aplicada no registro, reset e troca — [`docs/security/POLITICA_DE_SENHAS.md`](docs/security/POLITICA_DE_SENHAS.md).
- **Sessão:** JWT HS256 (access 15 min / refresh 7 d) em cookie `HttpOnly`/`SameSite=Lax`/`Secure` (produção). **Uma sessão ativa por conta** — login em outro dispositivo encerra a anterior — [`docs/security/AUTHENTICATION.md`](docs/security/AUTHENTICATION.md).
- **RBAC:** hierarquia linear `ORGANIZATION_OWNER > ORGANIZATION_ADMIN > ANALYST > VIEWER`; `PLATFORM_ADMIN` é flag global sem membership. Escrita em empresa **congelada** é bloqueada (409). Detalhe e exceções de Super Admin: [`docs/security/ACCESS_CONTROL.md`](docs/security/ACCESS_CONTROL.md).
- **API key:** papel resolvido **ao vivo** pela membership de quem criou a chave; escopo = leitura de 6 endpoints de analytics.
- **Rate limiting:** 18 limiters em 3 dimensões (IP isolado, conta isolada, IP+conta), in-memory / single-replica — [`docs/security/RATE_LIMITING.md`](docs/security/RATE_LIMITING.md).
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `CSP: default-src 'none'; frame-ancestors 'none'`. CORS restrito por ambiente.
- **Auditoria:** append-only por convenção de código (sem trigger no banco — [L-19](docs/governanca/LACUNAS_ENCONTRADAS.md)); 50 identificadores de ação registrados (inclui bloqueios por rate limit).
- Modelo de ameaças, OWASP, LGPD, classificação de dados, resposta a incidente: [`docs/security/`](docs/security/README.md).

## 12. Integrações reais

| Integração | Estado |
|---|---|
| **Cloudinary** | logotipo de empresa; desabilitado (503) sem as 3 env vars |
| **Resend** | e-mail transacional; **sem chave por padrão** → devolve `dev_token` fora de produção |
| **Power BI / Looker Studio** | apenas **pesquisa** ([`docs/analytics/POWER_BI.md`](docs/analytics/POWER_BI.md), [`docs/analytics/LOOKER_STUDIO.md`](docs/analytics/LOOKER_STUDIO.md)) + o mecanismo de API key que expõe leitura de analytics — sem conector/embedding pronto |
| **GA4, Google Ads, Meta Ads, CRM, ERP** | **nenhuma** — dado é digitado ou importado manualmente |

## 13. Como rodar (resumo)

```bash
cp .env.example .env
docker compose up -d db
npm run migrate
npm run seed
docker compose up
```

API em `http://localhost:8000` (`/health`, `/docs`), front em `http://localhost:3000`. Usuário de dev (dado fictício): `demo@consultoria.exemplo` / `TrocarEssaSenha123!`. Comandos, execução sem Docker e variáveis de ambiente: [`README.md`](README.md).

## 14. Limitações conhecidas

- Sem integrações automáticas de dados (§12); tudo entra manual ou por planilha.
- Sem MFA ([`docs/security/MFA.md`](docs/security/MFA.md) é proposta).
- Sem exclusão/exportação self-service de dados pessoais LGPD (só processo manual — RNF-018).
- Rate limiting não sobrevive a múltiplas réplicas (in-memory).
- `/auth/refresh` não rotaciona o refresh token ([L-13](docs/governanca/LACUNAS_ENCONTRADAS.md)).
- `ltv()`, `retention_rate()`, `churn_rate()` existem no motor mas **não são usadas** por nenhuma tela; não há fonte de dado para elas ([L-02](docs/governanca/LACUNAS_ENCONTRADAS.md)).
- Sem MRR / taxa de crescimento ([L-21](docs/governanca/LACUNAS_ENCONTRADAS.md)).
- Performance/carga não instrumentada (Fase 18).
- Lista completa de divergências: [`docs/governanca/LACUNAS_ENCONTRADAS.md`](docs/governanca/LACUNAS_ENCONTRADAS.md).

## 15. Testes e CI

- **Backend:** pytest — `tests/unit` (sem banco), `tests/integration`, `tests/api`, `tests/security` (com Postgres). Teste estrutural parametrizado cobre todo endpoint de escrita org-scoped.
- **Frontend:** Vitest + Testing Library (`apps/web/src/**/*.spec.*`).
- **E2E:** Playwright (`tests/e2e/`, chromium).
- **CI (5 jobs, executados em toda PR):** `backend` (ruff, mypy, migrations, pytest com cobertura reportada, sem limite mínimo), `backend-security` (bandit, pip-audit), `frontend` (eslint, tsc, vitest, `check:i18n`, build), `frontend-security` (npm audit), `e2e`. O merge é condicionado ao resultado **por processo** ([`CONTRIBUTING.md`](CONTRIBUTING.md)); a proteção técnica de branch não está disponível no plano atual do GitHub para repositório privado.
- Estratégia e cobertura: [`docs/testing/strategy.md`](docs/testing/strategy.md) *(números em atualização — ver [L-11](docs/governanca/LACUNAS_ENCONTRADAS.md))*.

## 16. Índice completo da documentação

[`docs/README.md`](docs/README.md) — portal navegável de todos os ~100 documentos, agrupados por área e por público.
