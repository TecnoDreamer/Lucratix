# Organizações — Busca/Paginação, Ciclo de Vida, Logotipo

Documenta a evolução de "Suas empresas" e da gestão de organizações introduzida em 2026-09-01 (PR 2 do
prompt mestre "Workspace, Configurações, Gestão de Empresas e i18n").

- [BUSCA_PAGINACAO.md](BUSCA_PAGINACAO.md) — "Suas empresas" escalável (busca + paginação server-side).
- [CICLO_DE_VIDA.md](CICLO_DE_VIDA.md) — congelar/reativar uma empresa-cliente, sem nunca apagar histórico.
- [LOGOTIPO.md](LOGOTIPO.md) — upload de logotipo por empresa (Cloudinary).

## Escopo desta rodada (PR 2)

Implementado: `GET /organizations` com `search`/`status`/`limit`/`offset`; `status` (`active`/`frozen`) +
`freeze`/`reactivate`; upload/remoção de logotipo; nova tela `organizations/[id]/configuracoes` (dados
cadastrais, ciclo de vida, logotipo — não existia nenhuma tela de edição de empresa antes desta PR).

**Fora de escopo desta rodada** (roadmap do prompt mestre, vira PR própria): internacionalização
pt-BR/en/es.

Ver também [ADR-0008](../adr/0008-organizacoes-nunca-deletar.md) (decisão de nunca apagar uma
organização) e [ACCESS_CONTROL.md](../security/ACCESS_CONTROL.md) (exceção do Super Admin no upload de
logo).
