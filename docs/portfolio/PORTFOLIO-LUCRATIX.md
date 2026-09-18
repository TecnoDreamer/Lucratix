# Lucratix — Portfólio

> Documento principal. Toda afirmação aqui tem lastro em [`01-MATRIZ-DE-MATURIDADE.md`](01-MATRIZ-DE-MATURIDADE.md) (status e números) e [`02-INVENTARIO-DE-EVIDENCIAS.md`](02-INVENTARIO-DE-EVIDENCIAS.md) (provas). Onde algo **não** existe, está dito.
> Versão de 2026-09-18 · commit auditado `4f6f8a6`.

---

## 1. Capa

**Lucratix** — plataforma de Business Intelligence e Marketing Analytics multiempresa, que conecta investimento em marketing a resultado financeiro.

| | |
|---|---|
| **Categoria** | SaaS B2B · Marketing Analytics / BI para consultorias e profissionais de marketing |
| **Stack** | Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS · FastAPI (Python 3.12) · PostgreSQL 16 · SQLAlchemy/Alembic · Docker · GitHub Actions |
| **Status** | Produto funcional ponta a ponta (Fases 0–16 do roadmap concluídas), em **pré-produção**: sem usuários finais reais. Integrações automáticas de dados e hardening de produção ainda **não** iniciados. |
| **Autoria e processo** | Projeto autoral, conduzido por uma pessoa: produto, UX/UI, backend, frontend, dados, segurança, testes e documentação. Desenvolvimento **assistido por IA** (Claude Code, da Anthropic), registrado nos trailers `Co-Authored-By` do histórico do Git; o autor define produto e escopo, toma as decisões, revisa e aprova cada PR. Histórico: 155 commits e ~80 PRs em ~4 semanas (2026-08-21 → 2026-09-18). |

## 2. Elevator pitch (~30 s)

> Consultorias de marketing sabem mostrar cliques e impressões, mas têm dificuldade em provar, com rigor, se o trabalho deixou o cliente mais lucrativo. A Lucratix reúne, por empresa atendida, o financeiro, o funil e as campanhas; guarda a situação **antes** do serviço como histórico imutável; e calcula os indicadores com uma regra simples e inegociável — dado ausente nunca vira zero. Cada cliente fica isolado dos demais, e o que o sistema não consegue afirmar, ele diz que não consegue.

Versões curtas: [`PITCH-30-SEGUNDOS.md`](PITCH-30-SEGUNDOS.md) · [`PITCH-2-MINUTOS.md`](PITCH-2-MINUTOS.md).

## 3. Problema

Consultorias e profissionais de marketing que atendem várias empresas costumam:

1. não ter um **baseline** confiável de "como o cliente estava antes";
2. apresentar **métricas de vaidade** (impressões, cliques) sem ligá-las a faturamento e lucro;
3. manter dados em **planilhas soltas**, sem controle de acesso nem trilha de auditoria;
4. calcular CAC, ROAS e ROI de **formas diferentes** a cada período;
5. tratar **dado ausente como zero**, distorcendo indicadores;
6. declarar testes A/B "vencedores" **sem significância estatística**.

> **Base desta descrição:** é uma hipótese de produto, derivada da experiência profissional do autor em marketing. O próprio projeto registra que **não há pesquisa de mercado formal** que a valide ([`docs/product/problem.md`](../product/problem.md)); o roteiro para validar com entrevistas será `docs/competitive/07-ROTEIRO-DISCOVERY-MERCADO.md` *(previsto na Parte B deste plano; ainda não existe)*.

## 4. Público-alvo

Somente segmentos que o produto suporta hoje e que a documentação justifica ([`personas.md`](../product/personas.md)):

| Perfil | Papel no sistema | O que faz |
|---|---|---|
| Consultor(a)/dono(a) de consultoria de marketing | `ORGANIZATION_OWNER` | Acompanha vários clientes, prova resultado |
| Analista de marketing / growth | `ANALYST` | Lança e mantém os dados operacionais |
| Cliente final da consultoria | `VIEWER` | Consulta resultado em modo leitura |
| Administrador da plataforma | `PLATFORM_ADMIN` | Gere quem acessa qual empresa |

**Não é público-alvo comprovado:** empresas que usem o produto sozinhas, grandes corporações, e-commerces com catálogo transacional (não há modelo de vendas). Ver limites na seção 20.

## 5. Proposta de valor

Sem promessas de resultado. O que o produto **entrega como capacidade**:

- **Isolamento por empresa**, comprovado por teste automatizado.
- **Baseline histórico** que nunca sobrescreve o anterior.
- **Indicadores com regra explícita:** dado ausente → "não aplicável" com motivo, nunca `0`.
- **Comparação antes × depois** com aviso de que variação observada **não** é prova de causa.
- **Funil de 8 etapas** com gargalo, conversão e abandono, por canal.
- **Experimentos A/B** que não declaram vencedor sem amostra mínima e significância.
- **Relatórios em PDF** para entregar ao cliente.

O produto **não promete** aumento de receita, redução de CAC nem ROI — nenhum resultado foi medido em uso real.

## 6. Visão geral e jornada

```
Cadastro/login → cria/seleciona empresa → registra baseline → cadastra produtos
→ lança financeiro e funil por mês (ou importa planilha) → cadastra canais/campanhas
→ Dashboard (mês) → Visão Executiva (intervalo, metas, correlação)
→ Funil (gargalo) → Experimentos → Relatório PDF / exportação
```

Detalhe: [`docs/product/user-journey.md`](../product/user-journey.md). Diagramas: [`DIAGRAMAS.md`](DIAGRAMAS.md).

## 7. Módulos

Todos com status conforme a matriz. "Screenshot" refere-se ao [`SCREENSHOT-PLAN.md`](SCREENSHOT-PLAN.md).

| Módulo | Problema que resolve | Entradas → saídas | Status | Screenshot |
|---|---|---|---|---|
| **Empresas** | Separar clientes; encerrar sem perder histórico (congelar, nunca apagar — [ADR-0008](../adr/0008-organizacoes-nunca-deletar.md)) | nome, logotipo → cartão com KPIs do mês | `IMPLEMENTADO` | SS-02 |
| **Baseline** | Provar "antes" | indicadores iniciais → snapshot versionado | `IMPLEMENTADO` (comparação cobre 4 métricas) | SS-04 |
| **Financeiro** | Ligar marketing a lucro | receita, custos, despesas, investimento, impostos (mensal) → lucro e margem | `IMPLEMENTADO` | SS-05 |
| **Marketing** | Ver retorno por campanha/canal | campanha (investimento, cliques, leads, clientes, receita atribuída) → ROAS, CTR, CPC, CPM, CPL, CPA | `IMPLEMENTADO` | SS-06 |
| **Funil** | Achar onde se perde gente | 8 etapas por mês, por canal → conversão, abandono, gargalo | `IMPLEMENTADO` | SS-07, SS-08 |
| **Analytics** | Visão do intervalo | KPIs, metas, correlação → séries e comparação | `IMPLEMENTADO` | SS-03, SS-09 |
| **Experimentos A/B** | Evitar "vencedor" precipitado | conversões por variante → p-valor e alerta de amostra | `PARCIAL` (sem ciclo de vida de status) | SS-10 |
| **Central de Dados** | Tirar o dado de planilhas | CSV/XLSX/JSON → mapeamento, preview, confirmação; exportação | `IMPLEMENTADO` | SS-11 |
| **Relatórios** | Entregar ao cliente | período → PDF (básico, executivo, funil) | `IMPLEMENTADO` | SS-12 |
| **Produtos** | Catálogo de referência | cadastro → lista | `PARCIAL` (sem análise por produto) | — |
| **Glossário** | Ensinar a ler o número | termo → definição, fórmula, leitura | `IMPLEMENTADO` | SS-13 |
| **Auditoria** | Saber quem alterou o quê | ações → trilha filtrável | `IMPLEMENTADO` | SS-14 |
| **Acesso** | Controle de quem vê o quê | papéis, chaves de API, Super Admin | `IMPLEMENTADO` (sem tela de equipe para admin da empresa) | SS-15 |

## 8. Analytics

**KPIs executivos (7):** receita, lucro, margem, CAC, taxa de conversão, ticket médio, recorrência.
**Marketing (7):** ROAS, ROI, CTR, CPC, CPM, CPL, CPA.
**Funil:** 8 valores de etapa, 7 taxas de conversão, 7 de abandono, gargalo.
**Comparações:** período × período anterior; período × baseline (receita, lucro, margem, CAC).
**Correlação:** Pearson entre dois KPIs (mínimo de 3 meses aplicáveis).
**Metas:** valor-alvo mensal por KPI, com progresso.

Regras que definem a qualidade dos números: razões guardadas em 0–1 e multiplicadas por 100 só na tela; denominador zero ou dado ausente → `is_applicable = false` com motivo; nenhuma conclusão de causa ([RN-003, RN-004, RN-007](../requirements/business-rules.md)).

**Fora do produto (não citar):** LTV, retenção, churn, MRR, crescimento MoM — as três primeiras existem como funções no motor mas nenhuma tela as usa (L-02).

## 9. Central de Dados

Fluxo: **upload → (seleção de aba, se XLSX) → mapeamento de colunas → preview → confirmação**, com política `pular`/`atualizar` para duplicados. Formatos CSV, XLSX e JSON, nos domínios Financeiro, Funil, Produtos e Marketing. Cabeçalhos em português e variações são reconhecidos por aliases. Exportação dos 5 domínios (a Auditoria exige administrador).

Limites reais: 5 MB e 2.000 linhas por importação; processamento síncrono, sem fila; o arquivo é lido uma vez e as linhas cruas ficam em JSONB (sem storage de arquivo). Cobertura: testes unitários (6 arquivos), de API e de segurança.

## 10. BI e gráficos

- **Gráficos:** Recharts no Funil e SVG desenhado à mão no Analytics — escolha documentada em [`CHART_DECISIONS.md`](../analytics/CHART_DECISIONS.md). **Recharts é a única biblioteca de gráficos do projeto.**
- **BI externo (Power BI, Looker Studio):** o produto oferece **chave de API por empresa**, somente leitura, que permite a essas ferramentas consumir os endpoints de analytics. Existe pesquisa de como ligá-las. **Não há conector nem embedding prontos.** Status: `PROPOSTO`.

## 11. UX/UI e IHC

O que existe e é verificável:

| Prática | Onde |
|---|---|
| Hierarquia e carga cognitiva reduzida: cartões por empresa, acessos rápidos configuráveis na Home | [`docs/workspace/`](../workspace/README.md) |
| Personalização por usuário e por empresa (acessos rápidos; configuração dos gráficos do Funil, persistida) | [`docs/charts/PERSONALIZACAO_DE_GRAFICOS.md`](../charts/PERSONALIZACAO_DE_GRAFICOS.md) |
| Educação do usuário: Glossário e ícone de ajuda (`?`) em cada indicador | tela `/glossario`, `metric-help.tsx` |
| Estados vazios explícitos, "não aplicável" com motivo, nunca campo em branco enganoso | motor de métricas + telas |
| Tema claro e escuro; impressão sempre em tema claro | [ADR-0007](../adr/0007-relatorios-html-print-css.md) |
| Três idiomas (pt-BR, en, es), 773 chaves, com gate de CI para paridade | [ADR-0009](../adr/0009-estrategia-i18n.md) |
| Menu em gaveta em telas estreitas | layout responsivo |
| Logout automático por inatividade (15 min) | `idle-logout-watcher` |
| Design system próprio documentado | [`DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md) |

**Não afirmar:** conformidade WCAG (não verificada — sem axe/Lighthouse no projeto), design system "completo" (não há catálogo público), aplicativo móvel (não existe).

## 12. Segurança

Somente controles **verificados** (detalhe e "o que não dizer" em [matriz §5](01-MATRIZ-DE-MATURIDADE.md)):

- Senhas com **Argon2**; política forte aplicada em cadastro, reset e troca.
- **Sessão única por conta**, revogada no servidor a cada login ([RN-016](../requirements/business-rules.md)).
- **Isolamento entre empresas** com resposta 404 (e não 403) para não-membro, cobrado por teste automatizado.
- **RBAC** em quatro papéis lineares, mais `PLATFORM_ADMIN` global.
- **Rate limiting** em três dimensões (IP, conta, combinada) nos endpoints sensíveis.
- **Trilha de auditoria** com 50 identificadores de ação no código (inclui bloqueios por rate limit).
- **Validação de faixa** em entradas numéricas ([RN-017](../requirements/business-rules.md)).
- **CI de segurança:** SAST (`bandit`), auditoria de dependências Python e Node em toda PR.

Sem MFA (proposta documentada), sem certificação, sem auditoria externa, sem afirmação de conformidade com LGPD.

## 13. Arquitetura

```
Navegador ─▶ Next.js (App Router, i18n) ─▶ /api/* reescrito ─▶ FastAPI ─▶ PostgreSQL
                                                                  │
                                            camada de serviço ◀──┘
                                                  │
                                    metrics/engine.py (funções puras)
```

**Monólito modular** ([ADR-0001](../adr/0001-monolito-modular.md)) com 20 módulos de API. O navegador só fala com a origem do Next; em produção `/api/*` é reescrito para o backend, mantendo o cookie de sessão na mesma origem. Serviços externos reais: **Cloudinary** (logotipo) e **Resend** (e-mail), ambos opcionais por variável de ambiente. Diagramas Mermaid em [`DIAGRAMAS.md`](DIAGRAMAS.md).

## 14. Banco de dados

PostgreSQL 16 · 21 tabelas · 19 migrations lineares (Alembic). Decisões relevantes:

- **Multi-tenancy** por `organization_id` em esquema compartilhado ([ADR-0003](../adr/0003-estrategia-multi-tenancy.md)).
- **Append-only** para baseline e auditoria ([ADR-0005](../adr/0005-baseline-append-only.md)) — por convenção de código, não por trigger (L-19).
- **Sessão única** garantida por índice único parcial (`WHERE revoked_at IS NULL`): o banco recusa uma segunda sessão ativa, mesmo sob concorrência.
- **Empresas nunca são deletadas**, apenas congeladas ([ADR-0008](../adr/0008-organizacoes-nunca-deletar.md)).
- Granularidade **mensal** para financeiro, funil e metas.

## 15. Qualidade

Números medidos em 2026-09-18 (método e ressalvas na [matriz §2](01-MATRIZ-DE-MATURIDADE.md)):

| Camada | Quantidade |
|---|---|
| Backend (unit · integration · api · security) | **736 testes** (última execução completa: 730 ✓, 0 falhas; +6 testes do L-05 verdes no CI) |
| Frontend (Vitest + Testing Library) | **513 testes**, 70 arquivos, todos passando |
| E2E (Playwright, chromium) | **56 testes** em 20 arquivos |
| Lint / tipos | `ruff`, `mypy`, `eslint`, `tsc` em CI |
| Migrations | aplicadas do zero em CI (`alembic upgrade head`) |

Cobertura percentual: **não medida** (o CI reporta, sem limite) — não citar. Desempenho e acessibilidade automatizada: **não medidos**.

## 16. Engenharia e processo

- Branch por assunto, **Conventional Commits**, PR com template, squash-merge ([`CONTRIBUTING.md`](../../CONTRIBUTING.md)).
- **Uso de IA declarado:** Desenvolvimento **assistido por IA** (Claude Code, da Anthropic), registrado nos trailers `Co-Authored-By` do histórico do Git; o autor define produto e escopo, toma as decisões, revisa e aprova cada PR.
- **5 jobs de CI em toda PR**; o merge é condicionado por processo (proteção técnica de branch indisponível no plano atual do GitHub).
- **9 ADRs**, ~100 documentos, 17 regras de negócio numeradas com rastreabilidade RF → história → aceite.
- **Ciclo auditoria → correção:** a auditoria de 2026-09-10 registrou 21 lacunas; 4 já foram corrigidas com PR, teste e decisão registrada ([`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md)).

## 17. Desafios técnicos

Problemas reais, com a solução adotada e onde está a evidência:

| Desafio | Solução | Evidência |
|---|---|---|
| **Números confiáveis**: dado ausente virava zero e divisão por zero quebrava indicadores | Motor puro que devolve `MetricResult{value, is_applicable, reason}` e nunca lança exceção nem devolve 0 por ausência | `metrics/engine.py`, 72 testes unitários |
| **Sessão única sob concorrência** | Índice único parcial no banco, além da ordem das instruções da aplicação | `models/session.py`, `integration/test_single_active_session.py` |
| **Rate limit fraco contra spraying** (chave `IP:e-mail` não bloqueava poucas senhas contra muitas contas) | Três dimensões independentes de limite por endpoint sensível | `core/rate_limit.py`, `security/test_rate_limiting.py` |
| **Não revelar existência de empresas** | Não-membro recebe 404, nunca 403 | ADR-0003, `security/test_authorization.py` |
| **Relatório PDF sem depender do navegador** | Geração server-side com ReportLab (wheel puro, sem bibliotecas nativas) | [`PDF_INFRAESTRUTURA.md`](../reports/PDF_INFRAESTRUTURA.md) |
| **Importar planilhas sujas** | Parse único, mapeamento de colunas com aliases, preview antes de gravar, duplicados tratáveis | [`docs/data-import-export/`](../data-import-export/README.md) |
| **Vulnerabilidade crítica em dependência (Next.js)** detectada pelo CI em 2026-09-10 | Atualização de `next` e `sharp` em PR única, com auditoria limpa em produção de dependências | PR #130 |

## 18. Trade-offs arquiteturais

| Decisão | Ganho | Custo aceito |
|---|---|---|
| Monólito modular em vez de microserviços | Simplicidade de deploy e de transação | Escala independente por módulo não é possível |
| Esquema compartilhado com `organization_id` | Operação simples, um banco | Isolamento depende de disciplina em todo acesso — mitigado por filtro centralizado e teste estrutural |
| Cookies `HttpOnly` em vez de token no navegador | Menor exposição a XSS | Exige proxy same-origin |
| Dado manual/planilha antes de integrações | Valida o modelo sem depender de APIs de terceiros | Sem coleta automática |
| SVG artesanal no Analytics, Recharts no Funil | Controle e zero dependência onde bastava | Duas abordagens de gráfico convivendo |
| Rate limit em memória | Zero infraestrutura | Não sobrevive a múltiplas réplicas |
| Refresh token sem rotação | Simplicidade | Token vazado vale até 7 dias (L-13) |

## 19. Diferenciais comprovados

Só o que é observável no código e nos testes — **sem comparação com concorrentes**, que fica para a análise competitiva (Parte B):

1. Regra de número: ausência ≠ zero, aplicada e testada em toda a camada de métricas.
2. Comparação antes × depois com baseline histórico e aviso explícito sobre causalidade.
3. Isolamento entre empresas verificado por teste, incluindo o caso de não revelar existência.
4. Experimentos que recusam "vencedor" sem amostra e significância.
5. Glossário e ajuda contextual em cada indicador (educação do usuário).
6. Documentação e processo de engenharia fora do comum para o porte: ADRs, regras de negócio rastreáveis, auditoria própria com correções.

## 20. Roadmap (não é funcionalidade disponível)

| Item | Status | Observação |
|---|---|---|
| Integrações GA4 / Google Ads / Meta Ads | `PLANEJADO` | Bloqueado até validação em uso real |
| Exclusão/exportação self-service de dados pessoais (LGPD) | `PLANEJADO` | Issue #25 |
| MFA (TOTP) para papéis privilegiados | `PROPOSTO` | Documento de arquitetura |
| Acesso por módulo (empresa e usuário) | `PROPOSTO` | Só desenho |
| Tela de equipe para o admin da empresa | `PLANEJADO` | API pronta, UI ausente |
| Observabilidade, performance, acessibilidade auditada, backup | `PLANEJADO` | Fase 18 (hardening) |
| LTV, retenção, churn, MRR | `PLANEJADO` | Decisão de produto pendente (L-02, L-21) |
| Priorização com base em análise de mercado | `EM DESENVOLVIMENTO` | `docs/product/COMPETITIVE-OPPORTUNITY-BACKLOG.md` *(Partes B/C deste plano; ainda não existe)* |

## 21. Galeria de telas

Nenhuma imagem versionada ainda. O plano de capturas, com dados fictícios e itens a ocultar, está em [`SCREENSHOT-PLAN.md`](SCREENSHOT-PLAN.md). *(Pendência assumida: as capturas exigem executar a aplicação com a empresa demo.)*

## 22. Como demonstrar com segurança

Roteiro completo em [`ROTEIRO-DE-DEMO.md`](ROTEIRO-DE-DEMO.md). Regras:

- Usar **somente** a empresa fictícia de `test-data/demo-company/`.
- Nunca exibir barra de URL com UUID, console do navegador, chave de API criada, `.env` ou e-mails reais.
- Nunca mostrar `/admin` com dados que não sejam de demonstração.
- Dizer, no início, que o produto está em pré-produção.

## 23. Contato

`[NOME · E-MAIL · LINKEDIN · REPOSITÓRIO — a definir com o autor antes da publicação]`

Nenhum contato foi inventado; substituir o placeholder na aprovação.
