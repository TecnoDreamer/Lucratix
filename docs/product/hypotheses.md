# Hipóteses

Hipóteses de produto assumidas nesta fase inicial (sem pesquisa de mercado formal), a serem validadas com o uso real pela consultoria do usuário.

## H1 — Problema

**Hipótese:** consultorias de marketing têm dificuldade real, hoje, em provar de forma confiável se o trabalho realizado aumentou a lucratividade (não só métricas de mídia) de seus clientes.
**Como validar:** uso real do módulo de baseline + financeiro + dashboard com pelo menos uma empresa-cliente real (com dados fictícios/anonimizados em ambiente de desenvolvimento) e comparação com o processo atual (planilha).

## H2 — Isolamento multi-tenant é pré-requisito de confiança

**Hipótese:** sem isolamento comprovado por teste automatizado entre empresas, a plataforma não é confiável o suficiente para ser adotada, mesmo internamente.
**Como validar:** testes de integração explícitos (Fase 7) que tentam acesso cruzado entre organizações e falham como esperado.

## H3 — Tratamento correto de dado ausente muda a decisão

**Hipótese:** diferenciar `0`, `null`, "não disponível" e "não aplicável" evita decisões erradas (ex.: achar que CAC é zero quando na verdade não há dado de investimento no período).
**Como validar:** revisão de caso real onde a distinção teria evitado uma leitura errada de indicador.

## H4 — Baseline versionado é mais útil que baseline único

**Hipótese:** manter o baseline como histórico versionado (em vez de um único registro editável) é necessário porque a percepção da "situação antes" pode precisar de correção sem perder o registro original.
**Como validar:** uso real ao longo de múltiplos meses com pelo menos uma correção de baseline.

## H5 — MVP manual (sem integrações automáticas) já entrega valor

**Hipótese:** é possível entregar valor real com entrada manual de dados, antes de qualquer integração com GA4/Google Ads/Meta Ads.
**Como validar:** critério de sucesso do MVP (ver [mvp.md](mvp.md)) atingido e usado por pelo menos um ciclo mensal completo antes de iniciar a Fase 17 (Integrações).

## Status

Todas as hipóteses acima estão **não validadas** nesta fase inicial (Fase 1 — Produto). Nenhuma decisão de arquitetura irreversível deve depender de uma hipótese ainda não validada sem que isso esteja documentado em ADR.
