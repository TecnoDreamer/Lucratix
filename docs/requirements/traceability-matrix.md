# Matriz de Rastreabilidade

Relaciona requisito funcional → história de usuário → critério de aceite → critério de sucesso do MVP ([mvp.md](../product/mvp.md)) → tipo de teste esperado.

| RF | User Story | Critério de Aceite | Item do MVP (seção "Critério de sucesso") | Tipo de teste |
|---|---|---|---|---|
| RF-001 | US-01 | [RF-001](acceptance-criteria.md#rf-001--cadastro-de-usuário) | 1. Autenticar | Unitário + API |
| RF-002 | US-02 | [RF-002](acceptance-criteria.md#rf-002--login) | 1. Autenticar | Unitário + API + Segurança |
| RF-003 | US-03 | — (a detalhar) | 1. Autenticar | API |
| RF-004 | US-04 | — (a detalhar) | — | API + Segurança |
| RF-005 | — | — (a detalhar) | — | API |
| RF-006 | — | — (a detalhar) | — | API |
| RF-007 | US-05 | [RF-007/009/010](acceptance-criteria.md#rf-007--rf-009--rf-010--organização-e-isolamento-o-requisito-mais-crítico-do-produto) | 2. Selecionar empresa | Integração + API |
| RF-008 | — | — (a detalhar) | 2. Selecionar empresa | API |
| RF-009 | US-06 | [RF-007/009/010](acceptance-criteria.md#rf-007--rf-009--rf-010--organização-e-isolamento-o-requisito-mais-crítico-do-produto) | 2. Selecionar empresa | Integração (isolamento) |
| RF-010 | US-06 | [RF-007/009/010](acceptance-criteria.md#rf-007--rf-009--rf-010--organização-e-isolamento-o-requisito-mais-crítico-do-produto) | 2. Selecionar empresa | Integração (isolamento) |
| RF-011 | US-07 | — (a detalhar) | — | API |
| RF-012 | US-07 | — (a detalhar) | — | Integração (autorização) |
| RF-013 | US-08 | [RF-013/014](acceptance-criteria.md#rf-013--rf-014--baseline-versionado) | 3. Cadastrar baseline | Unitário + API |
| RF-014 | US-09 | [RF-013/014](acceptance-criteria.md#rf-013--rf-014--baseline-versionado) | 3. Cadastrar baseline | API |
| RF-015 | US-10 | — (a detalhar) | 4. Cadastrar produtos | Unitário + API |
| RF-016 | — | — (a detalhar) | 4. Cadastrar produtos | API |
| RF-017 | US-11 | — (a detalhar) | 5. Informar dados financeiros | Unitário + API |
| RF-018 | US-12 | — (a detalhar) | 6. Registrar campanhas | API |
| RF-019 | US-12 | — (a detalhar) | 6. Registrar campanhas | Unitário + API |
| RF-020 | US-13 | — (a detalhar) | 7. Informar etapas do funil | Unitário + API |
| RF-021 | US-14 | [RF-021](acceptance-criteria.md#rf-021--motor-de-métricas-divisão-por-zero-e-dado-ausente) | 8. Visualizar métricas calculadas | Unitário (crítico) |
| RF-022 | US-15 | [RF-022](acceptance-criteria.md#rf-022--comparação-antes--depois) | 9. Comparar períodos / 10. Comparar baseline × atual | Unitário + API |
| RF-023 | US-14 | — (a detalhar) | 11. Visualizar dashboard | API + E2E |
| RF-024 | US-16 | — (a detalhar) | 12. Criar experimento | API |
| RF-025 | US-17 | [RF-025](acceptance-criteria.md#rf-025--experimento-não-declara-vencedor-automaticamente) | 12. Criar experimento | Unitário |
| RF-026 | US-18 | — (a detalhar) | 13. Gerar relatório básico | API + E2E |
| RF-027 | US-19 | — (a detalhar) | 14. Consultar auditoria | API + Integração (autorização) |

## Notas

- Itens marcados "a detalhar" terão critério de aceite Given/When/Then escrito no momento da implementação da respectiva issue (Definition of Ready, seção 23 do prompt mestre), não é obrigatório esgotar 100% antes da Fase 3.
- RNF-002 (isolamento multi-tenant) é transversal a **todos** os RFs que tocam dado de organização — não está listado linha a linha para não repetir 20 vezes a mesma referência; ver [acceptance-criteria.md](acceptance-criteria.md#rnf-002-transversal--nenhuma-query-sem-filtro-de-organização).
