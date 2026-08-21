# Contribuindo

## Fluxo de trabalho

1. Nunca desenvolver diretamente em `main`.
2. Criar branch a partir de `main`, seguindo o padrão: `docs/<assunto>`, `feat/<feature>`, `fix/<bug>`, `test/<escopo>`, `refactor/<escopo>`, `chore/<escopo>`, `security/<escopo>`.
3. Implementar apenas o escopo da issue.
4. Escrever e rodar testes.
5. Rodar lint, formatter, type checking e verificação de segurança antes de abrir PR.
6. Commit seguindo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`, `perf:`, `security:`).
7. Abrir Pull Request preenchendo o [template](.github/pull_request_template.md).
8. Merge apenas após todos os checks obrigatórios passarem — nunca ignorar proteção de branch ou pular checks.

## Definition of Ready (para uma issue entrar em implementação)

Ver [docs/product/mvp.md](docs/product/mvp.md) e [traceability-matrix.md](docs/requirements/traceability-matrix.md). Uma issue precisa ter: problema, objetivo, escopo, fora de escopo, critérios de aceite, dependências, impacto em segurança, impacto em banco, impacto em testes.

## Definition of Done

- Critérios de aceite atendidos.
- Testes unitários (e de integração/API/E2E quando aplicável).
- Lint, type checking e verificação de segurança passando.
- Documentação atualizada.
- Migrations testadas (quando aplicável).
- CI verde e PR revisado antes do merge.

## Padrões de qualidade

Ver [docs/architecture/overview.md](docs/architecture/overview.md) para a organização de módulos e [docs/security/](docs/security/) para requisitos de segurança obrigatórios.
