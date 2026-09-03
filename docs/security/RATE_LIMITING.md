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
| `POST /auth/register` | — | 10 / 300s | — | Sem "conta" antes de criar uma — só IP, contra criação em massa/automação. |
| `POST /auth/password-reset/confirm` | — | 20 / 300s | — | O token opaco (256 bits) já torna força bruta offline inviável — isto é defesa em profundidade contra um script chamando o endpoint em volume. |
| `POST /auth/verify-email` | — | 20 / 300s | — | Mesmo raciocínio de password-reset/confirm. |
| `POST /auth/change-password` | — | — | 10 / 300s | Usuário já autenticado (sessão única, RN-013) — o risco é uma sessão comprometida testando a senha atual; por conta, não por IP. |
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

## Testes

- `tests/unit/test_rate_limit.py` — o primitivo isolado: limite, janela, chaves independentes, expiração, reset, `clear_all`, concorrência (prova o lock), `retry_after`.
- `tests/unit/test_client_ip.py` — resolução de IP confiável: `X-Forwarded-For` forjado é ignorado por padrão; com `trusted_proxy_count` configurado, pega o hop certo.
- `tests/security/test_rate_limiting.py` — end-to-end via HTTP: cada endpoint listado acima, mais os cenários de **spray** (mesmo IP, muitas contas) e **stuffing distribuído** (mesma conta, muitos IPs simulados via `monkeypatch`) que a chave só-combinada não bloqueava antes.
- `tests/conftest.py::_reset_rate_limiters` — fixture `autouse` que zera todos os limiters antes de cada teste. Necessária porque o `TestClient` do Starlette sempre reporta o host fixo `"testclient"` — sem o reset, os limiters por IP isolado acumulariam tentativas de toda a sessão de testes, não só de um teste.
