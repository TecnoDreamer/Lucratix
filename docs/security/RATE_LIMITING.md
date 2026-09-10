# Rate limiting

Arquitetura de defesa contra força bruta, credential stuffing e password spraying (auditoria de hardening, 2026-09). Complementa [`AUTHENTICATION.md`](AUTHENTICATION.md) (visão geral de sessão/tokens) e [`threat-model.md`](threat-model.md) (STRIDE). Implementação: `apps/api/app/core/rate_limit.py` (o primitivo) e `apps/api/app/core/client_ip.py` (resolução de IP).

## O achado que motivou esta rodada

Antes desta auditoria, login/reset/reenvio já tinham rate limiting — mas a chave usada era **sempre `IP:e-mail` combinada**. Isso não bloqueia os dois padrões de ataque mais comuns:

- **Password spraying**: 1-2 senhas comuns testadas contra muitas contas, do mesmo IP. Cada combinação `IP:e-mail` é nova — o limite combinado nunca esgota.
- **Credential stuffing distribuído**: uma conta atacada a partir de muitos IPs diferentes. Mesma razão, do outro lado.

Por isso, todo endpoint sensível agora verifica **3 dimensões independentes** (quando aplicável) — qualquer uma que estourar bloqueia a requisição:

1. **IP isolado** — agrega todas as tentativas de um IP, contra qualquer conta. Trava spraying.
2. **Conta isolada** — agrega todas as tentativas contra uma conta, de qualquer IP. Trava stuffing distribuído.
3. **IP+conta combinada** — a mais apertada; cobre o caso comum de um usuário legítimo errando a própria senha repetidamente, sem incomodar todo mundo que compartilha o IP dele.

`enforce_rate_limits()` (`app/core/rate_limit.py`) roda as três (quando as três se aplicam) e levanta `429` com `Retry-After` na primeira que falhar — sem revelar qual dimensão foi ("você usou N de M tentativas" ajudaria quem está atacando a calibrar o ataque).

## Limites por endpoint

| Endpoint | Combinada (IP+conta) | IP isolado | Conta isolada | Por quê |
|---|---|---|---|---|
| `POST /auth/login` | 10 / 60s | 30 / 60s | 10 / 300s | Já existia (combinada); IP/conta isolados fecham spray/stuffing. |
| `POST /auth/password-reset/request` | 5 / 300s | 15 / 300s | 5 / 900s | Dispara e-mail de verdade — sem as 3 dimensões, vira spam contra a caixa de entrada de qualquer conta. |
| `POST /auth/resend-verification` | 5 / 300s | 15 / 300s | 5 / 900s | Mesmo raciocínio de password-reset/request. |
| `POST /auth/register` | — | 100 / 300s | — | Sem "conta" antes de criar uma — só IP, contra criação em massa/automação. Ajustado de 10 para 100 depois que a própria suíte e2e (dezenas de cadastros em minutos, mesma API) foi bloqueada em CI — 10 era baixo demais até pra uso legítimo (evento de onboarding, escritório compartilhado). |
| `POST /auth/password-reset/confirm` | — | 20 / 300s | — | O token opaco (256 bits) já torna força bruta offline inviável — isto é defesa em profundidade contra um script chamando o endpoint em volume. |
| `POST /auth/verify-email` | — | 20 / 300s | — | Mesmo raciocínio de password-reset/confirm. |
| `POST /auth/change-password` | — | — | 10 / 300s | Usuário já autenticado (sessão única, RN-016) — o risco é uma sessão comprometida testando a senha atual; por conta, não por IP. |
| `POST /auth/refresh` | — | 60 / 60s | — | Chamado automaticamente por clientes legítimos com frequência; generoso de propósito, mas sem nenhum limite antes desta rodada. |
| `POST /organizations/{id}/memberships` (convite) | — | 20 / 300s (por IP+admin) | — | Já exige `ORGANIZATION_ADMIN`, mas sem limite contra convite em massa (ex.: sessão de admin comprometida). |
| `POST /platform/users` (criação administrativa) | — | 20 / 300s (por IP+Super Admin) | — | Mesmo raciocínio, papel de Super Admin. |
| Upload de logo (não é auth, mesmo módulo) | — | 10 / 300s (por usuário+org+IP) | — | Protege a cota gratuita do Cloudinary — sem relação com força bruta. |

Nenhum limite é lockout permanente — todos expiram sozinhos ao fim da janela. Nenhuma conta é desativada automaticamente por tentativas repetidas.

## Backoff progressivo

Não há uma máquina de estados de backoff exponencial — a combinação de uma janela curta e apertada (a combinada, ex. 10/60s) com uma janela mais longa e mais larga por conta (ex. 10/300s ou 5/900s) já produz o efeito de "throttle sustentado": um atacante que espera a janela curta liberar esbarra na janela longa antes de conseguir volume de verdade. Uma máquina de backoff exponencial de verdade (dobrar o cooldown a cada bloqueio) foi avaliada e descartada por ora — exigiria estado adicional por chave (o timestamp do último bloqueio) sem ganho claro sobre a janela dupla atual; revisitar se o volume de abuso observado em produção justificar.

## Resolução de IP confiável

`get_client_ip()` (`app/core/client_ip.py`) usa `request.client.host` por padrão — nunca confia cegamente em `X-Forwarded-For`, que é um header controlado pelo próprio cliente (um atacante podia mandar um IP diferente a cada tentativa pra tentar contornar o limite por IP).

Só passa a olhar `X-Forwarded-For` quando `TRUSTED_PROXY_COUNT` (env var, `Settings.trusted_proxy_count`, padrão `0`) for configurado explicitamente — nesse caso, pega o N-ésimo IP a partir da **direita** da lista (o hop mais próximo da API, inserido pelo proxy confiável), nunca o primeiro da esquerda.

**Hoje `TRUSTED_PROXY_COUNT=0`** — a API roda no Railway sem nenhum proxy/CDN próprio deste projeto na frente (confirmado por auditoria: nenhum Nginx/Cloudflare configurado no repo). `request.client.host` é a fonte correta. Se um proxy confiável for adicionado no futuro (ex.: Cloudflare na frente do Railway), configurar essa variável é suficiente — nenhum ponto de chamada (rate limiting, auditoria) precisa mudar.

## Por que ainda em memória, não Redis

`RateLimiter` (`app/core/rate_limit.py`) é uma janela deslizante em memória, thread-safe (`threading.Lock` — corrige uma corrida de dados real encontrada nesta auditoria: o servidor ASGI pode servir handlers síncronos em threads de um pool mesmo numa única instância). **Confirmado com o usuário**: produção roda hoje uma única instância no Railway, sem réplicas — nesse cenário, memória local é suficiente e correta, e é a mesma decisão que os docs deste projeto já registravam antes desta rodada.

**Gatilho explícito para revisitar**: se o deploy passar a ter mais de uma instância/réplica atrás de um load balancer, cada réplica passaria a ter seu próprio contador — um atacante rotacionando entre instâncias furaria qualquer limite. Nesse momento, trocar o storage por um externo compartilhado (ex.: Redis) é obrigatório. A interface atual (`RateLimiter.check(key)`/`.reset(key)`/`.retry_after(key)`, chaves nomeadas por dimensão) foi desenhada para essa troca não exigir redesenhar nenhum ponto de chamada — só a implementação interna do `RateLimiter` mudaria (de `dict`+`deque` para operações atômicas do Redis, ex. `INCR`+`EXPIRE`).

## Risco residual auditado: normalização de identificador (2026-09, PR4)

O prompt de hardening pede identificador normalizado como uma das dimensões de chave e como caso de teste de bypass ("casing diferente de e-mail"). Auditado nesta rodada: **nenhum fluxo normaliza case do e-mail** — `authenticate_user`/`register_user`/reset/reenvio comparam com `User.email == email`, exato. O limiter de conta isolada usa o e-mail bruto (`data.email`, sem `.lower()`) como chave.

**Por que isso não é explorável hoje**: a comparação do Postgres é case-sensitive (sem `citext`/índice funcional `lower()`). Uma variação de casing enviada por um atacante nunca bate com a linha da conta real — a consulta simplesmente não encontra ninguém, e o fluxo cai em "credenciais inválidas" como qualquer chute errado (`test_login_with_different_email_casing_never_matches_the_real_account`, `tests/security/test_rate_limiting.py`). Isso significa que variar o casing:

- não autentica a conta real (a senha nunca chega a ser verificada);
- não dilui a proteção da conta real (o limiter de conta isolada da conta real nunca é tocado por uma tentativa que nem chegou a resolver pra ela).

**Por que não implementamos normalização mesmo assim**: normalizar exigiria uma migration de dados sobre `users.email` já em produção, com risco real de colisão (duas contas existentes que hoje só diferem em casing virariam duplicata de e-mail única) — uma mudança de dado de produção maior do que o item justifica, para um problema que a auditoria confirma não ser explorável. Fica registrado como risco residual, não como pendência esquecida — revisitar apenas se o produto decidir que contas com casing diferente do mesmo e-mail (ex.: `Ana@x.com` vs `ana@x.com`) é um problema de suporte/UX que valha a pena resolver por si só.

**Espaços nas pontas**: já resolvido de graça — `EmailStr` (Pydantic) descarta espaço nas pontas antes de qualquer validação rodar; não existe brecha de "mesmo e-mail com espaço tratado como conta diferente" (`test_email_with_surrounding_whitespace_is_normalized_by_pydantic_before_reaching_the_route`).

## Outros itens de bypass auditados (2026-09, PR4)

- **Endpoints equivalentes**: auditado via inventário de todas as rotas de `auth`/`memberships`/`platform_admin` — não existe rota duplicada/alias que ofereça o mesmo efeito de login/reset/verificação sem passar pelo rate limiting.
- **IPv4/IPv6**: `get_client_ip()` trata o IP como string opaca — um IPv6 no `request.client.host` funciona como chave sem erro (`test_ipv6_socket_address_is_used_as_is`, `tests/unit/test_client_ip.py`). `sessions.ip_address` já é `String(45)`, dimensionado para o maior literal IPv6 possível.
- **Encoding**: senha com acentuação/emoji sobrevive ao round-trip hash → login sem quebrar (Argon2 opera sobre bytes UTF-8) — `test_password_with_unicode_characters_hashes_and_authenticates_correctly`.
- **Trocar de dispositivo**: não reseta nem contorna a proteção por conta — a chave é o e-mail, nunca o cookie/sessão de quem está tentando (`test_switching_device_does_not_reset_account_rate_limit`).
- **`X-Forwarded-For` forjado, ponta a ponta via HTTP real** (além do teste de unidade já existente de `get_client_ip` isolado): `test_forged_x_forwarded_for_does_not_bypass_login_rate_limit_over_http`.

## Testes

- `tests/unit/test_rate_limit.py` — o primitivo isolado: limite, janela, chaves independentes, expiração, reset, `clear_all`, concorrência (prova o lock), `retry_after`.
- `tests/unit/test_client_ip.py` — resolução de IP confiável: `X-Forwarded-For` forjado é ignorado por padrão; com `trusted_proxy_count` configurado, pega o hop certo; IPv6 funciona como chave.
- `tests/security/test_rate_limiting.py` — end-to-end via HTTP: cada endpoint listado acima, os cenários de **spray** (mesmo IP, muitas contas) e **stuffing distribuído** (mesma conta, muitos IPs simulados via `monkeypatch`), e os testes de bypass listados acima (casing, espaços, encoding, troca de dispositivo, `X-Forwarded-For` forjado).
- `tests/e2e/login_rate_limit.spec.ts` — fluxo abusivo ponta a ponta: excesso de tentativas de login → `429` com a mensagem amigável visível na UI → cooldown real → login legítimo funciona depois.
- `tests/conftest.py::_reset_rate_limiters` — fixture `autouse` que zera todos os limiters antes de cada teste. Necessária porque o `TestClient` do Starlette sempre reporta o host fixo `"testclient"` — sem o reset, os limiters por IP isolado acumulariam tentativas de toda a sessão de testes, não só de um teste.
