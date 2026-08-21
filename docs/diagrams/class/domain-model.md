# Diagrama de Classes — Modelo de Domínio

```mermaid
classDiagram
    class User {
        +UUID id
        +string email
        +string password_hash
        +string name
        +string status
        +datetime created_at
    }
    class Organization {
        +UUID id
        +string name
        +string trade_name
        +string segment
        +string cnpj
        +string currency
        +string timezone
        +date tracking_start_date
        +datetime created_at
    }
    class Membership {
        +UUID id
        +UUID user_id
        +UUID organization_id
        +string role
        +string status
        +datetime created_at
    }
    class Baseline {
        +UUID id
        +UUID organization_id
        +decimal revenue
        +decimal profit
        +decimal margin
        +decimal cac
        +decimal conversion_rate
        +UUID created_by
        +datetime created_at
    }
    class Product {
        +UUID id
        +UUID organization_id
        +string name
        +string category
        +decimal price
        +decimal cost
        +bool active
    }
    class FinancialPeriod {
        +UUID id
        +UUID organization_id
        +date period
        +decimal revenue
        +decimal costs
        +decimal expenses
        +decimal marketing_investment
        +decimal taxes
    }
    class MarketingChannel {
        +UUID id
        +UUID organization_id
        +string name
        +string type
    }
    class Campaign {
        +UUID id
        +UUID organization_id
        +UUID channel_id
        +string name
        +date start_date
        +date end_date
        +decimal investment
        +int impressions
        +int clicks
        +int leads
        +int opportunities
        +int customers
        +decimal attributed_revenue
    }
    class FunnelSnapshot {
        +UUID id
        +UUID organization_id
        +date period
        +int impressions
        +int visits
        +int leads
        +int mqls
        +int sqls
        +int opportunities
        +int customers
        +int repeat_purchases
    }
    class MetricDefinition {
        +UUID id
        +string key
        +string name
        +string formula
        +string unit
        +int version
    }
    class MetricSnapshot {
        +UUID id
        +UUID organization_id
        +UUID metric_definition_id
        +date period
        +decimal value
        +bool is_applicable
        +datetime calculated_at
    }
    class Experiment {
        +UUID id
        +UUID organization_id
        +string hypothesis
        +string page_or_process
        +string primary_metric
        +date start_date
        +date end_date
        +string status
    }
    class ExperimentVariant {
        +UUID id
        +UUID experiment_id
        +string name
        +int sample_size
        +int conversions
    }
    class AuditLog {
        +UUID id
        +UUID organization_id
        +UUID user_id
        +string action
        +string entity
        +UUID entity_id
        +datetime created_at
    }

    User "1" --> "0..*" Membership
    Organization "1" --> "0..*" Membership
    Organization "1" --> "0..*" Baseline
    Organization "1" --> "0..*" Product
    Organization "1" --> "0..*" FinancialPeriod
    Organization "1" --> "0..*" MarketingChannel
    Organization "1" --> "0..*" Campaign
    Organization "1" --> "0..*" FunnelSnapshot
    Organization "1" --> "0..*" MetricSnapshot
    Organization "1" --> "0..*" Experiment
    Organization "1" --> "0..*" AuditLog
    MarketingChannel "1" --> "0..*" Campaign
    MetricDefinition "1" --> "0..*" MetricSnapshot
    Experiment "1" --> "2..*" ExperimentVariant
```

> Diagrama simplificado para o MVP — não representa `integrations`, que ainda não tem modelo de dados detalhado (ver [out-of-scope.md](../../product/out-of-scope.md)).
