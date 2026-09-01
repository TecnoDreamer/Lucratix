# Catálogo de mensagens — convenção

`apps/web/messages/{pt-BR,en,es}.json`. Ver [README.md](README.md) para o contexto geral e o que fica
deliberadamente fora do escopo de tradução.

## Estrutura

Um namespace de nível superior por rota/funcionalidade, geralmente alinhado ao nome do arquivo/pasta em
`src/app/` ou ao componente compartilhado. `useTranslations("namespace.subNamespace")` lê uma chave por vez;
chaves aninhadas (`t("sub.key")`) também funcionam dentro do mesmo namespace passado ao hook.

| Namespace | Cobre |
|---|---|
| `common` | Botões/mensagens genéricas reaproveitadas em várias telas ("Salvar", "Cancelar", "Carregando...", `notApplicable`, `genericConnectionError`, `showingCount`/`loadMore` de paginação) e componentes de uso amplo (`seriesChart`, `dateRangeFilter`, `dataDomains`, `exportPanel`, `metricHelp`). |
| `auth.*` | `/login`, `/register`, `/esqueci-senha`, `/redefinir-senha`, `/confirmar-email`. |
| `authHero` | `components/auth-hero.tsx` (painel lateral das telas de autenticação). |
| `home.about` | `/` e `/sobre`. |
| `organizations.list` / `organizations.companyCard` | `/organizations` e `components/company-card.tsx`. |
| `organizationHome` | `organizations/[id]/page.tsx`. |
| `organizationLayout` | `organizations/[id]/layout.tsx` (nav da empresa). |
| `roles` | `useRoleLabel()` (`lib/roles.ts`) — rótulo de `MembershipRole`. |
| `workspace.quickAccessCards` | Acessos rápidos configuráveis (`lib/quick-access.ts`). |
| `analytics.*` | `organizations/[id]/analytics/page.tsx` + `correlationPanel`/`correlationChart`/`targetsPanel` (componentes usados só ali). `analytics.metricLabels` é reaproveitado por `lib/metrics.ts::useExecutiveMetricOptions()` (painéis de meta/correlação) e por `reports.tsx`. |
| `dashboard.*` | `organizations/[id]/dashboard/page.tsx`. `dashboard.metricLabels` também é reaproveitado por `reports.tsx`. |
| `financials` / `funnel.fields` / `marketing` / `products` / `reports` | Uma sub-página de empresa cada. |
| `orgSettings.*` | `organizations/[id]/configuracoes/page.tsx` (chaves de nível superior) + `orgSettings.logo` (`logo-uploader.tsx`) + `orgSettings.frozenBanner` (`frozen-organization-banner.tsx`). |
| `account.*` | `conta/configuracoes/page.tsx` (Aparência, Idioma, Acessos Rápidos). |
| `centralDeDados.*` | `organizations/[id]/central-de-dados/page.tsx` (chaves de nível superior + `history`) + `centralDeDados.importWizard` (`components/import-wizard.tsx`). |
| `audit` | `organizations/[id]/audit/page.tsx`. |
| `glossario` | `organizations/[id]/glossario/page.tsx` — só o *chrome* (busca, categorias, empty state); o conteúdo de cada métrica vem do catálogo em português (ver README.md). |
| `admin.layout` / `admin.organizations` / `admin.members` / `admin.users` | `/admin/*` (painel de Super Admin). |

## Convenções

- **Reaproveitar antes de duplicar.** Quando o mesmo rótulo já existe em outro namespace com o texto exato
  necessário (ex.: `common.loading`, `common.showingCount`, `analytics.metricLabels`), chame
  `useTranslations` uma segunda vez com o namespace de origem em vez de copiar a string — evita que uma
  tradução futura corrija um lugar e esqueça o outro. Pequenas duplicações inevitáveis (ex.: "Cancelar"
  repetido em vários namespaces de diálogo) são aceitáveis quando os textos não têm uma fonte única óbvia.
- **Array de ícone+rótulo:** nunca guardar o rótulo traduzido num array de módulo. Guardar só `key`/`href`/
  ícone no array e montar um `Record<key, label>` dentro do componente via `useTranslations` (ex.:
  `lib/roles.ts`, `lib/metrics.ts::EXECUTIVE_METRIC_KEYS`, `lib/date-ranges.ts::DATE_RANGE_PRESET_IDS`,
  `lib/data-domains.ts::DATA_DOMAIN_KEYS`).
- **Interpolação/pluralização:** usar a sintaxe ICU do próprio `next-intl` — `{placeholder}` para
  interpolação simples, `{count, plural, one {...} other {...}}` para plural, `{flag, select, true {...}
  other {...}}` para trechos condicionais (ex.: `centralDeDados.importWizard.mappingIntroRest`,
  `admin.organizations.ownerLine`). Nunca montar a string final concatenando `t()` de pedaços fora de uma
  única chave quando ICU resolve — mas **quando um teste precisa localizar um valor dinâmico isoladamente**
  (ex.: `screen.getByText("financeiro.csv")` batendo só no nome do arquivo), mantenha esse valor num
  elemento HTML próprio fora da mensagem traduzida, em vez de interpolá-lo dentro do texto — ver o `<span>`
  ao redor de `job.source_filename` em `import-wizard.tsx`.
- **Fidelidade byte-a-byte em pt-BR.** Todo valor em `pt-BR.json` deve ser idêntico ao texto que substituiu
  no JSX — é o que permite a suíte de testes inteira continuar passando sem `<NextIntlClientProvider>` (ver
  README.md, seção Testes).
- **`npm run check:i18n`** depois de qualquer edição em `messages/*.json` — falha se uma chave existir num
  idioma e faltar em outro.
