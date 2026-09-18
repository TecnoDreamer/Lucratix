# Fontes — inteligência competitiva

> Registro de **toda** fonte usada em `docs/competitive/`. Cada afirmação nos demais documentos cita um ID (`S01`…). Todas as consultas foram feitas em **2026-09-18**.
> Método e limites: [`README.md`](README.md).

**Tipos:** `Oficial` (site/documentação/preço do próprio fornecedor) · `Dado público` (órgão oficial) · `Fornecedor (blog)` (texto do próprio fornecedor, com viés comercial) · `Secundária` (terceiros) · `Interna` (este repositório).
**Confiabilidade:** `Alta` (fonte oficial, lida na íntegra ou renderizada no navegador) · `Média` (fonte oficial, mas extraída por resumo automático ou lida parcialmente) · `Baixa` (secundária, viés comercial ou snippet de busca).

## A. Soluções — recorte nacional

| ID | Empresa | Título / página | URL | Tipo | Publicação | Afirmações suportadas | Confiab. |
|---|---|---|---|---|---|---|---|
| S01 | Reportei | Página inicial | https://reportei.com/ | Oficial | — | Público declarado, funcionalidades, lista de integrações, trial de 3 dias, "mais de 10.000 clientes em 70 países" (declaração da empresa) | Média |
| S02 | Reportei | Planos e preços (app de preços) | https://app.reportei.com/externalPricing | Oficial | — | Preços por plano/mês para 5 projetos, limites por plano; **lido no navegador com JavaScript executado** | Alta |
| S03 | mLabs Analytics | Página inicial | https://www.mlabsanalytics.io/ | Oficial | — | Público, funcionalidades, integrações, trial de 7 dias, "+10.000 agências e empresas"; `dashgoo.com` redireciona (301) para este domínio | Média |
| S04 | mLabs Analytics | Planos e preços | https://mlabsanalytics.io/planos/ | Oficial | — | Preços dos 3 planos, limites, comparativo de recursos; **lido no navegador** | Alta |
| S05 | AgencyAnalytics | Pricing | https://agencyanalytics.com/pricing | Oficial | — | US$ 20 por cliente/mês (anual), plano único, trial 14 dias, add-ons, moedas aceitas | Média |
| S06 | DashThis | Pricing | https://dashthis.com/pricing/ | Oficial | — | Quatro planos em USD, limites de dashboards/fontes, trial | Média |
| S07 | Databox | Pricing | https://databox.com/pricing | Oficial | — | Planos Free a Custom, limites, plano Agency com "client packs" | Média |
| S08 | Metricool | Pricing | https://metricool.com/pricing/ | Oficial | — | Planos em € e US$, limites de marcas, conector Looker Studio | Média |
| S09 | Google Cloud | About Looker Studio Pro (documentação) | https://docs.cloud.google.com/looker/docs/studio/about-looker-studio-pro | Oficial | — | Versão gratuita permanece disponível; recursos exclusivos do Pro; a documentação também usa o nome "Data Studio" | Média |
| S10 | Microsoft | Power BI — preços (pt-BR) | https://www.microsoft.com/pt-br/power-platform/products/power-bi/pricing | Oficial | — | Gratuito, Pro R$ 80,20 e Premium por usuário R$ 137,40 (usuário/mês, anual), preços sem impostos | Média |
| S11 | Kondado | Página inicial | https://kondado.com.br/ | Oficial | — | Integração de dados (80+ fontes), planos "a partir de R$ 99/mês", trial de 14 dias, templates Power BI/Looker Studio | Média |
| S12 | Treasy | Página inicial | https://www.treasy.com.br/ | Oficial | — | FP&A/BI financeiro, ERPs, trial de 7 dias, preço não publicado, "1.000+ empresas" (declaração da empresa) | Média |
| S13 | eKyte | Página inicial | https://www.ekyte.com/ | Oficial | — | Gestão de trabalho/agências, "+700 métricas", preço não publicado na página | Média |
| S14 | Conta Azul | Página inicial | https://contaazul.com/ | Oficial | — | ERP financeiro para micro/pequenas/médias empresas e contadores; planos e trial existem (valores **não** transcritos: extração ambígua) | Média |
| S15 | WiseData Agency | Blog: "Os 15 melhores sistemas para agências" | https://blog.wisedataagency.com/ferramentas-para-agencias/melhores-sistemas-agencias-marketing/ | Fornecedor (blog) | 2026-01-03 (atual. 2026-07-27) | Existência de um SaaS brasileiro de gestão de agências; preços declarados pelo próprio fornecedor (Free/Basic/Pro/Enterprise) — **não** conferidos em página de preços | Baixa |
| S28 | Wikipédia | Reportei | https://pt.wikipedia.org/wiki/Reportei | Secundária | — | Lançamento em fevereiro de 2015 | Baixa |
| S31 | Reportei | Central de ajuda — primeiros passos / como gerar meu primeiro relatório | https://reportei.com/central-de-ajuda/como-gerar-meu-primeiro-relatorio/ | Oficial | — | Fluxo de onboarding: criar **projeto** (cliente/marca; nome e idioma) → integrar contas → escolher template ("Padrão") → definir período (padrão de 30 dias). *Conteúdo obtido via busca restrita ao domínio (resumo do resultado), não por leitura integral da página* | Baixa |
| S32 | mLabs | Central de ajuda — Como criar um Dashboard | https://ajuda.mlabs.com.br/pt-BR/articles/8224719-como-criar-um-dashboard | Oficial | — | Dashboard criado com **nome, modelo (template) e cliente**; acessível ao cliente final por **login e senha** via Portal do Cliente. *Via busca restrita ao domínio* | Baixa |
| S33 | mLabs | Central de ajuda — Como personalizar o Portal do Cliente | https://ajuda.mlabs.com.br/pt-BR/articles/8228619-como-personalizar-o-portal-do-cliente | Oficial | — | Portal com **nome da agência, endereço web próprio, logo e cor** da agência. *Via busca restrita ao domínio* | Baixa |

## B. Recorte regional e local

| ID | Empresa / órgão | Título / página | URL | Tipo | Afirmações suportadas | Confiab. |
|---|---|---|---|---|---|---|
| S16 | WiseData Marketing | Agência de marketing em Araras | https://www.wisedatamarketing.com/pt-br/agencia-de-marketing-araras | Oficial | **Sede em Goiânia-GO**; atende Araras, Leme etc. "de forma remota"; "a partir de R$ 4.000,00/mês" para quem fatura acima de R$ 100 mil/mês; "+400 clientes" | Média |
| S17 | Z4 Digital | Página inicial | https://z4.digital/ | Oficial | Lista Leme entre as cidades atendidas; sede não declarada; "relatórios 100% online"; preço sob consulta | Média |
| S18 | Starten Comunicação | Página inicial | https://www.startencomunicacao.com.br/ | Oficial | **Sede em São José do Rio Preto-SP**; "mais de 1.000 clientes ativos"; dashboards não citados | Média |
| S19 | DIVIA Marketing Digital | Agência de tráfego pago em Limeira | https://www.divia.com.br/agencia-de-trafego-pago-em-limeira-sp | Oficial | **Sedes em Porto Alegre, Florianópolis, Goiânia e São Paulo**, sem endereço em Limeira; cita Power BI e Google Analytics; formulário pede faixa de investimento de R$ 4 mil a mais de R$ 20 mil/mês | Média |
| S20 | MTR Analytics | Página inicial | https://mtrindustrialanalytics.com.br/ | Oficial | Campinas/SP; dashboards Power BI e automação para PMEs e empresas "com gestão em planilhas"; preço sob consulta | Média |
| S21 | Twelve Solutions | Serviços | https://twelvesolutions.com.br/servicos | Oficial | Piracicaba; consultoria Power BI (página com conteúdo limitado) | Baixa |
| S22 | Consult Contabilidade e Consultoria | Página inicial | https://contabilidadeconsult.com.br/ | Oficial | **Matriz em Leme-SP** (Centro) e filial em Pirassununga; 17 anos; contabilidade, consultorias, fiscal e folha; sem dashboards/BI listados | Média |
| S23 | Visão Contábil | Consultoria contábil | https://www.visaocontabil.com.br/consultoria-contabil | Oficial | **Leme-SP**, desde 1993; "preparação mensal de relatório para apresentação para a diretoria"; sem BI listado | Média |
| S24 | Leme Soluções Contábeis | Página inicial (via busca restrita ao domínio) | https://lemesc.com.br/ | Oficial | Serviços incluem contabilidade, controladoria, sistemas, **BI, Power BI e Qlik**. A página não abriu na coleta (erro SSL) e a **cidade da sede não foi confirmada** | Baixa |
| S25 | IBGE | API de localidades — municípios de SP | https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios | Dado público | Código de Leme (3526704); Região Imediata de Araras = Araras, Conchal, Leme, Santa Cruz da Conceição; Microrregião de Limeira | Alta |
| S26 | IBGE | SIDRA, tabela 4714 (Censo 2022) — população | https://apisidra.ibge.gov.br/values/t/4714/n6/3526704,3503307,3526902,3543907,3539301,3538709,3509502/v/93/p/last%201 | Dado público | População residente 2022 dos municípios comparados | Alta |
| S27 | IBGE | SIDRA, tabela 1685 (CEMPRE 2021) — Leme | https://apisidra.ibge.gov.br/values/t/1685/n6/3526704/v/all/p/last%201 | Dado público | Unidades locais, empresas atuantes e pessoal ocupado em Leme (2021) | Alta |

## C. Fontes de contexto (não sustentam fatos sobre concorrentes)

| ID | Origem | Uso | URL | Tipo | Confiab. |
|---|---|---|---|---|---|
| S29 | Resultados de busca web ("Leme SP agência de marketing digital…") | Apenas para **descobrir** candidatos; mostram páginas-modelo de SEO por cidade (ex.: `pagi.com.br`, `especialistadigital.com.br`, `expertmarketing.com.br`) | vários | Secundária | Baixa |
| S30 | Este repositório | Hipóteses e limites do próprio produto | [`docs/product/problem.md`](../product/problem.md), [`docs/portfolio/01-MATRIZ-DE-MATURIDADE.md`](../portfolio/01-MATRIZ-DE-MATURIDADE.md) | Interna | Alta |

## D. Homônimos descartados (não são Leme-SP)

- **Leme Digital** (`lemedigital.com.br`) — agência de Fortaleza.
- **Agência Leme** (Instagram `@agencialeme`) — São Paulo (capital).

## E. Fontes tentadas e não usadas

| Fonte | Motivo |
|---|---|
| `https://reportei.com/planos/`, `/precos/` | Retornaram 404; o preço oficial foi obtido em S02 |
| Tabela de preços em `reportei.com/en/plans/` | Renderizada por JavaScript; leitura por resumo automático não a alcançou (contornado com S02) |
| `inovbi.com.br` | Domínio não resolveu na coleta — **não verificado** |
| `cidades.ibge.gov.br` (painel do município) | Acesso negado (HTTP 403); substituído pela API do IBGE (S25–S27) |
| `marketing.startencomunicacao.com.br/…-leme-sp/` | Erro de servidor; a sede foi confirmada na página inicial (S18) |
| Preço do Looker Studio Pro | Não consta na documentação consultada (S09) |
| Valores dos planos da Conta Azul | Extração ambígua; omitidos até conferência no navegador |

## Erros de coleta encontrados e corrigidos (transparência de método)

1. O resumidor automático retornou o código IBGE **3520202 para Leme**; o correto é **3526704** (3520202 é Igaratá). Detectado ao conferir o nome do município na resposta do IBGE. **Consequência:** valores obtidos por resumo automático foram tratados como `Média` e os numéricos críticos foram reconferidos na fonte primária.
2. Um blog citava o preço do Power BI Pro como "cerca de R$ 65"; a página oficial (S10) traz **R$ 80,20**. Prevalece a fonte oficial.
3. Um resumo de busca afirmou que a Starten Comunicação "tem operações em Leme"; a página oficial (S18) mostra sede em São José do Rio Preto.
