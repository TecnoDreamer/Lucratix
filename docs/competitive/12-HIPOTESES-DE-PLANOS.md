# Hipóteses de planos e modularização

> **Hipóteses de pacotes — não há preço, tabela nem decisão comercial aqui.** O prompt mestre exige que preço definitivo não seja fixado "apenas pela concorrência" (§20). O Lucratix **não tem billing, planos nem entitlements** hoje (`PLANEJADO`, fora de escopo — [`out-of-scope.md`](../product/out-of-scope.md)). Referências de mercado: [`05-PRECOS-E-MONETIZACAO.md`](05-PRECOS-E-MONETIZACAO.md). Consulta: 2026-09-18.

## 1. O que o mercado consultado mostra (fatos)

- A cobrança gira em torno do **cliente da agência** (projeto, marca, cliente); planos escalam por **volume** dessa unidade e por **recursos** (integrações, dashboards, usuários, IA, white-label).
- Trials curtos e freemium são comuns; IA é frequentemente **add-on** ou plano superior.
- Não existe, nas fontes lidas, referência de preço para **marketing × financeiro**.

## 2. O que o produto permite tecnicamente (fatos)

- A **empresa** (organização) é a unidade de isolamento e já tem **status** (ativa/congelada) — combina com cobrança **por empresa**.
- Os **módulos** são separáveis no código (financeiro, marketing, funil, produtos, experimentos, analytics, relatórios, central de dados, API), mas **não há mecanismo de habilitar/desabilitar módulo** — existe apenas um **desenho** de "acesso por módulo" (2 PRs), nunca implementado.
- Papéis lineares (`OWNER > ADMIN > ANALYST > VIEWER`) e `PLATFORM_ADMIN`.

## 3. Hipóteses de pacote

Todas **sem preço**. Cada uma diz o que precisaria ser verdade e como validar.

| ID | Hipótese | Unidade de cobrança | O que teria que ser verdade | Como validar | Risco |
|---|---|---|---|---|---|
| **HP-1** | **Por empresa atendida**, com degraus de quantidade | nº de empresas ativas | O comprador (consultoria) pensa e orça **por cliente**, como nas ferramentas de agência (S02, S04, S05) | Perguntar como orçam ferramentas hoje (`07`, blocos B/E) | Sensibilidade a preço por cliente; comparar com ferramentas que cobram menos por marca |
| **HP-2** | **Por módulo**: núcleo (financeiro + dashboard) + módulos (funil, experimentos, relatórios, API) | módulos habilitados por empresa | Há segmentos que usam **só** parte do produto (ex.: só lucratividade, ou só funil) — o caso levantado no desenho de acesso por módulo | Entrevistas: "que partes você usaria?"; exigir **comportamento**, não intenção | Complexidade de pacotes e permissões; se todos usam tudo, o valor é nulo |
| **HP-3** | **Por assento + empresas**: usuários internos (analistas) contam, `VIEWER` (cliente final) é gratuito | usuários com escrita + empresas | O **cliente final** é canal de venda (portal) e não deve ser cobrado | Depende de G-02/G-03 (portal e tela de equipe) | Perde receita se clientes finais forem os maiores usuários |
| **HP-4** | **Gratuito limitado** (1 empresa, sem exportações/relatórios PDF) como porta de entrada | — | Adoção exige experimentar sem cartão (padrão 3–14 dias e freemium no mercado — S02, S04, S07, S08) | Testar interesse em piloto | Custo de suporte de usuários que não convertem |
| **HP-5** | **Complemento de BI externo** cobrado à parte (API key, template) | por chave de API ou por empresa | Há demanda por BI externo (P-C) | Discovery com usuários de Power BI/Looker | Pode canibalizar o núcleo |

## 4. Modularização — o que já existe e o que não

| Item | Estado |
|---|---|
| Módulos separáveis no código | Sim (20 módulos de API) |
| Ligar/desligar módulo **por empresa** | **Não** (desenho, `PROPOSTO`) |
| Restringir módulo **por usuário** | **Não** (desenho, `PROPOSTO`) |
| Cobrança por módulo | **Não** |

Consequência: **HP-2 e HP-4 exigem construir antes o controle de acesso por módulo**; HP-1 e HP-3 exigem **contagem de empresas/usuários** e billing. Nenhuma se sustenta sem decisão do responsável.

## 5. O que **não** fazer

- **Não** copiar a faixa de preço de um concorrente (unidades e recursos diferentes — [`05`](05-PRECOS-E-MONETIZACAO.md) §4).
- **Não** construir billing antes de haver alguém disposto a pagar (G-15).
- **Não** comunicar planos publicamente como se existissem.

## 6. Próximo passo

Incluir as perguntas de **orçamento por comportamento** no roteiro de discovery ("qual foi a última ferramenta que você contratou e como decidiu?") e voltar a este documento com **evidência**, não com intuição.
