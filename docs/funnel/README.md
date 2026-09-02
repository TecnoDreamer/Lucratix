# Funil Multicanal — Modelagem, KPIs, Gráficos, PDF

Documenta a evolução do Funil pedida pelo usuário em 2026-09-01/02 ("Funil Multicanal, Gráficos e Relatórios PDF"): transformar a tela de Funil — antes um formulário de 8 campos manuais por mês, sem nenhuma atribuição a canal/campanha — numa ferramenta analítica completa. Dividida em 4 PRs (ver `docs/analytics/CHART_DECISIONS.md`, entrada "Funil multicanal").

- [MODELAGEM.md](MODELAGEM.md) — por que `channel_id` é uma coluna nullable em `funnel_snapshots`, não uma tabela filha nem uma view, e a armadilha de `UNIQUE`+`NULL` no Postgres.
- [KPIS.md](KPIS.md) — as 8 etapas do funil, as 7 conversões/abandonos etapa-a-etapa, e o que ainda não é calculado (maior gargalo, qualificação automática de MQL/SQL).

## Escopo desta rodada (PR1 de 4)

Implementado: `funnel_snapshots.channel_id` (migration `0016_funnel_snapshot_channel`); `GET /analytics/funnel` (funil agregado por intervalo, com conversão/abandono etapa-a-etapa e comparação período-a-período da taxa de conversão); `GET /analytics/funnel/by-channel` (mesmo drill-down de `/analytics/marketing/by-channel`); segmentação por canal na importação/exportação de Funil (Central de Dados); 1 verbete novo no Glossário ("Taxa de Abandono").

**Fora de escopo desta rodada** (PRs seguintes do mesmo pedido):
- **PR2** — UX do Funil (alternância agregado/segmentado, seletor de canal, comparação de período na tela), os 14 verbetes de Glossário restantes (Funil, Impressões, Visitas, Lead, MQL, SQL, Oportunidade, Cliente, Recompra, Canal, Fonte, Plataforma, Campanha, e reaproveitar "Taxa de Conversão") atrás de um ícone `?` reutilizável, adoção de **Recharts** no Funil.
- **PR3** — infraestrutura de relatório PDF **server-side em Python**, relatório do Funil.
- **PR4** — inventário e adoção do padrão de gráfico/PDF nas demais telas.

Ver também [CHART_DECISIONS.md](../analytics/CHART_DECISIONS.md) (decisão de adotar Recharts especificamente para o Funil, e PDF server-side) e [metrics-catalog.md](../analytics/metrics-catalog.md).
