# Estratégia de Testes

Ver também [security-testing.md](../security/security-testing.md) (casos específicos de segurança).

## Pirâmide de testes deste projeto

```text
tests/
├── unit/          Python, sem banco. Motor de métricas (RN-003/RN-004),
│                  analise de experimentos (RN-013), hash/JWT/rate limit,
│                  hierarquia de papeis. 78 testes, 100% independentes de
│                  infraestrutura — rodam em qualquer ambiente, sem Docker.
├── integration/   Python + Postgres real. Isolamento multi-tenant
│                  (RNF-002) — o requisito mais critico do produto.
├── api/           Python + Postgres real, via FastAPI TestClient. Fluxo
│                  completo de cada modulo (auth, baseline, produtos,
│                  financeiro, marketing, funil, experimentos, reset de
│                  senha).
├── security/      Python + Postgres real. RBAC, cookies, payload
│                  invalido, rate limiting.
└── e2e/           TypeScript + Playwright, contra o stack completo
                   (Postgres + API + front-end, sem mocks). Cadastro/
                   login/logout, criacao de empresa e isolamento entre
                   usuarios, baseline, dashboard.
```

## Onde cada tipo roda

| Camada | Precisa de Postgres? | Pipeline CI |
|---|---|---|
| `tests/unit` | Não | `backend-ci` |
| `tests/integration`, `tests/api`, `tests/security` | Sim (serviço no job) | `backend-ci` |
| `tests/e2e` | Sim (API + front-end completos) | `e2e-ci` |

## Por que a divisão unit vs. o resto

A lógica com maior densidade de regra de negócio crítica (motor de métricas, análise de experimentos, hash de senha/token, RBAC hierárquico) foi deliberadamente implementada como **funções puras**, sem SQLAlchemy nem FastAPI (ver `app/modules/metrics/engine.py`, `app/modules/experiments/analysis.py`). Isso permite cobertura de 100% dessa lógica com testes que rodam em milissegundos, sem depender de infraestrutura — inclusive em ambientes onde Postgres/Docker não está disponível (ver [environment.md](../environment.md) para um caso real desta limitação).

## Cobertura atual (2026-08-21)

- **Unit:** 78 testes, 100% passando, sem dependência de banco.
- **Integration/API/Security:** implementados e verificados com Postgres real via GitHub Actions CI (não neste ambiente local — Docker Desktop indisponível).
- **E2E:** 8 cenários Playwright, orquestração de Postgres + API + front-end via `e2e-ci.yml`.

## O que não está coberto ainda

- Testes de carga/performance (explicitamente adiado, seção 15 do prompt mestre: "não otimizar prematuramente").
- Cobertura completa de todos os fluxos de erro de todo endpoint (foco foi nos casos críticos de segurança e integridade de dado).
