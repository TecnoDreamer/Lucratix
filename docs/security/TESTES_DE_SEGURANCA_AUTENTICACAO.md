# Testes de segurança de autenticação

Fechamento do épico de hardening de autenticação (PR1-PR4, 2026-09): mapa seção-a-seção do prompt mestre de hardening (`prompt_claude_code_defesa_brute_force_autenticacao.md`, seções 22-25) contra o que de fato existe de teste hoje, com o arquivo/caso que cobre cada item e o racional de todo item marcado como não aplicável ou deferido. Serve também como o "relatório de testes executados" pedido pela seção 33 do prompt.

Este projeto **não tem OTP/código numérico** em nenhum fluxo (recuperação de senha e verificação de e-mail usam token opaco de alta entropia por link, não código de 6 dígitos) — todo item das seções 22-25 sobre OTP está marcado N/A abaixo, não ignorado por omissão.

## Seção 22 — Testes unitários

| Item pedido | Cobertura |
|---|---|
| Limite por IP | `tests/unit/test_rate_limit.py` (primitivo) + `tests/security/test_rate_limiting.py` (por endpoint) |
| Limite por conta | idem |
| Limite combinado (IP+conta) | idem — `login_rate_limiter`, chave `IP:e-mail` |
| Expiração da janela | `test_allows_again_after_window_expires` (`tests/unit/test_rate_limit.py`) |
| Backoff/cooldown | Não há máquina de backoff exponencial (decisão documentada em [RATE_LIMITING.md](RATE_LIMITING.md#backoff-progressivo)) — a combinação de janela curta+apertada e janela longa+larga por conta produz o efeito equivalente; testada implicitamente pelos testes de limite por conta com janela de 300-900s |
| Normalização do identificador | **Auditado, não implementado** — [RATE_LIMITING.md](RATE_LIMITING.md#risco-residual-auditado-normalização-de-identificador-2026-09-pr4) explica por quê, com teste provando a não-exploração (`test_login_with_different_email_casing_never_matches_the_real_account`) |
| OTP válido/inválido/expirado | N/A — sem OTP neste sistema |
| Excesso de OTP | N/A |
| Reenvio | `test_resend_verification_*` (`tests/api/test_email_verification.py`) — equivalente do sistema pra "reenvio" é o reenvio de verificação de e-mail, coberto |
| Single-use | `test_confirm_reset_changes_password_and_token_is_single_use` (`tests/api/test_password_reset.py`), `test_verify_email_token_is_single_use` (`tests/api/test_email_verification.py`) |
| Reset de contador quando apropriado | O `RateLimiter` conta tentativas (sucesso ou falha) dentro da janela, por desenho — não reseta em sucesso, o que é intencional: um login bem-sucedido não deveria "limpar" o histórico de tentativas erradas anteriores dentro da mesma janela curta (isso enfraqueceria a defesa contra um atacante que acerta por sorte no meio de uma sequência). `reset()`/`clear_all()` existem como operação administrativa/de teste, não automática (`tests/unit/test_rate_limit.py`) |

## Seção 23 — Testes de integração/API

| Item pedido | Cobertura |
|---|---|
| Repetição é limitada | Todos os testes de `tests/security/test_rate_limiting.py` |
| Trocar navegador não contorna proteção da conta | `test_switching_device_does_not_reset_account_rate_limit` (novo, PR4) |
| Uma conta não bloqueia outra indevidamente | `test_keys_are_independent` (`tests/unit/test_rate_limit.py`) + `test_password_spraying_from_one_ip_against_many_accounts_is_blocked` (contas diferentes, o IP trava, não a conta de terceiros) |
| OTP não aceita tentativas ilimitadas | N/A |
| Reenvio é limitado | `test_resend_verification_is_rate_limited` (`tests/api/test_email_verification.py`) |
| Token expirado falha | `test_confirm_reset_with_expired_token_is_rejected` (`tests/api/test_password_reset.py`), `test_verify_email_with_expired_token_is_rejected` (`tests/api/test_email_verification.py`) — envelhecem o `expires_at` do token direto no banco (a API roda fora do processo de teste, então não dá pra mockar o relógio dela) e confirmam a rejeição |
| Token reutilizado falha | `test_confirm_reset_changes_password_and_token_is_single_use`, `test_verify_email_token_is_single_use` |
| Reset invalida o necessário | `test_confirm_reset_revokes_any_active_session` (`tests/api/test_password_reset.py`) — reset revoga a sessão ativa da conta |
| Manipular tenant não vaza dados | Fora do escopo de autenticação em si (é RBAC/multi-tenancy) — coberto por `tests/security/test_export_security.py`, `test_import_security.py` e os testes de isolamento multi-tenant já existentes no projeto |

## Seção 24 — Testes de bypass

| Item pedido | Cobertura |
|---|---|
| Casing diferente de e-mail | `test_login_with_different_email_casing_never_matches_the_real_account` (novo, PR4) |
| Espaços/normalização | `test_email_with_surrounding_whitespace_is_normalized_by_pydantic_before_reaching_the_route` (novo, PR4) |
| Encoding | `test_password_with_unicode_characters_hashes_and_authenticates_correctly` (novo, PR4) |
| Headers manipulados | Ver "X-Forwarded-For falso" abaixo — é o header sensível relevante neste sistema (não há outro header usado por autenticação/rate limiting) |
| X-Forwarded-For falso | `test_forged_forwarded_for_is_ignored_when_no_trusted_proxy_configured` (unidade) + `test_forged_x_forwarded_for_does_not_bypass_login_rate_limit_over_http` (novo, PR4 — ponta a ponta via HTTP real) |
| Endpoints equivalentes | Auditado (sem código de teste automatizado — é uma auditoria de inventário, não um comportamento testável em isolamento): nenhuma rota duplicada/alias fora do rate limiting, ver [RATE_LIMITING.md](RATE_LIMITING.md#outros-itens-de-bypass-auditados-2026-09-pr4) |
| IPv4/IPv6 | `test_ipv6_socket_address_is_used_as_is` (novo, PR4) |
| Requisições concorrentes | `test_concurrent_checks_on_same_key_never_allow_more_than_max_attempts` (`tests/unit/test_rate_limit.py`) |
| Múltiplas instâncias | N/A por design atual — produção roda uma única instância (confirmado com o usuário), documentado com gatilho explícito para revisitar em [RATE_LIMITING.md](RATE_LIMITING.md#por-que-ainda-em-memória-não-redis) |

## Seção 25 — E2E

| Item pedido | Cobertura |
|---|---|
| Login válido → sucesso | `tests/e2e/auth.spec.ts` |
| Falhas repetidas → proteção → mensagem adequada → cooldown → recuperação esperada | `tests/e2e/login_rate_limit.spec.ts` (novo, PR4) |
| Forgot password → token → tentativas inválidas → limite → fluxo válido → nova senha forte → token não reutilizável → login com nova senha | `tests/e2e/password_reset.spec.ts` — cobre o fluxo completo ponta a ponta; "tentativas inválidas → limite" não se aplica da mesma forma que um código OTP (é um link, não um código a redigitar), então o E2E foca no fluxo válido completo + a senha antiga deixar de funcionar (prova indireta de que o reset — e portanto o token — foi consumido); o *limite de tentativas de request* de reset já é testado a nível de API (`test_password_reset_request_is_rate_limited_after_too_many_attempts`) |

## Resumo do que esta PR adicionou

Backend (`tests/security/test_rate_limiting.py`, `tests/unit/test_client_ip.py`, `tests/api/test_password_reset.py`, `tests/api/test_email_verification.py`): `test_forged_x_forwarded_for_does_not_bypass_login_rate_limit_over_http`, `test_switching_device_does_not_reset_account_rate_limit`, `test_login_with_different_email_casing_never_matches_the_real_account`, `test_email_with_surrounding_whitespace_is_normalized_by_pydantic_before_reaching_the_route`, `test_password_with_unicode_characters_hashes_and_authenticates_correctly`, `test_ipv6_socket_address_is_used_as_is`, `test_confirm_reset_with_expired_token_is_rejected`, `test_verify_email_with_expired_token_is_rejected`.

E2E (`tests/e2e/login_rate_limit.spec.ts`, novo arquivo): fluxo abusivo de login completo.

Nenhuma mudança de código de produção — todos os comportamentos testados já existiam desde as PRs 1-3; esta rodada fechou lacunas de cobertura de teste e de documentação, não de implementação.
