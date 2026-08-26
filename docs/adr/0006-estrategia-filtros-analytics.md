# ADR-0006 — Estratégia de filtros de data em Analytics

- **Status:** Aceito
- **Data:** 2026-08-26

## Contexto

O prompt de BI (seção 7) pede um filtro de intervalo de datas com presets como "Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", além de presets mensais. Os dados disponíveis (`financial_periods`, `funnel_snapshots`) são armazenados com granularidade **mensal** — um registro por organização+mês (RF-017, RF-020) — não há nenhum dado diário.

## Decisão

Os presets oferecidos em `apps/web/src/lib/date-ranges.ts` são só de granularidade mensal: Este mês, Mês anterior, Últimos 3 meses, Últimos 6 meses, Este trimestre, Este ano, Personalizado. **Não** foram implementados presets diários ("Hoje", "Ontem", "Últimos 7 dias") — mesmo que o campo de data aceite qualquer dia (o filtro "Personalizado" usa `<input type="date">`, não `type="month"`), um preset de "Últimos 7 dias" mostraria exatamente o mesmo resultado de "Este mês" sempre que os 7 dias caíssem dentro do mês corrente, e resultado parcial/enganoso quando cruzassem a virada do mês — sem nenhum ganho real de informação, só a aparência de granularidade que os dados não têm.

A API (`GET /analytics/executive`) aceita `date_from`/`date_to` como datas quaisquer (não só primeiro/último dia do mês): um mês é incluído no cálculo se `financial_periods.period` (sempre dia 1) cair dentro de `[date_from com dia forçado para 1, date_to]` — ou seja, um intervalo que termina no meio de um mês ainda inclui aquele mês inteiro, porque não há como recortar dentro dele.

## Alternativas consideradas

- **Oferecer os presets diários da seção 7 literalmente:** rejeitado — violaria a instrução do próprio prompt mestre de "não inventar métricas que os dados não sustentam" (seção 30 do prompt de BI). Um preset que não muda o resultado (ou muda de forma enganosa) é pior que não ter o preset.
- **Bloquear o filtro personalizado para só aceitar primeiro/último dia do mês (`type="month"` como no dashboard antigo):** rejeitado — mais restritivo que o necessário; o back-end já lida corretamente com datas arbitrárias (inclui o mês inteiro), então não há motivo técnico para impedir o usuário de escolher, por exemplo, o dia 15 como referência.

## Consequências

- Se o produto ganhar dados diários no futuro (ex.: integração com GA4/Ads mencionada em `docs/product/vision.md`), os presets diários podem ser adicionados sem quebrar a API atual (ela já aceita qualquer `date_from`/`date_to`) — só precisaria de uma fonte de dado diária real para agregar.
- A comparação "período anterior equivalente" (`previous_equivalent_range`, `app/modules/analytics/date_ranges.py`) é sempre "os N dias imediatamente anteriores ao intervalo", não necessariamente o mês de calendário anterior — documentado e testado explicitamente (`tests/unit/test_date_ranges.py`) para não surpreender quem for estender isso depois.
