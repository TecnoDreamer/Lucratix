# Internacionalização (pt-BR / en / es)

Documenta a internacionalização da plataforma introduzida em 2026-09-01 (item 9 do prompt mestre
"Workspace, Configurações, Gestão de Empresas e Internacionalização"), depois de PR 1 (navegação/central de
configurações/acessos rápidos) e PR 2 (busca/paginação, ciclo de vida, logotipo de organizações).

- [CATALOGO_DE_MENSAGENS.md](CATALOGO_DE_MENSAGENS.md) — convenção de namespace/chave dos arquivos
  `apps/web/messages/*.json`.

Ver também [ADR-0009](../adr/0009-estrategia-i18n.md) (decisão de roteamento sem prefixo de URL +
persistência cookie/coluna).

## Escopo desta rodada

**Implementado:** todo texto estático da UI do frontend — rótulos, botões, cabeçalhos, placeholders,
empty states, tooltips, mensagens de ajuda — nas ~24 rotas do App Router e nos componentes compartilhados,
incluindo o painel de Super Admin (`/admin`). Seletor de idioma em Configurações → Idioma
(`conta/configuracoes`), com sincronia entre dispositivos.

**Deliberadamente fora de escopo** (não é lacuna esquecida — permanece só em português independente do
idioma escolhido na UI):

1. **Mensagens de erro vindas do backend** (`ApiError.message`, todo `HTTPException(detail=...)` do
   FastAPI). Essa é a superfície mais visível da limitação: o caminho mais comum do app (falha de login,
   "Credenciais inválidas") continua em português mesmo com a UI em `en`/`es`. Traduzir isso exigiria uma
   segunda frente de trabalho no backend (100+ strings espalhadas por ~15 módulos, e um sistema de código de
   erro em vez de string livre) — escopo de uma PR própria. Só o texto de fallback **autoral do frontend**
   (o lado `else` de `err instanceof ApiError ? err.message : "<fallback traduzido>"`) foi traduzido.
2. **E-mails transacionais** (`core/email.py`, `modules/auth/service.py`) — 100% hardcoded em português, sem
   parâmetro de idioma em nenhuma chamada.
3. **Formatação de número/data/moeda** (`lib/formatters.ts`, `LOCALE = "pt-BR"` fixo) — regra explícita do
   prompt mestre: nunca misturar idioma de UI com apresentação de moeda/número. Um usuário com a UI em
   inglês continua vendo valores no formato `1.234,56`, nunca `1,234.56`. Único texto tratado como cópia (não
   formato) dentro dos helpers de métrica: o literal "não aplicável" — `formatMetric`/`formatPercentChange`
   (`lib/metrics.ts`) e `formatValue` (`lib/business.ts`) passaram a exigir esse rótulo como parâmetro em vez
   de hardcodá-lo, eliminando qualquer risco de um card ficar preso em português.
4. **Catálogo de definições de métricas do Glossário** (`domain/metrics/metric-definitions.ts` — nome,
   descrição, fórmula e exemplo de cada uma das ~18 métricas, consumido pelo Glossário e por `MetricHelp`).
   Mesmo tratamento dado a mensagens de erro/e-mails: é conteúdo de domínio financeiro/marketing que exigiria
   uma frente de tradução terminológica própria (não uma extração de string de UI), e a própria lógica de
   busca/ordenação do catálogo (`searchMetrics`, `sortMetricsAlphabetically` em `metric-utils.ts`) já assume
   pt-BR como idioma canônico — os aliases em inglês existentes (ex.: `"customer acquisition cost"` para
   CAC) são só um atalho de busca, não uma segunda versão de idioma completa. Pela mesma razão,
   `lib/insights.ts` (observações do dashboard executivo, que embutem o nome da métrica do catálogo dentro
   de uma frase) também não é traduzido. Fica traduzido, porém, todo o *chrome* ao redor: busca, filtro de
   categoria (`useMetricCategoryLabels`, em `metric-utils.ts`), navegação alfabética, "maior/menor é
   melhor", "ver explicação completa".
5. **Metadados `<head>`** (`title`/`description` de `app/layout.tsx`) — cópia de SEO focada no mercado PT,
   decisão explícita.
6. **Dado gerado pelo usuário** (nome de empresa, observações, motivo de encerramento, nome de campanha
   etc.) — nunca traduzido, é conteúdo do usuário, não cópia da aplicação.

## Arquitetura (resumo — detalhes no ADR-0009)

- `next-intl` no modo "sem roteamento i18n": nenhuma rota muda de lugar, o idioma nunca aparece na URL.
  `src/i18n/request.ts` resolve o idioma no servidor a partir do cookie `NEXT_LOCALE` a cada request.
- Persistência em duas camadas: cookie (`src/lib/locale.ts`) para leitura imediata no servidor + coluna
  `users.locale` (nullable — `NULL` = nunca escolheu, usa pt-BR) para sincronia entre dispositivos via
  `PATCH /api/v1/auth/locale` e `<LocaleSync />` (componente cliente montado no layout raiz).
- Seletor em `conta/configuracoes` (`components/locale-switcher.tsx`), mesmo padrão visual do seletor de
  tema.

## Padrão de extração usado no código

Sempre que um array de nível de módulo combinava um ícone/chave (não traduzível) com um rótulo de texto
(`label`), o rótulo foi removido do array e reconstruído dentro de um componente via `useTranslations` — ex.:
`lib/roles.ts::roleLabel()` virou o hook `useRoleLabel()`; `lib/metrics.ts::EXECUTIVE_METRIC_OPTIONS` virou
`EXECUTIVE_METRIC_KEYS` + `useExecutiveMetricOptions()`; mesma ideia em `lib/date-ranges.ts` e
`lib/data-domains.ts`.

**Cuidado conhecido:** `useTranslations()` retorna uma função **nova a cada render** — nunca deve entrar num
array de dependências de `useCallback`/`useMemo`/`useEffect` (quebra a memoização; um caso real virou um
loop de renderização infinito durante o desenvolvimento desta feature, capturado pela suíte de testes). A
correção é sempre omitir o tradutor do array de deps com um comentário `eslint-disable-next-line
react-hooks/exhaustive-deps` explicando o motivo — nunca adicioná-lo ao array.

## Testes

Nenhum dos ~50 arquivos de teste de frontend pré-existentes precisou de `<NextIntlClientProvider>`: um mock
global em `vitest.setup.ts` troca `useTranslations`/`useLocale` por `createTranslator({locale: "pt-BR",
messages, namespace})` (API oficial do next-intl para testes), usando o próprio `messages/pt-BR.json` como
fonte. Isso só funciona porque cada valor extraído é **idêntico, caractere por caractere**, ao texto
hardcoded que substituiu — qualquer PR futura que altere uma string em `messages/pt-BR.json` deve conferir
se algum `screen.getByText(...)` deixou de bater.

`npm run check:i18n` (`apps/web/scripts/check-i18n-keys.mjs`) compara as chaves dos 3 arquivos de mensagem e
falha se um idioma estiver com alguma faltando — rodar depois de qualquer edição em `messages/*.json`.
