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

## Fora de escopo: drill-down de receita por canal, cohorts, correlação

Dependem de coisas que os dados atuais não sustentam sem inventar:

- **Drill-down de receita/lucro/CAC (Visão Executiva) → canal/produto → período**: precisaria de filtro por dimensão (canal, produto) nos endpoints agregados, que `docs/analytics/FILTERS.md` já documenta como não implementado por falta de vínculo real entre essas dimensões e `financial_periods`/`funnel_snapshots`. (Marketing por canal é diferente — ver "Entregue" abaixo.)
- **Cohorts/retenção (heatmap)**: exigiria dado longitudinal por cliente (data de aquisição × atividade por período), que não existe — hoje só há contagens agregadas por mês.
- **Correlação (scatter)**: mesma limitação — sem granularidade por cliente/venda individual para calcular uma correlação estatisticamente válida sem inventar.

## Entregue (2026-08-31): direção semântica, insights automáticos, exportação

Terceira rodada desta evolução — os itens que dependiam só de dado que já existe, sem precisar de dimensão nova nem tabela nova:

- **Direção desejável por métrica** (`MetricDefinition.direction`, `higher_is_better`/`lower_is_better`, `domain/metrics/metric-types.ts`): corrige um bug real — `ComparisonBadge` (Analytics) pintava toda variação positiva de verde, mesmo para CAC/CPC/CPM/CPL/CPA, onde **subir é a notícia ruim**. Fonte única de verdade também usada pelo painel de insights e exibida no próprio `MetricHelp` ("↓ Menor é melhor"/"↑ Maior é melhor").
- **Insights determinísticos** (`lib/insights.ts`): até 3 observações por período — maior variação absoluta (o que merece investigação), receita↑+CAC↓ (crescimento eficiente), receita↑+margem↓ (alerta, sem afirmar causa). Só lê `percent_change` já calculado pelo backend; nunca gera nada sem comparação aplicável.
- **Exportação do gráfico de evolução** (`lib/analytics-export.ts`): CSV client-side dos KPIs mensais já buscados (`GET /analytics/executive/series`), com empresa/período/geração/fuso horário no cabeçalho — sem chamada nova ao backend. Complementa (não substitui) a exportação de dado bruto já existente na Central de Dados.

Ainda fora de escopo até aqui: Recharts/ApexCharts, Looker Studio, drill-down por canal/produto, cohorts, correlação — cada um pela razão já registrada acima.

## Entregue (2026-08-31): metas por KPI/mês

Quarta rodada — o item recomendado como maior valor de negócio entre os que restavam, e o único que não depende de nenhum dado que não existe (o próprio usuário fornece a meta).

- **`targets`** (tabela nova, migration `0010_targets`): meta mensal por organização+métrica (`revenue`, `profit`, `margin`, `cac`, `conversion_rate`, `average_ticket`, `recurrence_rate` — os mesmos 7 KPIs da Visão Executiva; Marketing/ROAS fica de fora por ora). Granularidade mensal, mesmo grão de `FinancialPeriod`/`FunnelSnapshot` — decisão explícita, sem meta por intervalo livre. CRUD completo (`GET`/`PUT`/`DELETE /targets`), ANALYST+ pra escrever, qualquer membro pra ler (mesmo critério de `financials`).
- **Progresso agregado só pra receita/lucro.** `GET /analytics/executive/targets` soma a meta mensal ao longo do intervalo selecionado e compara com o atual — mas isso só é matematicamente válido pra métrica genuinamente aditiva (receita, lucro). As outras 5 (margem, CAC, conversão, ticket médio, recorrência) são **razões** (ex.: CAC = investimento/clientes) — somar a meta mensal delas não representa "a meta do intervalo" sem pesar pelo volume de cada mês, o mesmo problema de somar 5 CACs mensais e chamar de "CAC do trimestre". Por isso essas 5 só comparam meta mês a mês (linha tracejada no gráfico de evolução, que nunca agrega), nunca num card de "% da meta" pro intervalo inteiro.
- Frontend: `TargetsPanel` (form + lista + remoção) na própria página de Analytics — sem gate de papel adicional na UI, porque a página inteira já exige ANALYST+ pra ser alcançada (RN-010); o backend segue exigindo ANALYST+ em `PUT`/`DELETE` independente disso.

## Entregue (2026-08-31): Marketing por canal

Quinta rodada — o único drill-down que sobrou que não dependia de dado ausente. `campaigns.channel_id` já existe (é uma FK obrigatória, `RESTRICT`); o único motivo de não existir antes é que `/analytics/marketing` sempre somou todas as campanhas juntas.

- **`GET /analytics/marketing/by-channel`**: mesmas 7 métricas de `/analytics/marketing` (ROAS, ROI, CTR, CPC, CPM, CPL, CPA), reaproveitando `aggregate_campaigns`/`compute_marketing_metrics` sem nenhuma fórmula nova — só agrupadas por canal em vez de somadas todas juntas. Mesma permissão (ANALYST+), mesmo critério de campanha incluída de `list_campaigns_in_range`.
- **Sem comparação com período anterior nesta primeira versão** — o eixo aqui é "canal A vs. canal B no mesmo período", não "antes vs. depois" (diferente de `/analytics/marketing` e `/analytics/executive`). Poderia ser adicionado depois se fizer falta.
- Frontend: `MarketingByChannelTable` — uma linha por canal (nome, nº de campanhas, 7 métricas), sem estado vazio próprio (o aviso "Nenhuma campanha..." já mostrado pela seção Marketing cobre o caso, sem duplicar mensagem).
