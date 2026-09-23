# Sequência — Execução de Experimento e Importação de Dados (futuro)

## Execução de experimento (registro de resultado)

> **Nota (L-08, 2026-09-23):** o diagrama abaixo é o desenho original de projeto e não reflete as rotas reais. Na implementação, registrar resultado e encerrar são duas chamadas separadas: `PATCH /api/v1/organizations/{org}/experiments/{id}/variants/{variant_id}` (amostra/conversões de uma variante) e `PATCH /api/v1/organizations/{org}/experiments/{id}/status` (avança `draft → running → finished`, sem voltar atrás; `409` em qualquer outra transição). A análise de significância é `GET .../experiments/{id}/result`, calculada sob demanda — não há um "service" que a dispare no encerramento.

```mermaid
sequenceDiagram
    actor A as Analyst
    participant W as Next.js
    participant API as FastAPI /experiments
    participant Svc as ExperimentsService
    participant DB as PostgreSQL

    A->>W: Informa conversões por variante e encerra experimento
    W->>API: PATCH /api/v1/experiments/{id}/finish
    API->>Svc: finish_experiment(id, variant_results)
    Svc->>DB: UPDATE experiment_variants (sample_size, conversions)
    Svc->>Svc: Calcula diferença bruta entre variantes
    Svc->>Svc: Verifica critério mínimo de amostra (RN-013)
    alt amostra insuficiente para declarar resultado
        Svc-->>API: resultado com flag "sem significância suficiente", sem "vencedor"
    else amostra suficiente (critério documentado)
        Svc-->>API: resultado com variante de maior conversão indicada, ainda sem termo "vencedor" automático no MVP
    end
    API-->>W: 200 + resultado
    W-->>A: Exibe resultado com a devida qualificação
```

## Importação de dados (arquitetura futura — Fase 17, não implementada no MVP)

```mermaid
sequenceDiagram
    actor Admin as Platform Admin
    participant API as FastAPI /integrations
    participant Ext as Fonte externa (ex.: GA4)
    participant DB as PostgreSQL

    Note over API,Ext: Fluxo ilustrativo de arquitetura, fora do escopo do MVP
    Admin->>API: Configura integration_account (credenciais)
    API->>Ext: Autoriza (OAuth) — nunca com senha em texto plano
    API->>Ext: Solicita dados do período
    Ext-->>API: Dados brutos
    API->>DB: INSERT integration_sync_runs (status, período, origem)
    API->>DB: Persiste dados normalizados nas tabelas de domínio (com origem/fonte registrada)
```
