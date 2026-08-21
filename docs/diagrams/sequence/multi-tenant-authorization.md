# Sequência — Autorização Multi-tenant (fluxo mais crítico do produto)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant W as Next.js
    participant A as FastAPI (router)
    participant Auth as Auth Dependency
    participant Repo as Repository
    participant DB as PostgreSQL

    U->>W: Requisita recurso da Organização X (ex.: GET /api/v1/organizations/X/financials)
    W->>A: HTTP GET (cookie de sessão)
    A->>Auth: Valida token, extrai user_id
    Auth->>DB: Busca memberships ativas do user_id
    DB-->>Auth: Lista de organization_id + role
    alt organization_id X não está na lista de memberships do usuário
        Auth-->>A: 403 Forbidden
        A-->>W: 403 Forbidden
        W-->>U: Acesso negado
    else organization_id X está na lista, com role suficiente
        Auth-->>A: contexto autorizado (user_id, organization_id=X, role)
        A->>Repo: get_financials(organization_id=X, ...)
        Repo->>DB: SELECT ... WHERE organization_id = X
        DB-->>Repo: linhas
        Repo-->>A: dados
        A-->>W: 200 OK + dados
        W-->>U: Exibe dados
    end
```

Este fluxo é validado por teste de integração automatizado (RNF-002, Fase 7) que garante explicitamente que o ramo `alt` (negação) ocorre quando um usuário tenta acessar organização à qual não pertence.
