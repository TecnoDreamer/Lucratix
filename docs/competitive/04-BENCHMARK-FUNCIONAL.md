# Benchmark funcional

> Classifica funcionalidades pela **frequência com que aparecem nas fontes consultadas** — não por importância comercial provada. Base: [`02-MATRIZ-COMPETITIVA.md`](02-MATRIZ-COMPETITIVA.md). Consulta: 2026-09-18. Preços e monetização: [`05-PRECOS-E-MONETIZACAO.md`](05-PRECOS-E-MONETIZACAO.md).

## 1. Critério de classificação (explícito, para não manipular)

Universo de comparação: as **4 ferramentas de relatório para agências** (Reportei, mLabs Analytics, AgencyAnalytics, DashThis), por serem as mais próximas da tarefa. Databox, Metricool, BI geral e Kondado entram como contexto.

| Classe | Regra usada |
|---|---|
| **Essencial no mercado** | ✓ em **todas** as 4 e nenhuma dúvida de verificação |
| **Paridade** | ✓ em **3 ou 4** das 4 (com ≤ 1 `?`) |
| **Diferenciador comum** | ✓ em **2** das 4 e `?` nas demais |
| **Diferenciador raro** | **Não localizado** em nenhuma das 4 (`—`) e presente no Lucratix — **é hipótese**, não conclusão |
| **Emergente** | Recurso recente/pago à parte, citado por ≥ 2 fornecedores diferentes, sem padrão estável |
| **Não relevante** | Sem evidência de demanda nas fontes **e** sem aderência à tese do produto |

> Como muitas células são `?`, **o critério é conservador**: prefere classificar como "comum" ou "hipótese" a inflar uma conclusão.

## 2. Classificação

| Funcionalidade | Classe | Evidência (fontes) | Lucratix hoje |
|---|---|---|---|
| Dashboards / relatórios interativos | **Essencial** | Reportei, mLabs, AgencyAnalytics, DashThis ✓ (S01–S06) | ✓ |
| Integrações automáticas (Ads, redes, GA4…) | **Essencial** | 4/4 ✓; Reportei 34 citadas; AgencyAnalytics "85+" (S01, S05) | — (`PLANEJADO`) |
| Multicliente (projeto/marca/cliente como unidade) | **Paridade** | Reportei, mLabs, AgencyAnalytics ✓; DashThis `?` (S01–S05) | ✓ |
| White-label / portal do cliente | **Paridade** | mLabs, AgencyAnalytics, DashThis ✓; Reportei `?` (S04–S06) | — |
| Análise com IA | **Emergente** | 4/4 ✓, mas quase sempre como **plano superior, créditos ou add-on pago** (S01–S07) — recurso recente, ainda sem formato estável | — |
| Relatório exportável (PDF/link) | **Diferenciador comum** (pela regra: só 2 confirmados) | Reportei, mLabs ✓; AgencyAnalytics e DashThis `?` (S01, S04) — provavelmente mais difundido do que a regra sugere | ✓ |
| Agendamento/envio automático de relatório | **Diferenciador comum** | Reportei, mLabs ✓; demais `?` (S01, S04) | — |
| Alertas de meta/KPI | **Não classificado** (1 fonte) | Só Reportei ("Reportei Controle") localizado (S01) — abaixo do mínimo de 2 da regra | △ (metas com progresso, sem alerta) |
| Planilha própria como fonte | **Diferenciador comum** | mLabs ("planilhas próprias como indicadores"), Reportei (Google Sheets) (S01, S03) | ✓ (importação CSV/XLSX/JSON) |
| Integração com assistentes de IA (MCP) | **Emergente** | Reportei MCP, Databox MCP, Kondado MCP (S01, S07, S11) — 3 fornecedores | — |
| Conector para BI externo (Looker Studio/Power BI) | **Diferenciador comum** (universo ampliado) | Metricool (Looker Studio), Kondado (vários), AgencyAnalytics/Databox (API) (S05, S07, S08, S11) | △ (chave de API; sem conector) |
| **Financeiro** (lucro, margem, DRE) | **Diferenciador raro — hipótese** | Não localizado nas 4; Kondado só **transporta** dados de ERP (S11); Treasy/Conta Azul cobrem financeiro **sem** marketing (S12, S14) | ✓ |
| **Funil de 8 etapas com gargalo** | **Diferenciador raro — hipótese** | Não localizado nas 4 | ✓ |
| **Baseline numérico antes × depois** | **Diferenciador raro — hipótese** | Não localizado nas 4; Reportei tem "Linha do Tempo" de **marcos**, que é outra coisa (S01) | △ (4 métricas) |
| **Experimentos A/B com significância** | **Diferenciador raro — hipótese** | Não localizado nas 4 | △ |
| **Trilha de auditoria** | **Não verificado** | `?` em todas | ✓ |
| **Glossário/ajuda de métricas no produto** | **Não verificado** | `?` em todas | ✓ |
| LTV / retenção / churn / MRR | **Não relevante (por ora)** | Nenhuma das 4 os cita nas páginas lidas; **no Lucratix são código órfão** (L-02, L-21) | — |
| App móvel nativo | **Não relevante (por ora)** | Só Looker Studio Pro cita app (S09); sem sinal nas 4 | — (responsivo) |

## 3. O que a classificação diz

1. O Lucratix **não tem** o que mais aparece nas ferramentas de relatório — **integrações automáticas** (essencial), **white-label** (paridade) e **IA** (emergente, presente nas 4) — nem **agendamento** (diferenciador comum). É o **custo de entrada** para competir de igual para igual **na tarefa "relatório de mídia"**.
2. O que o Lucratix tem e **não foi localizado** nessas ferramentas (financeiro, funil de 8 etapas, baseline, A/B) é **diferencial em potencial, ainda não em valor**: nada prova que os usuários o queiram. Vale como **hipótese de posicionamento** ([`11-POSICIONAMENTO.md`](11-POSICIONAMENTO.md)).
3. **Copiar a paridade** (integrações, IA, white-label) sem validar **seria competir onde os incumbentes já têm 10.000+ clientes declarados** (S01, S03) — decisão de investimento, não de checklist.
4. Alguns itens têm **conflito com princípios do produto** (agendar envio com dado manual; IA que explique causa): ver [`03-BENCHMARK-UX-UI.md`](03-BENCHMARK-UX-UI.md) P6 e P7.

## 4. Limites

- Só páginas públicas; nenhuma funcionalidade foi **testada**. "✓" = **anunciada**, não "funciona bem".
- A classe "Diferenciador raro" é **por ausência nas páginas lidas**; pode haver recurso não divulgado ou em outra página.
- Não há dado de **uso** ou de **valorização pelo cliente** — a matriz mede **presença**, não **importância**.
- Ferramentas de fora do universo pesquisado podem já oferecer o "raro".
