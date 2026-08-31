# Looker Studio — arquitetura (documentação, sem integração real)

> **Reversão de decisão registrada**: em 2026-08-30, ao decidir o escopo da evolução do Analytics, o usuário optou por manter só o plano já pesquisado de Power BI e **não** pesquisar Looker Studio (ver `docs/analytics/CHART_DECISIONS.md`, "Fora de escopo: BI externo"). Em 2026-08-31, o usuário pediu explicitamente para reverter essa decisão e pesquisar Looker Studio agora, como camada gratuita/freemium de entrada (Power BI continua premium). Este documento é o resultado dessa pesquisa — pesquisado em fontes oficiais da Google em 2026-08-31 (links no rodapé de cada seção), sem nenhum preço ou limite inventado. Igual a `docs/analytics/POWER_BI.md`: **nenhuma integração real existe hoje** — busca no repositório inteiro por `looker` (case-insensitive) confirma zero ocorrências antes deste documento. Nenhum código, nenhuma credencial.

## O que é gratuito de verdade (não "gratuito com pegadinha")

Looker Studio em si **é gratuito** — não é uma versão limitada por tempo nem trial. Um usuário com conta Google pode:

- Criar relatórios/dashboards ilimitados, sem cartão de crédito.
- Conectar nativamente a fontes gratuitas da própria Google (Google Sheets, BigQuery, GA4, Google Ads, Search Console).
- Compartilhar por link, convite direto, PDF agendado (1 agendamento ativo por relatório na versão gratuita) e **embed via iframe** em qualquer site.
- Publicar um relatório com embed público (qualquer pessoa vê) ou privado (só quem tem a conta Google convidada).

Fonte: [Data Studio Pro subscription overview](https://docs.cloud.google.com/data-studio/pro-subscription-overview), [Ways to share your reports](https://docs.cloud.google.com/looker/docs/studio/ways-to-share-your-reports), [Embed a report](https://docs.cloud.google.com/looker/docs/studio/embed-a-report).

## O que é pago (Looker Studio Pro) — e por que não é "incluído de graça"

**Looker Studio Pro custa US$ 9 por usuário, por projeto do Google Cloud, por mês** — cobrado ao **cliente**, nunca ao Lucratix (o Lucratix não intermedeia essa cobrança, é uma assinatura direta do cliente com a Google). Detalhes confirmados na documentação oficial:

- Exige um **projeto do Google Cloud dedicado** com uma conta de faturamento (Cloud Billing) vinculada — não é uma opção dentro do próprio Looker Studio, é infraestrutura do Google Cloud.
- A diferença central não é "mais recursos visuais", é **governança**: no gratuito, cada relatório/fonte de dado pertence à pessoa que criou; no Pro, pertence à organização (projeto do Google Cloud), com workspaces de equipe e gestão de conteúdo centralizada.
- **Quem só visualiza um relatório Pro não precisa de licença Pro** — a cobrança é por criador/editor de conteúdo, não por espectador. Isso importa pro Lucratix: um cliente com Looker Studio Pro não precisa que os funcionários dele todos paguem, só quem edita o dashboard.

Fonte: [Data Studio Pro subscription overview](https://docs.cloud.google.com/data-studio/pro-subscription-overview) (preço e "per user, per project" confirmados via busca cruzada com múltiplas fontes de mercado, já que a página de preços em si não expôs o número em texto simples no fetch — ver nota de metodologia no fim deste documento).

**Nunca tratar Looker Studio Pro como incluído em qualquer plano do Lucratix** — é uma licença externa, paga pelo cliente diretamente à Google, com seu próprio ciclo de cobrança.

## Como o Lucratix entraria — a diferença técnica real vs. Power BI

Diferente do Power BI (Power Query tem um conector genérico "Web" que aceita qualquer endpoint REST direto, sem código), **o Looker Studio não tem um conector genérico de REST embutido**. As opções documentadas pela Google para trazer dado de uma API externa são:

1. **Community Connector** (Google Apps Script) — um pequeno script hospedado no Google Apps Script, escrito contra o SDK de conectores da Google, que busca dado de uma API e o expõe no formato que o Looker Studio entende. É a forma suportada oficialmente de "REST → Looker Studio" e é gratuita para construir (o custo é o tempo de desenvolvimento).
2. **Ponte via Google Sheets** — um script (Apps Script ou externo) grava o dado periodicamente numa planilha, que o Looker Studio já lê nativamente. Mais simples de construir, mas introduz uma cópia intermediária do dado (staleness = frequência do script, não tempo real).
3. **BigQuery** — fora de escopo aqui (o Lucratix não usa BigQuery hoje).

Fonte: [Looker Studio Community Connectors (developers.google.com)](https://developers.google.com/looker-studio/connector/), pesquisa cruzada confirmando ausência de conector REST genérico nativo.

**Implicação de arquitetura**: a Opção 1 (Community Connector) é a única que não introduz uma cópia periódica do dado, e ela reaproveitaria **exatamente o mesmo pré-requisito já documentado para o Power BI Opção A** — o módulo de API key por organização (`app/modules/api_keys/`, não implementado hoje, ver `docs/analytics/POWER_BI.md`). O connector seria um script hospedado pela Google (não pelo Lucratix) que chama `GET /analytics/*` autenticado pela API key — o mesmo endpoint, o mesmo dado, a mesma superfície de segurança já modelada em `docs/security/POWER_BI_SECURITY.md` (Opção A) se aplica aqui sem alteração: chave escopada a `analytics:read`, nunca escrita, herdando o papel de quem criou.

## Diagrama (estado futuro, se aprovado)

```
Community Connector (Google Apps Script, hospedado pela Google)
     ↓ HTTPS + API key (mesmo mecanismo do Power BI Opção A — a criar)
GET /api/v1/organizations/{id}/analytics/{executive,marketing,...}
     ↓
(mesma stack já existente — sem mudança de arquitetura no backend)
     ↓
Looker Studio (relatório do cliente, gratuito ou Pro)
     ↓ embed (iframe) opcional dentro do Lucratix, se o cliente permitir compartilhamento
```

## Dados que uma integração Looker Studio exporia hoje

Mesma lista já documentada para Power BI — nenhuma métrica nova seria inventada, e a limitação é a mesma (nada por produto/cliente/venda individual, sem modelo transacional): ver `docs/analytics/POWER_BI.md`, seção "Dados que uma integração Power BI exporia hoje". Os mesmos 7 endpoints de `/analytics/*` servem os dois BIs sem diferença.

## Looker Studio (gratuito) vs. Power BI (premium) — por que essa é a divisão certa

| | Looker Studio | Power BI |
|---|---|---|
| Custo pro cliente | Gratuito (Pro é opcional, US$ 9/usuário/projeto/mês) | Licença Pro/Premium já é paga por padrão no mercado corporativo |
| Conector REST nativo | Não — precisa de Community Connector (código) | Sim — Power Query "Web", sem código |
| Embed dentro do Lucratix | Sim, iframe simples, sem infraestrutura extra | Só com Premium/Premium Per User + Service Principal (Opção B do Power BI) |
| Perfil de cliente típico | Pequeno negócio, uso individual/pequena equipe | Empresa com ecossistema Microsoft já implantado |

A divisão gratuita/premium não é arbitrária: Looker Studio genuinamente não custa nada pro cliente típico (Starter/Growth), e Power BI genuinamente pressupõe investimento corporativo prévio (Premium, Azure AD) — coerente com posicionar como Enterprise.

## Próximos passos (quando desbloqueado)

1. Confirmar com o usuário se o Community Connector seria construído/mantido pelo Lucratix (distribuído pra clientes) ou se cada cliente constrói o próprio a partir de um guia — decisão de produto, não técnica.
2. Implementar o módulo de API keys — **pré-requisito compartilhado com Power BI Opção A**, um único trabalho destrava os dois.
3. Construir e publicar o Community Connector (Apps Script) contra os endpoints de `/analytics/*`.
4. Nenhuma auditoria de segurança nova é necessária além de `docs/security/POWER_BI_SECURITY.md` (Opção A) — o mecanismo de autenticação é o mesmo, reaproveitar o checklist já existente lá.

## Nota de metodologia

Pesquisado via busca e leitura de documentação oficial da Google (`docs.cloud.google.com`, `developers.google.com`) em 2026-08-31. O preço de US$ 9/usuário/projeto/mês do Looker Studio Pro está amplamente confirmado por múltiplas fontes de mercado (Whatagraph, DataHub Pro, Beastmetrics, Kodalogic) mas **não foi possível extrair o número em texto simples diretamente da página oficial de preços via fetch automatizado nesta pesquisa** — a página oficial de "Data Studio Pro subscription overview" confirma a existência da cobrança por usuário/projeto/mês sem repetir o valor em dólares no corpo extraído. Antes de comunicar esse preço a um cliente ou usá-lo em qualquer material comercial, confirmar o valor vigente diretamente em <https://cloud.google.com/looker-studio/pricing> (preços de terceiros mudam sem aviso — RN implícita do prompt de monetização: nunca hardcode preço externo sem revalidar).
