# Oportunidades

> Avaliadas **sem pressupor** que valem a pena. Cada uma recebe: o que a evidência sugere, o que **falta** provar, o **risco** e o **estado no funil** do prompt §21 (`Descartar` · `Investigar` · `Validar com usuário` · `Planejar` · `Implementar`). Base: [`08-SWOT.md`](08-SWOT.md), [`09-GAP-ANALYSIS.md`](09-GAP-ANALYSIS.md). Consulta: 2026-09-18.
> **Nada aqui está decidido.** Concorrente possuir algo não é motivo para copiar (prompt §21).

## Lista do prompt mestre §20

| # | Tema | O que a evidência sugere | O que falta provar | Risco | Estado |
|---|---|---|---|---|---|
| 1 | **Simplicidade** | As ferramentas líderes têm muitas funções (Reportei: 9 linhas de produto na home; integrações em dezenas). Sugere espaço para um produto mais focado — **inferência**, não fato | Que usuários sintam excesso de complexidade | Simplicidade sem prova vira slogan | `Validar com usuário` |
| 2 | **PMEs** | MTR Analytics mira PMEs "com gestão em planilhas" (S20); Conta Azul/Treasy atendem finanças de PME (S12, S14) | Que PMEs (não só agências) queiram acompanhar marketing × resultado por conta própria | O produto foi desenhado para **consultorias**, não para PME direta | `Investigar` |
| 3 | **Multiempresa** | Todas as ferramentas de agência têm a unidade "cliente"; é padrão, **não** diferencial | Nada — é paridade já atendida | Comunicar como novidade seria falso | `Implementar` (já feito) |
| 4 | **Agências** | Preço de entrada baixo e concorrência forte (S02, S04, S05); agências locais verificadas em Leme: **nenhuma** (S16–S19) | Existência e disposição de agências próximas a usar/pagar | Mercado saturado nos relatórios de mídia | `Validar com usuário` (P1) |
| 5 | **Automação** | Agendamento e alertas são comuns (S01, S04) | Se a automação é importante **com dado manual** | Enviar dado defasado; conflita com "número confiável" | `Investigar` |
| 6 | **Importação** | Existe e é diferencial de fato *do Lucratix* (CSV/XLSX/JSON com mapeamento e preview); mLabs aceita planilhas próprias (S03) | Se importação **basta** ou se integração automática é requisito de entrada (H-D7) | Subestimar a barreira da falta de integração | `Validar com usuário` |
| 7 | **Relatórios** | 3 PDFs; concorrentes têm templates e portal (S04, S33) | Que "versão para o cliente final" tenha valor | Escopo de editor | `Investigar` |
| 8 | **Educação / glossário** | Diferencial implementado do Lucratix; **não localizado** nas páginas dos concorrentes (`?`) | Que usuários usem e valorizem | Custo de manter definições corretas em 3 idiomas | `Validar com usuário` |
| 9 | **Personalização** | Concorrentes têm; o Lucratix tem em acessos rápidos e gráficos do funil | Quais personalizações fazem diferença | Complexidade de estado por usuário/empresa | `Investigar` |
| 10 | **Integrações** | Essencial no mercado (`04`); Kondado mostra caminho **complementar** (S11) | H-D7; custo/benefício de construir × complementar | Custo contínuo; competir onde incumbentes dominam | `Investigar` (bloqueada, H5) |
| 11 | **Mobile** | Só Looker Studio Pro cita app (S09) | Uso em celular pelo público | Investir sem demanda | `Investigar` (testar responsividade primeiro) |
| 12 | **Onboarding** | Onboarding dos concorrentes é curto e apoiado em integração (S31); o do Lucratix depende de dado manual | Onde as pessoas travam | Otimizar sem observação | `Validar com usuário` |
| 13 | **Modularização** | Nenhum concorrente pesquisado a anuncia; desenho de "acesso por módulo" existe só como plano | Que usuários queiram ligar/desligar módulos | Complexidade de permissões; pouco valor se todos usam tudo | `Investigar` |

## Oportunidades adicionais que surgiram da pesquisa

| # | Tema | Evidência | Falta provar | Risco | Estado |
|---|---|---|---|---|---|
| 14 | **Provar resultado financeiro** (o "porquê" central do produto) | Não localizado nas 4 ferramentas de relatório (`02`); financeiro existe em produtos separados (Treasy, Conta Azul) sem marketing (S12, S14) | H-D1, H-D6 | Nicho pequeno ou já resolvido por contador/ERP | `Validar com usuário` — **a mais importante** |
| 15 | **Contador como canal/usuário** | Duas contabilidades com sede em Leme oferecem relatórios gerenciais (S22, S23) | H-D4 | Contadores podem não querer marketing | `Validar com usuário` (P4) |
| 16 | **Complemento de BI externo** (template + conector sobre a chave de API) | Kondado e Metricool oferecem templates/conector (S08, S11) | Demanda por BI externo no público-alvo | Duas superfícies para manter | `Investigar` |
| 17 | **Recorte por confiabilidade/rigor** (o "número que se pode defender") | Regra de ausência ≠ zero, aviso de causalidade; concorrentes anunciam IA/automação, não rigor (`04`) | Que rigor seja **compra**, não só valor interno | Rigor pode ser invisível ao comprador | `Validar com usuário` |
| 18 | **Aprender com a "sede" das agências**: SEO por cidade mostra que o mercado local é atendido de fora | S16–S19 | Quem, em Leme, compra marketing e como | — | `Investigar` (discovery P3) |

## Como decidir o que sai daqui

1. **Nada** com estado `Validar com usuário` entra em desenvolvimento antes do discovery ([`07`](07-ROTEIRO-DISCOVERY-MERCADO.md)).
2. Itens `Investigar` viram **tarefas de pesquisa/spike** de baixo custo (protótipo, teste de usabilidade, estudo técnico).
3. A **priorização com método explícito** e os horizontes estão em [`docs/product/COMPETITIVE-OPPORTUNITY-BACKLOG.md`](../product/COMPETITIVE-OPPORTUNITY-BACKLOG.md) e [`ROADMAP-COMPETITIVO.md`](../product/ROADMAP-COMPETITIVO.md).
