# Roteiro de demonstração (8–10 minutos)

> Todos os passos são sustentados por testes E2E/API existentes ([inventário §3](02-INVENTARIO-DE-EVIDENCIAS.md)). **Nada aqui é publicado ou executado automaticamente.**

## Pré-requisitos

| Item | Como |
|---|---|
| Stack local no ar | `docker compose up` (API `:8000`, web `:3000`) |
| Dados fictícios | `npm run migrate` e `npm run seed` — cria o usuário de demonstração e as empresas **Empresa Demo** (com baseline, financeiro, produtos, funil, campanhas e experimento), **Loja Alpha** e **Clinica Demo** |
| Planilha para o passo 3 | arquivos de `test-data/demo-company/` (CSV/XLSX/JSON) |
| Navegador | janela limpa, sem extensões, zoom 100 %, **barra de URL oculta ou recortada** (há UUIDs) |

**Segurança da demonstração:** só a empresa fictícia; nunca abrir `/admin` com dados reais; não mostrar console, `.env` nem chave de API criada; não usar e-mail pessoal. Se o Docker estiver indisponível, usar as capturas do [`SCREENSHOT-PLAN.md`](SCREENSHOT-PLAN.md) como plano B.

## Abertura (30 s)

Dizer: "Produto em **pré-produção**, com dados fictícios. Vou mostrar como uma consultoria acompanha vários clientes e prova evolução com números confiáveis."

## Passos

| # | Tempo | Tela | O que fazer | O que dizer | Evidência |
|---|---|---|---|---|---|
| 1 | 1 min | `/organizations` | Mostrar as 3 empresas com cartões de KPIs; entrar em **Empresa Demo** | "Cada cliente é uma empresa separada." | e2e `organizations`, `switch_organization` |
| 2 | 1 min | Dashboard | Mostrar KPIs do mês e a comparação com baseline | "O baseline é o 'antes'; nunca é sobrescrito. E variação observada não é prova de causa." | e2e `baseline_and_dashboard` |
| 3 | 2 min | Central de Dados | Importar uma planilha demo: mapeamento → preview → confirmar | "Aceita CSV, XLSX e JSON; mostra o que vai gravar antes de gravar." | api `imports`, `demo_data_import` |
| 4 | 2 min | Funil | Mostrar gargalo, conversão por etapa, "por canal"; abrir a configuração de um gráfico | "Aponta onde se perde mais gente, proporcionalmente. A personalização fica salva para você nesta empresa." | e2e `funnel_personalization` |
| 5 | 1 min | Visão Executiva | Mostrar meta mensal e correlação entre dois KPIs | "Mostra correlação, nunca causa." | api `analytics_targets`, `analytics_correlation` |
| 6 | 30 s | Glossário / ícone `?` | Abrir a definição de um indicador | "O sistema ensina a ler o número." | vitest `glossario`, `metric-help` |
| 7 | 1 min | Relatórios | Gerar o PDF executivo e abrir | "Entregável para o cliente, com rodapé de confidencialidade." | api `reports_executive_pdf` |
| 8 | 1 min | **Momento de "não aplicável"** | Numa empresa sem dados de um mês (ex.: **Clinica Demo**), mostrar um KPI "não aplicável" com o motivo | "Aqui está a regra central: dado ausente nunca vira zero." | unit `metrics_engine` |

## Extras (se houver tempo ou pergunta técnica)

- **Sessão única:** logar no mesmo usuário em uma segunda janela anônima; voltar à primeira e mostrar a mensagem de sessão encerrada. *(e2e `single_active_session`)*
- **Isolamento:** tentar abrir por URL uma empresa de outro usuário → 404. *(e2e `multi_tenant_isolation`)*
- **Tema e idioma:** alternar claro/escuro e pt-BR/en/es.
- **Testes:** mostrar a saída do `pytest`/Playwright (números na [matriz §2](01-MATRIZ-DE-MATURIDADE.md)).

## Perguntas prováveis e respostas honestas

| Pergunta | Resposta |
|---|---|
| "Integra com Google Ads / Meta / GA4?" | Não. O dado entra por digitação ou planilha; integrações estão no roadmap, bloqueadas até validar o problema em uso real. |
| "Integra com Power BI / Looker?" | Existe chave de API somente-leitura que permite consumir os dados de analytics; **não há conector pronto**. |
| "Quantos clientes usam?" | Nenhum — está em pré-produção. |
| "Que resultado já gerou?" | Nenhum medido. Nenhuma promessa de resultado é feita. |
| "É seguro / está em conformidade com a LGPD?" | Há controles verificados (senha forte, sessão única, isolamento testado, rate limit, auditoria). Não há certificação nem auditoria externa, e não afirmo conformidade com a LGPD. |
| "E o admin da empresa gerencia a equipe?" | Pela API sim; a tela existe só para o administrador da plataforma — está no roadmap. |
| "Foi feito só por você?" | Conduzido por mim, com desenvolvimento assistido por IA (Claude Code), registrado no histórico do Git. Eu defino escopo e decisões e aprovo cada PR. |
