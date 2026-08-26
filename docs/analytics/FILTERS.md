# Filtros — Analytics

> Decisão de escopo (por que só presets mensais) em `docs/adr/0006-estrategia-filtros-analytics.md`.

## Filtro de intervalo de datas

Componente: `apps/web/src/components/date-range-filter.tsx`. Presets resolvidos por `apps/web/src/lib/date-ranges.ts::resolvePreset` (puro, testado em `date-ranges.spec.ts`):

| Preset | Intervalo |
|---|---|
| Este mês | 1º dia do mês atual até hoje/fim do mês |
| Mês anterior | mês de calendário anterior completo |
| Últimos 3 meses | do início do mês há 2 meses até o fim do mês atual |
| Últimos 6 meses | do início do mês há 5 meses até o fim do mês atual |
| Este trimestre | trimestre de calendário atual (jan-mar, abr-jun, jul-set, out-dez) |
| Este ano | ano corrente completo |
| Personalizado | `date_from`/`date_to` escolhidos livremente pelo usuário (`<input type="date">`) |

Validação: `date_from > date_to` mostra erro inline e não dispara a busca (nem no componente, nem na API — o endpoint também rejeita com 400 como segunda camada de proteção, já que o filtro pode ser chamado por outros clientes além desta tela no futuro).

## Onde os filtros já existiam antes desta rodada

`dashboard`/`reports` continuam com o seletor de mês único (`<input type="month">`) — não foram alterados nesta rodada; a nova página `analytics` (Visão Executiva) é quem ganhou o filtro de intervalo. Unificar os dois fica como evolução futura, fora do escopo desta etapa (ver seção "Ordem de execução" do prompt de BI — filtros → visão executiva → produtos/lucratividade → ... → relatórios, cada etapa em seu próprio PR).

## Filtros avançados (produto, categoria, canal, etc. — seção 8 do prompt)

**Não implementados nesta rodada.** Dependem de dimensões que hoje não existem de forma consultável nos dados agregados (produto/categoria não têm vínculo com `financial_periods`; canal existe só em `campaigns`, que não alimenta este dashboard — ver `docs/analytics/ARCHITECTURE.md`). Implementar filtro por uma dimensão sem dado real por trás violaria a instrução do prompt de não inventar funcionalidade sem suporte.
