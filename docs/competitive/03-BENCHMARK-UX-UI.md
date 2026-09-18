# Benchmark UX/UI

> **Limite central:** nenhuma conta ou trial foi criado em concorrentes, então **só o que é público foi observado** — páginas de produto, tabelas de preço e centrais de ajuda oficiais. Onboarding *dentro* do produto, densidade, filtros, estados vazios, feedback e acessibilidade **não foram observados por uso** (seção 3). Princípios, **não** cópia de identidade ou layout.
> Fontes: [`SOURCES.md`](SOURCES.md). Consulta: 2026-09-18.

## 1. Como cada padrão é apresentado

Campos do prompt mestre §16: **problema que resolve · como é tratado · aplicabilidade ao Lucratix · risco de copiar · alternativa própria**. Status de cada padrão no funil do prompt (§21): `Descartar` · `Investigar` · `Validar com usuário` · `Planejar`.

### P1 — O "cliente" como unidade central da interface
| | |
|---|---|
| **Problema que resolve** | Quem atende várias empresas precisa separar dados e relatórios por cliente sem confusão |
| **Como é tratado** | Reportei: o **"projeto"** é o cliente/marca; nome e idioma definidos no cadastro (S31, S02). mLabs Analytics: dashboards criados **por cliente/marca** (S32) |
| **Aplicabilidade** | **Já existe** no Lucratix: a **empresa** é a unidade de isolamento, com seletor, cartões com KPIs e troca de empresa |
| **Risco de copiar** | Nenhum relevante; é convergência natural |
| **Alternativa própria** | Manter; o diferencial do Lucratix é o **isolamento verificável** (404 para não-membro), não o rótulo |
| **Status** | Já atendido |

### P2 — Caminho curto até o primeiro relatório
| | |
|---|---|
| **Problema que resolve** | O usuário abandona se demora a ver valor |
| **Como é tratado** | Reportei descreve 4 passos: criar projeto → integrar contas → escolher template "Padrão" → definir período (padrão de 30 dias) (S31). mLabs: conectar redes → o sistema gera gráficos e análises automaticamente (S03, S32). Ambos **dependem de integração automática** para o "primeiro relatório em segundos" |
| **Aplicabilidade** | **Alta como princípio, baixa como mecanismo.** No Lucratix o dado é digitado/importado; o primeiro valor exige criar empresa, informar dados e só então ver o painel |
| **Risco de copiar** | Prometer "relatório em segundos" **sem integração** seria enganoso |
| **Alternativa própria** | Reduzir o **tempo até o primeiro insight** com meios já existentes: importação guiada com **planilha-modelo**, dados de exemplo opcionais, e estados vazios que expliquem o próximo passo. *Hipótese: precisa de teste de usabilidade para saber onde as pessoas travam.* |
| **Status** | `Validar com usuário` |

### P3 — Templates prontos + personalização
| | |
|---|---|
| **Problema que resolve** | Ninguém quer montar relatório do zero, mas também não quer relatório genérico |
| **Como é tratado** | mLabs: "templates de relatórios pré-definidos", personalização, criação de templates próprios (ilimitada no plano Completo) (S04). Reportei: template "Padrão" e criação de templates (S31) |
| **Aplicabilidade** | Média. O Lucratix tem **3 PDFs fixos** (básico, executivo, funil) e nenhum editor |
| **Risco de copiar** | Construir um **editor de relatórios** é grande e foge da tese do produto (número confiável, não layout) |
| **Alternativa própria** | Variações **parametrizadas por audiência** (executivo × técnico) e por seção, sem editor livre |
| **Status** | `Investigar` |

### P4 — Portal do cliente com marca da agência (white-label)
| | |
|---|---|
| **Problema que resolve** | A agência quer que o **cliente final** veja o resultado com a **identidade dela**, com login próprio |
| **Como é tratado** | mLabs: portal com **nome da agência, endereço web, logo e cor**; dashboards acessados por **login e senha** do cliente (S32, S33). AgencyAnalytics e DashThis anunciam white-label (S05, S06) |
| **Aplicabilidade** | **Alta para o público-alvo declarado** (a persona "cliente final" é `VIEWER` — [`personas.md`](../product/personas.md)). O Lucratix já tem **logotipo por empresa** e papel `VIEWER` somente leitura |
| **Risco de copiar** | Escopo grande (domínio próprio, e-mail com marca) e **depende de uma tela de equipe que hoje não existe** (o admin da empresa não convida `VIEWER` pela interface) |
| **Alternativa própria** | Etapas pequenas: (1) tela de equipe para convidar `VIEWER`; (2) logo e nome da empresa no cabeçalho do painel do `VIEWER`; (3) só depois, marca própria |
| **Status** | `Validar com usuário` |

### P5 — Alertas de meta/KPI
| | |
|---|---|
| **Problema que resolve** | Perceber desvio sem abrir o painel |
| **Como é tratado** | Reportei: "Reportei Controle" — alertas de metas e KPIs (S01) |
| **Aplicabilidade** | Média. O Lucratix já tem **metas mensais com progresso** na Visão Executiva; não tem alerta |
| **Risco de copiar** | Como o dado entra **manualmente**, alertar "em tempo real" não faz sentido |
| **Alternativa própria** | Sinalização **na própria Home** ("KPI abaixo da meta neste mês") e lembrete de fechamento de mês; e-mail só se houver demanda |
| **Status** | `Investigar` |

### P6 — Agendamento e envio automático de relatórios
| | |
|---|---|
| **Problema que resolve** | Cumprir a rotina de reporte sem trabalho manual |
| **Como é tratado** | Reportei: automação de relatórios com envio recorrente (S01). mLabs: relatórios agendados por plano (S04). Looker Studio Pro: entrega agendada (S09) |
| **Aplicabilidade** | Baixa **no modelo atual**: agendar envio de um relatório cujo dado é digitado corre o risco de **enviar informação defasada** |
| **Risco de copiar** | Quebra a promessa de "número confiável" se o dado não foi atualizado |
| **Alternativa própria** | **Lembrete para atualizar os dados** antes do fechamento e envio manual com um clique; agendamento só quando houver integração |
| **Status** | `Investigar` (dependente de integrações) |

### P7 — Análise assistida por IA
| | |
|---|---|
| **Problema que resolve** | Transformar número em recomendação sem exigir análise |
| **Como é tratado** | Reportei ("Reportei AI", "Reportei Studio"), mLabs ("análise com IA"), Databox ("AI analyst"), DashThis e AgencyAnalytics (add-ons de IA) (S01, S03–S07). Créditos de IA como limite de plano (S02, S07) |
| **Aplicabilidade** | Média-alta em **valor percebido**; conflita com a regra do produto de **não afirmar causalidade** (RN-007) |
| **Risco de copiar** | Texto gerado que "explica" uma variação como causa — contradiz o princípio central |
| **Alternativa própria** | Manter os **insights determinísticos** já existentes (gargalo do funil, direção de KPI) e, se houver IA, com **salvaguardas explícitas** (só descrever, citar o número, marcar incerteza, nunca atribuir causa) |
| **Status** | `Investigar` |

### P8 — Simulador de preço por volume de clientes
| | |
|---|---|
| **Problema que resolve** | O comprador quer saber quanto pagará **para o seu tamanho** |
| **Como é tratado** | Reportei: seletor de nº de projetos (5 a 200+) e alternância mensal/anual (S02). mLabs Analytics: "Quantidade de Marcas" e "faça uma simulação" (S04) |
| **Aplicabilidade** | Só quando existir cobrança (hoje **não existe**) |
| **Risco de copiar** | Nenhum agora |
| **Alternativa própria** | Deixar para a etapa comercial ([`12-HIPOTESES-DE-PLANOS.md`](12-HIPOTESES-DE-PLANOS.md)) |
| **Status** | `Planejar` (futuro) |

### P9 — Prova de compatibilidade (vitrine de integrações)
| | |
|---|---|
| **Problema que resolve** | Mostrar de imediato que "funciona com o que eu uso" |
| **Como é tratado** | Reportei e mLabs exibem **logos e listas** de integrações na página inicial e nos planos (S01, S04) |
| **Aplicabilidade** | Baixa hoje: o Lucratix **não tem integrações automáticas** |
| **Risco de copiar** | Exibir logos de plataformas que não se integram seria **enganoso** |
| **Alternativa própria** | Comunicar com clareza o que existe: **importação CSV/XLSX/JSON** e **chave de API** para BI externo |
| **Status** | `Descartar` como padrão de interface por ora |

## 2. Referências do próprio Lucratix (o que já é decisão de UX)

Não são comparação com concorrentes — registram o que o produto já faz e que **nenhuma página consultada** mencionou: **glossário e ajuda contextual por indicador** ("?"), **"não aplicável" com motivo** em vez de zero, **aviso de que variação não prova causa**, acessos rápidos personalizáveis, personalização de gráficos por usuário e empresa, tema claro/escuro e três idiomas. Estado: [`01-MATRIZ-DE-MATURIDADE.md`](../portfolio/01-MATRIZ-DE-MATURIDADE.md). Se isso é **valorizado** por usuários é hipótese a validar.

## 3. O que **não** foi possível observar

| Aspecto (prompt §16) | Observado? | Por quê |
|---|---|---|
| Onboarding **dentro** do produto | Parcial — só pelos passos descritos na ajuda (S31, S32) | Sem conta |
| Navegação, hierarquia, densidade | **Não** | Sem conta |
| Dashboard (layout real) | **Não** | Sem conta; só descrições de página |
| Filtros | **Não** | Sem conta |
| Empty states, feedback | **Não** | Sem conta |
| Glossário/ajuda contextual | **Não localizado** nas páginas consultadas | — |
| Relatórios (aparência) | **Não** | Sem amostra de relatório real |
| Mobile | **Não** | Sem teste em dispositivo |
| Acessibilidade | **Não** | Sem auditoria |
| Tempo/esforço para tarefas | **Não** | Exige uso cronometrado |
| Descoberta de funcionalidades | **Não** | Exige uso |

**Como completar** (com autorização do responsável): criar contas de teste próprias, cronometrar as tarefas centrais (cadastrar cliente → primeiro relatório) e registrar capturas — respeitando os termos de uso de cada fornecedor.

## 4. Leitura

1. **Convergência de UX entre os incumbentes** (consultadas): unidade "cliente", onboarding curto **apoiado em integração**, templates, portal do cliente, IA como diferencial de plano.
2. O maior **descompasso de UX** do Lucratix em relação a esses padrões é o **tempo até o primeiro valor**, porque o dado é manual — e o que **não** se deve fazer é fingir que não é.
3. O **portal do cliente com marca** parece o padrão mais aderente à **persona** do produto — mas depende de uma etapa anterior (tela de equipe).
4. **IA e agendamento** são padrões que **conflitam** com princípios do produto se copiados sem adaptação.
