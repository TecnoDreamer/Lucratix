# Modelagem — Funil por canal

## Por que uma coluna nullable, não uma tabela filha nem uma view

`funnel_snapshots` já era "uma linha por organização+período" (RN-006: ordem fixa das 8 etapas — `impressions, visits, leads, mqls, sqls, opportunities, customers, repeat_purchases`). A auditoria desta rodada confirmou que essa tabela nunca teve atribuição de canal — é genuinamente diferente de `marketing_channels`/`campaigns`, que já têm canal, mas um conjunto de métricas próprio e incompleto para o funil (falta visitas/MQL/SQL/recompra).

`channel_id` (nullable, `FK marketing_channels.id`, `ondelete=RESTRICT`) foi adicionado direto na tabela existente, não como tabela filha nem view, porque:

- **Mantém o modelo que já existe.** Só adiciona uma dimensão opcional — nenhuma outra tabela nem join novo para o caso comum (organização que não segmenta por canal).
- **Zero backfill.** Toda linha histórica passa a significar "agregado" (`channel_id IS NULL`) sem nenhuma migração de dado.
- **Espelha o precedente já usado** em `Campaign.channel_id` (`apps/api/app/models/campaign.py`, `ForeignKey("marketing_channels.id", ondelete="RESTRICT")`) — só que nullable, porque nem toda organização segmenta o funil por canal (ao contrário de campanha, que sempre pertence a um canal).

## A armadilha do Postgres: `UNIQUE` trata `NULL` como distinto

Sem cuidado, várias linhas "agregado" (`channel_id IS NULL`) poderiam coexistir para a mesma organização+período — o Postgres nunca as considera duplicatas entre si numa `UNIQUE` normal. A solução (migration `0016_funnel_snapshot_channel`):

- Constraint composta `uq_funnel_snapshot_org_period_channel` em `(organization_id, period, channel_id)` — impede duas linhas do mesmo canal no mesmo período.
- **Mais** um índice único parcial `ix_funnel_snapshot_org_period_aggregate` em `(organization_id, period) WHERE channel_id IS NULL` — impede duas linhas agregadas no mesmo período, o caso que a constraint composta sozinha não cobre.

Ambos espelhados em `app/models/funnel_snapshot.py::__table_args__`, não só na migration — os testes de integração criam o schema via `Base.metadata.create_all()` (`tests/conftest.py`), não via Alembic, então sem espelhar no model os testes rodariam contra um schema sem essa proteção.

## Onde a linha "agregada" continua sendo a única que existe

Nenhuma tela ainda cria uma linha por canal (a tela de entrada manual do Funil é PR2). Toda leitura pré-existente (`GET /funnel-snapshots`, dashboard, visão executiva, exportação sem filtro de canal, resumo "Suas empresas") filtra explicitamente `channel_id IS NULL` — continuam vendo exatamente o que viam antes desta PR, nunca uma mistura com linha por canal. A API já aceita `channel_id` no upsert (`PUT /funnel-snapshots`) e na importação (Central de Dados, coluna "Canal" opcional) para que a Central de Dados e testes possam popular dado segmentado antes da UI de PR2 existir.

## MQL/SQL continuam 100% manuais

Não existe regra automática de qualificação de MQL→SQL em nenhum lugar do sistema hoje — isso é documentado como está, não inventado. Uma regra de qualificação automática (ex.: pontuação por engajamento) seria uma decisão de negócio própria, fora do escopo desta modelagem.
