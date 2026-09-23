# Catálogo de Métricas

Toda métrica abaixo segue o mesmo contrato (RN-003, RN-004, RNF-011, RNF-012): quando o dado necessário está ausente ou o denominador é zero, o resultado é `is_applicable = false` com um motivo explícito — nunca `0` silencioso, nunca exceção não tratada. Implementação de referência: `MetricsService` (Fase 13), ver [sequence diagrams](../diagrams/sequence/metrics-calculation.md).

## Receita

- **Definição:** valor total faturado pela empresa no período.
- **Fórmula:** `revenue` (informado diretamente em `financial_periods`).
- **Unidade:** moeda da organização (`organizations.currency`).
- **Não aplicável quando:** não há `financial_periods` para o período.

## Lucro

- **Fórmula:** `revenue - costs - expenses - taxes`.
- **Unidade:** moeda.
- **Não aplicável quando:** `financial_periods` do período ausente.

## Margem

- **Fórmula:** `lucro / revenue`.
- **Unidade:** percentual.
- **Não aplicável quando:** `revenue` ausente ou igual a zero (divisão por zero — RN-003).

## CAC (Custo de Aquisição de Cliente)

- **Fórmula:** `marketing_investment / novos_clientes`.
- **Campos usados:** `financial_periods.marketing_investment`, contagem de novos clientes no período (via `funnel_snapshots.customers` ou soma de `campaigns.customers`, a decidir em ADR na Fase 13).
- **Unidade:** moeda por cliente.
- **Não aplicável quando:** investimento ausente OU novos clientes ausente OU novos clientes = 0.

## ROAS (Return on Ad Spend)

- **Fórmula:** `receita_atribuida / investimento`.
- **Campos usados:** `campaigns.attributed_revenue` (soma do período), `financial_periods.marketing_investment` ou soma de `campaigns.investment`.
- **Unidade:** razão (ex.: 4.0 = R$4 de retorno por R$1 investido).
- **Não aplicável quando:** investimento ausente ou igual a zero.

## ROI (Return on Investment)

- **Fórmula:** `(receita_atribuida - investimento) / investimento`.
- **Unidade:** percentual.
- **Não aplicável quando:** investimento ausente ou igual a zero.

## LTV (Lifetime Value)

- **Status: calculável no motor, ainda sem tela nem entrada de dado.** `engine.py::ltv` existe e é testado isoladamente, mas nenhuma rota/tela o chama — o produto não tem de onde vir `frequencia_de_compra`/`tempo_de_retencao` (exigiria um modelo de vendas/clientes individual, que não existe hoje). Decisão registrada em `docs/product/out-of-scope.md` (achado L-02 de `docs/governanca/LACUNAS_ENCONTRADAS.md`).
- **Fórmula (versão inicial, simplificada):** `ticket_medio * frequencia_de_compra_estimada * tempo_de_retencao_estimado`.
- **Unidade:** moeda.
- **Não aplicável quando:** qualquer um dos três fatores está ausente. Modelo mais sofisticado (LTV preditivo) é explicitamente fora de escopo do MVP (ver [out-of-scope.md](../product/out-of-scope.md)).

## Taxa de Conversão

- **Fórmula:** `clientes / etapa_anterior_do_funil` (ex.: `clientes / leads`, configurável conforme as duas etapas comparadas).
- **Unidade:** percentual.
- **Não aplicável quando:** etapa anterior ausente ou igual a zero.

## Ticket Médio

- **Fórmula:** `revenue / numero_de_clientes_ou_vendas`.
- **Unidade:** moeda.
- **Não aplicável quando:** número de clientes/vendas ausente ou igual a zero.

## CPL (Custo por Lead)

- **Fórmula:** `investimento / leads`.
- **Não aplicável quando:** leads ausente ou igual a zero.

## CPA (Custo por Aquisição)

- **Fórmula:** `investimento / conversoes` (conversão definida por contexto — lead, oportunidade ou cliente, conforme o RF/tela que a solicita).
- **Não aplicável quando:** conversões ausente ou igual a zero.

## CTR (Click-Through Rate)

- **Fórmula:** `cliques / impressoes`.
- **Unidade:** percentual.
- **Não aplicável quando:** impressões ausente ou igual a zero.

## CPC (Custo por Clique)

- **Fórmula:** `investimento / cliques`.
- **Não aplicável quando:** cliques ausente ou igual a zero.

## CPM (Custo por Mil Impressões)

- **Fórmula:** `(investimento / impressoes) * 1000`.
- **Não aplicável quando:** impressões ausente ou igual a zero.

## Retenção

- **Status: calculável no motor, ainda sem tela nem entrada de dado.** `engine.py::retention_rate` existe e é testado isoladamente, mas nenhuma rota/tela o chama — não há de onde vir "clientes ativos no início/fim do período" (mesma raiz do LTV: exigiria identidade de cliente individual, que o produto não modela hoje, só contagens agregadas por mês). Decisão registrada em `docs/product/out-of-scope.md` (achado L-02 de `docs/governanca/LACUNAS_ENCONTRADAS.md`).
- **Fórmula:** `clientes_ativos_fim_periodo / clientes_ativos_inicio_periodo`.
- **Unidade:** percentual.
- **Não aplicável quando:** dado de clientes ativos no início do período ausente ou igual a zero.

## Churn

- **Status: mesmo caso de Retenção** (`engine.py::churn_rate` deriva de `retention_rate` — calculável, sem tela nem dado de origem).
- **Fórmula:** `1 - retenção` (ou `clientes_perdidos / clientes_ativos_inicio_periodo`).
- **Unidade:** percentual.
- **Não aplicável quando:** mesma condição de Retenção.

## MRR e taxa de crescimento mensal

- **Status: fora de escopo por ora — nenhum código, campo ou rota existe hoje**, nem como órfão. Decisão registrada em `docs/product/out-of-scope.md` (achado L-21 de `docs/governanca/LACUNAS_ENCONTRADAS.md`).

## Recorrência

- **Fórmula:** `clientes_recorrentes / clientes_totais_do_periodo` (fonte: `funnel_snapshots.repeat_purchases` sobre `funnel_snapshots.customers`).
- **Unidade:** percentual.
- **Não aplicável quando:** `funnel_snapshots` do período ausente ou `customers = 0`.

## Versionamento

Cada métrica corresponde a um `MetricDefinition.key` com `version` incremental (ver [domain-model.md](../architecture/domain-model.md)). Alterar a fórmula de uma métrica cria uma **nova versão**, nunca sobrescreve a anterior — `MetricSnapshot` preserva qual versão gerou cada número histórico (lineage, seção 29 do prompt mestre).
