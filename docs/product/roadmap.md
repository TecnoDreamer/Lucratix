# Roadmap (alto nível, por fase de execução)

> Roadmap técnico-funcional, alinhado à "Ordem Obrigatória de Execução" do prompt mestre (seção 25). Datas não são estimadas nesta fase — o foco é a sequência de dependências, não prazo.

| Fase | Entrega | Depende de | Status |
|---|---|---|---|
| 0 | Discovery de ambiente | — | ✅ Concluída |
| 1 | Documentação de produto (este conjunto de documentos) | Fase 0 | ✅ Concluída |
| 2 | Requisitos (RF, RNF, regras, histórias, critérios de aceite, matriz de rastreabilidade) | Fase 1 | ✅ Concluída |
| 3 | Arquitetura, ADRs, modelo de domínio, ER, diagramas, threat model | Fase 2 | ✅ Concluída |
| 4 | Fundação técnica (monorepo, `apps/web`, `apps/api`, Docker Compose) | Fase 3 | ✅ Concluída |
| 5 | Banco de dados (PostgreSQL, SQLAlchemy, Alembic, migrations) | Fase 4 | ✅ Concluída (migrations escritas à mão; não validadas contra Postgres real nesta sessão — ver [environment.md](../environment.md)) |
| 6 | Autenticação | Fase 5 | ✅ Concluída |
| 7 | Organizações e multi-tenancy (com testes explícitos de isolamento entre empresas) | Fase 6 | ✅ Concluída (testes escritos; execução contra Postgres pendente) |
| 8 | Baseline | Fase 7 | ✅ Concluída |
| 9 | Produtos/serviços | Fase 7 | ✅ Concluída |
| 10 | Financeiro | Fase 9 | ✅ Concluída |
| 11 | Marketing (canais, campanhas) | Fase 7 | ✅ Concluída |
| 12 | Funil | Fase 11 | ✅ Concluída |
| 13 | Motor de métricas | Fases 8–12 | ✅ Concluída (100% de cobertura de teste unitário, sem dependência de banco) |
| 14 | Dashboard | Fase 13 | ✅ Concluída (API + tela inicial no front-end) |
| 15 | Experimentos/CRO | Fase 13 | ✅ Concluída |
| 16 | Relatórios | Fases 13–15 | ✅ Concluída (relatório básico) |
| 17 | Integrações (GA4, Google Ads, Meta Ads etc.) | Modelo manual validado (Fases 8–16) | ⏳ Não iniciada (fora de escopo até o modelo manual ser validado em uso real) |
| 18 | Hardening (segurança, performance, acessibilidade, observabilidade, backup) | Todas as anteriores | ⏳ Não iniciada |

**Pendência transversal a todas as fases 5–16:** os testes de integração/API/segurança que dependem de PostgreSQL não puderam ser executados nesta sessão porque o Docker Desktop não respondeu (diagnóstico: o backend WSL2 `docker-desktop` nunca saiu do estado `Stopped`, apesar do processo estar em execução — ver [environment.md](../environment.md)). O código foi validado com tudo que não depende de banco: lint, type checking estrito, SAST, dependency audit e testes unitários. Rodar `docker compose up -d db && pytest` assim que o Docker estiver disponível é o próximo passo antes de qualquer merge para `main`.

## Regra de execução

Cada fase é implementada em branch própria, com issues associadas, testes, CI verde e PR revisado — nunca diretamente em `main` (seções 18–24 do prompt mestre). O trabalho avança **uma fase por vez**; a fase seguinte não começa antes da anterior estar documentada e (quando aplicável) testada.
