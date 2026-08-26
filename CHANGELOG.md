# Changelog

Este arquivo passa a registrar mudanças notáveis a partir desta entrada — o projeto não tinha changelog antes (deploy contínuo, sem versionamento por release). Formato livre inspirado em [Keep a Changelog](https://keepachangelog.com/), agrupado por data.

## 2026-08-26

### Added
- Rebranding completo para **Lucratix** (nome, logo, paleta extraída por amostragem do logo, favicon/Open Graph gerados por código, `docs/branding/LUCRATIX_BRAND.md`, `docs/design/DESIGN_SYSTEM.md`).
- Redesign da experiência de autenticação: mostrar/ocultar senha, aviso de Caps Lock, recuperação de senha completa no frontend (`/esqueci-senha`, `/redefinir-senha` — o backend já existia, faltava a UI), rate limiting em `POST /auth/password-reset/request` (não existia). Ver `docs/design/AUTH_UI_UX.md` e `docs/security/AUTHENTICATION.md`.
- Auditoria completa de Business Intelligence/Power BI/Relatórios (`docs/auditoria/AUDITORIA_BI_RELATORIOS.md`), com decisões de escopo confirmadas.
- Sessão única por conta, com validação server-side: login em um novo dispositivo revoga a sessão ativa anterior, com garantia atômica no banco (índice único parcial).
- Analytics — Visão Executiva (RF-023): novo `GET /analytics/executive?date_from=&date_to=`, dashboard por intervalo de datas arbitrário (não mais só um mês), com cada KPI comparado contra o período anterior equivalente e transparência quando o período tem dado incompleto. Nova página `/organizations/[id]/analytics` com filtro de intervalo (presets mensais — ver `docs/adr/0006-estrategia-filtros-analytics.md`).
- Analytics — Marketing: novo `GET /analytics/marketing?date_from=&date_to=`, com ROAS, ROI, CTR, CPC, CPM, CPL e CPA agregados por intervalo de datas a partir das campanhas (mesmo mecanismo de comparação período-contra-período da visão executiva). Nova seção "Marketing" na página de Analytics.

### Fixed
- Tooltip de métricas (ícone "?") renderizava atrás de cards seguintes do grid do dashboard/relatórios. Causa raiz: hover no ícone também aciona o `transform` de hover do card ancestral, criando um novo *stacking context* que isola o `z-index` do tooltip. Corrigido renderizando o painel via `createPortal` em `document.body`.
- Login em produção retornava 500 para credenciais válidas: a migration da tabela `sessions` nunca tinha sido aplicada ao banco de produção. O container agora roda `alembic upgrade head` automaticamente a cada deploy, e o CI passou a validar a cadeia de migrations do zero.
- Logo mobile pequeno (32px) e desalinhado à esquerda em login/cadastro — agora 64px, centralizado.
- `CampaignRead.roas`/`.ctr` reimplementavam a fórmula inline em vez de usar `app/modules/metrics/engine.py` — corrigido para delegar ao motor de métricas (mesmo valor calculado, agora com fonte única).

## Antes desta entrada

Ver o histórico de Pull Requests e `docs/product/roadmap.md` para o desenvolvimento anterior (fundação técnica, isolamento multi-tenant, dashboards, catálogo/glossário de métricas, configurações de conta, sidebar da área da empresa, etc.).
