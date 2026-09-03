# Relatório do Funil em PDF

`GET /api/v1/organizations/{organization_id}/reports/funnel/pdf?date_from&date_to`
— mesma permissão (`ANALYST+`) e mesma validação de intervalo de
`/analytics/funnel`. Composição pura sobre funções já existentes
(`app/modules/reports/funnel_pdf.py`): nenhuma consulta nem regra de
negócio nova, só reaproveita `list_funnel_snapshots_in_range`,
`list_channel_funnel_snapshots_in_range`, `aggregate_funnels`,
`compute_stage_conversions`, `stage_values`, `previous_equivalent_range`,
`months_between` e `marketing_repository.get_channels_by_ids` — as
mesmas que alimentam `/analytics/funnel`, `/analytics/funnel/series` e
`/analytics/funnel/by-channel`.

## As 11 seções

Estrutura própria (o prompt original pedia "algo em torno de 11 seções",
sem especificar títulos literalmente):

1. **Capa/cabeçalho** — empresa, intervalo, data de geração (`pdf_builder.build_pdf`).
2. **Sumário executivo** — as mesmas 2 observações determinísticas do
   `InsightsPanel` da tela, combinadas num parágrafo curto.
3. **Visão geral das etapas** — as 8 etapas, valores absolutos do
   intervalo agregado.
4. **Conversão e abandono por etapa** — tabela completa, com o "gargalo"
   (menor conversão aplicável) destacado em amber.
5. **Comparação com o período anterior** — taxa de conversão de cada
   etapa vs. período anterior equivalente (contagem bruta não é
   comparada isoladamente — mesmo critério de `/analytics/funnel`).
6. **Evolução mensal** — tabela mês a mês das 8 etapas (PDF é estático,
   não leva gráfico interativo; mesmo dado de `/analytics/funnel/series`).
7. **Segmentação por canal** — tabela por canal.
8. **Comparação entre canais** — o "gargalo" de cada canal, lado a lado.
9. **Observações determinísticas** — lista completa (agregado + por
   canal), nunca linguagem causal.
10. **Definições** — glossário condensado dos termos usados no
    relatório (texto próprio, não importa do catálogo do frontend, que
    vive em outro runtime).
11. **Rodapé/aviso de confidencialidade + paginação** — resolvido pelo
    `pdf_builder.build_pdf` genérico, em todas as páginas.

**As seções 7 e 8 são omitidas por completo** — nunca aparecem vazias —
quando nenhum canal tem dado no intervalo selecionado (RN-003, mesmo
critério de `FunnelByChannelTable` na tela).

## O que o relatório NÃO faz

- Não inventa nenhuma métrica/fórmula nova — todo número vem de uma
  função já testada em `funnel_analytics.py`/`analytics/service.py`.
- Não atribui causalidade — "menor conversão observada", nunca "o
  problema é X".
- Não mistura dado de organizações diferentes — `organization_id` vem
  sempre do contexto de RBAC (`ctx`), nunca de um parâmetro do cliente.

## Frontend

Botão "Gerar relatório PDF" (`components/generate-pdf-report-button.tsx`,
reutilizável) na seção "Análise do Funil", usando o `date_from`/`date_to`
já selecionados na tela — o relatório reflete exatamente o filtro
visível, nunca um intervalo diferente.
