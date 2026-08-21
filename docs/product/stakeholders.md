# Stakeholders

| Stakeholder | Interesse principal | Nível de envolvimento |
|---|---|---|
| Usuário/dono do produto (product owner de fato) | Definir prioridades, aprovar escopo, revisar entregas | Alto — decide roadmap e aprova merges/PRs |
| Consultoria (empresa que usará a plataforma) | Provar resultado aos próprios clientes | Alto — é o usuário primário do MVP |
| Cliente final da consultoria | Entender se o investimento em marketing vale a pena | Baixo/médio no MVP (acesso `VIEWER` futuro) |
| Mantenedor técnico (Claude Code, atuando como arquiteto/dev/QA/DevSecOps) | Entregar incrementalmente com qualidade, segurança e rastreabilidade | Alto — execução |
| Futuras integrações (GA4, Google Ads, Meta Ads, CRMs, ERPs) | Fontes de dados externas | Nenhum no MVP; arquitetura deve prever |

## Papéis de decisão

- **Decisão de escopo e prioridade:** usuário (dono do produto).
- **Decisão técnica de arquitetura:** mantenedor técnico, documentada via ADR (ver [docs/adr](../adr)), com trade-offs explicados.
- **Decisão de segurança/LGPD:** segue os requisitos obrigatórios do prompt mestre (seção 5); qualquer exceção deve ser explicitamente aprovada pelo usuário.
