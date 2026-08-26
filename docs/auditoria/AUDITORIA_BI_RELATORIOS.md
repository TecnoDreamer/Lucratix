# Auditoria — Tooltip, Business Intelligence, Power BI e Relatórios

> Levantamento da arquitetura atual antes de qualquer implementação, per `PROMPT_CORRECOES_POWER_BI_ANALYTICS_RELATORIOS.md`. Respostas às 10 perguntas da seção 33.

## 1. Por que o tooltip está atrás dos cards?

**Causa raiz identificada e confirmada empiricamente (reprodução isolada com as mesmas classes Tailwind, ver nota no fim desta seção) — não é `z-index` insuficiente.** O gatilho: `cardHover` (`apps/web/src/lib/ui.ts:30`) tem `hover:-translate-y-0.5`. Passar o mouse no ícone `?` do `MetricHelp` (`apps/web/src/components/metric-help.tsx`), que fica **dentro** do card, também satisfaz o `:hover` do card ancestral — aplicando `transform: translateY(-2px)` a ele. Um `transform` diferente de `none` cria um **novo stacking context**, por especificação, independentemente de `position`. No instante em que o card do LUCRO está em hover, ele deixa de ser uma caixa "normal" e passa a isolar tudo dentro dele — inclusive o tooltip com `z-50` (`position: absolute` no `sm:`, ancorado no `<span className="relative">` interno, `metric-help.tsx:86`) — num stacking context próprio.

Isso sozinho já explicaria o tooltip preso, mas não explica por que ele perde especificamente para os cards **seguintes** (CAC, Conversão) e não para os anteriores. A peça que fecha o quadro: o grid de KPIs (`dashboard/page.tsx:126`, `display: grid`) trata todo item filho — com ou sem stacking context próprio — como stacking level `0`, desempatando por ordem de documento. O card do LUCRO (índice 1 no array `CARDS`, `dashboard/page.tsx:48-56`), agora um stacking context isolado por causa do `transform` de hover, ainda concorre nesse nível `0` contra os irmãos — e perde para os que vêm **depois** dele no DOM (CAC índice 3, Conversão índice 4), já que a ordem de documento é o critério de desempate entre irmãos de mesmo nível. **Aumentar o `z-index` do tooltip não resolveria nada**, pois ele nunca chega a competir fora do stacking context do próprio card enquanto este estiver em hover — é exatamente o comportamento que a seção 2 do prompt avisa para não tentar consertar com `z-index: 999999`.

Confirmado por leitura direta: `apps/web/src/lib/ui.ts` (`card`/`cardHover`, linhas 27-30) não define `overflow`, `contain` ou `isolation` — não há clipping acontecendo (o conteúdo não fica invisível, só perde no empilhamento). `globals.css` não tem regras globais de `isolation`/`contain`/`filter`. **Reproduzido isoladamente** numa página estática com a estrutura e classes idênticas (Card → flex → span relativo → botão + painel absolute, `hover:-translate-y-0.5` no card) antes de qualquer código de produção ser alterado: o comportamento bateu pixel a pixel com o screenshot original (ícone/texto do card de CAC pintando por cima do painel do LUCRO); com o painel movido para `document.body` (simulando `createPortal`) e posicionado via coordenadas absolutas, o mesmo cenário renderizou o painel sempre por cima, sem sobreposição.

**Correção**: renderizar o painel do tooltip via `createPortal(..., document.body)` (React), com posição calculada por `getBoundingClientRect()` do gatilho em vez de `position: absolute` relativo ao ancestral local — exatamente a saída sugerida na seção 2 do prompt. Isso tira o tooltip de qualquer stacking context local (do card em hover ou do grid) e o coloca no nível de documento, onde uma camada `tooltip` dedicada (ver seção 5 abaixo, agora formalizada em `docs/design/Z_INDEX_LAYERS.md`) sempre vence.

## 2. Onde estão vendas, custos, produtos e categorias?

**Achado crítico para todo o resto desta auditoria**: não existe modelo de venda/pedido/item de linha em nenhum lugar do sistema. `apps/api/app/models/` tem `product.py`, `financial_period.py`, `campaign.py`, `marketing_channel.py`, `baseline.py`, `funnel_snapshot.py` — nenhum `sale.py`/`order.py`/`order_item.py`/`invoice.py`.

- **`Product`** (`apps/api/app/models/product.py`): `name`, `category` (string livre, único campo de categoria/marca do sistema), `price`, `cost`, `active`. **Estático** — não tem quantidade vendida, não tem histórico, não tem vínculo com nenhum período ou receita real. `ProductRead.margin` (`apps/api/app/schemas/product.py:32-38`) é `(price - cost) / price`, uma margem de **tabela de preço**, não de vendas realizadas.
- **`FinancialPeriod`** (`apps/api/app/models/financial_period.py`): um registro por `(organization_id, período mensal)` com `revenue`, `costs`, `expenses`, `marketing_investment`, `taxes` — **agregado no nível de empresa/mês**, sem quebra por produto/categoria/cliente/canal. `profit`/`margin` são deliberadamente *não* armazenados (calculados pela engine, fonte única de verdade).
- **`Campaign`** (`apps/api/app/models/campaign.py`): por campanha, tem `investment`, `impressions`, `clicks`, `leads`, `opportunities`, `customers`, `attributed_revenue` — dados granulares o bastante para CTR/CPC/CPM/ROAS/ROI **por campanha**, mas essas funções da engine existem e não são chamadas por nenhum endpoint hoje (ver seção 4).
- **`FunnelSnapshot`**: também agregado por período, sem produto/categoria.

**Custos**: só existem em dois lugares — `FinancialPeriod.costs` (agregado, mensal) e `Product.cost` (estático, de tabela de preço). Não há custo variável por venda, frete, imposto por transação, desconto por transação, devolução ou estorno em lugar nenhum.

## 3. Quais métricas podem ser calculadas hoje?

A engine (`apps/api/app/modules/metrics/engine.py`, 223 linhas, funções puras, nunca divide por zero, nunca trata dado ausente como zero — `MetricResult(value, is_applicable, reason)`) já implementa **17 das métricas citadas no prompt**: `margin`, `profit`, `cac`, `roas`, `roi`, `ltv`, `conversion_rate`, `average_ticket`, `cpl`, `cpa`, `ctr`, `cpc`, `cpm`, `retention_rate`, `churn_rate`, `recurrence_rate`, mais `compare_periods` para comparação temporal. **MRR e ARR não existem na engine** (já sinalizado com `note` em `apps/web/src/domain/metrics/metric-definitions.ts:171,184` como "não calculado por nenhuma tela").

Importante: **implementada ≠ exposta**. `compute_dashboard_metrics` (`apps/api/app/modules/analytics/service.py`) — o que alimenta `/dashboard` e `/reports/basic` — só chama `profit`, `margin`, `cac`, `conversion_rate`, `average_ticket`, `recurrence_rate` a partir de UM `FinancialPeriod` + UM `FunnelSnapshot` do mês selecionado. `ltv`, `roi`, `roas`, `cpl`, `cpa`, `ctr`, `cpc`, `cpm`, `retention_rate`, `churn_rate` **não são chamadas por nenhum router hoje**, apesar de `Campaign` ter os campos brutos que alimentariam `ctr`/`cpc`/`cpm`/`roas`/`roi` por campanha.

**Prontos para expor com trabalho de API/service, sem modelo novo:**
- Receita, Lucro, Margem, CAC, Conversão, Ticket Médio, Recorrência — já existem no dashboard, só faltam filtro de datas/comparação/granularidade.
- ROAS, ROI, CPL, CPA, CTR, CPC, CPM **por campanha** — dado já existe em `Campaign`, só falta ligar a engine a um endpoint novo (`analytics` por canal/campanha).
- Margem estática por produto (`ProductRead.margin`) — já existe, é de tabela de preço, não de vendas.

**Não computáveis com os dados atuais** (exigem modelo novo — ver seção 4): Receita por produto, Lucro por produto, Ranking de mais vendidos por quantidade, Ranking de maior receita/lucro por produto, Margem realizada por produto, Prejuízo por produto/venda, Matriz Volume × Margem, Pareto de receita/lucro por produto, receita/lucro por cliente, sazonalidade por produto, LTV real (a função existe mas precisa de `purchase_frequency`/`retention_time` que não são coletados hoje), Churn como card (a função existe mas não há dado de clientes ativos por período), MRR/ARR (não modelados — o produto não parece ter assinatura recorrente por cliente).

## 4. Quais exigem novos dados?

**Toda a seção 9-12 do prompt (ranking de produtos por quantidade/receita/lucro, matriz volume×margem, Pareto, prejuízo por produto, sazonalidade) pressupõe um modelo de vendas transacional que não existe.** Isso não é um detalhe — é a decisão de escopo mais importante desta auditoria, e o prompt é explícito: "Não invente métricas que os dados atuais não consigam sustentar."

Para sustentar de verdade essas análises seria necessário um novo modelo (ex.: `Sale`/`OrderItem`: `organization_id`, `product_id`, `quantity`, `unit_price`, `unit_cost` (snapshot no momento da venda — preço/custo do produto mudam com o tempo), `discount`, `sale_date`, possivelmente `customer_id`, `channel_id`), a UI de cadastro correspondente, migração, testes — **uma feature nova por si só**, não um bugfix de dashboard. Trago essa decisão ao usuário antes de prosseguir (ver pergunta ao final desta auditoria).

Sem esse modelo, o caminho honesto é: (a) evoluir o que já é agregado por período (receita/lucro/margem/CAC/conversão da empresa como um todo, com filtro de datas e comparação temporal — pedido pelas seções 5-7), (b) ligar as métricas de campanha já computáveis (ROAS/ROI/CTR/CPC/CPM/CPL/CPA por canal/campanha — pedido implicitamente pela seção 5), e (c) manter a margem de produto como métrica de **tabela de preço**, deixando claro na UI que não reflete volume vendido (estado vazio explícito, seção 17 do prompt: "Cadastre o custo dos produtos para habilitar..." já existe parcialmente; precisa de um equivalente para "não há dados de vendas para calcular lucratividade por produto").

## 5. Como funciona o isolamento entre empresas?

Mesma arquitetura já auditada na etapa anterior (`docs/auditoria/AUDITORIA_METRICAS_GLOSSARIO_SESSAO.md`): `get_organization_context` (`apps/api/app/core/deps.py:67-93`) resolve a membership ativa do usuário para o `organization_id` do path, 404 (não 403) se não houver — nunca confia em `organization_id` vindo só do cliente.

**Autorização é só por hierarquia de papel** (`MembershipRole`: `ORGANIZATION_OWNER > ORGANIZATION_ADMIN > ANALYST > VIEWER`, `role_rank()` em `apps/api/app/models/membership.py`), via `require_role(minimum_role)`. **Não existe permissão granular** (`analytics:view`, `financial:view` etc. citados na seção 21 do prompt não existem hoje) — hoje um `ANALYST` vê os mesmos dados de custo/lucro que um `ORGANIZATION_ADMIN`. Se o prompt quer gating fino de quem vê margem/lucro/custo, isso precisa ser construído: a opção mais simples e consistente com o padrão atual é exigir um `minimum_role` mais alto (ex. `ANALYST`+) nos endpoints de lucratividade, em vez de inventar um sistema de permissões novo — mas vale confirmar se papel é granularidade suficiente ou se o prompt realmente quer permissões independentes de papel.

## 6. Como os relatórios funcionam atualmente?

`apps/web/src/app/organizations/[id]/reports/page.tsx` → `GET /api/v1/organizations/{id}/reports/basic?period=` (`apps/api/app/modules/reports/router.py`). É uma composição fina sobre `analytics`, `baselines`, `financials`, `funnels` (comentário no próprio arquivo: "não introduz nenhuma regra de negócio nova") — devolve organização, `generated_at`, os mesmos 6 KPIs do dashboard e comparação com baseline (receita/lucro). **Puramente uma tela de leitura**: sem export CSV, sem PDF, sem botão de impressão, sem filtro além do seletor de mês. Confirmado: nenhuma dependência de PDF/CSV instalada (`apps/api/pyproject.toml`, `apps/web/package.json` sem `pdf|weasy|reportlab|puppeteer|jspdf`). É o ponto de partida certo para "Relatório Executivo" (seção 18), mas os outros 4 tipos de relatório da seção 18 (Vendas, Lucratividade, por Produto, Prejuízos) esbarram na mesma limitação de dados da seção 4.

## 7. Existe configuração/licenciamento Power BI disponível?

Não. Busca no repositório inteiro por `power.?bi`/`powerbi` (case-insensitive): zero ocorrências — nenhum código, doc, variável de ambiente ou config. **Ponto de bloqueio real**: não há confirmação de que o usuário possui workspace/licença Power BI Pro ou Premium (necessária para embedding "app owns data" com Service Principal) nem Azure AD App Registration. Sem isso, a seção 4 do prompt ("prepare integração... quando tecnicamente e comercialmente viável") só pode avançar até o ponto de arquitetura documentada — a integração real fica bloqueada até essas credenciais existirem. Vou perguntar ao usuário se ele tem (ou pretende obter) uma licença Power BI antes de eu tratar isso como algo além de documentação/preparação de arquitetura.

## 8. Qual estratégia de PDF é mais adequada?

Dado o stack (Next.js App Router, sem backend Node — API é FastAPI/Python) e o princípio de não introduzir dependências desnecessárias já seguido nesta base (ícones, tema e tooltips são hand-rolled), as opções realistas são:

- **HTML + Print CSS (`@media print`)** — zero dependência nova, reaproveita os componentes React já existentes, funciona também como a solução de "Impressão" da seção 20 (a MESMA superfície serve os dois casos: apertar Ctrl+P gera o PDF do navegador). Limitação: menos controle fino de paginação/cabeçalho-rodapé do que uma geração server-side.
- **Server-side HTML → PDF (Python, ex. WeasyPrint)** — mais controle (paginação, cabeçalho/rodapé consistente, não depende do navegador do usuário), mas é uma dependência de sistema nova no backend (WeasyPrint precisa de bibliotecas nativas — Pango/Cairo — o que complica o Dockerfile/Railway).
- **PDF programático (ex. reportlab)** — mais trabalho para manter layout em sincronia com a UI (dois lugares para atualizar quando o design mudar), evitar.

**Recomendação preliminar** (a confirmar em ADR na fase de implementação, seção 19 pede isso formalmente): HTML + Print CSS como base para impressão E para "gerar PDF" (o navegador já sabe salvar como PDF a partir de uma tela impressa bem formatada) — evita dependência de sistema nova, reaproveita 100% dos componentes React, e resolve as seções 18-20 do prompt com uma única implementação. Migrar para geração server-side fica como evolução futura se o volume de uso ou a necessidade de PDF "no clique, sem depender da caixa de diálogo de impressão do navegador" justificar.

## 9. Quais arquivos serão alterados?

| Área | Arquivos principais |
|---|---|
| Bugfix do tooltip | `apps/web/src/components/metric-help.tsx` (reescreve para Portal + posicionamento por `getBoundingClientRect`) |
| Camadas do Design System | novo: `docs/design/Z_INDEX_LAYERS.md`; possivelmente novas constantes em `apps/web/src/lib/ui.ts` |
| Modelagem analítica | depende da decisão de escopo (pergunta ao usuário) — se aprovado modelo de vendas: novo `apps/api/app/models/sale.py` (ou `order.py`), migration nova, novo módulo `apps/api/app/modules/sales/` |
| Analytics UI | nova área `apps/web/src/app/organizations/[id]/analytics/` (Visão Executiva, Vendas, Lucratividade, Produtos, Prejuízos, Relatórios) |
| API de Analytics | novo `apps/api/app/modules/analytics/` estendido (hoje só tem `service.py`/`router.py` do dashboard) com endpoints de filtro por intervalo de datas, campanhas, e (se aprovado) produtos/vendas |
| Filtros | novo componente de filtro de datas + filtros avançados (frontend), extensão dos endpoints para aceitar `date_from`/`date_to` em vez de só `period` mensal |
| Relatórios/PDF | evolui `apps/web/src/app/organizations/[id]/reports/page.tsx`; novo `@media print` em `globals.css`; possivelmente novo componente de layout de relatório reaproveitável entre tela e impressão |
| Power BI | novo `apps/api/app/modules/powerbi/` (quando/se credenciais existirem); `docs/analytics/POWER_BI.md`, `docs/security/POWER_BI_SECURITY.md` documentando arquitetura mesmo sem integração real ainda |

## 10. Qual será a primeira branch?

`fix/metric-tooltip-layer` — corrige o bug do tooltip (crítico, visível em produção agora, conforme o screenshot) de forma isolada, sem depender de nenhuma decisão de escopo maior. Depois, a ordem segue a seção 31 do prompt: modelagem → filtros → visão executiva → produtos/lucratividade → prejuízos → visualizações → relatórios/PDF → Power BI → segurança → performance → testes → documentação, uma branch/PR por etapa, seguindo exatamente o padrão já usado nas etapas anteriores deste projeto.

---

## Decisões confirmadas com o usuário em 2026-08-26

1. **Sem modelo de vendas por produto.** ✅ Confirmado: escopar esta rodada para o que os dados atuais sustentam (dashboard/relatórios agregados por empresa/mês com filtro de datas e comparação temporal, métricas de campanha já computáveis pela engine, margem de produto como métrica de tabela de preço, deixada explicitamente como tal). Ranking/lucratividade/prejuízo por produto real fica para uma iniciativa futura, quando houver um modelo de vendas transacional.
2. **Power BI.** ✅ Confirmado: sem licença/Azure AD App Registration disponível hoje, a entrega desta rodada é só arquitetura documentada (`docs/analytics/POWER_BI.md`, `docs/security/POWER_BI_SECURITY.md`) e pontos de extensão no backend — nenhuma integração real.
3. **Permissões.** ✅ Confirmado: reaproveitar a hierarquia de papel existente (exigir `ANALYST`+ nos endpoints de lucratividade/custo) em vez de criar um sistema de permissões novo.

## Riscos remanescentes

1. **Escopo é muito grande** — 33 seções cobrindo bugfix, nova área de BI inteira, filtros avançados, PDF, impressão e Power BI. Vou seguir a ordem de execução da seção 31 do prompt, entregando por PR, começando pelo bugfix do tooltip.
2. **12+ testes E2E existentes não podem quebrar** — qualquer mudança na navegação/layout do dashboard precisa ser validada contra a suíte inteira antes de mergear (mesmo cuidado já aplicado nas etapas anteriores deste projeto).

## Estratégia proposta (resumo)

- **Tooltip**: `createPortal` para `document.body`, posição calculada via `getBoundingClientRect()` do gatilho + reposicionamento perto de bordas de viewport, camada `tooltip` formalizada em `docs/design/Z_INDEX_LAYERS.md`. Zero dependência nova (sem `@floating-ui/react` — cálculo manual, consistente com o padrão hand-rolled já usado no projeto).
- **Analytics (escopo inicial, sem modelo de vendas novo)**: generalizar os endpoints de `analytics`/`reports` de "um mês" (`period`) para um intervalo de datas (`date_from`/`date_to`), agregando múltiplos `FinancialPeriod`/`FunnelSnapshot`; ligar as métricas de campanha já existentes na engine (ROAS/ROI/CTR/CPC/CPM/CPL/CPA) a um endpoint novo de marketing analytics; comparação período-contra-período generalizada (já existe `compare_periods`, hoje só usado para baseline).
- **PDF/Impressão**: HTML + `@media print`, sem dependência nova, uma única implementação resolvendo os dois pedidos.
- **Power BI**: documentar arquitetura (`docs/analytics/POWER_BI.md`, `docs/security/POWER_BI_SECURITY.md`) sem implementar integração real até confirmação de licença.
