# Fora de Escopo (MVP)

Estes itens são reconhecidos como valiosos, mas **não fazem parte do MVP**. Ficam documentados aqui para não serem esquecidos e para evitar scope creep durante a implementação.

## Integrações automáticas

- Google Analytics 4, Google Ads, Meta Ads, Instagram/Facebook, CRMs, ERPs, plataformas de e-commerce, bancos de dados externos, planilhas, APIs de terceiros, webhooks.
- No MVP, os dados são **inseridos manualmente**. A arquitetura deve permitir integrações futuras (módulo `integrations`, entidades `integration_accounts` e `integration_sync_runs` já previstas no modelo de dados), mas nenhuma integração real será construída agora (Fase 17, após o modelo manual estar validado).

## Modelo de atribuição avançado

- First touch, last touch, linear, position based e data-driven attribution não serão implementados no MVP. Apenas documentação inicial sobre os modelos (ver seção 11 do prompt mestre) e um modelo de dados que não impeça a implementação futura.

## Análise estatística avançada de experimentos

- **Teste-z de duas proporções implementado em 2026-08-31** (`apps/api/app/modules/experiments/analysis.py`, RN-013) — cada variante comparada contra a Controle, nível de confiança de 95%, biblioteca padrão do Python (`statistics.NormalDist`, sem dependência nova). O que **continua** fora de escopo, documentado deliberadamente:
  - **Teste omnibus (qui-quadrado)** para experimentos com 3+ variantes — hoje são N-1 comparações par-a-par contra a Controle, sem correção para múltiplas comparações (ex.: Bonferroni). Um omnibus exigiria a função gama incompleta regularizada, que a biblioteca padrão não oferece pronta.
  - **Sequential testing / correção para "peeking"** (olhar o resultado repetidamente antes do fim planejado do experimento infla falso positivo) — o `note` da resposta avisa sobre isso textualmente, mas o sistema não impede nem corrige matematicamente.
  - Poder estatístico / cálculo de tamanho de amostra necessário antes do experimento começar (só o piso arbitrário de 30 por variante existe hoje).

## Machine Learning

- Detecção de tendência via ML, previsão e rotinas de ML são mencionadas como uso futuro do Python/pipeline de dados, não como entrega do MVP.

## Data Warehouse e pipelines complexos

- BigQuery (ou outro DW), dbt, filas, workers e processamento assíncrono ficam para quando houver necessidade real (ver seção 28 — evitar overengineering).

## Outros

- Emissão de documentos fiscais/contábeis.
- App mobile nativo.
- ~~Múltiplos idiomas (i18n) — o MVP é em português, salvo indicação contrária.~~ Implementado em 2026-09-01 (pt-BR/en/es, ver `docs/i18n/`) — essa indicação contrária. Continuam só em português, deliberadamente (ver `docs/i18n/README.md`): mensagens de erro vindas do backend, e-mails transacionais, formatação de número/data/moeda (nunca segue o idioma da UI), e o catálogo de definições de métricas do Glossário (nome/descrição/fórmula/exemplo de cada indicador).
- Deploy pago/produção gerenciada — fora da autonomia autorizada nesta fase (seção 27 do prompt mestre).
- Escolha de licença jurídica do repositório — depende de indicação explícita do usuário.
