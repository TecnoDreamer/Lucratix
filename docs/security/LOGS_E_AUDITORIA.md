# Logs e auditoria

Registro dos eventos de auditoria relacionados a autenticação/segurança — o que existe, o que foi adicionado na auditoria de hardening (2026-09), e o que nunca é logado. Complementa [`AUTHENTICATION.md`](AUTHENTICATION.md) e [`RATE_LIMITING.md`](RATE_LIMITING.md).

## Mecanismo

`record_audit()` (`apps/api/app/core/audit.py`) grava em `AuditLog` (append-only por design, RN-015 — nenhum repository/router deste projeto expõe `UPDATE`/`DELETE` para esta tabela). Convenção de nomenclatura do projeto: `action` é uma string `entidade.verbo` (minúsculo, ponto), não `SCREAMING_CASE` — os eventos abaixo seguem essa convenção já estabelecida, mesmo quando o vocabulário de segurança usual (OWASP, etc.) sugeriria outra forma; são os mesmos eventos, só a grafia já em uso no código.

## Eventos relacionados a autenticação/conta

| `action` | `entity` | Quando | Desde |
|---|---|---|---|
| `user.login` | `user` | Login bem-sucedido | Antes desta rodada |
| `user.login_failed` | `user` | Credenciais inválidas (sem `entity_id`/PII — o volume já é o sinal útil pra detectar abuso, RN-012 se aplica também ao audit trail) | Auditoria 2026-09 |
| `user.logout` | `user` | Logout (sessão revogada no servidor) | Auditoria 2026-09 |
| `user.password_changed` | `user` | `/auth/change-password` bem-sucedido | Antes desta rodada |
| `auth.rate_limited.<endpoint>` | `rate_limit` | Qualquer uma das 3 dimensões de rate limit estourou em `<endpoint>` (`login`, `register`, `refresh`, `password_reset_request`, `password_reset_confirm`, `resend_verification`, `verify_email`, `change_password`, `membership_invite`, `platform_user_create`) — sem `entity_id`/PII, o evento é o bloqueio em si | Auditoria 2026-09 |
| `membership.invited` / `membership.invited_new_account` | `membership` | Convite de membro (RF-012) | Antes desta rodada |
| `membership.granted_by_platform_admin` | `membership` | Mesmo fluxo, via painel de Super Admin | Antes desta rodada |
| `user.created_by_platform_admin` | `user` | Criação administrativa de conta | Antes desta rodada |
| `user.password_reset_completed` | `user` | `/auth/password-reset/confirm` bem-sucedido | PR2 (recuperação de senha) |
| `user.email_verified` | `user` | `/auth/verify-email` bem-sucedido | PR2 (recuperação de senha) |

`confirm_password_reset`/`confirm_email_verification` (`apps/api/app/modules/auth/service.py`) passaram a devolver o `User` resolvido (antes, só `bool`) — é o que permite o router auditar com `entity_id`/`user_id` corretos.

## Sessão como complemento (não substituto) da auditoria

`sessions.ip_address`/`user_agent` (migration `0017_session_metadata`) não são eventos de `AuditLog` — são metadado da própria sessão, gravado uma vez na criação (login). Útil pra correlacionar numa investigação: "este evento `user.login_failed` de tal horário" + "esta sessão ativa, criada logo depois, deste IP/user-agent" contam uma história mais completa que os eventos de auditoria sozinhos (que não guardam IP nenhum hoje). Consulta direta ao banco, sem endpoint/tela dedicada.

## O que nunca é logado

Nunca aparece em `AuditLog`, em nenhum evento, sob nenhuma circunstância:

- Senha (nem em texto puro, nem hash) — em nenhum dos dois sentidos (definir ou verificar).
- Token de reset de senha, token de verificação de e-mail, access token, refresh token — nem o valor bruto, nem o hash.
- Cookie de sessão.
- Corpo completo de uma requisição de autenticação (só os campos estruturados que os eventos acima documentam).

Isso é garantido pela própria assinatura de `record_audit()` (`action`, `entity`, `entity_id: UUID | None`, `user_id: UUID | None`, `organization_id: UUID | None`) — não existe um parâmetro de "payload livre" onde algo sensível pudesse vazar por engano.

## Multi-tenancy e privacidade

Eventos de autenticação (`user.login`, `user.login_failed`, `user.logout`, `auth.rate_limited.*`) **não têm `organization_id`** — são eventos de nível de conta/plataforma, não de uma organização específica (um login não pertence a nenhuma empresa em particular). Isso significa que **não aparecem em nenhuma exportação de auditoria por organização** (`GET /exports/audit_logs`, que sempre filtra por `organization_id`, ver `docs/reports/PR4_INVENTARIO.md`) — só eventos com `organization_id` setado (convites, alterações de dado de negócio) aparecem lá. Um tenant nunca vê evento de autenticação de outro, pela simples razão de que nenhum tenant vê evento de autenticação de ninguém por essa via.

Eventos com `organization_id` (convites, criação administrativa vinculada a uma organização) continuam sujeitos ao mesmo isolamento de sempre — `GET /audit-logs` e `GET /exports/audit_logs` sempre filtram por `organization_id` da sessão, nunca de input do cliente.

## Testes

Os eventos de auditoria desta rodada são verificados indiretamente pelos testes de comportamento (`tests/security/test_rate_limiting.py`, `tests/api/test_auth_flow.py`) — o foco é o comportamento observável pela API (429, 401, cookies), não a leitura direta da tabela `audit_logs`. Se um teste dedicado a conteúdo de auditoria for necessário no futuro, seguir o padrão já usado em `tests/api/test_reports_basic_pdf.py`/`test_reports_executive_pdf.py` (consulta direta à tabela via `db_session` após a chamada HTTP).
