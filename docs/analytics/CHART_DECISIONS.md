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

## BI externo: Power BI (premium) e Looker Studio (gratuito) — ambos pesquisados, nenhum implementado

Em 2026-08-30 o projeto já tinha um plano pesquisado pra **Power BI** (`docs/analytics/POWER_BI.md`), e a decisão foi manter só esse plano em vez de pesquisar Looker Studio. Em 2026-08-31 essa decisão foi revertida pelo usuário — Looker Studio foi pesquisado (`docs/analytics/LOOKER_STUDIO.md`) pra servir de camada **gratuita/freemium**, com Power BI posicionado como **premium/enterprise** (arquitetura sugerida por um prompt de monetização — ver seção "Fora de escopo: monetização/planos/entitlements" abaixo). As duas pesquisas compartilham o mesmo pré-requisito técnico real (módulo de API key por organização, não implementado) e o mesmo modelo de segurança (`docs/security/POWER_BI_SECURITY.md`, Opção A) — nenhuma integração de BI externo está implementada hoje, de nenhuma das duas ferramentas, só arquitetura documentada.

## Fora de escopo: monetização, planos, entitlements, feature flags

Um prompt separado (2026-08-31) pediu uma arquitetura comercial inteira — `Plan`/`Subscription`/`Feature`/`Addon`, feature matrix, estratégia de preço, modularização por planos (Starter/Growth/Pro/Enterprise). Não existe nenhum model de billing/plano no schema hoje (confirmado por auditoria — `apps/api/app/models/` não tem `Plan`, `Subscription`, `Feature` nem equivalente). Decisão confirmada com o usuário: escopo desta rodada ficou só na pesquisa de Looker Studio (documentada acima) e na geração de dados demo (ver `test-data/demo-company/README.md`) — a arquitetura de monetização em si (schema, entitlements, feature matrix, pricing strategy) fica pra uma rodada dedicada, por ser uma decisão de negócio grande demais pra decidir sem o usuário no processo passo a passo (preço real, modelo de cobrança, quais módulos entram em qual plano).

## Fora de escopo: drill-down de receita por canal/produto, cohorts

Dependem de coisas que os dados atuais não sustentam sem inventar:

- **Drill-down de receita/lucro/CAC (Visão Executiva) → canal/produto → período**: precisaria de filtro por dimensão (canal, produto) nos endpoints agregados, que `docs/analytics/FILTERS.md` já documenta como não implementado por falta de vínculo real entre essas dimensões e `financial_periods`/`funnel_snapshots`. (Marketing por canal é diferente — ver "Entregue" abaixo.) Receita/lucro *por produto* precisaria de algo ainda maior: `products` é só catálogo hoje, sem nenhuma venda registrada — não há como atribuir receita a um produto sem um modelo de vendas transacional, que não existe.
- **Cohorts/retenção (heatmap)**: mesma raiz do item acima — exigiria identidade de cliente individual e histórico de compra (`customers` + `sales`/`orders`), que não existem — hoje só há contagens agregadas por mês. Cohorts e receita por produto compartilham exatamente essa mesma peça faltante; construir um modelo de vendas transacional destravaria os dois ao mesmo tempo, mas é uma decisão de produto grande (como o dado entra: digitação manual, importação, integração), não uma decisão técnica a se tomar sozinho.

**Correlação entre métricas mensais não está mais nesta lista** — ver "Entregue" abaixo; era um exagero classificá-la como dependente de dado ausente.

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

## Entregue (2026-08-31): correlação entre métricas mensais

Sexta rodada. Ao contrário do que este documento dizia antes, correlação entre duas métricas mensais **não dependia de dado ausente** — é buildável direto da mesma série mensal de `/analytics/executive/series`, sem tabela nova. O que de fato limita é ter meses suficientes de histórico acumulado (não uma questão de arquitetura).

- **`GET /analytics/executive/correlation`**: coeficiente de Pearson (`statistics.correlation`, biblioteca padrão do Python — nenhuma dependência nova) entre duas das 7 métricas mensais, mais os pontos pro gráfico de dispersão. Mínimo de 3 meses com as duas métricas aplicáveis pra calcular (`engine.py::correlation`) — com 2 pontos, qualquer reta conecta os dois perfeitamente (r sempre ±1), o que não significa nada. `is_applicable=False` também quando uma das duas métricas não varia no período (correlação matematicamente indefinida, nunca 0).
- **Nunca afirma causalidade** — mesmo espírito de `PeriodComparison` (que deliberadamente não tem campo de "causa") e dos insights determinísticos.
- Frontend: `CorrelationChart` (gráfico de dispersão SVG artesanal, mesma convenção do resto) + `CorrelationPanel` (dois seletores de métrica — X/Y não podem ser iguais, opção correspondente fica desabilitada no outro seletor — e a interpretação textual do coeficiente, `lib/correlation.ts`, com faixas de força que seguem uma convenção comum, não um padrão universal).

## Entregue (2026-09-02): Funil multicanal — modelagem, KPIs de conversão/abandono (PR1 de 4)

Sétima rodada, primeira de uma sequência de 4 PRs pedida pelo usuário para transformar a tela de Funil numa ferramenta analítica completa (ver `docs/funnel/`). Esta PR1 é só backend — banco, API, KPIs — sem gráfico nem PDF ainda.

- **`funnel_snapshots.channel_id`** (nullable, migration `0016_funnel_snapshot_channel`): mesma ideia de `campaigns.channel_id`, mas opcional — linha sem canal = funil agregado da organização (comportamento que já existia), linha com canal = funil segmentado. Ver `docs/funnel/MODELAGEM.md`.
- **`GET /analytics/funnel` e `GET /analytics/funnel/by-channel`**: espelham exatamente `/analytics/marketing`/`/analytics/marketing/by-channel` (mesma decisão desta seção, "Marketing por canal") — conversão e abandono etapa-a-etapa (`docs/funnel/KPIS.md`), com comparação período-a-período só no agregado.
- **Ainda decidido nesta rodada** (fora desta PR): biblioteca de gráfico para o Funil será **Recharts** (não SVG artesanal — primeira exceção à decisão vigente desta seção, porque o gráfico de funil/etapas tem forma geométrica própria que não compensa desenhar à mão) e o motor de relatório em PDF será **server-side, em Python** — ambos confirmados com o usuário, implementação em PR2/PR3.

## Entregue (2026-09-02): Funil multicanal — UX, Glossário completo, Recharts (PR2 de 4)

Oitava rodada. `recharts@3.10.1` (compatível com React 19.2.8) é a **primeira exceção real** à decisão vigente desta seção — todos os outros gráficos do produto continuam SVG artesanal; só o Funil usa Recharts, e só porque o próprio formato do funil (trapézios decrescentes) não tem um equivalente hand-rolled que valha a pena manter.

- **`FunnelStagesChart`/`StageConversionChart`/`FunnelEvolutionChart`** (`apps/web/src/components/`): mesma disciplina de acessibilidade dos gráficos SVG (`role="img"`+`aria-label`, tabela com os mesmos dados — `sr-only` nos dois primeiros, **sempre visível** na conversão por etapa, que é dado primário). `GET /analytics/funnel/series` (novo, mirror de `/analytics/executive/series`) alimenta a evolução temporal.
- **`SegmentedControl`** (`apps/web/src/components/segmented-control.tsx`): extrai o padrão de grupo de botões-pílula já duplicado em `date-range-filter.tsx` e `glossario/page.tsx` — terceira ocorrência, valeu extrair.
- **Glossário**: `MetricDefinition.unit`/`direction` viram opcionais para suportar conceito categórico (Canal, Campanha...) sem número nem direção desejável — nova categoria `"funil"`. 13 verbetes novos completam os 15 pedidos pelo prompt original; Fonte/Plataforma documentados como conceitos ainda não modelados neste sistema (mesmo critério de honestidade de MRR/ARR). O ícone `?` reutilizável (`MetricHelp`) já existia e já era não-hover-only — nenhum componente novo precisou ser criado para isso.
- **Gargalo e insights determinísticos** (`lib/funnel-insights.ts`): mesmo espírito de `lib/insights.ts` — nunca linguagem causal, só "a menor conversão observada é entre X e Y".

## Entregue (2026-09-04): redesign visual do Funil — labels externos e tooltip compartilhado (PR1 de 3)

Décima rodada, primeira de uma nova sequência de 3 PRs pedida pelo usuário (prompt de UX focado nos gráficos do Funil + camada reutilizável de personalização — roadmap em `docs/charts/ARQUITETURA_DE_GRAFICOS.md`). Esta PR1 só corrige bugs visuais já existentes; não implementa personalização nem persistência.

- **`ChartTooltip`** (`apps/web/src/components/chart-tooltip.tsx`, novo): primeiro tooltip customizado do produto — todo gráfico Recharts usava o `<Tooltip>` padrão da lib até aqui (sem dark mode, sem controle de contraste). Adotado pelos 4 gráficos que já existiam (`FunnelStagesChart`, `StageConversionChart`, `FunnelEvolutionChart`, `ChannelBarChart`).
- **`FunnelStagesChart`**: os dois `LabelList` antigos (nome externo + valor branco no CENTRO do trapézio, ilegível em etapas estreitas) viram um único label externo combinado (nome + valor + conversão-em-relação-à-anterior), com conector — ver `docs/funnel/VISUALIZACOES.md`.
- **`StageConversionChart`**: barras horizontais (`layout="vertical"`) em vez de verticais com nomes inclinados; tooltip ganhou conteúdo rico (taxa, contagens absolutas, perda, abandono) quando recebe o novo prop opcional `stages`.
- Nenhuma dependência nova — Recharts continua a decisão vigente para a família do Funil (ver acima); nenhuma mudança na fonte dos dados (backend inalterado).

## Entregue (2026-09-03): Funil multicanal — inventário e adoção nas demais telas (PR4 de 4)

Nona rodada, última desta sequência de 4 PRs. `docs/reports/PR4_INVENTARIO.md` traz a decisão completa tela a tela (adotar/adiar/não aplicável); aqui só a decisão de biblioteca do gráfico novo.

- **`ChannelBarChart`** (`apps/web/src/components/channel-bar-chart.tsx`): Recharts (`BarChart`), mesma decisão de dependência já em uso pelo Funil desde a PR2 — não reabre a decisão vigente desta seção (SVG artesanal continua o padrão pros gráficos de linha existentes). A diferença desta PR: ao contrário de `FunnelStagesChart`/`StageConversionChart`/`FunnelEvolutionChart` (acoplados aos tipos de domínio do Funil, `lib/funnel-metrics.ts`), este componente é **deliberadamente genérico** — recebe só `{key,label,value}[]` e um formatador, sem conhecer "canal" nem nenhum outro domínio. É o primeiro gráfico Recharts do produto pensado pra ser reaproveitado por uma tela futura sem cópia/adaptação, não só um padrão a copiar.
- Usado hoje só em Marketing (ROAS por canal, via `GET /analytics/marketing/by-channel`, endpoint que já existia desde a rodada "Marketing por canal" acima e não era consumido por nenhuma tela).
- **Financeiro** ganhou gráfico de evolução (receita/lucro/margem) reaproveitando `SeriesChart` (SVG artesanal, já genérico) direto sobre o dado de `GET /financials` — nenhum componente novo, nenhum endpoint novo.
- **Relatório/Dashboard**: sem gráfico novo — ganharam PDF server-side (`GET /reports/basic/pdf`, mesmo padrão de `pdf_builder.py` da PR3), não um gráfico. Ver `docs/reports/PR4_INVENTARIO.md` e `docs/reports/PDF_INFRAESTRUTURA.md`.
