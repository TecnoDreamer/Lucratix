# Fora de Escopo (MVP)

Estes itens são reconhecidos como valiosos, mas **não fazem parte do MVP**. Ficam documentados aqui para não serem esquecidos e para evitar scope creep durante a implementação.

## Integrações automáticas

- Google Analytics 4, Google Ads, Meta Ads, Instagram/Facebook, CRMs, ERPs, plataformas de e-commerce, bancos de dados externos, planilhas, APIs de terceiros, webhooks.
- No MVP, os dados são **inseridos manualmente**. A arquitetura deve permitir integrações futuras (módulo `integrations`, entidades `integration_accounts` e `integration_sync_runs` já previstas no modelo de dados), mas nenhuma integração real será construída agora (Fase 17, após o modelo manual estar validado).

## Modelo de atribuição avançado

- First touch, last touch, linear, position based e data-driven attribution não serão implementados no MVP. Apenas documentação inicial sobre os modelos (ver seção 11 do prompt mestre) e um modelo de dados que não impeça a implementação futura.

## Análise estatística avançada de experimentos

- Testes de significância estatística formal para CRO/A-B testing ficam preparados na arquitetura, mas o motor de cálculo estatístico completo não é obrigatório no MVP — o importante é **não declarar vencedor prematuramente**.

## Machine Learning

- Detecção de tendência via ML, previsão e rotinas de ML são mencionadas como uso futuro do Python/pipeline de dados, não como entrega do MVP.

## Data Warehouse e pipelines complexos

- BigQuery (ou outro DW), dbt, filas, workers e processamento assíncrono ficam para quando houver necessidade real (ver seção 28 — evitar overengineering).

## Outros

- Emissão de documentos fiscais/contábeis.
- App mobile nativo.
- Múltiplos idiomas (i18n) — o MVP é em português, salvo indicação contrária.
- Deploy pago/produção gerenciada — fora da autonomia autorizada nesta fase (seção 27 do prompt mestre).
- Escolha de licença jurídica do repositório — depende de indicação explícita do usuário.
