# Decisões de biblioteca de gráficos — Analytics

Registro de decisão (ADR leve, mesmo espírito de `docs/adr/`) sobre qual motor visual usa cada gráfico do Analytics, e por quê. Atualizar sempre que um gráfico novo for adicionado ou a decisão for revista.

## Decisão vigente (2026-08-30): SVG artesanal, sem biblioteca de gráficos

Todos os gráficos do produto (o único existente hoje: linha de evolução mensal por KPI, `apps/web/src/components/series-chart.tsx`) são SVG escrito à mão, sem Recharts, ApexCharts, D3 ou qualquer outra dependência de gráfico — `apps/web/package.json` não tem nenhuma.

**Por quê:**

- **Volume real é pequeno.** Uma página (Analytics → Visão Executiva), 7 mini-gráficos de linha, todos do mesmo tipo. Não há hoje necessidade real de zoom, brush, annotations, mixed charts, heatmap ou treemap — os critérios que justificariam trazer ApexCharts (ver seção abaixo) — nem volume de gráficos que justificasse a curva de aprendizado/manutenção do Recharts para ganhar reuso.
- **Mesmo padrão já usado no projeto.** Todos os ícones (`components/icons.tsx`) já são SVG desenhado à mão, sem biblioteca de ícones. O gráfico segue a mesma convenção — consistência de stack, zero dependência nova, controle total de tema claro/escuro via `currentColor`/classes Tailwind (`dark:`) sem precisar sobrescrever CSS de terceiro.
- **Custo de manutenção previsível.** ~160 linhas, sem API externa para acompanhar breaking changes de major version.

**Quando revisar esta decisão:**

- Se surgir uma necessidade real de zoom/brush (explorar uma série longa ponto a ponto), annotations (marcar um evento no meio da série), heatmap/treemap (cohort de retenção, mapa de canal × dia) ou mixed chart (duas métricas de escalas diferentes no mesmo gráfico) — isso é o critério de entrada do **ApexCharts**, não do Recharts (ver prompt de evolução do Analytics, seção "Responsabilidades das três tecnologias").
- Se o número de tipos de gráfico crescer (barra, funil, stacked bar, scatter) a ponto de reescrever cada um à mão custar mais do que adotar o **Recharts** como padrão para os casos comuns (line/area/bar/stacked bar/sparkline).
- Qualquer um dos dois casos acima é decisão de escopo/produto, não só técnica — confirmar com o usuário antes de adicionar a dependência (mesmo critério já usado para toda decisão de negócio deste projeto).

## Fora de escopo nesta rodada: BI externo (Looker Studio / Power BI)

O projeto já tinha, antes desta rodada, um plano pesquisado especificamente para **Power BI** (`docs/analytics/POWER_BI.md`): arquitetura (Power Query direto vs. Gateway), o gap real de autenticação (API não tem mecanismo de API key, só cookie de sessão — pensado pra SPA, não pra ferramenta externa) e o que seria exposto hoje. Decisão confirmada com o usuário: manter esse plano em vez de pesquisar Looker Studio do zero (ferramenta diferente, nunca avaliada neste projeto). Ver `docs/analytics/POWER_BI.md` para o estado completo — nenhuma integração de BI externo está implementada hoje, de nenhuma das duas ferramentas.

## Fora de escopo nesta rodada: drill-down, metas/annotations, cohorts, correlação, insights automáticos

Todos dependem de coisas que os dados atuais não sustentam sem inventar:

- **Drill-down KPI → canal/campanha → período**: precisaria de filtro por dimensão (canal, produto) nos endpoints agregados, que `docs/analytics/FILTERS.md` já documenta como não implementado por falta de vínculo real entre essas dimensões e `financial_periods`/`funnel_snapshots`.
- **Metas/annotations**: não existe conceito de meta no schema hoje (nenhuma tabela `targets`/`goals`).
- **Cohorts/retenção (heatmap)**: exigiria dado longitudinal por cliente (data de aquisição × atividade por período), que não existe — hoje só há contagens agregadas por mês.
- **Correlação (scatter)**: mesma limitação — sem granularidade por cliente/venda individual para calcular uma correlação estatisticamente válida sem inventar.
- **Insights determinísticos automáticos** ("receita subiu e CAC caiu"): viável em princípio com os dados que já existem (comparação período-contra-período já calculada por KPI), mas não implementado nesta rodada — fica como evolução natural, não bloqueado por dado ausente como os itens acima.
