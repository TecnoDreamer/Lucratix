# Inventário de evidências — Lucratix

> Entregável da **Etapa 4** do prompt mestre de portfólio. Lista **o que pode servir de prova** em material público, onde está, e o que precisa ser tratado antes de aparecer.
> Base: [`01-MATRIZ-DE-MATURIDADE.md`](01-MATRIZ-DE-MATURIDADE.md) (status e números). Auditoria de 2026-09-18, commit `4f6f8a6`.

## 1. Como ler

Cada linha responde às seis perguntas do prompt mestre:

| Coluna | Pergunta |
|---|---|
| **Demonstra** | Que capacidade real esta evidência comprova? |
| **Onde** | Caminho no repositório (ou rota da aplicação). |
| **Público?** | Pode ir para material externo? `Sim` · `Sim, tratada` · `Não`. |
| **Anonimizar?** | Contém dado que precisa ser trocado/omitido antes de aparecer? |
| **Atualizar?** | A evidência está defasada em relação ao código? |
| **Screenshot?** | Vale capturar imagem? (o plano de capturas é a Etapa 6 — `SCREENSHOT-PLAN.md`) |

Regra geral: **nunca** expor credenciais, IDs sensíveis, e-mails reais, tokens, cookies, console do navegador, `.env` ou dados de cliente. Toda captura de tela usa a empresa fictícia de `test-data/demo-company/`.

## 2. Inventário

### A. Telas e fluxos de produto

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Login / cadastro / recuperação de senha | Fluxo de autenticação, política de senha visível (checklist de requisitos) | `/login`, `/register`, `/esqueci-senha`, `/redefinir-senha` | Sim | Campos de e-mail: usar `demo@…` fictício; ocultar `dev_token` | Não | Sim |
| Seleção de empresas | Multiempresa: cartões com resumo de KPIs por empresa | `/organizations` | Sim, tratada | **Sim** — nomes de empresa fictícios; barra de URL sem UUID | Não | Sim |
| Home da empresa + acessos rápidos | Personalização (cards configuráveis por usuário) | `/organizations/[id]` | Sim, tratada | Ocultar UUID da URL | Não | Sim |
| Dashboard | KPIs do mês, comparação com baseline | `/organizations/[id]/dashboard` | Sim, tratada | Ocultar UUID; dados demo | Não | Sim |
| Analytics — Visão Executiva | 7 KPIs, séries, metas, correlação, marketing por canal | `/organizations/[id]/analytics` | Sim, tratada | Ocultar UUID; dados demo | Não | Sim (várias) |
| Funil | Análise de gargalo, conversão/abandono, evolução, por canal, configuração de gráfico | `/organizations/[id]/funnel` | Sim, tratada | Ocultar UUID | Não | Sim (várias) — é a tela mais rica |
| Financeiro | Lançamento mensal; lucro e margem derivados | `/organizations/[id]/financials` | Sim, tratada | Dados demo | Não | Sim |
| Marketing | Canais e campanhas com ROAS/CTR por campanha | `/organizations/[id]/marketing` | Sim, tratada | Dados demo | Não | Sim |
| Produtos | Cadastro (ativar/inativar) | `/organizations/[id]/products` | Sim, tratada | Dados demo | Não | Opcional |
| Experimentos | Teste A/B com p-valor e alerta de amostra mínima | `/organizations/[id]/experiments` | Sim, tratada | Dados demo | Não | Sim |
| Central de Dados | Assistente de importação (mapeamento, preview) + exportação | `/organizations/[id]/central-de-dados` | Sim, tratada | Usar planilha de `test-data/demo-company/` | Não | Sim (passo a passo) |
| Relatórios | Geração de PDF (básico, executivo, funil) | `/organizations/[id]/reports` | Sim, tratada | O **PDF** traz nome da empresa: usar demo | Não | Sim + amostra do PDF |
| Glossário | Educação do usuário (definição, fórmula, leitura) | `/organizations/[id]/glossario` | Sim | Não | Não | Sim |
| Auditoria | Trilha de eventos filtrável | `/organizations/[id]/audit` | Sim, tratada | **Sim** — trilha contém e-mails e IPs de quem agiu; usar só usuários demo | Não | Sim |
| Configurações da empresa | Ciclo de vida (congelar), logotipo, chaves de API | `/organizations/[id]/configuracoes` | Sim, tratada | **Sim** — nunca capturar a chave de API após criada (exibida uma vez) | Não | Sim, sem chave visível |
| Conta do usuário | Troca de senha, idioma | `/conta/configuracoes` | Sim | Campos vazios | Não | Opcional |
| Super Admin | Gestão de acesso entre empresas | `/admin`, `/admin/organizations`, `/admin/users` | Sim, tratada | **Sim** — lista de usuários/empresas reais | Não | Sim, só com dados demo |
| Página "Sobre" | Apresentação pública do produto | `/sobre` | Sim | Não | Revisar texto ao lado do novo portfólio | Sim |
| Alternância de idioma (pt-BR/en/es) e de tema (claro/escuro) | i18n e tema | Seletor no layout; `apps/web/messages/` | Sim | Não | Não | Sim (par claro/escuro; 3 idiomas) |
| Mobile (menu em gaveta) | Responsividade | Layout abaixo do breakpoint `lg` | Sim, tratada | Idem | Não | Sim (viewport móvel) |

### B. Testes e qualidade

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Suíte de backend (736 testes: unit, integration, api, security) | Disciplina de teste em camadas; teste estrutural cobre todo endpoint de escrita | `tests/` | Sim (trechos) | Não (fixtures usam `@example.com`) | Não | Sim (saída do `pytest`) |
| Testes de isolamento multi-tenant | Prova automatizada do requisito mais crítico | `tests/integration/test_multi_tenant_isolation.py`, `tests/e2e/multi_tenant_isolation.spec.ts` | Sim | Não | Não | Opcional |
| Testes do motor de métricas (72) | Nunca divide por zero, nunca trata ausência como 0 | `tests/unit/test_metrics_engine.py` | Sim | Não | Não | Opcional |
| Testes de segurança (autorização, rate limit, import, export) | Verificação de controles | `tests/security/` | Sim | Não | Não | Opcional |
| Testes de frontend (Vitest + Testing Library) | Componentes e telas testados | `apps/web/src/**/*.spec.*` | Sim | Não | Contagem: ver matriz §2 | Opcional |
| Testes E2E (56 em 20 arquivos, Playwright) | Fluxos reais no navegador, incluindo abuso de login | `tests/e2e/` | Sim | Não | Não | Sim (relatório Playwright) |
| Dado demo determinístico | Demonstração reproduzível | `test-data/demo-company/` (CSV/XLSX/JSON + `expected/`) | Sim | Verificar que é 100% fictício antes de publicar | Não | Não |

### C. Arquitetura e diagramas

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Visão de arquitetura | Monólito modular, camadas, módulos | [`docs/architecture/overview.md`](../architecture/overview.md) | Sim, **após correção** | Não | **Sim** — lista módulos que não existem (L-10) | Não |
| ADRs (9) | Decisões e trade-offs registrados | `docs/adr/` | Sim | Não | ADR-0007 já anotado; demais atuais | Não |
| Diagramas de sequência e de casos de uso (8) | Fluxos de autenticação, entrada de dados, cálculo de métricas, autorização multi-tenant, experimentos | `docs/diagrams/` (Mermaid) | Sim | Não | Revisar contra o código na Etapa 10 | Sim (renderizados) |
| Modelo de dados | 21 tabelas, 19 migrations | `apps/api/app/models/`, `apps/api/alembic/versions/` | Sim | Não | Diagrama ER: [`docs/database/`](../database/) — conferir aderência | Opcional |
| Modelo de ameaças | Análise de risco (STRIDE) | [`docs/security/threat-model.md`](../security/threat-model.md) | Sim | Não | Não | Não |

### D. API e integração

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| OpenAPI interativo | Superfície da API documentada automaticamente | `GET /docs` (FastAPI) em ambiente local | Sim, tratada | Capturar só rotas/esquemas; nunca "Try it out" com token | Não | Sim |
| Chave de API para BI externo | Mecanismo de acesso somente-leitura para Power BI/Looker | `modules/api_keys/`; [`analytics/POWER_BI.md`](../analytics/POWER_BI.md) | Sim, com ressalva | Nunca mostrar chave | Não | Opcional |

> **Ressalva permanente:** Power BI e Looker Studio são **compatíveis via chave de API** (`PROPOSTO` como conector). Não há integração pronta.

### E. Gráficos e relatórios

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Gráficos do Funil (Recharts) e Analytics (SVG artesanal) | Visualização de dados com decisões documentadas | [`docs/analytics/CHART_DECISIONS.md`](../analytics/CHART_DECISIONS.md), [`docs/charts/`](../charts/README.md) | Sim | Dados demo | Não | Sim |
| Relatórios PDF (3) | Entregável para o cliente final | `modules/reports/`; [`docs/reports/`](../reports/PDF_INFRAESTRUTURA.md) | Sim, tratada | O PDF traz empresa + rodapé de confidencialidade: gerar com demo | Não | Sim (páginas do PDF) |

### F. CI/CD e processo de engenharia

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| 4 workflows / 5 jobs de CI | Lint, tipos, testes, migrations, SAST, auditoria de dependências, E2E | `.github/workflows/` | Sim, tratada | Workflows usam credenciais de Postgres de **teste** (`postgres/postgres`) — sem segredo real | Não | Sim (checks verdes de uma PR) |
| Histórico de PRs | Fluxo por branch, PR com template, squash-merge, Conventional Commits | GitHub (`#101`…`#134`) | Não (repo privado) | — | — | Sim (lista de PRs, tratada) |
| Governança | Convenções, template de PR/issue, DoR/DoD | [`CONTRIBUTING.md`](../../CONTRIBUTING.md), `.github/` | Sim | Não | Não | Não |
| Ciclo de auditoria → correção | Auditoria documenta 21 lacunas; 4 corrigidas com PR, teste e decisão registrada | [`governanca/LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md); PRs #129–#133 | Sim, tratada | Links de PR só funcionam se o repositório for público | Não | Opcional |
| Resposta a advisory crítico | Detecção pelo CI e correção em PR única (Next.js RCE, `next 16.3.4`) | PR #130 | Sim, tratada | Não | Não | Opcional |

### G. Segurança

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Documentos de segurança (autenticação, controle de acesso, rate limit, API keys, senhas, auditoria) | Controles descritos com referência ao código | [`docs/security/`](../security/README.md) | Sim, **após revisão** | Revisar: descrevem limites reais dos limitadores — decidir o nível de detalhe público | Alguns marcados "em atualização" | Não |
| `SECURITY.md` | Política de reporte de vulnerabilidade | raiz | Sim | Contato pessoal deve ser genérico antes de publicar | Trocar "pré-produção" quando o status mudar | Não |
| Relatórios de CI de segurança | `bandit`, `pip-audit`, `npm audit` executados | job `security-ci` | Sim, tratada | Não | Não | Sim (job verde) |

### H. Documentação

| Evidência | Demonstra | Onde | Público? | Anonimizar? | Atualizar? | Screenshot? |
|---|---|---|---|---|---|---|
| Guia mestre + portal navegável | Documentação de produto organizada por público | [`DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`](../../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md), [`docs/README.md`](../README.md) | Sim, **após ajustes** | Ver §4 | **Sim** — 2 divergências corrigidas junto desta PR (matriz §7) | Não |
| Requisitos e rastreabilidade | RF, RNF, 17 regras de negócio, histórias, critérios de aceite | [`docs/requirements/`](../requirements/) | Sim | Não | Matriz de rastreabilidade cobre RF→US→AC (sem coluna de RN) | Não |
| Marca | Identidade visual e tom | [`docs/branding/LUCRATIX_BRAND.md`](../branding/LUCRATIX_BRAND.md) | Sim | Não | Não | Não |
| Design system | Padrões de UI | [`docs/design/`](../design/DESIGN_SYSTEM.md) | Sim | Não | Não | Opcional |

## 3. Fluxos ponta a ponta demonstráveis

Candidatos ao `ROTEIRO-DE-DEMO.md` (Etapa 6). Todos sustentados por teste E2E ou API existente:

| # | Fluxo | Sustentação |
|---|---|---|
| 1 | Cadastro → login → criar empresa → registrar baseline → lançar financeiro → ver Dashboard | e2e `auth`, `organizations`, `baseline_and_dashboard`, `financials_and_campaigns` |
| 2 | Importar planilha (mapeamento → preview → confirmar) → ver os dados nos módulos | api `imports`, `demo_data_import`; vitest `import-wizard.spec` |
| 3 | Analisar o funil: gargalo, conversão por etapa, por canal, personalizar gráfico | e2e `funnel_personalization` |
| 4 | Definir meta mensal → acompanhar na Visão Executiva → correlação entre dois KPIs | api `targets`, `analytics_targets`, `analytics_correlation` |
| 5 | Gerar relatório executivo em PDF | api `reports_executive_pdf`; e2e `reports` |
| 6 | Trocar de empresa e ver que os dados são isolados | e2e `switch_organization`, `multi_tenant_isolation` |
| 7 | Login em outro dispositivo derruba a sessão anterior | e2e `single_active_session` |
| 8 | Abuso de login é bloqueado por rate limit e libera após o cooldown | e2e `login_rate_limit` |
| 9 | Tema claro/escuro e 3 idiomas | vitest `locale-switcher`; tema por `theme-watcher` |

## 4. Publicação e higiene do material

**Situação do repositório:** `PRIVADO` (verificado com `gh repo view`, 2026-09-18). Portanto:

- "GitHub Showcase" só é viável se (a) o repositório for tornado público, ou (b) for criado um repositório de vitrine separado com documentação e capturas — **decisão do responsável**, não tomada aqui.
- Links de PR/issue dentro dos documentos **não** funcionam para quem não tem acesso ao repositório privado.

**Varredura de segredos (tracked files), 2026-09-18** — método: `git ls-files` + `git grep` de padrões conhecidos (chaves AWS `AKIA…`, tokens `ghp_…`, `sk_live_…`, chaves privadas PEM, tokens Slack, chaves `re_…` do Resend):

| Verificação | Resultado |
|---|---|
| Arquivos `.env` versionados | Apenas `.env.example` (somente nomes de variáveis, sem valores reais) |
| Padrões de token/chave privada nos arquivos versionados | **Nenhuma ocorrência** |
| E-mails reais versionados | Nenhum — apenas `@example.com`, `@exemplo`, fixtures `ana@x.com` e o remetente de teste público `onboarding@resend.dev` |

> **Limite da varredura:** cobre os arquivos do **estado atual** por padrões conhecidos; **não** inspeciona o histórico do Git nem garante ausência de qualquer segredo. Antes de tornar público, rodar uma ferramenta dedicada no histórico completo (ex.: gitleaks/trufflehog) — **pendente**.

**Itens a tratar antes de qualquer publicação:**

| Item | Onde | Problema | Ação |
|---|---|---|---|
| Caminho local e conta pessoal do GitHub | `docs/environment.md` (linhas 10 e 22) | Expõe diretório do computador e nome de usuário | Remover do material público ou excluir o arquivo do espelho público |
| Links para o nome antigo do repositório | `docs/funnel/README.md`, `docs/product/roadmap.md`, `CHANGELOG.md` | `AleksGustavo/marketing-intelligence-platform` (redireciona) | Cosmético; padronizar para `TecnoDreamer/Lucratix` |
| Credenciais do usuário de desenvolvimento | `README.md` (seed) | E-mail e senha **fictícios** do seed em texto | Aceitável em repo privado; remover do README público |
| Contato no `SECURITY.md` | `SECURITY.md` | Diz "contato direto com o mantenedor" sem canal | Definir canal genérico antes de publicar |
| UUIDs de empresa em URLs | Capturas de tela | Identificam registros | Recortar/ocultar a barra de URL nas capturas |

## 5. Lacunas de evidência (o que ainda **não** existe e precisaria ser produzido)

| Falta | Por quê importa | Como obter |
|---|---|---|
| Capturas de tela com dados demo | Nenhuma imagem versionada hoje | Etapa 6 (`SCREENSHOT-PLAN.md`), executada com o Browser/Playwright sobre `test-data/demo-company/` |
| Percentual de cobertura de código | O CI reporta mas não guarda/limita | Rodar `pytest --cov` com Docker ativo; opcional: impor `--cov-fail-under` |
| Auditoria de acessibilidade (axe/Lighthouse) | Sem ela, não se pode falar em WCAG | Rodar Lighthouse/axe nas telas principais |
| Medição de desempenho | Fase 18 não iniciada | Lighthouse + teste de carga básico |
| URL/ambiente de produção verificado | Sem ele, "disponível online" é `NÃO VERIFICADO` | Confirmação do responsável |
| Revisão humana das traduções en/es | O gate valida só paridade de chaves | Revisão por falante nativo/fluente |
| Varredura de segredos no histórico do Git | Requisito para tornar o repositório público | `gitleaks detect` no histórico |
