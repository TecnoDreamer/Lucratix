# ADR-0002 — Stack tecnológica (Next.js + TypeScript / FastAPI + Python / PostgreSQL)

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

O prompt mestre do produto especifica preferência explícita por esta stack (seção 3), com Python reservado para cálculo de métricas, análise estatística, transformação de dados e futuras rotinas de Machine Learning.

## Decisão

- **Front-end:** Next.js, TypeScript, React, Tailwind CSS, React Hook Form, Zod, ESLint, Prettier.
- **Back-end:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, psycopg, pytest, Ruff, mypy/pyright, Bandit, pip-audit.
- **Dados:** PostgreSQL como armazenamento primário; Pandas/Polars quando necessário para transformação/análise; camada explícita de métricas em Python (módulo `metrics`).

## Alternativas consideradas

- **Back-end em Node/TypeScript (stack única):** reduziria a troca de linguagem entre front e back, mas o prompt mestre exige explicitamente Python para a camada analítica, e Python tem ecossistema mais maduro para estatística/ML futuro (pandas, scipy, statsmodels).
- **ORM alternativo (Prisma, Tortoise):** SQLAlchemy + Alembic foi escolhido por ser o padrão de fato do ecossistema Python/FastAPI, com controle fino de migration.

## Consequências

- Dois runtimes (Node para o front, Python para o back) — Docker Compose isola cada um; CI roda dois pipelines (`backend-ci`, `frontend-ci`).
- Contrato entre front e back é a API REST versionada (`/api/v1`) documentada via OpenAPI — não há acoplamento de tipo em tempo de build entre TypeScript e Python neste momento (poderia ser adicionado depois via geração de client a partir do OpenAPI, não obrigatório no MVP).
