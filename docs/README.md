# Central de Documentação — Lucratix

Portal navegável de toda a documentação do projeto. Para uma visão geral do produto antes de mergulhar, comece pelo guia mestre: [`../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`](../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md).

## Por onde começar

| Você é… | Leia nesta ordem |
|---|---|
| **Usuário / cliente** | [guia mestre](../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md) → [`product/user-journey.md`](product/user-journey.md) → [`analytics/metrics-catalog.md`](analytics/metrics-catalog.md) → [`data-import-export/IMPORT_FORMATS.md`](data-import-export/IMPORT_FORMATS.md) |
| **Dev novo no projeto** | [guia mestre](../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md) → [`architecture/overview.md`](architecture/overview.md) → [`adr/`](adr/) → [`database/schema-notes.md`](database/schema-notes.md) → [`security/AUTHENTICATION.md`](security/AUTHENTICATION.md) → [`../README.md`](../README.md) (como rodar) |
| **QA / revisor** | [`requirements/`](requirements/) → [`testing/strategy.md`](testing/strategy.md) → [`governanca/LACUNAS_ENCONTRADAS.md`](governanca/LACUNAS_ENCONTRADAS.md) |
| **Segurança** | [`security/README.md`](security/README.md) → [`security/threat-model.md`](security/threat-model.md) → [`security/security-requirements.md`](security/security-requirements.md) |

## Governança

- [governanca/LACUNAS_ENCONTRADAS.md](governanca/LACUNAS_ENCONTRADAS.md) — divergências implementação × documentação, código órfão e pontos que pedem decisão, classificados por severidade (auditoria 2026-09-10; itens já corrigidos marcados `✅ RESOLVIDO`).
- [environment.md](environment.md) — ferramentas verificadas na máquina de desenvolvimento (Fase 0).

## Portfólio

Base de evidências para apresentar o produto sem exagero (o que pode e o que não pode ser dito).

- [portfolio/01-MATRIZ-DE-MATURIDADE.md](portfolio/01-MATRIZ-DE-MATURIDADE.md) — status real de cada módulo e capacidade, com evidência, testes e números verificados.
- [portfolio/02-INVENTARIO-DE-EVIDENCIAS.md](portfolio/02-INVENTARIO-DE-EVIDENCIAS.md) — o que serve de prova em material público, o que precisa ser anonimizado e o que falta produzir.
- [`../CHANGELOG.md`](../CHANGELOG.md) — histórico datado de tudo que entrou (fonte primária de "o que shipou quando").
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — workflow de branch, Conventional Commits, Definition of Ready/Done.

## Produto ([`product/`](product/))

- [vision.md](product/vision.md), [problem.md](product/problem.md), [value-proposition.md](product/value-proposition.md) — por que o produto existe.
- [personas.md](product/personas.md), [stakeholders.md](product/stakeholders.md), [user-journey.md](product/user-journey.md).
- [scope.md](product/scope.md), [mvp.md](product/mvp.md), [roadmap.md](product/roadmap.md) — fases 0–16 concluídas; 17–18 pendentes.
- [risks.md](product/risks.md), [hypotheses.md](product/hypotheses.md), [out-of-scope.md](product/out-of-scope.md).

## Requisitos ([`requirements/`](requirements/))

- [business-rules.md](requirements/business-rules.md) — RN-001 a RN-017 (regras de negócio). RN-016 (sessão única) e RN-017 (faixa numérica) vieram das correções L-01 e L-05.
- [functional-requirements.md](requirements/functional-requirements.md) — RF-001 a RF-027.
- [non-functional-requirements.md](requirements/non-functional-requirements.md) — RNF-001 a RNF-020.
- [acceptance-criteria.md](requirements/acceptance-criteria.md), [user-stories.md](requirements/user-stories.md).
- [traceability-matrix.md](requirements/traceability-matrix.md) — RF → história → critério → item de MVP → teste.

## Arquitetura e decisões

- [architecture/overview.md](architecture/overview.md) — estilo (monólito modular), fluxo, tabela de módulos. *(Tabela de módulos defasada — ver [L-10](governanca/LACUNAS_ENCONTRADAS.md).)*
- [architecture/domain-model.md](architecture/domain-model.md) — descrição em prosa das entidades.
- [database/er-diagram.md](database/er-diagram.md) — diagrama ER (Mermaid).
- [database/schema-notes.md](database/schema-notes.md) — convenções de schema (UUID PK, timestamps, índices, sem trigger/view/RLS).
- [adr/](adr/) — 9 ADRs: [0001](adr/0001-monolito-modular.md) monólito modular · [0002](adr/0002-stack-tecnologica.md) stack · [0003](adr/0003-estrategia-multi-tenancy.md) multi-tenancy · [0004](adr/0004-estrategia-autenticacao.md) autenticação · [0005](adr/0005-baseline-append-only.md) baseline append-only · [0006](adr/0006-estrategia-filtros-analytics.md) filtros analytics · [0007](adr/0007-relatorios-html-print-css.md) relatórios *(superado — ver [L-17](governanca/LACUNAS_ENCONTRADAS.md))* · [0008](adr/0008-organizacoes-nunca-deletar.md) organizações nunca deletar · [0009](adr/0009-estrategia-i18n.md) i18n.

## Diagramas ([`diagrams/`](diagrams/) — Mermaid)

- [class/domain-model.md](diagrams/class/domain-model.md) — diagrama de classes do domínio.
- [use-case/core-operations.md](diagrams/use-case/core-operations.md), [use-case/analytics-and-governance.md](diagrams/use-case/analytics-and-governance.md).
- [sequence/auth-and-onboarding.md](diagrams/sequence/auth-and-onboarding.md), [sequence/data-entry.md](diagrams/sequence/data-entry.md), [sequence/metrics-calculation.md](diagrams/sequence/metrics-calculation.md), [sequence/multi-tenant-authorization.md](diagrams/sequence/multi-tenant-authorization.md), [sequence/experiments-and-integration.md](diagrams/sequence/experiments-and-integration.md).

## Métricas e analytics ([`analytics/`](analytics/))

- [metrics-catalog.md](analytics/metrics-catalog.md) — catálogo de métricas (fórmula, unidade, "não aplicável"). Implementação real: `apps/api/app/modules/metrics/engine.py`. *(Catálogo em atualização — ver [L-03](governanca/LACUNAS_ENCONTRADAS.md).)*
- [ARCHITECTURE.md](analytics/ARCHITECTURE.md) — camadas UI → router → service → engine → repositório.
- [FILTERS.md](analytics/FILTERS.md) — presets de intervalo de datas (granularidade mensal).
- [CHART_DECISIONS.md](analytics/CHART_DECISIONS.md) — qual motor visual cada gráfico usa e por quê.
- [POWER_BI.md](analytics/POWER_BI.md), [LOOKER_STUDIO.md](analytics/LOOKER_STUDIO.md) — pesquisa de BI externo (sem integração pronta).

## Funil ([`funnel/`](funnel/))

- [README.md](funnel/README.md) — visão do épico Funil Multicanal.
- [KPIS.md](funnel/KPIS.md) — 8 etapas fixas, 7 conversões/abandonos, gargalo, série mensal.
- [MODELAGEM.md](funnel/MODELAGEM.md) — por que `channel_id` é coluna nullable (armadilha do `UNIQUE` + `NULL` no Postgres).
- [UX.md](funnel/UX.md), [VISUALIZACOES.md](funnel/VISUALIZACOES.md).

## Gráficos ([`charts/`](charts/))

- [README.md](charts/README.md) — índice da camada de gráficos.
- [ARQUITETURA_DE_GRAFICOS.md](charts/ARQUITETURA_DE_GRAFICOS.md) — `ChartTooltip` compartilhado, roadmap do `ChartShell`.
- [PERSONALIZACAO_DE_GRAFICOS.md](charts/PERSONALIZACAO_DE_GRAFICOS.md) — presets e persistência por usuário+organização+gráfico.
- [ACESSIBILIDADE.md](charts/ACESSIBILIDADE.md), [TESTES.md](charts/TESTES.md).

## Relatórios ([`reports/`](reports/))

- [PDF_INFRAESTRUTURA.md](reports/PDF_INFRAESTRUTURA.md) — decisão ReportLab (wheel puro) e API Platypus.
- [FUNIL_PDF.md](reports/FUNIL_PDF.md) — as 11 seções do relatório de funil.
- [PR4_INVENTARIO.md](reports/PR4_INVENTARIO.md) — decisão tela a tela do padrão gráfico/PDF.

## Empresas e workspace

- [organizations/README.md](organizations/README.md), [organizations/BUSCA_PAGINACAO.md](organizations/BUSCA_PAGINACAO.md), [organizations/CICLO_DE_VIDA.md](organizations/CICLO_DE_VIDA.md) (congelar/reativar), [organizations/LOGOTIPO.md](organizations/LOGOTIPO.md).
- [workspace/README.md](workspace/README.md), [workspace/NAVEGACAO.md](workspace/NAVEGACAO.md), [workspace/ACESSOS_RAPIDOS.md](workspace/ACESSOS_RAPIDOS.md), [workspace/PERSONALIZACAO.md](workspace/PERSONALIZACAO.md).

## Importação e exportação ([`data-import-export/`](data-import-export/))

- [README.md](data-import-export/README.md) — 4 domínios importáveis, lista de endpoints.
- [ARCHITECTURE.md](data-import-export/ARCHITECTURE.md) — arquitetura de adaptadores, processamento síncrono, sem storage.
- [IMPORT_FORMATS.md](data-import-export/IMPORT_FORMATS.md) — formatos aceitos, detecção, limites (5 MB / 2000 linhas).

## Segurança ([`security/`](security/) — 19 documentos)

Índice próprio em [security/README.md](security/README.md). Destaques:

- [AUTHENTICATION.md](security/AUTHENTICATION.md) — sessão única, tokens, recuperação de senha, verificação de e-mail.
- [ACCESS_CONTROL.md](security/ACCESS_CONTROL.md) — 5 níveis de acesso, RBAC, Super Admin.
- [RATE_LIMITING.md](security/RATE_LIMITING.md) — as 3 dimensões de chave, IP confiável, storage.
- [API_KEYS.md](security/API_KEYS.md) — chave de API por organização (Power BI/Looker).
- [POLITICA_DE_SENHAS.md](security/POLITICA_DE_SENHAS.md), [LOGS_E_AUDITORIA.md](security/LOGS_E_AUDITORIA.md), [MFA.md](security/MFA.md) *(proposta)*.
- [threat-model.md](security/threat-model.md), [security-requirements.md](security/security-requirements.md) (OWASP), [security-testing.md](security/security-testing.md).
- [data-classification.md](security/data-classification.md), [incident-response.md](security/incident-response.md), [lgpd.md](security/lgpd.md).
- [POWER_BI_SECURITY.md](security/POWER_BI_SECURITY.md), [TESTES_DE_AUTENTICACAO.md](security/TESTES_DE_AUTENTICACAO.md), [TESTES_DE_SEGURANCA_AUTENTICACAO.md](security/TESTES_DE_SEGURANCA_AUTENTICACAO.md).

## Qualidade

- [testing/strategy.md](testing/strategy.md) — pirâmide de testes, qual camada roda em qual pipeline. *(Números em atualização — ver [L-11](governanca/LACUNAS_ENCONTRADAS.md).)*
- Auditorias pré-implementação: [auditoria/AUDITORIA_BI_RELATORIOS.md](auditoria/AUDITORIA_BI_RELATORIOS.md), [auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md](auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md), [auditoria/AUDITORIA_METRICAS_GLOSSARIO_SESSAO.md](auditoria/AUDITORIA_METRICAS_GLOSSARIO_SESSAO.md).

## Design e i18n

- [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md), [design/AUTH_UI_UX.md](design/AUTH_UI_UX.md), [design/Z_INDEX_LAYERS.md](design/Z_INDEX_LAYERS.md).
- [branding/LUCRATIX_BRAND.md](branding/LUCRATIX_BRAND.md).
- [i18n/README.md](i18n/README.md), [i18n/CATALOGO_DE_MENSAGENS.md](i18n/CATALOGO_DE_MENSAGENS.md).

## Operação

Instalação local, comandos e variáveis de ambiente estão no [`../README.md`](../README.md) da raiz (seções "Como rodar", "Comandos úteis", "Rodando o back-end sem Docker"). O `docker-compose.yml`, os `Dockerfile` e o `.env.example` são a referência canônica de configuração.

---

## Mapeamento com a estrutura sugerida pelo prompt-master de documentação (seção 2)

O prompt sugere uma árvore numerada `docs/00-...` a `docs/08-...` com ~50 arquivos. Este projeto **já tinha** documentação equivalente organizada por tema (links referenciados em PRs anteriores). Adotando a linha 28 do próprio prompt ("Adapte à realidade do repositório"), o conteúdo pedido está mapeado assim:

| Estrutura sugerida pelo prompt | Onde está aqui |
|---|---|
| `DOCUMENTACAO_PRINCIPAL_LUCRATIX.md` (guia mestre) | [`../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md`](../DOCUMENTACAO_PRINCIPAL_LUCRATIX.md) |
| `docs/README.md` (portal) | este arquivo |
| `00-governanca/ESCOPO_E_STATUS.md` | [`product/scope.md`](product/scope.md) + [`product/mvp.md`](product/mvp.md) + [`product/roadmap.md`](product/roadmap.md) |
| `00-governanca/MATRIZ_RASTREABILIDADE.md` | [`requirements/traceability-matrix.md`](requirements/traceability-matrix.md) |
| `00-governanca/LACUNAS_ENCONTRADAS.md` | [`governanca/LACUNAS_ENCONTRADAS.md`](governanca/LACUNAS_ENCONTRADAS.md) |
| `00-governanca/CHANGELOG_DOCUMENTACAO.md` | [`../CHANGELOG.md`](../CHANGELOG.md) (changelog único do projeto) |
| `01-produto/*` | [`product/`](product/) |
| `02-manual-usuario/*` | [`product/user-journey.md`](product/user-journey.md) + guia mestre §5/§8/§9 *(manual passo a passo por tela ainda não consolidado)* |
| `03-metricas/DICIONARIO_DE_DADOS.md` | *(não consolidado — dado espalhado em [`database/schema-notes.md`](database/schema-notes.md), [`funnel/MODELAGEM.md`](funnel/MODELAGEM.md), [`data-import-export/IMPORT_FORMATS.md`](data-import-export/IMPORT_FORMATS.md) e nos models)* |
| `03-metricas/DICIONARIO_DE_METRICAS.md` | [`analytics/metrics-catalog.md`](analytics/metrics-catalog.md) |
| `03-metricas/MAPA_DADO_PARA_INSIGHT.md` | *(não consolidado)* |
| `03-metricas/GLOSSARIO.md` | tela "Glossário" da plataforma + `apps/web/src/domain/metrics/metric-definitions.ts` |
| `04-tecnico/ARQUITETURA.md` | [`architecture/overview.md`](architecture/overview.md) + [`adr/`](adr/) |
| `04-tecnico/BANCO_DE_DADOS.md` | [`database/schema-notes.md`](database/schema-notes.md) + [`database/er-diagram.md`](database/er-diagram.md) |
| `04-tecnico/API.md` | OpenAPI automática em `/docs` (FastAPI) |
| `04-tecnico/AUTENTICACAO_E_AUTORIZACAO.md` | [`security/AUTHENTICATION.md`](security/AUTHENTICATION.md) + [`security/ACCESS_CONTROL.md`](security/ACCESS_CONTROL.md) |
| `04-tecnico/INTEGRACOES.md` | guia mestre §12 + [`analytics/POWER_BI.md`](analytics/POWER_BI.md) + [`organizations/LOGOTIPO.md`](organizations/LOGOTIPO.md) |
| `05-seguranca/*` | [`security/`](security/) |
| `06-qualidade/ESTRATEGIA_DE_TESTES.md` | [`testing/strategy.md`](testing/strategy.md) |
| `06-qualidade/CI_CD.md` | `.github/workflows/*.yml` (4 workflows, 5 jobs) |
| `07-operacao/*` | [`../README.md`](../README.md) + `docker-compose.yml` + `Dockerfile` + `.env.example` |
| `08-diagramas/*` | [`diagrams/`](diagrams/) + [`database/er-diagram.md`](database/er-diagram.md) |

Itens marcados *(não consolidado)* são os candidatos a criação numa rodada de "truth-up completo" da documentação — ver [`governanca/LACUNAS_ENCONTRADAS.md`](governanca/LACUNAS_ENCONTRADAS.md).

## Política "documentation as code"

```
Mudou regra de negócio  → atualize docs/requirements/business-rules.md
Criou/alterou KPI       → atualize docs/analytics/metrics-catalog.md
Criou endpoint          → a OpenAPI (/docs) atualiza sozinha; documente comportamento não-óbvio no doc do módulo
Alterou variável de env → atualize .env.example e o README
Mudou um fluxo          → atualize o guia mestre e o diagrama de sequência correspondente
Encontrou divergência   → registre em docs/governanca/LACUNAS_ENCONTRADAS.md
```
