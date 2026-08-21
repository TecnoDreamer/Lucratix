# Casos de Uso — Núcleo (Autenticação, Administração, Empresa, Usuários, Produtos, Financeiro, Campanhas)

> Notação: diagrama de casos de uso aproximado com Mermaid `flowchart` (Mermaid não tem notação UML de caso de uso nativa). Atores como nós de losango/retângulo arredondado, casos de uso como retângulos.

```mermaid
flowchart LR
    subgraph Atores
        Visitor(("Visitante"))
        Analyst(("Analyst"))
        OrgAdmin(("Organization Admin/Owner"))
        PlatformAdmin(("Platform Admin"))
    end

    Visitor --> UC1["Cadastrar-se"]
    Visitor --> UC2["Login"]
    Analyst --> UC2
    OrgAdmin --> UC2
    Analyst --> UC3["Logout"]
    Analyst --> UC4["Recuperar senha"]

    OrgAdmin --> UC5["Cadastrar empresa"]
    OrgAdmin --> UC6["Editar empresa"]
    Analyst --> UC7["Selecionar/trocar empresa ativa"]
    OrgAdmin --> UC8["Convidar usuário"]
    OrgAdmin --> UC9["Gerenciar papéis (RBAC)"]
    PlatformAdmin --> UC9

    Analyst --> UC10["Cadastrar produto/serviço"]
    Analyst --> UC11["Editar/inativar produto"]

    Analyst --> UC12["Registrar dados financeiros do período"]

    Analyst --> UC13["Cadastrar canal de marketing"]
    Analyst --> UC14["Cadastrar/editar campanha"]
```

Casos de uso relacionados a RF-001 a RF-019 — ver [functional-requirements.md](../../requirements/functional-requirements.md).
