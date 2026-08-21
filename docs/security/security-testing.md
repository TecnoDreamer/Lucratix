# Estratégia de Testes de Segurança

## Ferramentas (ver [code-quality/CI](../../.github/workflows))

| Ferramenta | Tipo | Quando roda |
|---|---|---|
| Bandit | SAST (Python) | `security-ci`, a cada PR |
| pip-audit | Dependência (Python) | `security-ci`, a cada PR |
| `npm audit` | Dependência (Node) | `frontend-ci`, a cada PR |
| Testes de integração dedicados (`tests/security/`) | Autorização/isolamento | `backend-ci`, a cada PR |

## Casos de teste obrigatórios (mínimo, MVP)

1. Usuário da Organização A não lê recurso da Organização B via API, mesmo manipulando o ID diretamente na URL/body (IDOR/BOLA).
2. Usuário com papel `VIEWER` não consegue executar operação de escrita (`POST`/`PUT`/`PATCH`/`DELETE`) em nenhum recurso de organização.
3. Usuário com papel `ANALYST` não consegue promover a si mesmo ou outro usuário a `ORGANIZATION_OWNER`.
4. Login com credenciais inválidas retorna mensagem genérica, não diferenciando "e-mail não existe" de "senha incorreta".
5. Requisição sem cookie/token de sessão a rota autenticada retorna 401.
6. Cookie de sessão emitido possui as flags `HttpOnly` e `SameSite` (e `Secure` quando `ENV=production`).
7. Payload malformado ou com tipo inválido retorna 422 com mensagem de validação, não um erro 500.
8. Requisição de origem não permitida é rejeitada por CORS.
9. Nenhuma senha, token ou cookie aparece em log de aplicação (verificação manual em code review + grep automatizado quando possível).

## Quando rodar

Os casos 1–5 são obrigatórios (Definition of Done) para qualquer PR que introduza ou altere uma rota que leia/escreva dado de organização. Os demais são obrigatórios a partir da Fase 6 (Autenticação) e Fase 7 (Multi-tenancy).
