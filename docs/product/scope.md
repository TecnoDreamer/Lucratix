# Escopo

## Escopo do MVP (dentro)

- Autenticação (cadastro, login, logout, recuperação e troca de senha, perfil).
- Organizações e multi-tenancy (`User`, `Organization`, `Membership`, `Role`, `Permission`), com papéis `PLATFORM_ADMIN`, `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `ANALYST`, `VIEWER`.
- Cadastro de empresa/cliente com dados básicos (nome, segmento, CNPJ opcional, tamanho, site, data de início do acompanhamento, moeda, timezone, metas, observações).
- Baseline versionado e histórico (nunca sobrescrito silenciosamente).
- Produtos/serviços com preço, custo, margem, ativo/inativo.
- Financeiro por período (receita, custos, despesas, investimento em marketing, impostos quando usado, margem, lucro).
- Marketing: canais e campanhas (investimento, impressões, cliques, leads, oportunidades, clientes, receita atribuída).
- Funil (impressões → visitas → leads → MQL → SQL → oportunidades → clientes → recompras).
- Motor central de métricas (receita, lucro, margem, CAC, ROAS, ROI, LTV, conversão, ticket médio, CPL, CPA, CTR, CPC, CPM, retenção, churn, recorrência), com fórmula, unidade e tratamento explícito de dado ausente/zero/não aplicável documentados em [metrics-catalog.md](../analytics/metrics-catalog.md).
- Comparação antes × depois (baseline, período anterior, mesmo período do ano anterior quando houver histórico, início do acompanhamento).
- Dashboard executivo por empresa.
- Experimentos/CRO (hipótese, variantes, métricas, resultado, status), sem declarar vencedor apenas por diferença percentual simples.
- Relatório básico exportável.
- Auditoria (quem fez o quê, quando) conforme permissão.
- API REST versionada (`/api/v1`) com OpenAPI.
- Segurança: RBAC, isolamento multi-tenant, proteção OWASP Top 10, trilha de auditoria, LGPD básica.

## Fora de escopo do MVP

Ver [out-of-scope.md](out-of-scope.md).

## Critério de sucesso do MVP

Ver seção "Critério de Sucesso" em [mvp.md](mvp.md), derivada diretamente da seção 34 do prompt mestre.
