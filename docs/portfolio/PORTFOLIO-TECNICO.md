# Lucratix — Versão técnica

> Para CTOs, recrutadores técnicos e desenvolvedores. Números de 2026-09-18 (método na [matriz §2](01-MATRIZ-DE-MATURIDADE.md)). Visão de produto: [`PORTFOLIO-LUCRATIX.md`](PORTFOLIO-LUCRATIX.md).

## 1. Resumo

Monólito modular multi-tenant: **FastAPI (Python 3.12) + PostgreSQL 16** no backend, **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind** no frontend. 20 módulos de API, 21 tabelas, 19 migrations, 26 telas, 3 idiomas. Conduzido por uma pessoa, com fluxo de PR, CI de 5 jobs e documentação de decisões, em ~4 semanas (155 commits, ~80 PRs). Desenvolvimento **assistido por IA** (Claude Code, da Anthropic), registrado nos trailers `Co-Authored-By` do histórico do Git; o autor define produto e escopo, toma as decisões, revisa e aprova cada PR.

## 2. Organização do código

```
apps/api/app/
  core/       deps (autorização), sessions, security, rate_limit, audit, formatting
  models/     21 modelos SQLAlchemy
  schemas/    contratos Pydantic de entrada/saída
  modules/    20 módulos de domínio (router.py + repository.py; service.py onde há regra)
    metrics/  engine.py — fórmulas puras, sem ORM nem HTTP
apps/web/src/
  app/        rotas (App Router)      components/  UI compartilhada + gráficos
  domain/     definições de métricas  lib/ hooks/ contexts/ i18n/
tests/        unit · integration · api · security · e2e (Playwright)
docs/         ADRs, requisitos, segurança, analytics, governança, portfólio
```

## 3. Decisões de arquitetura (com trade-off)

| Decisão | Por quê | Custo aceito | Registro |
|---|---|---|---|
| Monólito modular | Um deploy, transação única, complexidade proporcional ao porte | Sem escala independente por módulo | ADR-0001 |
| Esquema compartilhado + `organization_id` | Operação simples com um banco | Isolamento depende de disciplina — mitigado por dependência central e teste estrutural | ADR-0003 |
| Access/refresh JWT em cookie `HttpOnly` + proxy same-origin | Reduz exposição a XSS | Depende do rewrite `/api/*` | ADR-0004 |
| Baseline e auditoria append-only | Histórico confiável | Garantido por convenção de código, **não** por trigger (L-19) | ADR-0005 |
| Empresa congelada, nunca deletada | Preserva histórico | Estado extra nas escritas (409) | ADR-0008 |
| i18n por cookie + coluna, sem prefixo de URL | URLs estáveis | Sem SEO por idioma | ADR-0009 |
| PDF server-side com ReportLab | Independente do navegador, sem libs nativas | Layout mantido em código | `PDF_INFRAESTRUTURA.md` |
| SVG artesanal (Analytics) + Recharts (Funil) | Controle onde bastava | Duas abordagens coexistindo | `CHART_DECISIONS.md` |

## 4. Multi-tenancy e autorização

Ponto único: `core/deps.py::get_organization_context`. Cadeia por requisição: **401** (sessão inválida/revogada) → **404** (não-membro ou empresa inexistente — não revela existência) → **409** (escrita em empresa congelada) → **403** (papel insuficiente). Papéis lineares `OWNER > ADMIN > ANALYST > VIEWER`; `PLATFORM_ADMIN` é flag global e não toca dado de negócio. Chaves de API resolvem o papel **ao vivo** pela membership de quem as criou. Um **teste estrutural parametrizado** percorre todo endpoint de escrita org-scoped. Diagrama: [`DIAGRAMAS.md` §3](DIAGRAMAS.md).

## 5. Motor de métricas

`modules/metrics/engine.py` é puro (sem SQLAlchemy/FastAPI). Contrato: `MetricResult{value, is_applicable, reason}`; **nunca** divide por zero, **nunca** converte ausência em `0`. Razões guardadas em 0–1, multiplicadas por 100 só na renderização. 72 testes unitários dedicados. Os schemas de saída delegam a esse motor (`engine.profit`, `engine.margin`, `engine.roas`…) para manter **uma fonte única** de cada fórmula — um caso de duplicação foi encontrado na auditoria e corrigido (L-04, PR #131).

## 6. Segurança de aplicação

Argon2 · JWT HS256 (access 15 min, refresh 7 dias) em cookies `HttpOnly`/`SameSite=Lax`/`Secure` · **sessão única** por conta com índice único parcial no banco · 18 rate limiters em 3 dimensões (IP, conta, combinada) · cabeçalhos `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP restritiva na API · validação de faixa em entradas numéricas (RN-017) · 50 identificadores de ação de auditoria.
Limites assumidos: rate limit **em memória** (réplica única); refresh **sem rotação** (L-13); **sem MFA** (proposta em `MFA.md`); **sem trigger** que imponha append-only.

## 7. Dados e migrations

Alembic linear (`0001`…`0019`), aplicado do zero em CI. Importação: parse único, linhas cruas em JSONB (`import_jobs.raw_rows`), mapeamento com aliases, preview, confirmação com política de duplicados; 5 MB / 2.000 linhas; síncrono. Enums PG para 5 domínios; `import_jobs.status` é `String(30)` por decisão a documentar (L-14).

## 8. Qualidade

| | |
|---|---|
| Backend | **736 testes** (`unit`, `integration`, `api`, `security`); última execução completa 730 ✓ / 0 falhas + 6 novos verdes em CI |
| Frontend | **513 testes** Vitest + Testing Library, 70 arquivos, 0 falhas |
| E2E | **56 testes**, Playwright (chromium), 20 arquivos — inclui abuso de login, sessão única, isolamento entre empresas |
| Estático | `ruff`, `mypy`, `eslint`, `tsc` |
| Segurança em CI | `bandit`, `pip-audit`, `npm audit --omit=dev` |
| i18n | `check:i18n` falha o CI se faltar chave em algum idioma (773 chaves) |

**Não medido:** cobertura percentual (CI reporta, sem limite), Lighthouse/axe, carga.

## 9. CI/CD e processo

4 workflows / 5 jobs em toda PR: `backend`, `backend-security`, `frontend`, `frontend-security`, `e2e`. Conventional Commits, branch por assunto, template de PR, squash-merge. Merge condicionado **por processo** (proteção de branch indisponível no plano atual do GitHub). Ver [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## 10. Episódios que mostram o método

- **Advisory crítico (RCE) no Next.js**, detectado pelo `frontend-security` em 2026-09-10: correção em PR única (`next 16.3.4`, override de `sharp`), auditoria de produção limpa. *(#130)*
- **Auditoria de documentação:** 21 lacunas classificadas por severidade; 4 já corrigidas — homônimo de regra (RN-013 → RN-016), fórmula duplicada, validação de faixa (RN-017) e gate de i18n. *(#129, #131, #132, #133)*
- **Autocorreção:** ao preparar este portfólio, um número anterior ("469 testes de frontend") foi refeito e corrigido para 513 depois de perceber que 3 arquivos não tinham rodado. *(#135)*

## 11. Dívida técnica conhecida

L-02 código órfão de LTV/churn · L-06 coluna `opportunities` sem uso · L-07 seis colunas de baseline nunca lidas · L-08 `experiment.status` preso em `draft` · L-13 refresh sem rotação · L-19 append-only só por convenção · sem observabilidade estruturada · sem tela de equipe para admin de empresa. Lista completa: [`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md).

## 12. O que faria a seguir (se fosse produção)

1. Validar o problema com consultorias reais antes de qualquer integração.
2. Observabilidade (logs estruturados, métricas, rastreio de erro) e limites de rate distribuídos.
3. Auditoria de acessibilidade (axe/Lighthouse) e medição de desempenho.
4. Rotação de refresh token e MFA para papéis privilegiados.
5. Trigger/`REVOKE` para tornar append-only garantido pelo banco.
