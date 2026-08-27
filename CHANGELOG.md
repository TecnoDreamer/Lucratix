# Changelog

Este arquivo passa a registrar mudanças notáveis a partir desta entrada — o projeto não tinha changelog antes (deploy contínuo, sem versionamento por release). Formato livre inspirado em [Keep a Changelog](https://keepachangelog.com/), agrupado por data.

## 2026-08-27

### Changed
- RN-010 (VIEWER é somente leitura) refinada: a decisão de exigir `ANALYST`+ nos endpoints de lucratividade (tomada em bloco na auditoria de BI) entrava em conflito com a regra já documentada de que VIEWER vê dashboard/relatórios. Resolvido tela por tela com o usuário: VIEWER continua vendo `GET /dashboard`/`GET /dashboard/compare-to-baseline`; `GET /analytics/executive`, `GET /analytics/marketing` e `GET /reports/basic` passam a exigir `ANALYST`+. Ver `docs/requirements/business-rules.md`.

### Fixed
- Logo mobile nas 4 telas de autenticação (login, cadastro, esqueci/redefinir senha) usava `variant="wordmark"` — um recorte que mostra só a base do troféu (sem coroa, taça ou fitas), não um bug de CSS. Trocado para `variant="mark"` (troféu completo), com largura responsiva (`max-w-[120px] sm:max-w-[150px]`, já que a proporção do mark é retrato, diferente do wordmark). Sem regressão no desktop — `AuthHero` (logo pequeno + painel azul) continua intocado.

### Changed
- Wordmark pequeno do painel de marca (canto superior esquerdo do login/cadastro/recuperação de senha) trocado de imagem para texto estilizado ("Lucra" em azul + "tix" em dourado, `--brand-glow`) — o mesmo padrão já documentado em `brand-logo.tsx` para tamanhos abaixo de ~28px de altura, onde o recorte do logo perde legibilidade.

## 2026-08-26

### Added
- Rebranding completo para **Lucratix** (nome, logo, paleta extraída por amostragem do logo, favicon/Open Graph gerados por código, `docs/branding/LUCRATIX_BRAND.md`, `docs/design/DESIGN_SYSTEM.md`).
- Redesign da experiência de autenticação: mostrar/ocultar senha, aviso de Caps Lock, recuperação de senha completa no frontend (`/esqueci-senha`, `/redefinir-senha` — o backend já existia, faltava a UI), rate limiting em `POST /auth/password-reset/request` (não existia). Ver `docs/design/AUTH_UI_UX.md` e `docs/security/AUTHENTICATION.md`.
- Auditoria completa de Business Intelligence/Power BI/Relatórios (`docs/auditoria/AUDITORIA_BI_RELATORIOS.md`), com decisões de escopo confirmadas.
- Sessão única por conta, com validação server-side: login em um novo dispositivo revoga a sessão ativa anterior, com garantia atômica no banco (índice único parcial).
- Analytics — Visão Executiva (RF-023): novo `GET /analytics/executive?date_from=&date_to=`, dashboard por intervalo de datas arbitrário (não mais só um mês), com cada KPI comparado contra o período anterior equivalente e transparência quando o período tem dado incompleto. Nova página `/organizations/[id]/analytics` com filtro de intervalo (presets mensais — ver `docs/adr/0006-estrategia-filtros-analytics.md`).
- Analytics — Marketing: novo `GET /analytics/marketing?date_from=&date_to=`, com ROAS, ROI, CTR, CPC, CPM, CPL e CPA agregados por intervalo de datas a partir das campanhas (mesmo mecanismo de comparação período-contra-período da visão executiva). Nova seção "Marketing" na página de Analytics.
- Relatório executivo com impressão/PDF: botão "Imprimir / Salvar como PDF" (HTML + `@media print`, sem dependência nova — ver `docs/adr/0007-relatorios-html-print-css.md`), com o relatório agora incluindo também as métricas de marketing do período. Qualquer página do app imprime em tema claro, mesmo com o modo escuro ativo.
- Documentação de arquitetura do Power BI (`docs/analytics/POWER_BI.md`, `docs/security/POWER_BI_SECURITY.md`) — sem integração real (sem licença/Azure AD App Registration disponível hoje, decisão de escopo já confirmada com o usuário): duas opções de integração documentadas (conector via API REST vs. embedding "app owns data"), ponto de extensão de autenticação necessário (API key por organização, ainda não implementada) e modelo de ameaças específico de cada opção (RLS obrigatório para embedding, responsabilidade de dado exportado para o conector).
- Nova composição visual do painel de marca (login/cadastro/recuperação de senha): o troféu completo (antes nunca usado, `BrandLogo variant="mark"`) agora aparece em destaque ao lado do texto de boas-vindas, com efeito de rotação 360° na entrada e no hover (CSS puro, sem loop infinito, respeitando `prefers-reduced-motion`).

### Fixed
- Tooltip de métricas (ícone "?") renderizava atrás de cards seguintes do grid do dashboard/relatórios. Causa raiz: hover no ícone também aciona o `transform` de hover do card ancestral, criando um novo *stacking context* que isola o `z-index` do tooltip. Corrigido renderizando o painel via `createPortal` em `document.body`.
- Login em produção retornava 500 para credenciais válidas: a migration da tabela `sessions` nunca tinha sido aplicada ao banco de produção. O container agora roda `alembic upgrade head` automaticamente a cada deploy, e o CI passou a validar a cadeia de migrations do zero.
- Logo mobile pequeno (32px) e desalinhado à esquerda em login/cadastro — agora 64px, centralizado.
- `CampaignRead.roas`/`.ctr` reimplementavam a fórmula inline em vez de usar `app/modules/metrics/engine.py` — corrigido para delegar ao motor de métricas (mesmo valor calculado, agora com fonte única).
- Logotipo (troféu) aparecia cortado em todas as telas de autenticação e na home. Causa raiz: `lucratix-wordmark.png` era um recorte malfeito do troféu completo que capturava uma fatia truncada da haste/colar da taça na borda superior do quadro — não um bug de CSS/container. Recorte refeito a partir de `lucratix-mark.png` (faixa y=[1100,1522], só base + coroa de louros). Ver `docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md`.
- Logo (`BrandLogo`) servia imagens ~7-12× maiores que o necessário: sem `sizes` no `next/image`, o Next mirava a resolução intrínseca inteira (1024px) em vez do tamanho exibido (no máximo 300px). Medido em produção: 58KB/584ms para um logo de 64px de altura. Corrigido com `sizes` por variante.
- `/` (raiz) baixava o bundle inteiro, hidratava e só então chamava `/auth/me` para decidir o redirecionamento — agora é um Server Component que decide pela presença do cookie de sessão, sem round-trip de rede no cliente.
- A conversão de `/` para Server Component fez a tela dedicada de "API fora do ar, tentar novamente" desaparecer (a raiz não busca mais dado nenhum). Reintroduzida em `/organizations` — o primeiro lugar que de fato busca dado após o redirecionamento — distinguindo falha de conexão (mensagem genérica + retry) de um erro real do servidor (mensagem específica), em vez de misturar as duas com o alerta inline de "criar empresa".

## Antes desta entrada

Ver o histórico de Pull Requests e `docs/product/roadmap.md` para o desenvolvimento anterior (fundação técnica, isolamento multi-tenant, dashboards, catálogo/glossário de métricas, configurações de conta, sidebar da área da empresa, etc.).
