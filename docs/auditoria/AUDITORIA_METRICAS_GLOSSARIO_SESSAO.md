# Auditoria — Ajuda contextual de métricas, glossário, perfil da empresa e sessão única

> Etapa 1 do `PROMPT_GLOSSARIO_CONFIGURACOES_SESSAO_UNICA.md`. Levantamento da arquitetura atual antes de qualquer implementação.

## 1. Arquitetura geral

Monorepo (ADR-0001): `apps/api` (FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL) e `apps/web` (Next.js 16 App Router + TypeScript + Tailwind v4), sem ORM/BFF intermediário — o front chama a API diretamente via `fetch` (`apps/web/src/lib/api.ts`). Multi-tenant por `organization_id` (ADR-0003), isolamento centralizado em `get_organization_context` (`apps/api/app/core/deps.py`).

## 2. Onde os dados empresariais são inseridos

Cada área tem sua própria página client-side sob `apps/web/src/app/organizations/[id]/`, cada uma com fetch + formulário próprios (padrão repetido, não um form builder genérico):

| Página | Dado inserido |
|---|---|
| `page.tsx` (raiz) | Baseline (receita, lucro, CAC) |
| `financials/page.tsx` | Período financeiro (receita, custos, despesas, investimento em marketing) |
| `products/page.tsx` | Produtos/serviços (preço, custo) |
| `marketing/page.tsx` | Canais e campanhas |
| `funnel/page.tsx` | Snapshot de funil (8 campos) |
| `experiments/page.tsx` | Experimentos de CRO (hipótese, variantes, amostra/conversões) |

Não existe formulário genérico reutilizável — cada `<input>`/`<label>` é escrito à mão, estilizado via classes compartilhadas em `apps/web/src/lib/ui.ts` (strings Tailwind, não componentes React — decisão deliberada desta sessão para não arriscar a associação implícita de `<label>` da qual os testes E2E dependem).

## 3. Onde os indicadores são exibidos

- `dashboard/page.tsx`: grid de cards (`CARDS` array com `key`/`label`/`percent`/`icon`) — 7 métricas: Receita, Lucro, Margem, CAC, Conversão, Ticket médio, Recorrência.
- `reports/page.tsx`: grid similar, 6 métricas (subconjunto do dashboard).
- Tabelas em `products`, `financials`, `marketing`, `funnel` mostram campos brutos + margem/ROAS calculados.
- Formatação centralizada em `apps/web/src/lib/metrics.ts` (`formatMetric`) e `apps/web/src/lib/business.ts` (`formatValue`) — **já existe um ponto único de formatação**, mas nenhum de *explicação*.
- **Nenhum tooltip, ajuda contextual ou glossário existe hoje.** Siglas (CAC, ROAS, CTR, etc.) aparecem como texto puro.

## 4. Motor de métricas (backend)

`apps/api/app/modules/metrics/engine.py`: funções puras (`margin`, `cac`, `roas`, `roi`, `ltv`, `conversion_rate`, `average_ticket`, `cpl`, `cpa`, `ctr`, `cpc`, `cpm`, `retention_rate`, `churn_rate`, `recurrence_rate`) retornando `MetricResult(value, is_applicable, reason)` — **as fórmulas já existem e são testadas** (`tests/unit/test_metrics_engine.py`), então o catálogo do glossário pode (e deve) referenciar essas fórmulas em vez de reinventá-las, evitando divergência entre o que o backend calcula e o que o glossário explica.

Nem todas as siglas do prompt mestre têm métrica calculada no backend hoje: `LTV` existe na engine mas não é exposta em nenhum endpoint; `MRR`, `ARR`, `Churn` (como card) não aparecem no dashboard atual. O glossário pode/deve catalogar todas (é educacional, não depende de estarem "ligadas" a um card), mas isso deve ficar explícito no catálogo para não prometer explicação de um número que a tela não mostra.

## 5. Sistema de autenticação (estado atual)

ADR-0004: JWT stateless — `access_token` (15 min) + `refresh_token` (7 dias), ambos `HttpOnly`/`SameSite=Lax`/`Secure` (produção) em cookies. Implementado em `apps/api/app/core/security.py` (`create_access_token`, `create_refresh_token`, `decode_token`) e `apps/api/app/modules/auth/router.py`.

- **`POST /api/v1/auth/refresh`** (adicionado nesta sessão, PR #34): lê `refresh_token`, reemite `access_token`. Não rotaciona o refresh token.
- **Sem tabela de sessão.** `decode_token` só valida assinatura + expiração — qualquer JWT válido é aceito, não há como invalidar um token individual antes de expirar.
- **Issue #24 já documentada** ("Revogação server-side de refresh token") descreve exatamente essa lacuna — a sessão única é, na prática, a extensão natural dessa issue.
- Rate limiting (`RateLimiter` em `apps/api/app/core/rate_limit.py`): **em memória**, não compartilhado entre instâncias — relevante porque a solução de sessão única também precisa ser à prova de concorrência real (constraint/transação no banco), não um dicionário em memória.
- `get_current_user` (`apps/api/app/core/deps.py`): decodifica o cookie, busca o `User` no banco — **ponto natural para inserir a checagem de `session_id`**.

## 6. Banco de dados / ORM

PostgreSQL + SQLAlchemy 2.0 (`Mapped`/`mapped_column`) + Alembic (migrations manuais, não autogeradas — ver `apps/api/alembic/versions/`). Padrão de modelo: `UUIDPrimaryKeyMixin` + `TimestampMixin`/`CreatedAtMixin` (`apps/api/app/models/mixins.py`). Enums usam `values_callable` (bug já corrigido nesta sessão — ver `app/models/membership.py`).

Não há tabela `sessions` hoje. Adicioná-la é uma migration nova, sem tocar nas existentes.

## 7. Middleware existente

- `SecurityHeadersMiddleware`: headers básicos (`X-Content-Type-Options`, `X-Frame-Options`, CSP restritiva).
- `CORSMiddleware`: origem única (env `CORS_ALLOWED_ORIGINS`), `allow_credentials=True`.
- `GZipMiddleware` (adicionado nesta sessão).
- **Não há middleware de sessão** — a validação de auth acontece via dependency (`get_current_user`), não via middleware global. A checagem de `session_id` deve seguir o mesmo padrão (dependency), não um novo middleware, para não duplicar a lógica de "onde a auth é aplicada".

## 8. Rotas protegidas

Todas as rotas de organização dependem de `get_organization_context` (que já depende de `get_current_user`). Rotas de conta (`/api/v1/auth/me`, `/change-password`) dependem só de `get_current_user`. Não existe rota de "perfil" ou "configurações" hoje — nem no backend nem no frontend.

## 9. Design System / componentes reutilizáveis

- `apps/web/src/lib/ui.ts`: strings de classe Tailwind (`input`, `label`, `buttonPrimary`, `card`, etc.) — não componentes.
- `apps/web/src/components/ui.tsx`: `Card`, `Alert`, `Badge`, `EmptyState`, `Skeleton` — componentes de apresentação genéricos, já no padrão certo para um `MetricHelp`/`Tooltip` se seguir o mesmo estilo.
- `apps/web/src/components/icons.tsx`: ícones SVG **próprios** (sem lib externa, decisão desta sessão para não arriscar CI). Precisa de um ícone novo tipo `IconHelpCircle`/`IconInfo` seguindo o mesmo padrão (`base()` helper, `aria-hidden`, 24×24, `strokeWidth 1.75`).
- Paleta: azul/branco (Tailwind `blue`/`slate`), estabelecida no redesign desta sessão — o glossário e a sidebar devem seguir a mesma paleta, não introduzir uma nova.
- **Não existe sistema de tooltip/popover hoje.** Precisa ser construído do zero (Radix UI seria a escolha padrão de mercado, mas é uma dependência nova — avaliar no planejamento; alternativa: implementação própria com `aria-describedby` + `position: absolute`, mais trabalho mas zero dependência nova, consistente com a decisão de ícones próprios).

## 10. Testes existentes

- **Unitários** (`tests/unit/`): motor de métricas, segurança (hash/JWT), hierarquia de papéis, análise de experimentos, rate limiter, tokens de reset de senha.
- **Integração/API** (`tests/integration/`, `tests/api/`, `tests/security/`): fluxo de auth, isolamento multi-tenant, CRUD de cada módulo, autorização (RBAC).
- **E2E** (`tests/e2e/`, Playwright): 12 testes cobrindo auth, organizações, baseline/dashboard, financeiro/marketing, isolamento, permissões, troca de empresa. Todos preservam textos/roles exatos usados pelos `getByLabel`/`getByRole`/`getByText` — **qualquer novo componente (tooltip, sidebar, glossário) precisa manter os textos/labels existentes intactos**, já que a suíte não pode quebrar.
- `helpers.ts` (`registerAndLogin`, `createOrganization`) são reaproveitáveis para os novos testes de sessão única (`browser.newContext()` já é usado em `multi_tenant_isolation.spec.ts` e `permissions.spec.ts` — o padrão de dois contextos independentes pedido na seção 42 do prompt já tem precedente direto no código).

## 11. Acessibilidade

Nenhum padrão formal documentado, mas o código já usa `aria-hidden` em ícones decorativos e `aria-current="page"` na navegação (layout da organização). Foco visível via `focus:ring-4` nas classes de `lib/ui.ts`. Base razoável para expandir.

## 12. Perfil da empresa (estado atual)

**Não existe.** O mais próximo é `organizations/[id]/layout.tsx` — o "shell" com nav horizontal (Dashboard, Produtos, Financeiro, Marketing, Funil, Experimentos, Relatório, Auditoria) que criei no redesign. O prompt pede uma sidebar com uma estrutura diferente (Visão Geral, Dados, Indicadores, Glossário / Perfil, Configurações, Segurança) — **isso é uma reestruturação da navegação existente**, não uma adição isolada.

---

## Pontos de alteração

| Área | Arquivos principais |
|---|---|
| Catálogo de métricas | novo: `apps/web/src/domain/metrics/` |
| Tooltip/ajuda contextual | novo componente + novo ícone em `components/icons.tsx` |
| Glossário | nova rota `organizations/[id]/glossary/page.tsx` |
| Sidebar | reescreve `organizations/[id]/layout.tsx` (nav horizontal → sidebar) |
| Configurações | nova rota `organizations/[id]/settings/page.tsx` + tabela de preferências (backend) |
| Segurança/perfil | nova rota `organizations/[id]/security/page.tsx` (ou fora do escopo de organização, já que sessão é por **usuário**, não por empresa — ver Riscos) |
| Sessão única (backend) | `app/models/` (nova tabela `sessions`), `app/core/security.py`, `app/core/deps.py`, `app/modules/auth/router.py`, migration nova |
| Sessão única (frontend) | `lib/api.ts` (interceptar `401`/`SESSION_REVOKED`), novo componente de aviso |

## Riscos (decisões confirmadas com o usuário em 2026-08-25)

1. **Sessão é por usuário, não por empresa.** ✅ Confirmado: a tela de Segurança vive em `/conta/seguranca`, fora do escopo `organizations/[id]/`, já que login/sessão são de `User`, não de `Organization`.
2. **Sessão única pode derrubar dispositivos legítimos simultâneos** (o próprio usuário testou de notebook e celular na mesma rede durante esta sessão). ✅ Confirmado: implementar exatamente como pedido no prompt, valendo inclusive para o ambiente de demo já em produção.
3. **Rate limiter em memória** não escala para múltiplas instâncias — não é um problema agora (Railway roda 1 réplica), mas a tabela de `sessions` deve ser a fonte de verdade (banco), nunca memória, para não repetir essa limitação numa feature de segurança.
4. **Refresh token não rotaciona** (decisão documentada no ADR-0004) — ao implementar sessão única, faz sentido revisitar isso junto, já que "revogar sessão anterior" e "rotacionar token" são o mesmo mecanismo por baixo.
5. **12 testes E2E existentes não podem quebrar.** Qualquer mudança na navegação (sidebar) ou no cookie de auth precisa ser validada contra a suíte inteira antes de mergear.
6. **Escopo é grande.** O prompt pede 4 features substanciais (ajuda contextual, glossário, sidebar/configurações, sessão única) — a Etapa 7 (sessão única) sozinha é uma mudança de segurança em produção (o site de demo está no ar agora). Recomendo confirmar prioridade/ordem antes de implementar tudo de uma vez.

## Estratégia proposta (resumo — detalhe no plano após confirmação)

- **Catálogo de métricas**: TypeScript puro no frontend (`src/domain/metrics/metric-definitions.ts`), sem chamada de API por tooltip (seção 39 do prompt). Fórmulas copiadas fielmente das já testadas em `engine.py`, com um teste que documenta a paridade textual (fórmula do catálogo == docstring/comentário da engine) para não divergirem no futuro.
- **Tooltip**: componente próprio (`MetricHelp`), sem dependência nova, seguindo o padrão de `components/ui.tsx`. Popover simples com posicionamento via CSS, fecha com `Escape`, funciona por clique (mobile) e hover+foco (desktop).
- **Glossário**: rota nova sob `organizations/[id]/`, busca client-side (sem API — o catálogo já está no bundle), agrupamento alfabético automático via `Object.groupBy`/`reduce`.
- **Sidebar**: substitui o nav horizontal atual por uma sidebar (fixa em desktop, drawer em mobile), preservando todos os `href`/labels atuais (não quebrar os 12 testes E2E) e adicionando os itens novos (Glossário, Configurações, Segurança).
- **Sessão única**: nova tabela `sessions` (`id`, `user_id`, `session_id_hash`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`), `refresh_token` passa a carregar um `jti` validado contra essa tabela a cada request autenticada (via `get_current_user`), login revoga sessões anteriores do usuário numa transação atômica (`UPDATE ... WHERE user_id = ? AND revoked_at IS NULL`).

---

**Próximo passo:** apresentar o resumo de 7 pontos pedido na seção 55 do prompt e aguardar confirmação antes de abrir issues/branches.
