# Matriz competitiva

> Compara **presença documentada** de capacidades — não qualidade. Consulta: 2026-09-18. Fontes por coluna ao final ([`SOURCES.md`](SOURCES.md)). **Não é um ranking**: as ferramentas fazem coisas diferentes (ver [`README.md`](README.md) §1).

## Legenda

| Símbolo | Significado |
|---|---|
| ✓ | **Confirmado** em fonte oficial consultada |
| △ | **Parcial/limitado**: existe com ressalva (plano, escopo, equivalente diferente) — explicada nas notas |
| — | **Não localizado** nas páginas consultadas. *Não significa que não exista.* |
| ? | **Não foi possível verificar** com o material coletado |

Para o **Lucratix**, ✓/△/— vêm da [matriz de maturidade](../portfolio/01-MATRIZ-DE-MATURIDADE.md) (`IMPLEMENTADO` → ✓; `PARCIAL` → △; ausente/`PLANEJADO`/`PROPOSTO` → —).

## Matriz

| Capacidade | **Lucratix** | Reportei | mLabs Analytics | Agency-Analytics | DashThis | Databox | Metricool | Looker Studio | Power BI | Kondado |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboards / relatórios interativos | ✓ | ✓ | ✓ | ✓ | ✓ | ? | ? | ✓ | ✓ | △ ¹ |
| Relatório exportável (PDF/link) | ✓ | ✓ | ✓ | ? | ? | ? | ✓ | ? | ? | — |
| Multiempresa / multicliente | ✓ | ✓ | ✓ | ✓ | ? | ✓ | ✓ | △ ² | ? | ? |
| Integrações automáticas (Ads, redes, GA4…) | — | ✓ | ✓ | ✓ | ✓ | ✓ | △ ³ | ? | ? | ✓ |
| Entrada por planilha / manual | ✓ | △ ⁴ | ✓ | ? | ? | △ ⁵ | ? | ? | ? | — |
| Expõe dados a BI externo (API/conector) | △ ⁶ | ? | ? | △ | ? | △ | ✓ | n/a | n/a | ✓ |
| **Financeiro** (lucro, margem, DRE) | ✓ | — | — | — | — | ? | — | ? ⁷ | ? ⁷ | △ ⁸ |
| **Funil de 8 etapas** com gargalo | ✓ | — | — | — | — | ? | — | ? ⁷ | ? ⁷ | — |
| **Baseline** antes × depois | △ ⁹ | △ ¹⁰ | — | — | — | ? | — | ? ⁷ | ? ⁷ | — |
| **Experimentos A/B** com significância | △ ¹¹ | — | — | — | — | ? | — | ? | ? | — |
| Produtos / catálogo | △ ¹² | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Personalização pelo usuário | ✓ | ✓ | ✓ | △ | ? | ? | ? | ? | ? | ? |
| **Trilha de auditoria** | ✓ | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| **Glossário / ajuda de métricas no produto** | ✓ | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Multi-idioma | ✓ ¹³ | △ ¹⁴ | △ ¹⁴ | ? | ? | ? | ? | ? | ? | ? |
| Mobile | △ ¹⁵ | ? | ? | ? | ? | ? | ? | ✓ ¹⁶ | ? | ? |
| Permissões por papel | ✓ | △ ¹⁷ | △ ¹⁷ | △ ¹⁷ | ? | ? | △ ¹⁷ | △ ¹⁸ | ? | ? |
| White-label / portal do cliente | — | ? | ✓ | ✓ | ✓ | ? | △ ¹⁹ | — | ? | ? |
| Análise com IA | — | ✓ | ✓ | ✓ | ✓ | ✓ | △ ²⁰ | ✓ | ? | △ ²¹ |
| Agendamento/envio automático de relatório | — | ✓ | ✓ | ? | ? | △ | ? | △ ²² | ? | — |

## Notas

1. Kondado **não** é ferramenta de dashboard; oferece **templates gratuitos** para Power BI e Looker Studio (S11).
2. Looker Studio Pro tem "workspaces de equipe" e propriedade dos relatórios pela organização (S09) — não é multicliente no sentido de agência.
3. Metricool: foco em redes sociais; integrações citadas na página de preços são limitadas (S08).
4. Reportei integra **Google Sheets** (S01) — não é importação de arquivo CSV/XLSX.
5. Databox: "custom data integrations" a partir do plano Analyst (S07).
6. Lucratix: **chave de API somente-leitura por empresa** habilita Power BI/Looker; **não há conector nem embedding** (`PROPOSTO`).
7. Power BI/Looker Studio podem, em tese, exibir qualquer dado que o usuário modele — a capacidade é **do usuário**, não do produto; por isso `?`.
8. Kondado leva dados de ERPs (Bling, Omie, Tiny) a dashboards — transporta dado financeiro, não o analisa (S11).
9. Lucratix: baseline histórico existe; a comparação cobre 4 métricas (receita, lucro, margem, CAC).
10. Reportei tem "Linha do Tempo" para registrar **marcos** do projeto (S01) — é histórico de eventos, **não** um baseline numérico comparável.
11. Lucratix: teste A/B com p-valor; o ciclo de vida de status do experimento não existe (L-08).
12. Lucratix: cadastro de produtos, sem análise por produto.
13. Lucratix: pt-BR, en, es (773 chaves; qualidade da tradução en/es não revisada por humano).
14. O **site** dos fornecedores tem versões em mais de um idioma (Reportei: EN e PT-PT; mLabs: seletor "PT"); o idioma **do produto** não foi verificado.
15. Lucratix: layout responsivo com menu em gaveta; **não há app**.
16. Looker Studio Pro cita acesso ao **Looker Mobile App** (S09).
17. Citam "usuários convidados"/"equipe" (Reportei: 3 usuários adicionais no Starter; mLabs: usuários convidados; AgencyAnalytics: "unlimited staff & client users"; Metricool Advanced: gestão de equipe) — **papéis/permissões granulares não verificados**.
18. Looker Studio Pro: workspaces de equipe permitem "gerenciar acesso e compartilhar conteúdo" (S09).
19. Metricool: white label somente no plano Custom (S08).
20. Metricool: créditos de IA no plano Custom (S08).
21. Kondado: integração com assistentes de IA via protocolo MCP (S11) — não é análise de marketing com IA.
22. Looker Studio Pro: entrega agendada de até 200 agendamentos por relatório (S09).

## O que a matriz mostra (e o que não mostra)

**Mostra**, dentro do que foi consultado:

- As ferramentas de **relatório para agências** (Reportei, mLabs Analytics, AgencyAnalytics, DashThis) convergem em: **muitas integrações automáticas, dashboards, relatórios agendados, white-label e IA**. São **paridade de mercado** — o Lucratix hoje **não** tem integrações automáticas, white-label, IA nem agendamento.
- Nas páginas consultadas, **financeiro (lucro/margem/DRE), funil de 8 etapas, baseline numérico e testes A/B com significância aparecem no Lucratix e não foram localizados nessas ferramentas**. Isso **não prova** ausência e **não prova** que o mercado valorize isso — é uma **hipótese a validar** (ver [`07-ROTEIRO-DISCOVERY-MERCADO.md`](07-ROTEIRO-DISCOVERY-MERCADO.md)).
- Preços e modelos de cobrança variam muito (por projeto, por marca, por cliente, por dashboard, por usuário) — ver [`05-PRECOS-E-MONETIZACAO.md`](05-PRECOS-E-MONETIZACAO.md).

**Não mostra:** qualidade, facilidade de uso, confiabilidade dos dados, desempenho, suporte real ou satisfação. A grande quantidade de `?` reflete o limite do método (nenhuma conta foi criada; só páginas públicas).

## Fontes por coluna

Reportei — S01, S02 · mLabs Analytics — S03, S04 · AgencyAnalytics — S05 · DashThis — S06 · Databox — S07 · Metricool — S08 · Looker Studio — S09 · Power BI — S10 · Kondado — S11 · Lucratix — [matriz de maturidade](../portfolio/01-MATRIZ-DE-MATURIDADE.md).
