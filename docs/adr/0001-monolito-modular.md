# ADR-0001 — Monólito modular em vez de microserviços

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

O produto começa com um único cliente real (a consultoria do usuário), volume de dados baixo e escopo de MVP focado em qualidade de dado e segurança, não em quantidade de funcionalidades ([mvp.md](../product/mvp.md)).

## Decisão

Implementar um monólito modular: um único serviço FastAPI, organizado em módulos de domínio com fronteiras internas claras (`auth`, `organizations`, `financials`, `metrics` etc., ver [architecture/overview.md](../architecture/overview.md)), e um front-end Next.js separado.

## Alternativas consideradas

- **Microserviços por domínio** — permitiria escalar times/domínios de forma independente, mas adiciona custo operacional (deploy distribuído, observabilidade entre serviços, contratos de API internos) sem benefício real neste estágio.
- **Monólito não modular** — mais rápido no curtíssimo prazo, mas dificulta manutenção e testabilidade à medida que o domínio cresce (funil, métricas, experimentos etc.).

## Consequências

- Deploy único simplifica CI/CD e ambiente de desenvolvimento (Docker Compose com poucos serviços).
- Fronteiras de módulo bem definidas preservam a opção de extrair um módulo para serviço próprio no futuro, se necessário (ex.: `metrics` como serviço de cálculo pesado).
- Exige disciplina para não deixar módulos se acoplarem indevidamente (revisão de PR deve observar isso).
