# Roadmap (alto nível, por fase de execução)

> Roadmap técnico-funcional, alinhado à "Ordem Obrigatória de Execução" do prompt mestre (seção 25). Datas não são estimadas nesta fase — o foco é a sequência de dependências, não prazo.

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | Discovery de ambiente | — |
| 1 | Documentação de produto (este conjunto de documentos) | Fase 0 |
| 2 | Requisitos (RF, RNF, regras, histórias, critérios de aceite, matriz de rastreabilidade) | Fase 1 |
| 3 | Arquitetura, ADRs, modelo de domínio, ER, diagramas, threat model | Fase 2 |
| 4 | Fundação técnica (monorepo, `apps/web`, `apps/api`, Docker Compose) | Fase 3 |
| 5 | Banco de dados (PostgreSQL, SQLAlchemy, Alembic, migrations) | Fase 4 |
| 6 | Autenticação | Fase 5 |
| 7 | Organizações e multi-tenancy (com testes explícitos de isolamento entre empresas) | Fase 6 |
| 8 | Baseline | Fase 7 |
| 9 | Produtos/serviços | Fase 7 |
| 10 | Financeiro | Fase 9 |
| 11 | Marketing (canais, campanhas) | Fase 7 |
| 12 | Funil | Fase 11 |
| 13 | Motor de métricas | Fases 8–12 |
| 14 | Dashboard | Fase 13 |
| 15 | Experimentos/CRO | Fase 13 |
| 16 | Relatórios | Fases 13–15 |
| 17 | Integrações (GA4, Google Ads, Meta Ads etc.) | Modelo manual validado (Fases 8–16) |
| 18 | Hardening (segurança, performance, acessibilidade, observabilidade, backup) | Todas as anteriores |

## Regra de execução

Cada fase é implementada em branch própria, com issues associadas, testes, CI verde e PR revisado — nunca diretamente em `main` (seções 18–24 do prompt mestre). O trabalho avança **uma fase por vez**; a fase seguinte não começa antes da anterior estar documentada e (quando aplicável) testada.
