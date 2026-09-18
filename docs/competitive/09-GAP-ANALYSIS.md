# Gap analysis

> Diferenças entre o Lucratix **hoje** e o que o mercado consultado **anuncia** — mais dívidas internas que travam a apresentação do produto. Cada gap: problema, evidência, usuário afetado, impacto, esforço **qualitativo**, dependências, risco e solução possível. **Um gap não é uma ordem de construção**: passa pelo funil descartar → investigar → validar → planejar (prompt §21).
> Base: [`02`](02-MATRIZ-COMPETITIVA.md), [`03`](03-BENCHMARK-UX-UI.md), [`04`](04-BENCHMARK-FUNCIONAL.md), [`01-MATRIZ-DE-MATURIDADE.md`](../portfolio/01-MATRIZ-DE-MATURIDADE.md), [`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md). Esforço: **P** (pequeno) · **M** (médio) · **G** (grande) — estimativa qualitativa, sem dias.

## Resumo

| ID | Categoria | Gap | Fonte do gap | Esforço |
|---|---|---|---|---|
| G-01 | Integração | Sem integrações automáticas (Ads, redes, GA4) | Mercado (essencial) | G |
| G-02 | Funcional | Sem white-label / portal do cliente com marca | Mercado (paridade) | M–G |
| G-03 | UX / funcional | Sem tela de equipe para o admin da empresa | Interno | M |
| G-04 | Onboarding | Tempo até o primeiro valor alto (dado manual) | Mercado + interno | M |
| G-05 | Funcional | Relatórios fixos, sem variações por audiência/templates | Mercado (comum) | M |
| G-06 | Analytics | Metas sem alerta/sinalização | Mercado (1 fonte) | P |
| G-07 | Analytics | Sem análise assistida por IA | Mercado (emergente) | M–G |
| G-08 | Funcional | Sem agendamento/envio automático de relatório | Mercado (comum) | M |
| G-09 | Integração | Chave de API existe, mas sem conector/template para Looker Studio/Power BI | Mercado + interno | M |
| G-10 | Técnico | Sem observabilidade estruturada, sem medição de desempenho | Interno | M |
| G-11 | UX | Acessibilidade não auditada (sem axe/Lighthouse) | Interno | P–M |
| G-12 | Segurança | Sem MFA; refresh sem rotação; rate limit em memória | Interno | M |
| G-13 | Segurança / comercial | Sem exclusão/exportação self-service de dados pessoais (LGPD) | Interno (#25) | M |
| G-14 | Comercial | Sem cobrança, planos ou billing | Interno | G |
| G-15 | Comercial | **Sem prova de demanda**: nenhum usuário, cliente ou entrevista | Interno | M (esforço de pesquisa) |
| G-16 | Documentação | Sem site público de produto além da página "Sobre"; sem capturas de tela | Interno | P–M |
| G-17 | Analytics (interno) | Campos/funções sem uso (LTV/churn, `opportunities`, baselines, status de experimento) | L-02, L-06, L-07, L-08 | P–M |
| G-18 | Mobile | Sem app nativo; responsivo sem teste completo em mobile | Interno | M |

## Detalhamento

### G-01 — Sem integrações automáticas
| | |
|---|---|
| **Problema** | Todo dado é digitado ou importado; concorrentes puxam de Ads, redes e GA4 sozinhos |
| **Evidência** | 4/4 ferramentas de relatório têm integrações (Reportei 34 citadas; AgencyAnalytics "85+") (S01, S05); Lucratix: `PLANEJADO`, issue #26, `status:blocked` até validar em uso real |
| **Usuário afetado** | Analista (esforço) e consultor (defasagem do dado) |
| **Impacto** | Alto na percepção de paridade; **desconhecido** na decisão de compra |
| **Esforço** | **G** (cada fonte: autenticação OAuth, cotas, mapeamento, manutenção) |
| **Dependências** | Validar H-D7 (importação basta?); segurança de credenciais de terceiros; modelo de dados por canal (já há `channel_id` no funil) |
| **Risco** | Custo de manutenção contínuo (APIs mudam); competir onde os incumbentes já dominam |
| **Possível solução** | (a) importação melhor (modelo de planilha, mapeamento salvo); (b) **complementar** com pipeline de terceiros (tipo Kondado, S11) escrevendo no Lucratix; (c) 1–2 conectores de maior demanda **após** o discovery |

### G-02 — Sem white-label / portal do cliente
| | |
|---|---|
| **Problema** | A agência quer que o cliente final veja resultados com a identidade dela |
| **Evidência** | mLabs, AgencyAnalytics, DashThis anunciam white-label (S04–S06); mLabs descreve nome/endereço/logo/cor (S33) |
| **Usuário afetado** | Consultor/dono (persona 1) e cliente final (`VIEWER`) |
| **Impacto** | Alto para o público declarado |
| **Esforço** | M–G (marca própria de domínio/e-mail é a parte grande) |
| **Dependências** | **G-03** (convidar `VIEWER` pela interface) |
| **Risco** | Escopo inflar; segurança de domínio próprio |
| **Possível solução** | Em etapas: `VIEWER` com painel de leitura com logo da empresa → nome da consultoria → só depois domínio próprio |

### G-03 — Sem tela de equipe
| | |
|---|---|
| **Problema** | O admin da empresa não gerencia membros pela interface (só o Super Admin) |
| **Evidência** | Matriz de maturidade §3, linha "Membros da empresa"; endpoints org-scoped existem sem consumidor no frontend |
| **Usuário afetado** | Dono/admin da consultoria |
| **Impacto** | Alto — bloqueia demonstração honesta e o portal do cliente |
| **Esforço** | M (API pronta) |
| **Dependências** | Nenhuma técnica |
| **Risco** | Baixo; regras de papel já existem (RN-009) |
| **Possível solução** | Página "Equipe": listar, convidar, trocar papel, revogar |

### G-04 — Tempo até o primeiro valor
| | |
|---|---|
| **Problema** | Sem integração, o usuário precisa preparar dados antes de ver o painel |
| **Evidência** | Onboarding dos concorrentes em 4 passos com integração (S31); fluxo do Lucratix descrito em [`PORTFOLIO-LUCRATIX.md`](../portfolio/PORTFOLIO-LUCRATIX.md) §6 |
| **Usuário afetado** | Todo novo usuário |
| **Impacto** | Alto (hipótese) |
| **Esforço** | M |
| **Dependências** | Teste de usabilidade para localizar o atrito |
| **Risco** | Otimizar o passo errado sem observar usuários |
| **Possível solução** | Planilha-modelo por domínio, dados de exemplo opcionais, estados vazios com próximo passo, checklist de configuração |

### G-05 — Relatórios fixos
| | |
|---|---|
| **Problema** | 3 PDFs fixos; sem variação por audiência |
| **Evidência** | mLabs: templates e criação de templates (S04); Lucratix: `reports_*_pdf` |
| **Usuário afetado** | Consultor (apresentação ao cliente) |
| **Impacto** | Médio |
| **Esforço** | M (variações parametrizadas) — **G** se fosse editor livre (não recomendado) |
| **Dependências** | Validar quais seções/audiências importam |
| **Risco** | Perder o foco em número confiável |
| **Possível solução** | Seleção de seções e "versão para o cliente final" sem editor |

### G-06 — Metas sem alerta
| | |
|---|---|
| **Problema** | Desvio de meta só é visto abrindo o painel |
| **Evidência** | Reportei Controle (S01, 1 fonte); Lucratix: metas mensais com progresso |
| **Impacto** | Baixo-médio | **Esforço** | P |
| **Dependências** | Nenhuma | **Risco** | Alertar dado defasado (manual) |
| **Possível solução** | Sinalização na Home e lembrete de fechamento de mês |

### G-07 — Sem IA
| | |
|---|---|
| **Problema** | Expectativa de "análise pronta" |
| **Evidência** | 4/4 anunciam IA (S01–S06); RN-007 restringe afirmar causa |
| **Impacto** | Médio | **Esforço** | M–G |
| **Dependências** | Política de uso (o que a IA pode/não pode dizer); custo por uso; privacidade de dados de clientes enviados a terceiros |
| **Risco** | Contradizer o princípio do produto; vazamento de dado |
| **Possível solução** | Manter insights determinísticos; pesquisar IA **descritiva** com salvaguardas |

### G-08 — Sem agendamento/envio
| | |
|---|---|
| **Problema** | Reporte recorrente exige trabalho manual |
| **Evidência** | Reportei, mLabs (S01, S04) |
| **Impacto** | Médio | **Esforço** | M |
| **Dependências** | E-mail transacional real (Resend, hoje opcional); integrações para o dado estar atualizado |
| **Risco** | Enviar dado defasado |
| **Possível solução** | Lembrete para atualizar + envio manual com um clique |

### G-09 — API key sem conector/template
| | |
|---|---|
| **Problema** | A leitura por BI externo é possível mas exige montar tudo |
| **Evidência** | `analytics/POWER_BI.md` e `LOOKER_STUDIO.md` (pesquisa); Kondado oferece templates gratuitos (S11); Metricool tem conector Looker (S08) |
| **Impacto** | Médio | **Esforço** | M |
| **Dependências** | Decisão de posicionar BI externo como parceiro |
| **Risco** | Suportar duas superfícies (produto e templates) |
| **Possível solução** | Um template público de Looker Studio/Power BI sobre a API + guia |

### G-10 a G-18 — resumo

| ID | Problema | Evidência | Possível solução |
|---|---|---|---|
| G-10 | Sem logging estruturado, métricas ou rastreio de erro; sem medição de desempenho | Apenas `/health`; Fase 18 | Observabilidade mínima antes de qualquer piloto |
| G-11 | Acessibilidade não auditada | Sem axe/Lighthouse | Rodar axe e Lighthouse nas telas principais; corrigir achados |
| G-12 | MFA ausente; refresh sem rotação; rate limit em memória | L-13, `MFA.md` | Hardening dirigido antes de dado real |
| G-13 | LGPD self-service ausente | Issue #25 | Concluir #25 antes de dado pessoal real |
| G-14 | Sem cobrança | Fora de escopo | Só após validar demanda; ver [`12`](12-HIPOTESES-DE-PLANOS.md) |
| G-15 | **Sem prova de demanda** | `SECURITY.md`; `problem.md` | Discovery ([`07`](07-ROTEIRO-DISCOVERY-MERCADO.md)) e piloto pequeno |
| G-16 | Sem capturas de tela nem site público de produto | Inventário de evidências §5 | Executar o `SCREENSHOT-PLAN.md`; decidir opção A/B/C do showcase |
| G-17 | Campos e funções sem uso | L-02, L-06, L-07, L-08 | Decisões de produto pendentes (não é gap competitivo) |
| G-18 | Sem app nativo; mobile sem teste completo | Só Looker Studio Pro cita app (S09) | Sem sinal de demanda; testar responsividade antes de decidir |

## Priorização

**Não é feita aqui.** A ordenação (com método explícito) está em [`docs/product/COMPETITIVE-OPPORTUNITY-BACKLOG.md`](../product/COMPETITIVE-OPPORTUNITY-BACKLOG.md).
