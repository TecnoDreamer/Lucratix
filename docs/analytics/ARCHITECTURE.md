# Arquitetura — Analytics

> Ver `docs/auditoria/AUDITORIA_BI_RELATORIOS.md` para o levantamento completo (o que os dados atuais sustentam, o que não). Este documento cobre a arquitetura do que foi implementado: visão executiva por intervalo de datas (RF-023) e métricas de campanha/marketing.

## Camadas

```
Analytics UI (apps/web/.../analytics/page.tsx)
     ↓ GET /analytics/executive?date_from=&date_to=
     ↓ GET /analytics/marketing?date_from=&date_to=
API (app/modules/analytics/router.py)
     ↓
Service (app/modules/analytics/service.py, app/modules/analytics/marketing_service.py) — agregação + motor de métricas
     ↓
Repository (financials/repository.py, funnels/repository.py, marketing/repository.py)
     ↓
Banco (financial_periods, funnel_snapshots — granularidade mensal; campaigns — por campanha, com start_date/end_date)
```

Mesma separação já usada no resto do projeto (repository → service → router), sem camada nova. O motor de métricas (`app/modules/metrics/engine.py`) continua sendo a única fonte de verdade para fórmulas — nem o service nem o router reimplementam nenhum cálculo.

## Agregação por intervalo de datas

`financial_periods`/`funnel_snapshots` são mensais (um registro por organização+mês). Para um intervalo de datas arbitrário:

1. `repository.list_*_in_range` busca todos os registros cujo mês cai dentro do intervalo.
2. `service.aggregate_financials`/`aggregate_funnels` somam os campos (`_sum_optional`: ignora ausências, só retorna `None` se **nenhum** mês do intervalo tiver aquele campo — nunca trata mês ausente como zero, RN-003/RN-004).
3. O resultado agregado (`AggregatedFinancials`/`AggregatedFunnel`, dataclasses com os mesmos nomes de campo dos models) alimenta `compute_dashboard_metrics` **sem nenhuma mudança nessa função** — ela já era duck-typed por nome de atributo.

Essa terceira etapa é o motivo de `AggregatedFinancials`/`AggregatedFunnel` existirem: evita duplicar a lógica de cálculo de métricas para "um mês" vs. "um intervalo agregado".

## Comparação período-contra-período

`app/modules/analytics/date_ranges.py::previous_equivalent_range(date_from, date_to)` calcula o intervalo imediatamente anterior de mesma duração em dias (não necessariamente o mês de calendário anterior — ver ADR-0006). O endpoint calcula as métricas do intervalo atual e do intervalo anterior, depois aplica `engine.compare_periods` (já existente, usado também em `/dashboard/compare-to-baseline`) a cada uma das 7 métricas — não é uma comparação nova, é o mesmo mecanismo generalizado para qualquer par de intervalos, não só "baseline × atual".

## Transparência sobre completude de dados

`ExecutiveDashboardRead` inclui `months_in_range`, `months_with_financial_data` e `months_with_funnel_data`. Quando o intervalo selecionado tem meses sem registro algum, a soma reflete só os meses com dado — e a UI mostra um aviso explícito (`Alert tone="warning"`) em vez de apresentar um total parcial como se fosse o período inteiro.

## Métricas de campanha/marketing (ROAS, ROI, CTR, CPC, CPM, CPL, CPA)

`campaigns` é uma tabela por-campanha (não mensal), com `start_date`/`end_date` opcionais e independentes. `GET /analytics/marketing` segue o mesmo padrão do dashboard executivo, com uma repository própria:

1. `marketing/repository.py::list_campaigns_in_range` busca campanhas cujo intervalo `[start_date, end_date]` sobrepõe `[date_from, date_to]`. Uma campanha **sem nenhuma das duas datas** é excluída — não há como saber se rodou no período.
2. `analytics/marketing_service.py::aggregate_campaigns` soma os campos (`AggregatedCampaigns`, mesmo padrão de `_sum_optional` — nunca trata campanha sem dado como zero).
3. `compute_marketing_metrics` chama `engine.roas/roi/ctr/cpc/cpm/cpl/cpa` sobre o agregado — nenhuma fórmula nova, só orquestração. `cpa` usa `customers` como "conversões" (mesmo campo usado pelo CAC do dashboard executivo, para não introduzir um segundo sentido de "conversão" no produto).
4. Mesmo mecanismo de comparação período-contra-período (`previous_equivalent_range` + `compare_periods`) do dashboard executivo.

`CampaignRead.roas`/`.ctr` (usado na tela de Marketing, `/marketing`) foi refatorado para delegar a `engine.roas`/`engine.ctr` em vez de reimplementar a fórmula inline — havia uma duplicação pré-existente que este trabalho corrigiu.

## O que fica de fora (decisão de escopo já confirmada)

Métricas de venda por produto (ex.: margem por SKU, ranking de produtos) continuam fora: não há dado transacional por produto no modelo atual (ver auditoria, seção 3). O que existia como lacuna documentada — ROAS/ROI/CTR/CPC/CPM/CPL/CPA sem endpoint — foi fechado nesta iteração.
