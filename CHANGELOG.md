# Changelog

Este arquivo passa a registrar mudanças notáveis a partir desta entrada — o projeto não tinha changelog antes (deploy contínuo, sem versionamento por release). Formato livre inspirado em [Keep a Changelog](https://keepachangelog.com/), agrupado por data.

## 2026-09-03

### Added (Funil multicanal — inventário e adoção nas demais telas, PR4 de 4)
- `GET /api/v1/organizations/{id}/reports/basic/pdf?period=` — Relatório Básico (RF-026)
  em PDF server-side, mesmo padrão de `pdf_builder.py` da PR3 (KPIs do período,
  comparação com o baseline, marketing do período — omitido sem campanha no período).
  Mesma permissão (`ANALYST+`) de `/reports/basic`; nenhuma regra de negócio nova.
- Botão "Baixar relatório em PDF" na tela de Relatório (ao lado do "Imprimir/Salvar PDF"
  existente, mantido) e no Dashboard (só para ANALYST+, já que o endpoint exige esse
  papel mas o Dashboard continua visível a VIEWER).
- Gráfico de evolução (receita/lucro/margem) em Financeiro, reaproveitando `SeriesChart`
  sobre o dado já buscado — nenhum endpoint novo.
- Seção "Desempenho por Canal" em Marketing: filtro de período + `ChannelBarChart`
  (componente novo, **genérico** — ao contrário dos gráficos Recharts do Funil) + a
  tabela `MarketingByChannelTable` já existente, sobre `GET /analytics/marketing/by-channel`
  (endpoint já existente, não consumido por nenhuma tela até agora).
- `docs/reports/PR4_INVENTARIO.md` (novo) — decisão tela a tela (adotar/adiar/não
  aplicável) para Dashboard, Analytics, Produtos, Financeiro, Marketing, Experimentos,
  Relatório, Central de Dados e Auditoria. Fecha a série de 4 PRs do Funil Multicanal.

### Added (Funil multicanal — relatório em PDF server-side, PR3 de 4)
- Infraestrutura reutilizável de relatório em PDF (`app/modules/reports/pdf_builder.py`,
  ReportLab — decisão confirmada com o usuário, sem nenhuma biblioteca de sistema, ao
  contrário de WeasyPrint) para qualquer relatório futuro compor suas seções.
- `GET /api/v1/organizations/{id}/reports/funnel/pdf?date_from&date_to` — relatório do
  Funil em 11 seções (capa, sumário executivo, visão geral das etapas, conversão/abandono
  com gargalo destacado, comparação com período anterior, evolução mensal, segmentação e
  comparação por canal — omitidas quando não há canal com dado, observações
  determinísticas, definições, rodapé/paginação). Mesma permissão (`ANALYST+`) e mesma
  validação de `/analytics/funnel`; nenhuma regra de negócio nova, só composição.
- `describe_bottleneck`/`describe_biggest_mover` (`funnel_analytics.py`) — port pro Python
  das mesmas 2 regras de `lib/funnel-insights.ts`, para o sumário executivo determinístico.
- `app/core/formatting.py` (novo) — formatação pt-BR de número no backend, necessária
  porque o PDF é gerado inteiramente no servidor.
- Botão "Gerar relatório PDF" (`GeneratePdfReportButton`, componente reutilizável) na
  seção "Análise do Funil".
  Ver `docs/reports/PDF_INFRAESTRUTURA.md`/`FUNIL_PDF.md`.
  [#112](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/112)

## 2026-09-02

### Added (Funil multicanal — UX, Glossário completo, Recharts, PR2 de 4)
- Nova seção "Análise do Funil" na tela de Funil (`organizations/[id]/funnel`):
  alternância Agregado/Por canal (`SegmentedControl`, componente novo extraído do
  padrão de botões-pílula já duplicado), cards das 8 etapas, visualização em
  funil e evolução temporal (`GET /analytics/funnel/series`, endpoint novo),
  conversão/abandono por etapa com o "gargalo" (menor conversão aplicável)
  destacado, insights determinísticos e `FunnelByChannelTable` (drill-down por
  canal, seções expansíveis). Tabela/formulário de lançamento manual inalterados.
- **Recharts** adotado (primeira exceção ao padrão de gráfico SVG artesanal do
  produto) — só no Funil, pelas 3 visualizações acima.
- 13 verbetes novos no Glossário (Funil, Impressões, Visitas, Lead, MQL, SQL,
  Oportunidade, Cliente, Recompra, Canal, Campanha, Fonte, Plataforma) — os 2
  últimos documentados como conceitos ainda não modelados neste sistema.
  `MetricDefinition.unit`/`direction` viram opcionais para suportar esse tipo de
  verbete categórico. O ícone `?` reutilizável (`MetricHelp`) já existia.
  Ver `docs/funnel/README.md`.
  [#111](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/111)

### Added (Funil multicanal — modelagem e KPIs, PR1 de 4)
- `funnel_snapshots.channel_id` (nullable, migration `0016_funnel_snapshot_channel`) —
  o funil passa a poder ser segmentado por canal, sem alterar o comportamento do
  funil agregado que já existia (`channel_id IS NULL`). `GET /analytics/funnel`
  (conversão e abandono etapa-a-etapa, com comparação período-a-período) e
  `GET /analytics/funnel/by-channel` (drill-down por canal, mesmo padrão de
  `/analytics/marketing/by-channel`). Segmentação por canal também na
  importação/exportação de Funil (Central de Dados). Novo verbete no Glossário:
  "Taxa de Abandono". Primeira de 4 PRs — UX/Glossário completo/Recharts (PR2),
  PDF (PR3) e adoção em outras telas (PR4) ficam para rodadas seguintes. Ver
  `docs/funnel/README.md`.
  [#110](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/110)

### Added (tela de alteração de senha)
- Nova seção "Senha" na Central de Configurações (`components/change-password-card.tsx`),
  front-end para `POST /api/v1/auth/change-password` — o endpoint já existia e já era
  testado desde a política de senha forte (2026-09-01), mas não tinha nenhuma tela.
  Mesmo checklist de requisitos em tempo real de `/register`/`/redefinir-senha`; campo
  de senha atual não exige a política (é senha já existente, possivelmente legado).
  Ver `docs/security/POLITICA_DE_SENHAS.md`.

## 2026-09-01

### Fixed (formatação de percentual)
- Margem em Financeiro/Produtos e variação em Dashboard/Relatórios usavam `.toFixed()`
  (sempre ponto decimal) em vez do formatador pt-BR do app — corrigido para usar
  `formatPercentage`/`formatPercentChange` (vírgula), com teste novo
  (`financials.spec.tsx`). [#106](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/106)

### Added (política de senha forte)
- Toda senha nova (cadastro, alteração, redefinição, convite/criação administrativa)
  passa a exigir 8+ caracteres, 1+ maiúscula, 1+ caractere especial, 3+ números —
  validado no backend (`app/core/password_policy.py`, autoridade) e espelhado no
  frontend só para feedback em tempo real (`lib/password-policy.ts` +
  `components/password-requirements-checklist.tsx`). Nenhuma conta existente é
  invalidada. Ver `docs/security/POLITICA_DE_SENHAS.md`.
  [#107](https://github.com/AleksGustavo/marketing-intelligence-platform/pull/107)

### Added (organizações: busca/paginação, ciclo de vida, logotipo)
- "Suas empresas" agora busca e pagina no servidor (`GET /api/v1/organizations?search=&status=&limit=&offset=`,
  formato `{items, total, limit, offset}` — antes devolvia sempre a lista inteira do usuário, sem filtro,
  o que não escala para centenas de empresas). Abas Ativas/Encerradas/Todas, busca com debounce,
  "Carregar mais". Ver `docs/organizations/BUSCA_PAGINACAO.md`.
- Ciclo de vida de organização: `status` (`active`/`frozen`) + congelar/reativar
  (`POST /organizations/{id}/freeze`, `/reactivate`) — encerrar um cliente **nunca apaga histórico**
  (financeiro, marketing, funil, produtos, experimentos, metas, importações, auditoria continuam
  intactos e legíveis). Bloqueio de escrita numa empresa congelada aplicado num único ponto
  (`core/deps.py::get_organization_context`), cobrindo automaticamente todo módulo de domínio existente
  sem alteração neles. Leitura nunca é bloqueada — deep link para empresa encerrada nunca vira 404. Ver
  `docs/adr/0008-organizacoes-nunca-deletar.md` e `docs/organizations/CICLO_DE_VIDA.md`.
- Logotipo por empresa via Cloudinary (`POST`/`DELETE /organizations/{id}/logo`), sem dependência nova
  (upload assinado via `data:` URI base64 + `urlencode`, stdlib). Validação de conteúdo real (assinatura
  de bytes, nunca extensão declarada), SVG rejeitado, 2 MB máximo, redimensionamento no próprio upload.
  Autorização: dono/admin da empresa **ou** Super Admin da plataforma (nova exceção documentada em
  `docs/security/ACCESS_CONTROL.md`). Nova tela `organizations/[id]/configuracoes` — não existia nenhuma
  tela de edição de empresa antes desta rodada. Ver `docs/organizations/LOGOTIPO.md`.
- `.env.example`/`docker-compose.yml` ganharam `CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET` (vazio =
  upload desabilitado, mesmo padrão do `RESEND_API_KEY`).

### Added (internacionalização pt-BR/en/es)
- Toda a UI estática do frontend passa a ser traduzível — seletor de idioma em Configurações → Idioma
  (`conta/configuracoes`), sem prefixo de idioma na URL (`next-intl` no modo "sem roteamento i18n").
  Persistência em duas camadas: cookie `NEXT_LOCALE` (leitura imediata no servidor) + nova coluna
  `users.locale` (migration `0015_user_locale_preference`, nullable — sincronia entre dispositivos via
  `PATCH /api/v1/auth/locale` e `<LocaleSync />`). Cobre as ~24 rotas do App Router e os componentes
  compartilhados, incluindo o painel de Super Admin (`/admin`). Deliberadamente fora do escopo (continuam
  só em português): mensagens de erro vindas do backend, e-mails transacionais, formatação de
  número/data/moeda, e o catálogo de definições de métricas do Glossário. Ver `docs/i18n/README.md` e
  `docs/adr/0009-estrategia-i18n.md`.
- Nenhum dos ~50 arquivos de teste de frontend pré-existentes precisou de mudança por causa da extração:
  mock global de `next-intl` em `vitest.setup.ts` via `createTranslator`, usando `messages/pt-BR.json`
  como fonte (cada string extraída é idêntica, caractere por caractere, ao texto que substituiu). Novo
  `npm run check:i18n` valida paridade de chaves entre `messages/{pt-BR,en,es}.json`.

## 2026-08-31

### Added (workspace: navegação e acessos rápidos)
- Corrigido o "Voltar" de Configurações: sempre ia para "Suas empresas", nunca para a empresa ativa
  (`apps/web/src/app/conta/layout.tsx` tinha um link fixo). Agora resolve via `?from=<orgId>` (escrito pela
  sidebar) + `localStorage` como fallback para deep link/refresh, sempre validado contra a lista real de
  organizações do usuário (nunca confia num id cru vindo da URL) — cobre botão visual, Back nativo,
  sidebar, deep link, refresh e sessão expirada. Nunca usa `router.back()` (histórico pode conter deep
  link/refresh/página externa). Ver `docs/workspace/NAVEGACAO.md`.
- Cards de "Acesso rápido" da Home agora são configuráveis (ativar/desativar, reordenar por
  cima/baixo — sem drag-and-drop, requisito de acessibilidade) e persistidos por usuário+empresa
  (nova tabela `user_workspace_preferences`, migration `0013_user_workspace_preferences`; novo endpoint
  `GET/PATCH /api/v1/organizations/{id}/workspace-preferences`, sem exigir papel mínimo — é preferência
  pessoal de UI, mesma categoria do tema claro/escuro). Uma preferência salva nunca "ressuscita" um card
  que o papel atual do usuário não permite (regra estrutural, não só validação de entrada — ver
  `docs/workspace/ACESSOS_RAPIDOS.md`). Nova seção "Acessos rápidos" em Configurações.
- Home reordenada: Acesso rápido → Ações rápidas → Histórico/Registrar baseline → Resumo do mês (KPIs) →
  alerta de queda de receita (mantido junto do Resumo, por derivar da mesma comparação de baseline).

### Added (verificação de e-mail)
- E-mail transacional real (RF-001) — cadastro nunca enviava e-mail de confirmação nenhum, porque nenhum
  serviço de envio existia. Pedido de autenticação por e-mail e WhatsApp; pesquisado antes de prometer
  algo: WhatsApp (mensagem de verificação = categoria "Authentication") **não é gratuito por padrão**
  segundo a própria documentação da Meta, cobrado desde a primeira mensagem — fora de escopo até haver
  decisão explícita de assumir esse custo. E-mail via Resend é genuinamente grátis em volume razoável
  (3.000/mês) — escolhido e implementado.
- `app/core/email.py::send_email` — `urllib.request` da biblioteca padrão, **nenhuma dependência nova**
  (POST direto pra API REST do Resend). Sem `RESEND_API_KEY` configurada, nunca tenta rede — devolve
  `False` (comportamento idêntico ao de antes desta rodada, liga sozinho quando a env var aparecer).
  Reaproveitado por três fluxos que já existiam e ficavam presos no fallback `dev_token`: cadastro (novo,
  esta rodada), reset de senha e criação de conta por admin/Super Admin (memberships, painel de Super
  Admin) — um só ponto de envio para os quatro casos.
- Nova tabela `email_verification_tokens` (migration `0012_email_verification`) — mesma forma de
  `PasswordResetToken`, tabela separada de propósito (nunca reaproveita o mesmo token para os dois usos).
  `User.email_verified_at` (RN-004: ausência ≠ falso). `generate_password_reset_token`/
  `hash_password_reset_token` renomeados para `generate_opaque_token`/`hash_opaque_token`
  (`app/core/security.py`) — o primitivo sempre foi genérico, o nome é que estava específico demais
  agora que serve dois propósitos.
- `POST /auth/verify-email`, `POST /auth/resend-verification` (genérico + rate limited, RN-012),
  `GET /auth/me` ganha `email_verified: bool`. **Decisão deliberada: nunca bloqueia login** — evita travar
  o próprio fluxo de conta criada por admin, que já usa token pra definir senha; vira lembrete não
  bloqueante em "Suas empresas", com botão de reenviar. Frontend: nova página `/confirmar-email`,
  banner de `dev_token` no cadastro (mesmo padrão de `esqueci-senha/page.tsx`).
- `docs/security/AUTHENTICATION.md`: passo a passo completo pra ativar o Resend de verdade (conta, API
  key, verificação de domínio — essa parte exige o usuário, não é algo que a IA faz sozinha).

### Added (controle de acesso)
- Níveis de acesso reais e painel de Super Admin (RF-001, RF-012, RN-009) — já especificados desde o
  início do projeto (`docs/product/personas.md`, "Administrador(a) da Plataforma"), nunca implementados:
  `User.is_platform_admin` existia no schema mas não era checado em lugar nenhum. Nova
  `require_platform_admin` (`app/core/deps.py`) protege um módulo novo, `app/modules/platform_admin/`
  (`/api/v1/platform/*`) — deliberadamente separado de `get_organization_context`/RNF-002 (isolamento
  multi-tenant intocado): Super Admin gerencia QUEM tem acesso a QUAL empresa, não vê dado de negócio de
  dentro delas. Escopo: listar todas as empresas/usuários da plataforma, criar conta de usuário
  diretamente (sem exigir autocadastro prévio), conceder/revogar/alterar acesso a qualquer empresa mesmo
  sem membership nela, ativar/desativar contas, conceder/revogar o próprio `is_platform_admin` de
  outros usuários (nunca do próprio, trava anti-lockout). Bootstrap do primeiro Super Admin fora da API
  (`python -m app.scripts.grant_platform_admin email@...`, contra o banco — nunca autopromoção via HTTP).
  Endpoint de convite por empresa (`POST /organizations/{id}/memberships`) deixou de exigir que a pessoa
  já tivesse conta: cria na hora, reaproveitando o mesmo mecanismo de "esqueci minha senha"
  (`PasswordResetToken`, `/redefinir-senha`) para a pessoa definir a própria senha — nenhum model,
  endpoint de confirmação ou página novos. Nova `DELETE /organizations/{id}/memberships/{id}` (revogar
  acesso, não existia nenhuma rota disso antes). Frontend: painel `/admin` (`organizations`, `users`),
  visível só para Super Admin (link em "Suas empresas"). Detalhes completos, incluindo a tabela dos 5
  níveis, em `docs/security/ACCESS_CONTROL.md`.

### Added (experimentos)
- Significância estatística real em Experimentos (CRO/A-B testing) — RN-013 previa isso desde o início ("...e, quando implementado, significância estatística...") e nunca tinha acontecido; item recomendado e escolhido entre as opções levantadas para "o que fazer sem envolver nada pago". Teste-z de duas proporções (`apps/api/app/modules/experiments/analysis.py::two_proportion_z_test`), `statistics.NormalDist` da biblioteca padrão do Python — nenhuma dependência nova (mesmo espírito de `engine.py::correlation`, que já usa `statistics.correlation`). Cada variante é comparada contra a Controle (a primeira da lista), só depois que a amostra mínima de 30 é atingida em todas (piso que já existia, inalterado); `p_value`/`is_significant` (nível de confiança 95%, `significance_alpha` exposto na resposta) somam-se ao `leading_variant_name`/`note` já existentes, nunca os substituem — o sistema continua nunca usando a palavra "vencedor". Variância combinada zero (ex.: 0% contra 0%) devolve `p_value=None`, nunca um valor fabricado. Limitação documentada (`docs/product/out-of-scope.md`): com 3+ variantes são comparações par-a-par contra a Controle, sem correção para múltiplas comparações; sem teste omnibus (qui-quadrado), que exigiria reimplementar a função gama incompleta regularizada. Frontend: badge por variante ("significativo (p=0.010)" / "não significativo (p=0.606)", `Badge` ganhou o tom `emerald`) na página de Experimentos.

### Added (importação)
- Seleção de aba em arquivo `.xlsx` com múltiplas abas — antes só a primeira aba não vazia era lida
  (limitação documentada desde 2026-08-29), qualquer outra ficava inacessível. `POST /imports` aceita
  `sheet_name` opcional: `.xlsx` de aba única continua lido direto, sem passo extra (comportamento
  inalterado); `.xlsx` de várias abas devolve `{"needs_sheet_selection": true, "sheets": [...]}` (HTTP
  200, nenhum job criado) em vez de escolher sozinho qual aba importar — o cliente reenvia o mesmo
  arquivo com `sheet_name` preenchido, sem precisar de storage de arquivo entre requests (mantém a
  decisão de arquitetura original intacta). Novo `ImportJob.sheet_name` (migration
  `0011_import_job_sheet_name`) guarda qual aba foi de fato usada, pra histórico/auditoria. Frontend:
  `ImportWizard` ganhou uma etapa entre upload e mapeamento (escolher a aba) quando necessário, mantendo
  o arquivo já selecionado em memória — sem pedir pra escolher de novo. Motivado pelo próprio dataset
  demo gerado nesta mesma rodada, cujo `.xlsx` (3 abas) só tinha a primeira realmente importável antes
  desta mudança; `tests/api/test_demo_data_import.py` foi atualizado para importar as 3 abas.

### Added (dados demo / testes)
- `test-data/demo-company/`: massa de dados fictícia, determinística (seed fixa `20260831`) e testável ponta a ponta contra o pipeline real de importação → Analytics → exportação, em três formatos (CSV, XLSX, JSON) — 12 meses de história cobertos no total (jun/2025–mai/2026, sem sobreposição entre datasets), cada um com perfil mensal diferente dos outros dois. Gerada por `generate_demo_data.py`, que reaproveita as funções reais de métrica (`app/modules/metrics/engine.py`) para computar os KPIs esperados (`expected/*.json`) — nunca um número recalculado à mão à parte. Desvio documentado (`README.md` do dataset) de duas limitações reais do sistema, não hipotéticas: o importador é estritamente um-domínio-por-arquivo (sem "arquivo misto"), e `parse_xlsx` só lê a primeira planilha — por isso o XLSX (3 abas: Campanhas/Financeiro/Leads) só tem a aba `Campanhas` realmente importável hoje, e os demais datasets viram um pequeno conjunto de arquivos por domínio em vez de um arquivo monolítico. Período do XLSX (out/2025–jan/2026) resolve um conflito real do prompt de origem (pedia 10 meses, contradizendo a própria regra de 4 meses por arquivo) escolhendo 4 meses que não colidem com o seed de desenvolvimento (`app/seed.py`, relativo a `date.today()`, nunca datas fixas). Cenários intencionais: `null` válido (impostos não apurados no primeiro mês, `mqls` não rastreado por mudança de ferramenta), `0` válido (sem recompra no primeiro mês, período novo), campanha de ROAS alto e campanha de ROAS baixo (abaixo de 1, prejuízo real) em cada dataset, cabeçalhos com alias intencional (`Faturamento`, `Sessoes`, `Novos clientes`...) para exercitar a sugestão automática de mapeamento. `tests/api/test_demo_data_import.py` (11 testes novos) roda o fluxo real via `TestClient` para cada arquivo — upload → mapeamento → preview → confirmação → persistência → Analytics → exportação — comparando contra `expected/*.json`. Escopo confirmado com o usuário: só geração de dados demo nesta rodada — a arquitetura de monetização/planos/entitlements pedida no mesmo prompt ficou fora de escopo (ver `docs/analytics/CHART_DECISIONS.md`).

### Added (docs)
- `docs/analytics/LOOKER_STUDIO.md` (novo): pesquisa de licenciamento/arquitetura do Looker Studio como opção gratuita/freemium de BI externo, complementar ao plano já existente de Power BI (agora explicitamente premium/enterprise) — reverte uma decisão anterior desta mesma sessão de não pesquisar Looker Studio (registrado no próprio documento). Confirmado em fontes oficiais da Google: o core é genuinamente gratuito (sem trial, sem cartão), Looker Studio Pro custa por usuário/projeto/mês e é cobrado do cliente, não do Lucratix; diferente do Power BI, não há conector REST genérico — precisaria de um Community Connector (Google Apps Script), que reaproveita o mesmo pré-requisito de API key já desenhado pro Power BI. Nenhum código de integração, nenhuma credencial — só arquitetura documentada, mesmo espírito de `POWER_BI.md`.

### Added
- Correlação entre métricas mensais (sexta rodada de evolução do Analytics): novo `GET /analytics/executive/correlation` — coeficiente de Pearson entre duas das 7 métricas mensais da Visão Executiva, reaproveitando a mesma série que já alimenta o gráfico de evolução (`compute_monthly_series`), sem tabela nova nem query nova. Usa `statistics.correlation` da biblioteca padrão do Python (nenhuma dependência nova). Mínimo de 3 meses com as duas métricas aplicáveis pra calcular (com 2 pontos, qualquer reta conecta os dois perfeitamente); menos que isso, ou uma métrica sem variância no período, vira `is_applicable=False` com motivo explícito, nunca um coeficiente enganoso. Frontend: `CorrelationChart` (dispersão SVG artesanal) + `CorrelationPanel` (seletor de métrica X/Y, sem permitir a mesma métrica nos dois — e a interpretação textual do coeficiente em `lib/correlation.ts`, deixando claro que correlação não implica causalidade). Corrige uma classificação errada de rodadas anteriores — correlação tinha sido documentada como bloqueada por dado ausente, quando na verdade só faltava reconhecer que a série mensal já existente bastava.
- Marketing por canal (quinta rodada de evolução do Analytics): novo `GET /analytics/marketing/by-channel` — as mesmas 7 métricas de `/analytics/marketing` (ROAS, ROI, CTR, CPC, CPM, CPL, CPA), agrupadas por `campaigns.channel_id` em vez de somadas todas juntas. Reaproveita `aggregate_campaigns`/`compute_marketing_metrics` (nenhuma fórmula nova), resolve nome de canal em lote via `get_channels_by_ids` (evita N+1). Sem comparação com período anterior nesta primeira versão (o eixo é "canal A vs. canal B", não "antes vs. depois"). Frontend: `MarketingByChannelTable`, uma linha por canal, na seção Marketing da página de Analytics — sem estado vazio próprio (reaproveita o aviso já existente quando não há campanha no período). O único drill-down que restava dos itens pendentes do "prompt mestre" que não dependia de dado ausente (`channel_id` já é FK obrigatória em `campaigns`) — recomendado pelo assistente e aprovado pelo usuário.
- Metas por KPI/mês (quarta rodada de evolução do Analytics): nova tabela `targets` (migration `0010_targets`) — meta mensal por organização+métrica, mesma granularidade de `financial_periods`/`funnel_snapshots`. CRUD completo (`GET`/`PUT`/`DELETE /targets`, ANALYST+ pra escrever, qualquer membro pra ler). Novo `GET /analytics/executive/targets` devolve progresso agregado no intervalo selecionado — mas **só pra receita e lucro** (as únicas métricas genuinamente aditivas entre os 7 KPIs; as outras 5 são razões — CAC, margem, conversão, ticket médio, recorrência — e somar a meta mensal delas não representa corretamente "a meta do intervalo" sem pesar pelo volume de cada mês, o mesmo problema de somar 5 CACs mensais e chamar de "CAC do trimestre"). Essas 5 comparam meta mês a mês em vez disso: `SeriesChart` ganhou uma linha tracejada opcional de meta, com o mesmo tratamento de "buraco" da linha de valor real (RN-003), incluída no cálculo de escala e na tabela `sr-only`. `TargetsPanel` (novo componente) — formulário + lista + remoção — vive na própria página de Analytics, sem gate de papel adicional na UI (a página já exige ANALYST+ pra ser alcançada). Dois ícones novos (`IconTarget`, `IconTrash`), mesma convenção SVG artesanal do resto do app. Recomendado pelo assistente entre os itens pendentes do "prompt mestre" de evolução do Analytics — maior valor de negócio e o único que não depende de dado que não existe (o próprio usuário fornece a meta); usuário aprovou o plano proposto.
- Terceira rodada de evolução do Analytics (P0/P1, seguindo o mesmo "prompt mestre" de arquitetura das duas rodadas anteriores): direção semântica por métrica, insights determinísticos e exportação do gráfico de evolução — os itens do prompt que dependiam só de dado que já existe, sem precisar de dimensão nova (canal/produto) nem tabela nova (metas). Ver `docs/analytics/CHART_DECISIONS.md`.
- **`MetricDefinition.direction`** (`higher_is_better`/`lower_is_better`, novo campo no catálogo central de métricas): corrige um bug real no `ComparisonBadge` da Visão Executiva — toda variação positiva era pintada de verde, inclusive para CAC/CPC/CPM/CPL/CPA, onde **subir é a notícia ruim**. Agora o ícone segue o sentido literal do número (subiu/desceu) e a cor segue o que é bom ou ruim pra aquela métrica especificamente. Populado para as 19 métricas do catálogo, com teste de integridade dedicado pros 5 "custo por X" (nenhum pode virar `higher_is_better` por engano). Também exibido no próprio `MetricHelp` ("↓ Menor é melhor"/"↑ Maior é melhor").
- **`lib/insights.ts`**: até 3 observações determinísticas por período na Visão Executiva — a métrica de maior variação absoluta (o que merece investigação), receita↑+CAC↓ na mesma janela (crescimento eficiente), receita↑+margem↓ (alerta, sem afirmar causa). Só lê `percent_change` já calculado pelo backend para cada KPI — nunca inventa dado nem causalidade, nunca gera nada sem comparação aplicável. Painel novo (`InsightsPanel`) não renderiza nada quando não há insight.
- **Exportação do gráfico de evolução mensal** (`lib/analytics-export.ts`): botão "Exportar CSV" na seção "Evolução mensal" gera um CSV client-side dos KPIs já buscados (`GET /analytics/executive/series`, sem chamada nova ao backend), com empresa/período/geração/fuso horário no cabeçalho e valores numéricos crus (não localizados) para reimportação/análise. Complementa a exportação de dado bruto já existente na Central de Dados (esse aqui é o dado *calculado*, mês a mês). `lib/browser-download.ts` (novo) extrai o gatilho de download do navegador de `export-panel.tsx`, que passa a reaproveitá-lo em vez de ter a própria cópia.

## 2026-08-30

### Added
- Primeira rodada de evolução do Analytics (P0, seguindo um "prompt mestre" de arquitetura para o módulo — Recharts/ApexCharts/Looker Studio, priorizado em P0/P1/P2): auditado o que já existia (camada semântica de métricas já em `docs/analytics/metrics-catalog.md`, API já neutra em relação a gráfico, filtros/comparação já implementados) antes de mexer em qualquer coisa. Duas decisões de escopo confirmadas com o usuário: manter os gráficos em SVG artesanal sem adotar Recharts/ApexCharts nesta rodada (zero gráfico hoje justifica a dependência — ver `docs/analytics/CHART_DECISIONS.md`, novo, registra a decisão e o gatilho para revisitá-la), e manter o plano já pesquisado de Power BI em vez de pesquisar Looker Studio do zero. Dentro desse escopo: `apps/web/src/lib/formatters.ts` (novo) centraliza formatação de decimal/moeda/inteiro/percentual/número compacto/mês-ano — `metrics.ts` e `series-chart.tsx` passam a reaproveitar em vez de cada um ter seu próprio `toLocaleString`. `SeriesChart` ganhou acessibilidade: `aria-label` por métrica (antes só "Evolução mensal" genérico, indistinguível por leitor de tela) e uma tabela `sr-only` com os mesmos dados mês a mês — gráfico não pode ser a única representação do dado.
- Gráficos de série temporal na Visão Executiva (`organizations/[id]/analytics`): novo `GET /analytics/executive/series` (mesma permissão de `/analytics/executive`, `ANALYST`+) devolve os mesmos 7 KPIs, mas um ponto por mês de calendário do intervalo em vez de somado — reaproveita `compute_dashboard_metrics` chamando-o uma vez por mês (`compute_monthly_series`, nova em `analytics/service.py`, pura) sobre os `FinancialPeriod`/`FunnelSnapshot` já buscados, e a nova `months_between` (`analytics/date_ranges.py`) para listar os meses tocados pelo intervalo. Mês sem `financial_period`/`funnel_snapshot` aparece na lista mesmo assim, com `is_applicable=False` (RN-003: nunca vira zero nem some do meio da série — o gráfico precisa do "buraco"). Frontend: `SeriesChart`, um gráfico de linha em SVG desenhado à mão (sem dependência nova, mesmo espírito dos ícones em `components/icons.tsx` — o projeto não tinha biblioteca de gráficos), com área de gradiente, ponto/tooltip nativo (`<title>`) por mês e rótulo de eixo abreviado em pt-BR; linha interrompida (não interpolada) nos meses sem dado. Um gráfico por KPI, mesma grade de 7 cards da Visão Executiva. Escolhido pelo usuário entre três opções levantadas (gráficos de série temporal, metas por métrica, alertas por e-mail) após pergunta aberta sobre o que valeria a pena adicionar ao produto.
- Atalho "Central de Dados" no grid de "Acesso rápido" da página inicial da empresa (`quickAccessItems`, `organizations/[id]/page.tsx`) — até então só era alcançável pela sidebar. Sem `minRole` (mesmo critério da entrada de sidebar e do painel de exportação — exportar é leitura, `VIEWER` incluso).
- Módulo de dados estendido para o domínio **Marketing** (`campaigns`) — o quarto e último domínio real do schema, fechando o módulo. Diferente dos três já feitos, toda campanha pertence a um canal (`channel_id`, FK obrigatória) e o arquivo importado só traz o nome do canal como texto. Decisão de negócio confirmada com o usuário antes de implementar: se o nome não bate com nenhum canal já cadastrado na organização, a linha fica inválida — nunca cria um canal automaticamente a partir de um erro de digitação na planilha. `validation.py::validate_rows` ganhou um mecanismo genérico novo para isso (`foreign_key_values` — um campo de texto que precisa apontar para um registro que já existe em OUTRA tabela), reaproveitável por qualquer domínio futuro com a mesma necessidade. Chave natural composta (`name` + `channel`, já que nome de campanha sozinho é ambíguo — a mesma campanha pode existir em canais diferentes) usa a mesma normalização case/espaço-insensível já genérica de Produtos, sem código novo. Export devolve o nome do canal, nunca o `channel_id` interno, buscado em lote para evitar N+1 (`Campaign` não tem relationship ORM para `MarketingChannel`). Nova `get_channel_by_name`/`get_campaign_by_name_and_channel`/`update_campaign`/`get_channels_by_ids` em `marketing/repository.py` — o último também passou a ser reaproveitado pelo endpoint `PATCH /campaigns/{id}`, que fazia a mesma coisa inline (duplicação removida). Nenhuma migration necessária — `campaigns`/`marketing_channels` já existiam. Verificado ao vivo, ponta a ponta: linha rejeitada quando o canal não existe (sem criar canal nenhum), depois aceita e gravada corretamente após cadastrar o canal, e export mostrando o nome do canal.

## 2026-08-29

### Added
- Módulo de Importação de Dados (corte vertical mínimo, domínio **Financeiro**): wizard completo via API — upload (`.csv`/`.xlsx`/`.json`, até 5 MB / 2000 linhas), sugestão automática de mapeamento de campo (alias exato, fuzzy match via `difflib`, e mapeamento lembrado do último import bem-sucedido da mesma organização), confirmação de mapeamento com validação recalculada sob demanda (campo obrigatório, tipo, duplicidade por chave natural — dentro do arquivo e contra o banco), preview paginado, confirmação com estratégia de duplicata (`skip`/`update`), histórico de imports e lista de erros por linha, e templates de mapeamento reutilizáveis. Processamento síncrono (sem fila de jobs) e sem storage de arquivo (linhas parseadas ficam em `JSONB`, nunca o arquivo em si) — decisões justificadas pela infraestrutura real (réplica única no Railway, sem Celery/Redis/S3, auditada antes de desenhar o módulo). Escrita reaproveita `financials_repository.upsert_financial_period` (nenhuma lógica de upsert duplicada). Arquitetura por adaptadores, pronta para novos domínios (Funil, Produtos, Marketing) sem tocar no pipeline genérico — ver `docs/data-import-export/ARCHITECTURE.md`. Permissão: `ANALYST`+ (mesmo precedente de RN-010), sem permissão nomeada nova. Nova dependência: `openpyxl` (leitura/escrita de `.xlsx`, escolhida sobre pandas por não ter dependência nativa). Migration `0009_data_import_export` (`import_jobs`, `import_errors`, `import_mapping_templates`). Export, frontend (Central de Dados/wizard) e demais domínios ficam para PRs seguintes — escopo confirmado com o usuário.
- Exportação de dados para o domínio **Financeiro**: novo `GET /api/v1/organizations/{id}/exports/{domain}?format=csv|xlsx|json&date_from=&date_to=`, espelhando a arquitetura por adaptadores da importação (`readers.py` lê do domínio real, `serializers.py` gera o arquivo — nenhum dos dois conhece `financial_periods` especificamente, só a `DomainSpec` compartilhada com o módulo de importação). CSV sai com cabeçalho amigável e BOM UTF-8 (Excel no Windows); XLSX guarda tipo nativo (data/número, célula formatada); JSON usa chave canônica, pronto para reimportar direto sem precisar mapear de novo. Reaproveita `sanitize_for_spreadsheet` (já existia, escrito durante a importação para este uso) contra CSV/Spreadsheet Formula Injection. Permissão: mesmo nível de `GET /financials` (`get_organization_context`, sem papel mínimo — exportar é ler o mesmo dado que `VIEWER` já vê na tela, só em arquivo), diferente da importação (que é escrita e exige `ANALYST`+). Mesmo teto de 2000 linhas da importação, pela mesma razão (processamento síncrono).
- Frontend do módulo de dados: nova página "Central de Dados" (`organizations/[id]/central-de-dados`, item de sidebar sem `minRole` — ver decisão de permissão acima) com o painel de exportação (formato, filtro de período opcional, download direto) sempre visível, e o wizard de importação (upload → mapeamento com sugestão pré-preenchida e badge de confiança → preview → confirmação) + histórico paginado só para quem pode escrever (`ANALYST`+, `VIEWER` vê um aviso em vez de um formulário que terminaria em 403). Cliente HTTP (`lib/api.ts`) ganhou `postForm` (upload multipart), `del` e `downloadFile` (baixa blob + lê nome do arquivo do `Content-Disposition`). Verificado ao vivo, ponta a ponta (upload de CSV real → mapeamento → preview → confirmação → dado gravado, e export baixado com o nome correto).

- Módulo de dados estendido para o domínio **Funil** (`funnel_snapshots`), ponta a ponta (importação, exportação e frontend) — prova de que a arquitetura por adaptadores do módulo (desenhada com o Financeiro) realmente generaliza: nenhum módulo do pipeline genérico (parsers, mapping, validation, security, serializers, os dois routers) precisou mudar, só `domains.py` (nova `DomainSpec` com o `DataType` `"integer"`, novo), `writers.py`/`exports/readers.py` (uma função cada, reaproveitando `funnels_repository`) e `service.py::_NATURAL_KEY_LOOKUPS` (registro de duplicidade, refatorado de if/elif para dict-por-domínio nesta mesma mudança). Nova `parse_integer` em `transform.py`, reaproveitando `parse_decimal` para herdar de graça a resolução de separador de milhar/decimal ambíguo. Nenhuma migration necessária — `funnel_snapshots` já existia (RF-020). Frontend: seletor de domínio (Financeiro/Funil) no painel de exportação e no wizard de importação, nova `lib/data-domains.ts`.
- Módulo de dados estendido para o domínio **Produtos** (`products`), ponta a ponta — o domínio mais diferente dos três até agora: sem `period` (`DomainSpec.supports_date_range = False`, filtro de data ignorado no export e escondido no frontend), com campo de texto (`DataType` `"string"` novo, `parse_string` com limite de tamanho espelhando a coluna do banco) e booleano (`DataType` `"boolean"` novo, `parse_boolean` aceita `"sim"/"não"`, `"ativo"/"inativo"`, `"true"/"false"`, `1`/`0`), e sem constraint de unicidade em `name` no banco — a deduplicação por nome (sem diferenciar maiúsculas/minúsculas nem espaço nas bordas) passou a ser feita só na camada de importação (`domains.py::normalize_natural_key_value`, usada tanto na validação quanto na busca do que já existe no banco), com uma busca por nome equivalente adicionada a `products/repository.py` (`get_product_by_name`, `update_product` — este último também passou a ser reaproveitado pelo endpoint `PATCH /products/{id}`, que fazia a mesma coisa inline). `active` (booleano `NOT NULL` com default `True` no banco, diferente dos campos nullable dos outros domínios) nunca é passado como `None` explícito ao criar/atualizar — evita violar a constraint e evita reativar/desativar um produto por acidente numa atualização que não mapeou esse campo. Export em CSV converte booleano para "Sim"/"Não" em vez do repr do Python ("True"/"False", um vazamento de inglês num arquivo todo em português) — aceito de volta na importação. Nenhuma migration necessária — `products` já existia.

### Fixed
- CORS não expunha `Content-Disposition` para `fetch` em requisição cross-origin — em dev local (frontend em `:3000` chamando a API em `:8000` direto, sem o rewrite same-origin que existe em produção), todo export baixava com o nome de arquivo genérico `"export"` em vez do nome de verdade (ex.: `financial_periods_export.csv`). Encontrado ao vivo durante a verificação do frontend do módulo de exportação; corrigido com `expose_headers=["Content-Disposition"]` no `CORSMiddleware`.

## 2026-08-27

### Added
- Auditoria de banco de dados (modelagem/índices/procedures/functions/triggers/RLS): schema, isolamento multiempresa e padrões de consulta revisados por completo — nenhum N+1 encontrado, isolamento já testado ponta a ponta (`tests/integration/test_multi_tenant_isolation.py`) e nenhuma procedure/function/trigger/view/RLS foi criada por falta de benefício real comprovado (fórmulas já centralizadas em `metrics/engine.py`, auditoria de negócio já explícita na aplicação — ver `docs/database/schema-notes.md`, seção "Procedures, functions, triggers, views e RLS"). O que a auditoria encontrou como gap real, corrigido: 4 índices compostos faltantes (`organization_id, created_at` em `audit_logs`/`baselines`/`experiments`; `organization_id, start_date` em `campaigns` — migration `0008_performance_indexes`), paginação de verdade em `GET /organizations/{id}/audit-logs` (antes hardcoded em 100 registros mais recentes, sem forma de ver entradas mais antigas — agora com `limit`/`offset`/`total`, e a tela de Auditoria com "Carregar mais"), e correção de `docs/database/er-diagram.md`/`schema-notes.md` (removidas `METRIC_SNAPSHOTS`/`METRIC_DEFINITIONS`, documentadas como nunca implementadas — métricas são calculadas sob demanda, não persistidas; adicionadas `SESSIONS`/`PASSWORD_RESET_TOKENS`, que faltavam no diagrama).
- Novo `GET /api/v1/organizations/summary?period=`: indicadores rápidos (Receita, Leads, Conversão, CAC — mesmas 4 métricas do mockup do prompt de redesign de UX) de todas as empresas do usuário num único request, reaproveitando o mesmo motor de cálculo do Dashboard (`compute_dashboard_metrics`). No máximo 3 queries no banco independente de quantas empresas o usuário tenha (`list_financial_periods_for_organizations`/`list_funnel_snapshots_for_organizations`, novas, buscam de todas as empresas de uma vez). Os cards de "Suas empresas" (`CompanyCard`) passam a mostrar esses indicadores quando disponíveis — fecha a pendência de backend documentada na PR do redesign daquela tela; se a chamada falhar, os cards continuam mostrando o resto normalmente, sem indicador nenhum (dado complementar, nunca bloqueia a lista).
- Item "Início" na sidebar de cada empresa, sempre visível e sempre o primeiro item do menu: leva para a página central operacional (`organizations/[id]`, cabeçalho + KPIs + acesso rápido + ações rápidas) que antes só era alcançada ao selecionar a empresa na lista, sem nenhum caminho de volta a partir de outra tela da própria organização. Novo ícone `IconHome`.
- Sidebar (e o grid de "Acesso rápido" da página inicial) passam a esconder os itens que o papel do usuário não pode abrir: `Analytics`/`Relatório` exigem `ANALYST`+ e `Auditoria` exige `ORGANIZATION_ADMIN`+ no backend — a UI só deixa de oferecer um link que terminaria em 403; a autorização de verdade continua sendo decidida pelo servidor. Novo `hasMinimumRole` em `lib/roles.ts`, espelhando a hierarquia `ROLE_HIERARCHY`/`role_rank` já existente em `apps/api/app/models/membership.py` (RN-009).
- Redesign da tela "Suas empresas": cada empresa agora aparece em um `CompanyCard` (nome, nome fantasia/segmento quando cadastrados, papel do usuário com rótulo amigável — "Proprietário" em vez de `ORGANIZATION_OWNER` — data de criação, CTA "Abrir empresa"), grid responsivo de 1/2/3 colunas e busca por nome (só acima de 6 empresas). Novo `lib/roles.ts` com o mapeamento de papel amigável, reaproveitado no badge de papel da sidebar.
- Página inicial de cada empresa (`organizations/[id]`) virou uma central operacional: cabeçalho com identificação da empresa e link "Trocar empresa", resumo de 4 KPIs do mês, 6 atalhos de acesso rápido (Analytics, Financeiro, Marketing, Funil, Produtos, Experimentos), ações rápidas para quem pode escrever dado (escondidas para VIEWER, RN-010) e um painel de atenção só quando há um sinal real (queda de receita >5% vs. baseline). Histórico de baseline e formulário de registro preservados sem alteração de rótulo/texto. Novo `hooks/use-dashboard.ts` (lógica de busca compartilhada com o Dashboard dedicado) e `contexts/organization-context.tsx` (evita buscar a empresa duas vezes — layout e página inicial agora reaproveitam a mesma busca).
- Drawer de navegação mobile: trava o scroll do conteúdo de fundo enquanto aberto e ganhou animação de entrada (slide-in + fade do overlay) — nenhum item de navegação foi alterado.
- Página pública `/sobre`, acessível sem login (mesmo nível de `/login`/`/register`, fora do gate de autenticação): visão geral da Lucratix, benefícios, funcionalidades (espelhando o menu real da área logada), pontos fortes, "como funciona", stack de tecnologias, glossário de termos da aplicação (Organização, Baseline, Funil, Experimento, Papel, Auditoria, Sessão única, Comparação de período) e FAQ com 12 perguntas — glossário e FAQ em acordeão (`AccordionItem`, mesmo padrão botão+`aria-expanded`+chevron já usado no glossário de métricas). Conteúdo levantado por análise real do código (`docs/product/vision.md`, `NAV_ITEMS`, modelos de papel/membership, motor de métricas, dependências do projeto), sem funcionalidade inventada — integração com Power BI é descrita como arquitetura documentada, não como recurso disponível. Link "Conheça a aplicação" adicionado nas 4 telas de autenticação (login, cadastro, esqueci/redefinir senha).

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
