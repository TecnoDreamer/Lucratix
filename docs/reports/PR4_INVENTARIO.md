# PR4 — Inventário e adoção do padrão de gráfico/PDF nas demais telas

`docs/funnel/README.md` registrava a PR4 como a rodada final do Funil Multicanal: "inventário e adoção do padrão de gráfico/PDF nas demais telas (Dashboard, Analytics, Produtos, Financeiro, Marketing, Experimentos, Relatório, Central de Dados, Auditoria)". Nenhum documento anterior priorizava as telas — a própria PR3 (`docs/reports/PDF_INFRAESTRUTURA.md`) delegava esse julgamento a esta rodada.

Este documento registra a decisão tela a tela, para não precisar re-auditar do zero numa rodada futura.

## Decisão por tela

| Tela | Decisão | Por quê |
|---|---|---|
| **Relatório** (RF-026) | ✅ Adotado — PDF | `GET /reports/basic` já era composição pura sobre módulos existentes (financials/funnels/`compute_dashboard_metrics`/baseline); só faltava o mesmo tratamento de PDF server-side da PR3. Hoje só tinha `window.print()` (mantido — ver "Decisões de implementação" abaixo). |
| **Dashboard** | ✅ Adotado — PDF (reaproveitando o mesmo endpoint) | Mesmos KPIs e mesmo seletor de mês do Relatório — zero código de backend novo, só um botão a mais na tela. |
| **Financeiro** | ✅ Adotado — gráfico | A série mensal (revenue/profit/margin) já vem inteira em `GET /financials`; virou gráfico (`SeriesChart`, já genérico) só no frontend, sem endpoint novo. |
| **Marketing** | ✅ Adotado — gráfico | `GET /analytics/marketing/by-channel` já existia (desde a rodada "Marketing por canal" do Analytics) e não era consumido por nenhuma tela — faltava só a UI (filtro de período + gráfico + a tabela `MarketingByChannelTable`, que já existia). |
| **Analytics** | ⏸ Adiado | Já tem `SeriesChart`/`CorrelationChart` + exportação CSV da série mensal. Um "PDF Executivo" (KPIs + série + metas + correlação + marketing por canal) teria escopo comparável à própria PR3 — múltiplos endpoints/seções novos — e não cabia no restante desta rodada sem inflar demais o escopo. Candidato natural de uma rodada futura dedicada. |
| **Produtos** | 🚫 Não aplicável | Catálogo sem dimensão temporal nem venda registrada (já documentado em `docs/analytics/CHART_DECISIONS.md`, "Fora de escopo: drill-down de receita por canal/produto, cohorts") — não há série nem categoria para comparar. |
| **Experimentos** | ⏸ Adiado | Cada experimento já mostra controle vs. variante lado a lado, com significância estatística — comparação binária já clara em números. Não há hoje uma visão agregada entre experimentos que justifique um gráfico próprio. |
| **Central de Dados** | 🚫 Não aplicável | Tela operacional (import/export de linha crua, histórico de jobs), não analítica — não há KPI nem série pra virar gráfico ou relatório. |
| **Auditoria** | 🚫 Não aplicável | Log tabular paginado, sem nenhuma agregação hoje (contagem por ação/dia, por exemplo, não existe). Candidato a **exportação CSV** no futuro (`audit_logs` como novo domínio em `exports/`) — mas isso é uma feature de exportação de dado bruto, não de gráfico/PDF, então fica fora desta rodada. |

## O que foi implementado

- **`GET /reports/basic/pdf?period=`** (`apps/api/app/modules/reports/basic_pdf.py` + `router.py`): mesmo padrão de `pdf_builder.py`/`funnel_pdf.py` da PR3 — KPIs do Dashboard, Comparação com o Baseline, Marketing do Período (omitida por completo sem campanha no período, RN-003). Mesma permissão de `/reports/basic` (ANALYST+).
- **Botão de PDF** em Relatório (ao lado do "Imprimir/Salvar PDF" existente) e em Dashboard (só para ANALYST+, ver "Decisões de implementação").
- **Gráfico de evolução** em Financeiro (receita/lucro/margem, `SeriesChart`).
- **Gráfico + filtro de período** em Marketing ("Desempenho por Canal": `DateRangeFilter` + `ChannelBarChart`, novo componente genérico, + `MarketingByChannelTable`, que já existia).

## Decisões de implementação

- **`window.print()` do Relatório foi mantido, não substituído.** A impressão rápida da tela continua útil (RF-026 original); o novo `GeneratePdfReportButton` é aditivo — PDF formal, paginado, com rodapé de confidencialidade, mesmo padrão do Funil. As duas opções coexistem de propósito.
- **O botão de PDF no Dashboard é condicional ao papel** (`hasMinimumRole(organization?.my_role, "ANALYST")`, `apps/web/src/lib/roles.ts`). `/reports/basic/pdf` exige ANALYST+ (mesmo nível de `/reports/basic`), mas o Dashboard continua visível a VIEWER (RN-010, `analytics/router.py`) — sem essa checagem, VIEWER veria um botão que sempre resulta em 403.
- **`ChannelBarChart` é deliberadamente genérico** (ao contrário dos componentes Recharts do Funil, acoplados a `lib/funnel-metrics.ts`) — ver `docs/analytics/CHART_DECISIONS.md`, entrada desta PR.
- **"Desempenho por Canal" se atualiza sozinho ao criar uma campanha**, sem esperar o usuário trocar o filtro de período. Achado na verificação manual desta PR: o painel só reagia à mudança de `range`, então uma campanha recém-criada dentro do período já selecionado ficava invisível até um reload manual — corrigido com um contador de recarga incrementado após `POST /campaigns` ter sucesso.
