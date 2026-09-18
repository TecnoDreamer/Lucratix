# EPIC — Portfolio & Competitive Intelligence

> Organização ágil do trabalho do prompt mestre de portfólio + inteligência competitiva (Parte D). Compatível com o padrão do repositório (`EPIC-013`, `EPIC-014` são as épicas abertas hoje). **Nenhuma issue do GitHub foi criada** — a seção 6 lista o que seria criado, após verificação de duplicidade.
> Data: 2026-09-18.

## 1. Objetivo

Documentar profissionalmente o Lucratix, mapear o mercado e transformar evidências competitivas em **oportunidades validadas** — sem inventar dados, sem copiar concorrentes e sem publicar nada sem autorização.

**Critério de sucesso da épica:** os três ativos existem e são **rastreáveis por fonte/evidência**: (1) apresentação profissional, (2) inteligência de mercado, (3) plano executável (backlog + roadmap).

## 2. Features

| # | Feature | Status | Entrega | PR |
|---|---|---|---|---|
| F1 | **Auditoria do produto** | ✅ Concluída | Matriz de maturidade + inventário de evidências | [#135](https://github.com/TecnoDreamer/Lucratix/pull/135) |
| F2 | **Portfólio** | ✅ Concluída *(imagens pendentes)* | Portfólio principal, versões executiva/técnica, case study, pitches, LinkedIn, showcase, demo, plano de capturas, diagramas | [#136](https://github.com/TecnoDreamer/Lucratix/pull/136) |
| F3 | **Pesquisa nacional** | ✅ Concluída *(cobertura parcial)* | 13 soluções, matriz, preços | [#137](https://github.com/TecnoDreamer/Lucratix/pull/137) |
| F4 | **Pesquisa regional** | ✅ Concluída *(cobertura parcial)* | Consultorias de BI e agências no interior de SP | [#137](https://github.com/TecnoDreamer/Lucratix/pull/137) |
| F5 | **Pesquisa Leme/entorno** | ✅ Concluída *(cobertura baixa do comércio local)* | Dados IBGE, verificação de sede das "agências em Leme", roteiro de discovery | [#137](https://github.com/TecnoDreamer/Lucratix/pull/137) |
| F6 | **Benchmark UX/UI** | ✅ Concluída *(sem uso real)* | Padrões observados em páginas públicas | esta PR |
| F7 | **Benchmark funcional/comercial** | ✅ Concluída | Classificação funcional e preços | #137 e esta PR |
| F8 | **Gap analysis** | ✅ Concluída | SWOT, gaps, oportunidades, posicionamento, hipóteses de planos | esta PR |
| F9 | **Backlog e roadmap** | ✅ Concluída | Backlog ICE e roadmap por horizontes | esta PR |
| F10 | **Publicação** | ⏸ **Não iniciada — exige autorização explícita** | Escolher showcase A/B/C, checklist de higiene, capturas aprovadas | — |

## 3. Histórias e tarefas pendentes

Onde não há persona real, usa-se **tarefa** (o prompt orienta não forçar user story artificial).

### Histórias

**HU-1 — Convidar membros pela interface** *(backlog B-01)*
Como **dono(a) de consultoria**, quero **convidar, trocar o papel e revogar membros da minha empresa pela interface**, para **não depender do administrador da plataforma**.
- [ ] Dado um `ORGANIZATION_ADMIN`, quando abre "Equipe", vê a lista de membros com papel
- [ ] Quando convida por e-mail com um papel ≤ ao seu, o membro aparece e (em dev) o link de definir senha é exibido
- [ ] Não consegue atribuir papel superior ao seu (regra RN-009) nem revogar a si mesmo
- [ ] `ANALYST` e `VIEWER` **não** veem a página (mensagem de acesso restrito)
- [ ] Testes de API/E2E cobrem os quatro casos; i18n nos 3 idiomas

**HU-2 — Preparar dados sem esforço** *(backlog B-04, após B-19)*
Como **analista**, quero **partir de uma planilha-modelo e ver o próximo passo em telas vazias**, para **chegar ao primeiro painel sem adivinhar o formato**.
- [ ] Planilha-modelo baixável por domínio (Financeiro, Funil, Produtos, Marketing)
- [ ] Estado vazio de cada tela indica o próximo passo
- [ ] Tempo/passos até o 1º painel medidos **antes e depois** (baseline do próprio teste de usabilidade)

### Tarefas

| ID | Tarefa | Critério de aceite | Ligada a |
|---|---|---|---|
| T-1 | Executar o `SCREENSHOT-PLAN.md` com a Empresa Demo | 21 capturas aprovadas no checklist de revisão; nenhuma com UUID, e-mail real, chave ou caminho local | B-03 |
| T-2 | Varredura de segredos no **histórico** do Git (`gitleaks`) | Relatório sem achados **ou** achados tratados; registrado em `docs/portfolio/` | B-03 (pré-requisito de A) |
| T-3 | Tratar `docs/environment.md` (caminho local e conta pessoal) | Arquivo ajustado/removido do espelho público | B-03 |
| T-4 | Rodar axe/Lighthouse nas telas principais e registrar | Relatório versionado; achados críticos com issue | B-05 |
| T-5 | Decidir e registrar a redação da **declaração de uso de IA** nos materiais | Texto aprovado pelo autor e replicado em `docs/portfolio/` | F2 |
| T-6 | Conduzir o discovery (≥ 5 conversas P1 e P3) | Planilha anonimizada + estado de cada H-D (`Confirmada`/`Refutada`/`Inconclusiva`) | B-02 |
| T-7 | Rodar o teste de usabilidade do "primeiro valor" | ≥ 5 sessões cronometradas com pontos de travamento | B-19 |
| T-8 | Observação de UX de concorrentes com **contas de teste próprias** *(com autorização e respeitando termos de uso)* | Cronometragem de "cadastrar cliente → primeiro relatório" em Reportei e mLabs Analytics | F6 (complemento) |

## 4. Sprints (proposta de sequência)

> Foram propostos os blocos abaixo; **o trabalho das sprints 1–4 foi executado de forma contínua em uma única frente**, não em sprints cronometradas com revisão intermediária. A tabela registra a **sequência lógica**, não um histórico de cadência.

| Sprint | Foco | Conteúdo | Situação |
|---|---|---|---|
| 1 | Auditoria + evidências | F1 | ✅ |
| 2 | Portfólio | F2 | ✅ (imagens e decisões T-1, T-2, T-3, T-5 pendentes) |
| 3 | Pesquisa competitiva | F3, F4, F5 | ✅ |
| 4 | Benchmarks + gaps + backlog | F6–F9 | ✅ |
| 5 | Preparação de publicação e validação | F10, T-1…T-8 | ⏳ **Depende de decisões do autor** |

## 5. Definição de Pronto (DoR) e de Feito (DoD)

**DoR** — uma demanda só entra quando tem: objetivo, contexto, critérios de aceite, dependências, evidências e riscos conhecidos.

**DoD** — quando aplicável ao item:

| Para documentação/pesquisa | Para código |
|---|---|
| Toda afirmação com **fonte + data** | Implementação conforme critérios de aceite |
| Hipótese separada de fato | Lint, tipos e testes passando |
| Limites da pesquisa declarados | Build |
| Sem dado sensível | Review e PR com template |
| PR revisável (pequena) | Responsividade e acessibilidade verificadas |
| Links relativos verificados | Segurança revisada; sem secrets |
| | Documentação atualizada; evidências anexadas |

**Pesquisa só está pronta com fontes e data de consulta.**

## 6. Issues propostas (não criadas)

Verificação de duplicidade em 2026-09-18: as issues abertas são **#25** (LGPD self-service) e **#26** (integrações); **nenhuma** coincide com os itens abaixo, exceto as referências indicadas.

| Título proposto | Origem | Relação com issue existente |
|---|---|---|
| `[FEATURE] Tela de equipe para o admin da empresa` | B-01 / HU-1 | — |
| `[TASK] Discovery com usuários (roteiro em docs/competitive/07)` | B-02 / T-6 | — |
| `[TASK] Capturas de tela do portfólio + decisão do showcase` | B-03 / T-1, T-2, T-3 | — |
| `[TASK] Auditoria de acessibilidade (axe/Lighthouse)` | B-05 / T-4 | — |
| `[TASK] Teste de usabilidade do primeiro valor` | B-19 / T-7 | — |
| `[FEATURE] Onboarding: planilha-modelo, exemplo e estados vazios` | B-04 / HU-2 | depende de B-19 |
| `[TASK] Observabilidade mínima` | B-06 | — |
| LGPD self-service | B-08 | **já é a issue #25** — não duplicar |
| Integrações externas | B-14 | **já é a issue #26** — não duplicar; permanece bloqueada |

Cada issue criada deve seguir os templates de `.github/ISSUE_TEMPLATE/` (`feature`, `task`, `bug`) com título, contexto, problema, objetivo, escopo, critérios de aceite, dependências, labels e milestone.

## 7. Convenções seguidas

Branches `docs/<assunto>`; commits pequenos em Conventional Commits (`docs(portfolio):`, `docs(research):`, `docs(product):`); PR com o template do repositório; merge só com CI verde. PRs desta épica: #135, #136, #137 e a que introduz este arquivo.
