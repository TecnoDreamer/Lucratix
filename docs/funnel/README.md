# Funil Multicanal — Modelagem, KPIs, Gráficos, PDF

Documenta a evolução do Funil pedida pelo usuário em 2026-09-01/02 ("Funil Multicanal, Gráficos e Relatórios PDF"): transformar a tela de Funil — antes um formulário de 8 campos manuais por mês, sem nenhuma atribuição a canal/campanha — numa ferramenta analítica completa. Dividida em 4 PRs (ver `docs/analytics/CHART_DECISIONS.md`, entrada "Funil multicanal").

- [MODELAGEM.md](MODELAGEM.md) — por que `channel_id` é uma coluna nullable em `funnel_snapshots`, não uma tabela filha nem uma view, e a armadilha de `UNIQUE`+`NULL` no Postgres.
- [KPIS.md](KPIS.md) — as 8 etapas do funil, as 7 conversões/abandonos etapa-a-etapa, gargalo/insights determinísticos, a série mensal, e o que ainda não é calculado.
- [UX.md](UX.md) — estrutura da tela, o ícone `?` reutilizável (já existia), a decisão de Recharts, e por que Fonte/Plataforma não são oferecidas como segmentação.
- [../reports/PDF_INFRAESTRUTURA.md](../reports/PDF_INFRAESTRUTURA.md) e [../reports/FUNIL_PDF.md](../reports/FUNIL_PDF.md) — infraestrutura de relatório em PDF (ReportLab) e as 11 seções do relatório do Funil.
- [../reports/PR4_INVENTARIO.md](../reports/PR4_INVENTARIO.md) — decisão tela a tela (adotar/adiar/não aplicável) da adoção do padrão de gráfico/PDF nas demais telas.

## Escopo por rodada

**PR1 — modelagem, banco, API, KPIs** ([#110](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/110)): `funnel_snapshots.channel_id` (migration `0016`); `GET /analytics/funnel` (funil agregado por intervalo, conversão/abandono etapa-a-etapa, comparação período-a-período); `GET /analytics/funnel/by-channel`; segmentação por canal na importação/exportação (Central de Dados); 1º verbete de Glossário ("Taxa de Abandono").

**PR2 — UX, Glossário completo, gráficos (Recharts)** ([#111](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/111)): `GET /analytics/funnel/series` (evolução temporal, mesmo padrão de `/analytics/executive/series`); seção "Análise do Funil" na tela (agregado/por canal via `SegmentedControl`, extraído do padrão de botões-pílula já duplicado 2x); os 13 verbetes de Glossário restantes (categoria nova "funil", `MetricDefinition.unit`/`direction` viram opcionais para suportar conceito categórico) — "Taxa de Conversão" reaproveitada, fechando os 15 termos pedidos; `MetricHelp` (ícone `?`) usado nos novos verbetes, sem nenhum componente novo (já era não-hover-only); **Recharts** adotado (primeira exceção ao padrão SVG-artesanal — `FunnelStagesChart`, `StageConversionChart`, `FunnelEvolutionChart`, `FunnelByChannelTable`); gargalo/insights determinísticos client-side (`lib/funnel-insights.ts`).

**PR3 — infraestrutura de relatório PDF (server-side) + relatório do Funil**: `app/modules/reports/pdf_builder.py` (blocos reutilizáveis ReportLab — `section_title`/`paragraph`/`kpi_table`/`data_table`/`build_pdf`, sem nenhuma regra de negócio, para a PR4 reaproveitar); `describe_bottleneck`/`describe_biggest_mover` em `funnel_analytics.py` (port pro Python das mesmas 2 regras de `lib/funnel-insights.ts`, já que o PDF é gerado inteiramente no servidor); `app/core/formatting.py` (formatação pt-BR no backend, novidade — sempre foi só do frontend); `GET /reports/funnel/pdf` com as 11 seções (`docs/reports/FUNIL_PDF.md`); `GeneratePdfReportButton` (componente reutilizável) na tela.

**PR4 — inventário e adoção do padrão de gráfico/PDF nas demais telas** ([PR4_INVENTARIO.md](../reports/PR4_INVENTARIO.md)): decisão tela a tela (Dashboard, Analytics, Produtos, Financeiro, Marketing, Experimentos, Relatório, Central de Dados, Auditoria). Adotado: `GET /reports/basic/pdf` (Relatório e Dashboard), gráfico de evolução em Financeiro (`SeriesChart`), gráfico + filtro de período em Marketing (`ChannelBarChart`, novo componente genérico, + `MarketingByChannelTable`). Adiado/não aplicável: Analytics (PDF executivo, escopo comparável à própria PR3), Produtos/Experimentos/Central de Dados/Auditoria (sem dimensão temporal, sem agregação, ou puramente operacionais — ver o documento pra justificativa completa de cada um).

**Fora de escopo**:
- **Fonte/Plataforma como segmentação real** — não modeladas (ver `UX.md`); documentadas no Glossário como conceitos ainda não suportados, mesmo critério de honestidade de MRR/ARR.

Ver também [CHART_DECISIONS.md](../analytics/CHART_DECISIONS.md) (decisão de adotar Recharts, e PDF server-side) e [metrics-catalog.md](../analytics/metrics-catalog.md).
