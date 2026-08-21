# Marketing Analytics, Growth & BI Platform

Plataforma de Marketing Analytics, Growth, CRO e Business Intelligence para consultorias e profissionais de marketing acompanharem, de forma isolada e segura, os dados de cada empresa/cliente atendido — conectando investimento em marketing a resultado financeiro real (faturamento, lucro, margem, CAC, LTV, ROAS, conversão), com baseline histórico e comparação antes × depois.

> **Status atual: Fase 1 concluída (Documentação de Produto).** Ainda não há código de aplicação neste repositório — ver [docs/product/roadmap.md](docs/product/roadmap.md) para a sequência de fases.

## Por que este projeto existe

Ver [docs/product/vision.md](docs/product/vision.md) e [docs/product/problem.md](docs/product/problem.md).

## Documentação

- **Produto:** [docs/product/](docs/product/) — visão, problema, proposta de valor, personas, stakeholders, jornada, escopo, MVP, roadmap, riscos, hipóteses.
- **Ambiente:** [docs/environment.md](docs/environment.md) — ferramentas verificadas na máquina de desenvolvimento.
- **Requisitos:** [docs/requirements/](docs/requirements/) *(Fase 2 — a produzir)*.
- **Arquitetura e ADRs:** [docs/architecture/](docs/architecture/), [docs/adr/](docs/adr/) *(Fase 3 — a produzir)*.
- **Diagramas:** [docs/diagrams/](docs/diagrams/) *(Fase 3 — a produzir)*.
- **Segurança:** [docs/security/](docs/security/) *(Fase 3 — a produzir)*.
- **Analytics / catálogo de métricas:** [docs/analytics/](docs/analytics/) *(Fase 13 — a produzir)*.

## Stack planejada

- **Front-end:** Next.js, TypeScript, React, Tailwind CSS, React Hook Form, Zod.
- **Back-end:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL.
- **Infraestrutura:** Docker, Docker Compose, GitHub Actions.

Ver justificativa e trade-offs em [docs/adr/](docs/adr/) assim que a Fase 3 (Arquitetura) for produzida.

## Como este projeto é conduzido

O projeto é executado por fases incrementais e rastreáveis (documentação → requisitos → arquitetura → fundação técnica → banco → autenticação → multi-tenancy → ... → hardening), cada uma em branch própria, com testes, CI e revisão antes de merge em `main`. Ver [docs/product/roadmap.md](docs/product/roadmap.md).

## Como rodar (ainda não aplicável)

Este projeto ainda não possui código de aplicação. Assim que a Fase 4 (Fundação técnica) estiver concluída, este README será atualizado com os comandos de setup (`cp .env.example .env`, `docker compose up -d`, migrate, seed, run, test, lint, typecheck, security, e2e).

## Licença

Nenhuma licença jurídica foi definida ainda. Não será escolhida sem indicação explícita do responsável pelo projeto.
