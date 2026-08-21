# Modelo de Domínio

## Entidades principais e relacionamentos

- **User** — pessoa que acessa a plataforma. Não pertence a uma organização diretamente; o vínculo é via `Membership`.
- **Organization** — a empresa/cliente acompanhada. É o limite de isolamento multi-tenant (tenant).
- **Membership** — vincula `User` a `Organization` com um `Role`. Um usuário pode ter memberships em várias organizações (ex.: um analista atende vários clientes).
- **Role** — papel dentro de uma organização (`ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `ANALYST`, `VIEWER`) ou global (`PLATFORM_ADMIN`).
- **Baseline** — snapshot histórico e imutável da situação da organização antes/durante o acompanhamento. Uma organização tem 0..N baselines, ordenados por `created_at`; o "baseline vigente" é o mais recente.
- **Product** — produto/serviço vendido pela organização. Referenciado por registros financeiros/campanhas; nunca excluído fisicamente, apenas inativado.
- **FinancialPeriod** — dados financeiros agregados de uma organização em um período (ex.: mês). Um por organização+período.
- **MarketingChannel** — canal de marketing (Google Ads, Meta Ads, orgânico etc.), catálogo por organização.
- **Campaign** — campanha específica, pertence a exatamente um `MarketingChannel` e a uma `Organization`, com período próprio.
- **FunnelSnapshot** — valores das etapas do funil de uma organização em um período.
- **MetricDefinition** — definição versionada de uma métrica (nome, fórmula, unidade, campos usados) — a "fonte da verdade" documentada e também representada em dado, para permitir auditar qual versão da fórmula gerou um número.
- **MetricSnapshot** — valor calculado de uma métrica para uma organização/período, com referência à versão de `MetricDefinition` usada (lineage).
- **Experiment** — experimento de CRO, com hipótese, página/processo, métrica principal, datas.
- **ExperimentVariant** — variante (A/B/...) de um `Experiment`, com amostra e conversões.
- **AuditLog** — registro imutável de ação (usuário, organização, entidade, ação, timestamp, dados antes/depois quando aplicável).
- **IntegrationAccount** / **IntegrationSyncRun** — estrutura futura para integrações externas (não implementada no MVP, apenas modelada).

## Diagrama de classes

Ver [docs/diagrams/class/domain-model.md](../diagrams/class/domain-model.md).

## Invariantes de domínio (resumo — ver [business-rules.md](../requirements/business-rules.md) para a lista completa)

- Toda entidade abaixo de `Organization` carrega `organization_id` e não existe sem uma organização válida.
- `Baseline` é append-only (RN-002).
- `AuditLog` é append-only e não editável via API de aplicação (RN-015).
- `Campaign.channel_id` é obrigatório e aponta para um `MarketingChannel` da **mesma** organização (RN-005).
