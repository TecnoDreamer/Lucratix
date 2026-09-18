# Relatório executivo — inteligência competitiva do Lucratix

> Resumo para decisão. Detalhes e fontes em [`README.md`](README.md) e nos documentos numerados. Consulta: **2026-09-18**. **Tudo que não tem fonte está marcado como hipótese.**

## 1. Situação atual

O Lucratix é um produto **funcional ponta a ponta e em pré-produção**: sem usuários reais, sem resultado de negócio medido e sem integrações automáticas de dados. Foi construído em **~4 semanas** (155 commits, ~80 PRs), com desenvolvimento **assistido por IA** declarado no histórico. Base: [`01-MATRIZ-DE-MATURIDADE.md`](../portfolio/01-MATRIZ-DE-MATURIDADE.md).

## 2. Maturidade

20 módulos de API, 21 tabelas, 736 testes de backend, 513 de frontend e 56 E2E, com CI de 5 jobs. **Forte** em engenharia, isolamento entre empresas e regra de números confiáveis. **Fraco/ausente** em integrações, white-label, IA, agendamento, tela de equipe, observabilidade e acessibilidade verificada.

## 3. Mercado analisado

Seis categorias (relatórios para agências, BI geral, integração de dados, financeiro/ERP, gestão de agência, serviços) — definidas **antes** dos nomes. Power BI e Looker Studio foram tratados como **substitutos/complementares**, não concorrentes diretos.

## 4. Concorrência nacional

13 soluções verificadas em fontes oficiais. **Concorrentes diretos na tarefa** ("reportar resultado ao cliente da agência"): **Reportei** e **mLabs Analytics** (nacionais, com preço em reais publicado), **AgencyAnalytics** e **DashThis** (internacionais). Preços de entrada publicados: Reportei **R$ 74,90/mês** (5 projetos); mLabs Analytics **a partir de R$ 34,90/mês** (equivalente anual); Power BI Pro **R$ 80,20/usuário/mês**. Reportei e mLabs declaram "mais de 10.000" clientes/empresas (declaração das empresas).

## 5. Concorrência regional

Consultorias de BI/Power BI existem em **Campinas** (MTR Analytics) e **Piracicaba** (Twelve Solutions), e uma contabilidade cita BI/Power BI/Qlik (Leme Soluções Contábeis — sede **não confirmada**). Nenhuma delas é SaaS.

## 6. Leme e entorno

Leme: **98.161 habitantes** (Censo 2022) e **3.388 empresas atuantes** (2021, IBGE). **Nenhuma agência com sede verificada em Leme**: as páginas "agência em Leme" pertencem a agências de Goiânia, São José do Rio Preto, Porto Alegre etc. (SEO por cidade). As únicas com **sede confirmada em Leme** são **contabilidades** (Consult Contabilidade e Visão Contábil), que oferecem relatórios gerenciais. **Nenhum SaaS local.** Como PMEs locais resolvem hoje continua **hipótese**.

## 7. Padrões de mercado

Ferramentas de relatório convergem em: **muitas integrações automáticas**, dashboards, **relatórios agendados**, **white-label/portal do cliente** e **IA** (quase sempre plano superior ou add-on). Cobrança pelo **cliente da agência** (projeto/marca/cliente), trials curtos sem cartão, desconto anual.

## 8. Principais gaps do Lucratix

Integrações automáticas (essencial no mercado), white-label, IA, agendamento, **tela de equipe** (bloqueia o portal do cliente), tempo até o primeiro valor, observabilidade, acessibilidade, LGPD self-service, e — o maior — **prova de demanda**. Lista completa: [`09-GAP-ANALYSIS.md`](09-GAP-ANALYSIS.md).

## 9. Diferenciais comprovados

*Comprovado = existe, funciona e é testado no produto; não = "usuários valorizam".* Regra "ausência ≠ zero"; antes × depois com baseline; **financeiro + funil de 8 etapas + campanhas** cruzados; teste A/B que recusa "vencedor" sem amostra e significância; **isolamento entre empresas verificável**; glossário e ajuda por indicador.

## 10. Diferenciais potenciais

"O número que se pode defender ao cliente" (rigor como razão de compra); contador/consultor como usuário; complemento de BI externo; modularização. **Todos dependem de validação.**

## 11. Ameaças

Base grande e integrações amplas dos incumbentes; **preço de entrada muito baixo**; alternativas gratuitas (Looker Studio, Power BI Desktop); IA como expectativa; LGPD; vulnerabilidades de dependência (já houve um caso crítico, corrigido em 1 PR).

## 12. Oportunidades

**Provar resultado financeiro** (não localizado nas 4 ferramentas de relatório pesquisadas — **hipótese**); PMEs/consultorias em planilha (**hipótese**); contador local como canal (**hipótese**); template/conector sobre a chave de API para BI externo.

## 13. Hipóteses de posicionamento

**P-A (mais alinhada à visão):** para consultorias que precisam provar resultado financeiro. **P-B:** PMEs que acompanham marketing em planilha. **P-C:** fonte governada para quem usa Power BI/Looker. Nenhuma está decidida — [`11-POSICIONAMENTO.md`](11-POSICIONAMENTO.md).

## 14. Hipóteses comerciais

Cobrança **por empresa**, **por módulo**, **por assento + empresas**, **freemium limitado** e **complemento de BI** — **sem preço** e **sem decisão**; o produto não tem billing. [`12-HIPOTESES-DE-PLANOS.md`](12-HIPOTESES-DE-PLANOS.md).

## 15. Prioridades (método ICE; regras anti-manipulação em [`COMPETITIVE-OPPORTUNITY-BACKLOG.md`](../product/COMPETITIVE-OPPORTUNITY-BACKLOG.md))

**Agora:** (1) tela de equipe; (2) **discovery com usuários**; (3) capturas de tela e decisão do showcase; (4) auditoria de acessibilidade. **Próximo:** teste de usabilidade do primeiro valor, onboarding, decisões L-02/06/07/08, observabilidade, LGPD self-service. **Integrações e cobrança ficam em "Explorar"** até o discovery — por método, um item baseado em demanda não validada não chega a "Agora".

## 16. Pesquisas adicionais necessárias

Entrevistas (roteiro pronto); **observação real de UX dos concorrentes** com contas de teste próprias (não feita); cobertura maior do comércio local de Leme; medição de acessibilidade e desempenho do próprio produto; preços "sob consulta"; concorrentes não encontrados nesta coleta.

## 17. Próximos passos

1. Decidir **sim/não** para iniciar o discovery e definir quem contatar.
2. Decidir sobre a **publicação** (showcase A/B/C) e **confirmar a redação da declaração de IA** nos materiais.
3. Construir a **tela de equipe**.
4. Só depois do discovery revisar posicionamento, integrações e preço.

## Limites desta análise

Nenhuma conta foi criada em concorrentes (UX e uso real **não** observados); cobertura de 13 soluções **não** é o universo do mercado; busca com baixa cobertura do comércio local; números de clientes são declarações das empresas; preços mudam e variam por volume; três erros de coleta foram encontrados e corrigidos ([`SOURCES.md`](SOURCES.md)).
