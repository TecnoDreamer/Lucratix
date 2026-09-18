# Inteligência competitiva — Lucratix

> Parte B do prompt mestre de portfólio + inteligência competitiva. **Não é ranking promocional** e **não recomenda copiar** concorrentes: descreve diferenças, registra o que se sabe (com fonte e data) e o que **não** se sabe.
> Consulta de dados: **2026-09-18**. Fontes: [`SOURCES.md`](SOURCES.md).

## Conteúdo

| Arquivo | Conteúdo |
|---|---|
| [`RELATORIO-EXECUTIVO.md`](RELATORIO-EXECUTIVO.md) | **Comece aqui** — resumo para decisão |
| [`01-CONCORRENTES-IDENTIFICADOS.md`](01-CONCORRENTES-IDENTIFICADOS.md) | Cadastro de soluções e serviços, por categoria e recorte |
| [`02-MATRIZ-COMPETITIVA.md`](02-MATRIZ-COMPETITIVA.md) | Comparação de funcionalidades (✓ / △ / — / ?) |
| [`03-BENCHMARK-UX-UI.md`](03-BENCHMARK-UX-UI.md) | Padrões de UX observados em páginas públicas e o que não foi observável |
| [`04-BENCHMARK-FUNCIONAL.md`](04-BENCHMARK-FUNCIONAL.md) | Classificação funcional (essencial, paridade, diferenciador, emergente) |
| [`05-PRECOS-E-MONETIZACAO.md`](05-PRECOS-E-MONETIZACAO.md) | Preços públicos e modelos de cobrança |
| [`06-MERCADO-LEME-E-REGIAO.md`](06-MERCADO-LEME-E-REGIAO.md) | Leme e entorno: quem realmente está lá, dados do IBGE, hipóteses |
| [`07-ROTEIRO-DISCOVERY-MERCADO.md`](07-ROTEIRO-DISCOVERY-MERCADO.md) | Roteiro de entrevistas para validar o que a web não prova |
| [`08-SWOT.md`](08-SWOT.md) | Forças, fraquezas, oportunidades e ameaças com evidência |
| [`09-GAP-ANALYSIS.md`](09-GAP-ANALYSIS.md) | Gaps G-01…G-18 |
| [`10-OPORTUNIDADES.md`](10-OPORTUNIDADES.md) | Oportunidades avaliadas sem pressupor |
| [`11-POSICIONAMENTO.md`](11-POSICIONAMENTO.md) | Diferencial comprovado × potencial × paridade × gap; hipóteses P-A/P-B/P-C |
| [`12-HIPOTESES-DE-PLANOS.md`](12-HIPOTESES-DE-PLANOS.md) | Hipóteses de pacotes e modularização, **sem preço** |
| [`SOURCES.md`](SOURCES.md) | Todas as fontes, com URL, data e o que sustentam |

Derivados em `docs/product/`: [`COMPETITIVE-OPPORTUNITY-BACKLOG.md`](../product/COMPETITIVE-OPPORTUNITY-BACKLOG.md) · [`ROADMAP-COMPETITIVO.md`](../product/ROADMAP-COMPETITIVO.md) · [`EPIC-PORTFOLIO-COMPETITIVE-INTELLIGENCE.md`](../product/EPIC-PORTFOLIO-COMPETITIVE-INTELLIGENCE.md).

## 1. Em que mercado o Lucratix compete (definido *antes* dos nomes)

O Lucratix se apresenta como plataforma de BI/marketing analytics **multiempresa** que liga marketing a **resultado financeiro**, com baseline histórico ([`vision.md`](../product/vision.md)). Ele toca cinco categorias de mercado; o que muda é o **tipo de relação** com cada uma.

| Categoria | Tarefa do cliente | Relação com o Lucratix |
|---|---|---|
| **A. Relatórios e dashboards de marketing para agências** (multicliente) | "Mostrar ao cliente o resultado do meu trabalho" | **Concorrente direto na tarefa**, com **tipo de dado diferente** (eles agregam métricas de mídia por integração; o Lucratix cruza com financeiro por digitação/planilha) |
| **B. BI de propósito geral** | "Montar meus próprios painéis" | **Substituto** (quem sabe construir) e **complementar** (o Lucratix expõe chave de API para eles lerem) — **não** classificado como concorrente direto |
| **C. Integração/ETL de dados** | "Levar dados de várias fontes para um painel" | **Complementar** (caminho para a fase de integrações do Lucratix) |
| **D. Financeiro/ERP/FP&A** | "Enxergar caixa, DRE e lucro" | **Substituto parcial** da metade financeira; **adjacente** |
| **E. Gestão de agência** | "Tocar projetos, tarefas e clientes" | **Adjacente** |
| **F. Serviço/consultoria** (agências, consultorias de BI, contabilidade) | "Alguém faz isso por mim" | **Substituto de serviço** — não SaaS |

Planilhas/Excel são o substituto mais provável em PMEs, mas **não há fonte** que meça isso — permanece **hipótese a validar** ([`07-ROTEIRO-DISCOVERY-MERCADO.md`](07-ROTEIRO-DISCOVERY-MERCADO.md)).

Legenda de classificação usada nos documentos: **Concorrente direto · Concorrente indireto · Substituto · Complementar · Serviço/consultoria · Adjacente**.

## 2. Recortes geográficos e critério

| Recorte | Critério | Justificativa |
|---|---|---|
| **Nacional** | SaaS/soluções que vendem em todo o Brasil | Software não tem fronteira; o recorte é o mercado de língua portuguesa |
| **Regional** | Estado de São Paulo, com foco em polos do interior (Campinas, Piracicaba, Ribeirão Preto) | Onde há oferta de **serviços** (consultorias de BI, agências) que atendem a região de Leme |
| **Local** | Leme + municípios da **Região Imediata de Araras** e da **Microrregião de Limeira** (IBGE), mais Pirassununga e Rio Claro (citadas no pedido) | Critério **oficial** (agrupamentos do IBGE) em vez de raio inventado; **distâncias em km não foram verificadas** e não são usadas |

Municípios (IBGE, [S25](SOURCES.md)): Região Imediata de Araras = Araras, Conchal, Leme, Santa Cruz da Conceição. Microrregião de Limeira = Araras, Conchal, Cordeirópolis, Iracemápolis, Leme, Limeira, Santa Cruz da Conceição, Santa Gertrudes.

## 3. Método

1. **Descoberta:** buscas na web para achar candidatos. Resultados de busca **não** são evidência (blogs de fornecedores têm viés e podem estar errados — ex.: um citou o preço do Power BI Pro incorretamente).
2. **Verificação:** página oficial de cada solução (produto, preços, documentação). Tabelas de preço renderizadas por JavaScript foram lidas **no navegador** (Reportei, mLabs Analytics).
3. **Regras de registro:** só se afirma o que está **explícito** na fonte; ausência = "não localizado nesta coleta"; preço ausente = "não publicado / sob consulta"; **números de clientes são declarações da empresa**, nunca fatos verificados.
4. **Dados públicos:** IBGE (API oficial) para população e empresas de Leme.
5. **Controle de erro:** valores extraídos por resumo automático foram tratados como confiabilidade `Média`, e os numéricos críticos, reconferidos na fonte primária. Três erros de coleta encontrados e corrigidos estão em [`SOURCES.md`](SOURCES.md).

## 4. Limitações — leia antes de usar qualquer conclusão

- **Nenhuma conta ou teste gratuito foi criado** em qualquer concorrente (criar contas está fora do que esta pesquisa faz). Logo, **UX, onboarding e profundidade real de funcionalidade não foram observados por uso** — só por páginas públicas.
- **"Não localizado" não significa "não existe".** A matriz usa `—` só para "não consta nas páginas consultadas".
- **Cobertura:** 13 soluções e 9 serviços/empresas regionais e locais. **Não é o universo do mercado.** Há concorrentes que esta coleta não encontrou.
- **A busca web usada é limitada** (ferramenta declarada como voltada aos EUA); a qualidade dos resultados em português foi satisfatória para nomes nacionais, mas **insuficiente para mapear o comércio local de Leme**.
- **Preços** podem mudar a qualquer momento e variam por número de clientes/projetos; valem **na data da consulta** e nas condições descritas.
- **Comportamento de PMEs locais** (como acompanham marketing, o que usam) **não é comprovado pela web** — é hipótese, com roteiro de validação.
- **Nada aqui compara qualidade** ("melhor/pior"): compara **presença documentada** de capacidades.

## 5. Como isto se conecta ao produto

Esta pasta gera **hipóteses**, não decisões. Toda descoberta segue o funil do prompt: **descartar → investigar → validar com usuário → planejar → implementar** (§21). O backlog e o roadmap derivados ficam em `docs/product/`.
