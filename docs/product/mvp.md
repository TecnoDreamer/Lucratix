# MVP

## Definição

O MVP prioriza **qualidade dos dados, segurança, rastreabilidade e métricas corretas**, não quantidade de funcionalidades (seção 1 do prompt mestre). Ver [scope.md](scope.md) para a lista completa de funcionalidades dentro do MVP.

## Critério de sucesso técnico do MVP

O MVP é considerado tecnicamente bem-sucedido quando um usuário autorizado consegue:

1. Autenticar. ✅
2. Selecionar uma empresa. ✅
3. Cadastrar baseline. ✅
4. Cadastrar produtos. ✅
5. Informar dados financeiros. ✅
6. Registrar campanhas. ✅
7. Informar etapas do funil. ✅
8. Visualizar métricas calculadas. ✅
9. Comparar períodos. ✅ (comparação vs. baseline; comparação vs. período anterior arbitrário ainda não tem endpoint dedicado)
10. Comparar baseline × atual. ✅
11. Visualizar dashboard. ✅
12. Criar um experimento. ✅
13. Gerar relatório básico. ✅
14. Consultar auditoria conforme permissão. ✅

**Status (2026-08-21): todos os 14 itens têm API e tela correspondentes**, implementados e com testes automatizados. Ver PRs #1–#28 no GitHub. Testes de integração/API/segurança foram validados no CI do GitHub (Postgres real) — não neste ambiente local (Docker Desktop indisponível, ver [environment.md](../environment.md)).

E quando, adicionalmente:

- Dados ficam isolados entre empresas (multi-tenancy comprovado por teste automatizado). ✅ `tests/integration/test_multi_tenant_isolation.py`, verde em CI.
- Testes críticos passam. ✅ 104+ testes de back-end verdes em CI (unit + integration + api + security).
- CI está verde. ✅ backend-ci, frontend-ci, security-ci, e2e-ci configurados e passando.
- Migrations funcionam (aplicam e, quando possível, revertem). ✅ Validado em CI (Postgres efêmero); todas têm `downgrade()`.
- Documentação está atualizada. ✅
- Nenhuma vulnerabilidade crítica conhecida permanece sem tratamento/documentação. ✅ Bandit e pip-audit/npm audit sem achados médios/altos; limitações conhecidas (revogação de refresh token, LGPD self-service, rate limit não distribuído) documentadas e rastreadas em issues.

## Fora do MVP

Ver [out-of-scope.md](out-of-scope.md).

## Rastreabilidade

Cada um dos 14 itens acima será associado a requisitos funcionais (RF-xxx) e critérios de aceite Given/When/Then em [traceability-matrix.md](../requirements/traceability-matrix.md), a ser produzido na Fase 2.
