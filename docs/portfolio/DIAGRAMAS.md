# Diagramas — Lucratix

> Somente componentes que **existem no código** (verificados em 2026-09-18). Onde algo é opcional ou não verificado em produção, o diagrama diz. Mermaid renderiza no GitHub e na maioria dos visualizadores de Markdown.
> Diagramas de sequência adicionais (autenticação/onboarding, entrada de dados, cálculo de métricas, autorização multi-tenant, experimentos) já existem em [`docs/diagrams/`](../diagrams/).

## 1. Arquitetura geral

```mermaid
flowchart LR
    U[Navegador] --> W["Next.js 16<br/>App Router · i18n<br/>apps/web"]
    W -- "/api/* reescrito<br/>(cookie same-origin)" --> A["FastAPI<br/>monólito modular · 20 módulos<br/>apps/api"]
    A --> DB[("PostgreSQL 16<br/>21 tabelas · 19 migrations")]
    A -. "logotipo (opcional)" .-> C[Cloudinary]
    A -. "e-mail (opcional)" .-> R[Resend]
    BI["Power BI / Looker Studio<br/>(PROPOSTO — sem conector)"] -. "chave de API, somente leitura" .-> A
```

Deploy: há Dockerfiles e `docker-compose.yml` para os três serviços; a documentação cita Vercel (web) e Railway (API). **Ambiente de produção não verificado.**

## 2. Fluxo de dados

```mermaid
flowchart TD
    M["Entrada manual<br/>(formulários)"] --> REPO
    I["Importação<br/>CSV · XLSX · JSON"] --> REPO
    REPO["Repositório<br/>grava sempre com organization_id"] --> SVC["Camada de serviço<br/>agrega por período/canal"]
    SVC --> ENG["metrics/engine.py<br/>funções puras"]
    ENG -- "MetricResult<br/>{value, is_applicable, reason}" --> API["API JSON"]
    API --> UI["Telas e gráficos"]
    API --> PDF["Relatórios PDF<br/>ReportLab, server-side"]
```

Granularidade **mensal** (`period` = dia 1) para financeiro, funil e metas.

## 3. Multi-tenancy e autorização

Cadeia real de checagens de uma requisição a um recurso de empresa (`apps/api/app/core/deps.py`):

```mermaid
sequenceDiagram
    participant C as Cliente
    participant D as deps.py
    participant DB as PostgreSQL
    C->>D: requisição (cookie de sessão)
    D->>DB: valida token + sessão (claim sid)
    alt sessão inválida ou revogada
        D-->>C: 401
    end
    D->>DB: empresa e membership do usuário
    alt não é membro (ou empresa inexistente)
        D-->>C: 404 (não revela existência)
    end
    alt método de escrita e empresa congelada
        D-->>C: 409
    end
    alt papel abaixo do mínimo da rota
        D-->>C: 403
    end
    D-->>C: contexto (usuário, empresa, papel) → executa a rota
```

## 4. Autenticação e sessão única

```mermaid
sequenceDiagram
    participant U as Usuário (dispositivo B)
    participant API as FastAPI
    participant DB as PostgreSQL
    U->>API: POST /auth/login
    API->>DB: verifica senha (Argon2) + rate limit (IP, conta, combinado)
    API->>DB: revoga sessão ativa anterior e cria nova (índice único parcial)
    API-->>U: cookies HttpOnly: access (15 min) + refresh (7 dias), ambos com sid
    Note over API,DB: dispositivo A, na próxima requisição, recebe 401 "sessão encerrada"
```

## 5. Importação de dados

```mermaid
flowchart LR
    UP["Upload<br/>até 5 MB · 2000 linhas"] --> PARSE["Parse único<br/>linhas cruas em JSONB"]
    PARSE --> SHEET{"XLSX?"}
    SHEET -- sim --> PICK[Seleção de aba]
    SHEET -- não --> MAP
    PICK --> MAP["Mapeamento de colunas<br/>(aliases em português)"]
    MAP --> PREV["Preview e validação<br/>por linha"]
    PREV --> CONF{"Confirmar"}
    CONF -- "duplicado: pular ou atualizar" --> WRITE["Grava no domínio<br/>Financeiro · Funil · Produtos · Marketing"]
```

Síncrono, sem fila e sem armazenamento do arquivo original.

## 6. Analytics e comparações

```mermaid
flowchart TD
    D1[Financeiro do mês] --> K
    D2[Funil do mês] --> K
    D3[Campanhas] --> K
    K["engine.py<br/>7 KPIs executivos · 7 de marketing · funil"] --> CMP
    B[Baseline] --> CMP["Comparações<br/>período × período anterior<br/>período × baseline (4 métricas)"]
    T[Metas mensais] --> PROG[Progresso de metas]
    K --> COR["Correlação de Pearson<br/>entre 2 KPIs · ≥ 3 meses"]
```

## 7. Relatórios

```mermaid
flowchart LR
    R1["GET /reports/basic/pdf"] --> RL
    R2["GET /reports/executive/pdf"] --> RL
    R3["GET /reports/funnel/pdf"] --> RL
    RL["pdf_builder<br/>ReportLab (wheel puro)"] --> OUT["PDF com rodapé de<br/>confidencialidade da empresa"]
    R1 & R2 & R3 --> AUD["evento de auditoria<br/>report.*.downloaded"]
```
