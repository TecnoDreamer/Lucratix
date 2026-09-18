# SWOT — Lucratix

> Cada item traz **evidência**, **impacto**, **probabilidade (qualitativa)** e **ação possível**. Itens sem evidência são marcados como **hipótese**. Base: [`01-MATRIZ-DE-MATURIDADE.md`](../portfolio/01-MATRIZ-DE-MATURIDADE.md), [`02-MATRIZ-COMPETITIVA.md`](02-MATRIZ-COMPETITIVA.md), [`04-BENCHMARK-FUNCIONAL.md`](04-BENCHMARK-FUNCIONAL.md). Consulta: 2026-09-18.
> Escala: **Impacto** Alto/Médio/Baixo (efeito sobre adoção ou risco). **Probabilidade** Alta/Média/Baixa (quão provável de se materializar). Ambas são **julgamento qualitativo**, não medição.

## Forças (internas, com evidência no repositório)

| # | Força | Evidência | Impacto | Prob. | Ação possível |
|---|---|---|---|---|---|
| F1 | **Regra de número confiável**: ausência ≠ zero, "não aplicável" com motivo | Motor puro, 72 testes; RN-003/004 | Alto — sustenta a promessa central | Alta (já vigente) | Tornar visível no produto e na comunicação; validar se o público percebe valor |
| F2 | **Isolamento entre empresas verificável** (404 p/ não-membro) | Teste de integração, E2E e teste estrutural de escrita | Alto — requisito crítico para quem atende vários clientes | Alta | Usar como argumento **factual** ("comprovado por teste"), nunca "100% seguro" |
| F3 | **Cruza marketing com financeiro, funil e baseline** num só lugar | Módulos implementados; **não localizado** nas 4 ferramentas de relatório pesquisadas (`02`) | Alto **se** houver demanda — hipótese | Média | Validar H-D1, H-D2, H-D6 nas entrevistas |
| F4 | **Educação embutida**: glossário, ajuda por indicador, aviso de causalidade | Módulo e componente implementados; `?` nas demais | Médio | Média | Testar com usuários se reduz dúvida; medir uso |
| F5 | **Rigor de engenharia e processo** (CI de 5 jobs, ADRs, auditoria própria com correções) | 736/513/56 testes; 9 ADRs; #129–#133 | Médio (confiança técnica; pouco visível ao cliente final) | Alta | Comunicar a CTOs/parceiros; **não** vender ao cliente final como benefício direto |
| F6 | **Multiempresa desde o modelo de dados**, com papéis e Super Admin | RBAC, `PLATFORM_ADMIN`, congelamento de empresa | Médio | Alta | Concluir a interface (F/W abaixo) |
| F7 | **Três idiomas e tema claro/escuro** | 773 chaves, gate de CI | Baixo-médio | Alta | Revisão humana en/es antes de divulgar |
| F8 | **Chave de API somente-leitura** já habilita BI externo | Módulo `api_keys` | Médio | Média | Criar o conector/guia (ver O4) |

## Fraquezas (internas, com evidência)

| # | Fraqueza | Evidência | Impacto | Prob. | Ação possível |
|---|---|---|---|---|---|
| W1 | **Sem integrações automáticas**; todo dado é digitado/importado | `PLANEJADO` (#26); 4/4 concorrentes diretos têm | **Alto** — é o item **essencial** do mercado | Alta (já é) | **Não** copiar às cegas: validar se importação basta (H-D7); avaliar caminho complementar (pipeline tipo Kondado) |
| W2 | **Sem usuários reais nem resultado medido** | `SECURITY.md`: pré-produção | **Alto** — impede prova social e aprendizado | Alta | Rodar discovery e um piloto pequeno ([`07`](07-ROTEIRO-DISCOVERY-MERCADO.md)) |
| W3 | **Sem white-label/portal do cliente com marca** e **sem tela de equipe** | Matriz de maturidade; padrão de mercado (P4) | Alto para o público-alvo declarado | Alta | Tela de equipe → cabeçalho do `VIEWER` com logo → marca própria |
| W4 | **Sem IA e sem agendamento de envio** | Paridade/emergente no mercado (`04`) | Médio | Alta | Investigar com salvaguardas; **conflitam** com princípios se copiados (`03` P6, P7) |
| W5 | **Tempo até o primeiro valor** alto (dado manual) | Fluxo do produto vs. onboarding dos concorrentes (`03` P2) | Alto (hipótese) | Média | Planilha-modelo, dados de exemplo, estados vazios guiados; testar |
| W6 | **Sem observabilidade, medição de desempenho e auditoria de acessibilidade** | Matriz §4 | Médio (risco operacional) | Média | Fase 18 do roadmap |
| W7 | **Campos/funções sem uso** (LTV/churn, `opportunities`, 6 colunas de baseline, status de experimento) | L-02, L-06, L-07, L-08 | Médio (confiança e clareza) | Alta | Decisões de produto pendentes |
| W8 | **Autoria conduzida por uma pessoa, com IA** e projeto de ~4 semanas | Histórico do Git | Médio — risco de continuidade e de percepção | Média | Declarar de forma transparente; documentação já reduz o risco de "conhecimento na cabeça" |
| W9 | **Rate limit em memória, refresh sem rotação, sem MFA** | L-13, `MFA.md` | Médio se houver produção | Média | Hardening antes de qualquer piloto com dado real |

## Oportunidades (externas — evidência de mercado ou **hipótese**)

| # | Oportunidade | Evidência / status | Impacto | Prob. | Ação possível |
|---|---|---|---|---|---|
| O1 | **Provar resultado financeiro**, não só métrica de mídia | Ausente nas 4 ferramentas nas páginas lidas (`02`) — **hipótese**, não validada | Alto | Média | Discovery H-D1/H-D6 |
| O2 | **PMEs e consultorias que hoje usam planilha** | Indício apenas de fornecedor (S20) — **hipótese** | Médio-alto | Média | Discovery H-D3 |
| O3 | **Contadores locais como canal ou usuário** | Duas contabilidades em Leme oferecem relatórios gerenciais (S22, S23) — **hipótese** | Médio | Baixa-média | Discovery H-D4 (perfil P4) |
| O4 | **Ecossistema Looker Studio / Power BI**: templates e conector sobre a chave de API | Kondado distribui templates gratuitos; Metricool tem conector Looker (S08, S11) | Médio | Média | Prototipar um template e/ou conector |
| O5 | **Preço de entrada baixo em reais é possível** (sinaliza mercado que paga pouco por ferramenta de relatório) | R$ 34,90–74,90/mês (S02, S04) — **não é prova de disposição a pagar pelo Lucratix** | Médio | — | Não usar para fixar preço |
| O6 | **Modularização** (cada empresa usa só os módulos de que precisa) | Desenho existente; nenhum concorrente pesquisado a anuncia — **hipótese** | Médio | Baixa-média | Validar demanda antes de construir |
| O7 | **Integrar depois**, via pipeline existente, em vez de construir cada conector | Kondado (80+ fontes) como referência de mercado (S11) | Médio | Média | Avaliar "comprar × construir" quando a fase de integrações abrir |

## Ameaças (externas, com evidência)

| # | Ameaça | Evidência | Impacto | Prob. | Ação possível |
|---|---|---|---|---|---|
| T1 | **Incumbentes com base grande e integrações amplas** | Reportei e mLabs declaram "mais de 10.000" clientes/empresas (S01, S03); 34+ integrações | Alto | Alta | Não competir por paridade; escolher um recorte (`11`) |
| T2 | **Preço de entrada muito baixo** dos incumbentes | R$ 34,90/mês (mLabs, equivalente anual) e R$ 74,90/mês (Reportei, 5 projetos) | Alto para preço | Alta | Diferenciar por valor (financeiro), não por preço |
| T3 | **Alternativa gratuita**: Looker Studio e Power BI (Desktop) | Versão gratuita segue disponível (S09, S10) | Médio | Alta | Posicionar como complemento (chave de API) |
| T4 | **Ferramentas de relatório adicionarem financeiro/funil** | Sinal indireto: Reportei integra Hotmart/Shopify/Pipedrive (S01) — **não** prova intenção | Médio-alto | Baixa-média | Acompanhar; vantagem estaria em rigor e baseline |
| T5 | **IA como expectativa de mercado** | 4/4 anunciam IA (`04`) | Médio | Alta | Definir postura (`03` P7) |
| T6 | **Regulatório / LGPD** | Exclusão e exportação self-service `PLANEJADO` (#25) | Médio | Média | Fechar #25 antes de piloto com dado pessoal real |
| T7 | **Vulnerabilidades de dependências** | Advisory crítico do Next.js em 2026-09-10 (#130) | Médio | Média | Manter CI de segurança; processo já provou funcionar |

## Leitura

- O **maior risco** não é técnico: é **não haver evidência de demanda** (W2, O1–O3 são hipóteses). Por isso o roteiro de discovery precede qualquer aposta em paridade.
- Das ameaças, **T1 e T2** pesam para qualquer estratégia de "mais um relatório de mídia" — reforçam a necessidade de escolher um **recorte diferente** ([`11-POSICIONAMENTO.md`](11-POSICIONAMENTO.md)).
