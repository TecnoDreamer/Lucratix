# Casos de Uso — Funil, Métricas, Experimentos, Dashboard, Relatórios, Auditoria, Integrações

```mermaid
flowchart LR
    subgraph Atores
        Analyst(("Analyst"))
        Viewer(("Viewer"))
        OrgAdmin(("Organization Admin/Owner"))
        PlatformAdmin(("Platform Admin"))
    end

    Analyst --> UC15["Registrar snapshot de funil"]

    Analyst --> UC16["Consultar métricas calculadas"]
    Viewer --> UC16
    OrgAdmin --> UC16

    Analyst --> UC17["Comparar períodos (antes x depois)"]
    Viewer --> UC17
    OrgAdmin --> UC17

    Viewer --> UC18["Visualizar dashboard executivo"]
    Analyst --> UC18
    OrgAdmin --> UC18

    Analyst --> UC19["Criar experimento CRO"]
    Analyst --> UC20["Registrar resultado de experimento"]

    Analyst --> UC21["Gerar relatório básico"]
    OrgAdmin --> UC21

    OrgAdmin --> UC22["Consultar trilha de auditoria"]
    PlatformAdmin --> UC22

    PlatformAdmin -.->|"futuro, não MVP"| UC23["Configurar integração externa (GA4/Ads)"]
```

Casos de uso relacionados a RF-020 a RF-027 — ver [functional-requirements.md](../../requirements/functional-requirements.md). UC23 é ilustrativo de arquitetura futura ([integrations](../../product/out-of-scope.md)), não implementado no MVP.
