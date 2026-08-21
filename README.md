# Marketing Analytics, Growth & BI Platform

Plataforma de Marketing Analytics, Growth, CRO e Business Intelligence para consultorias e profissionais de marketing acompanharem, de forma isolada e segura, os dados de cada empresa/cliente atendido — conectando investimento em marketing a resultado financeiro real (faturamento, lucro, margem, CAC, LTV, ROAS, conversão), com baseline histórico e comparação antes × depois.

> **Status atual: fundação técnica, banco de dados, autenticação e multi-tenancy implementados (Fases 4–7).** API FastAPI funcional com cadastro/login/logout, organizações, memberships/RBAC e trilha de auditoria, com isolamento multi-tenant validado por testes automatizados. Front-end Next.js escafoldado, telas de negócio ainda pendentes. Ver [docs/product/roadmap.md](docs/product/roadmap.md).

## Por que este projeto existe

Ver [docs/product/vision.md](docs/product/vision.md) e [docs/product/problem.md](docs/product/problem.md).

## Documentação

- **Produto:** [docs/product/](docs/product/) — visão, problema, proposta de valor, personas, stakeholders, jornada, escopo, MVP, roadmap, riscos, hipóteses.
- **Ambiente:** [docs/environment.md](docs/environment.md) — ferramentas verificadas na máquina de desenvolvimento.
- **Requisitos:** [docs/requirements/](docs/requirements/) — RF, RNF, regras de negócio, histórias, critérios de aceite, matriz de rastreabilidade.
- **Arquitetura e ADRs:** [docs/architecture/](docs/architecture/), [docs/adr/](docs/adr/).
- **Diagramas:** [docs/diagrams/](docs/diagrams/) (casos de uso, classes, ER, sequência — Mermaid).
- **Segurança:** [docs/security/](docs/security/) — threat model, requisitos OWASP, classificação de dados, LGPD, resposta a incidentes, testes de segurança.
- **Analytics / catálogo de métricas:** [docs/analytics/metrics-catalog.md](docs/analytics/metrics-catalog.md).

## Stack

- **Front-end:** Next.js, TypeScript, React, Tailwind CSS (`apps/web`).
- **Back-end:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL (`apps/api`).
- **Infraestrutura:** Docker, Docker Compose, GitHub Actions.

Ver justificativa e trade-offs em [docs/adr/](docs/adr/), em especial [ADR-0002](docs/adr/0002-stack-tecnologica.md) (stack), [ADR-0003](docs/adr/0003-estrategia-multi-tenancy.md) (multi-tenancy) e [ADR-0004](docs/adr/0004-estrategia-autenticacao.md) (autenticação).

## Como este projeto é conduzido

O projeto é executado por fases incrementais e rastreáveis (documentação → requisitos → arquitetura → fundação técnica → banco → autenticação → multi-tenancy → ... → hardening), cada uma em branch própria, com testes, CI e revisão antes de merge em `main`. Ver [docs/product/roadmap.md](docs/product/roadmap.md).

## Como rodar

```bash
cp .env.example .env
docker compose up -d db
npm run migrate
npm run seed
docker compose up
```

A API sobe em `http://localhost:8000` (`/health` para checagem, `/docs` para OpenAPI). O front-end sobe em `http://localhost:3000`.

Usuário de desenvolvimento criado pelo seed (dado fictício, ver `apps/api/app/seed.py`): `demo@consultoria.exemplo` / `TrocarEssaSenha123!`.

### Comandos úteis (`package.json` na raiz — task runner, ver seção 33 do prompt mestre)

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe todo o stack via Docker Compose |
| `npm run migrate` | Aplica migrations do banco (Alembic) |
| `npm run migrate:new -- "mensagem"` | Cria uma nova migration |
| `npm run seed` | Popula dados de desenvolvimento fictícios |
| `npm test` | Roda testes de back-end e front-end |
| `npm run lint` | Lint de back-end (Ruff) e front-end (ESLint) |
| `npm run typecheck` | Type checking de back-end (mypy) e front-end (tsc) |
| `npm run security` | Bandit + pip-audit (back-end) e `npm audit` (front-end) |

### Rodando o back-end sem Docker (desenvolvimento local)

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"
.venv/Scripts/uvicorn app.main:app --reload
```

Os testes de integração/API/segurança exigem um PostgreSQL acessível (local ou via `docker compose up -d db`); os testes unitários (`tests/unit`) não precisam de banco.

```bash
pytest                      # roda tudo (a partir da raiz do repo)
pytest tests/unit           # so unitarios, sem banco
```

## Licença

Nenhuma licença jurídica foi definida ainda. Não será escolhida sem indicação explícita do responsável pelo projeto.
