# Chaves de API por organização

Mecanismo de autenticação alternativo ao cookie de sessão (`access_token`/`refresh_token`, `HttpOnly`, pensado pro SPA em `apps/web`) — existe para ferramentas externas que não guardam cookie de navegador: Power BI Desktop, um Community Connector do Looker Studio, ou qualquer automação de cliente que queira puxar os próprios dados. Implementa o pré-requisito que [`docs/analytics/POWER_BI.md`](../analytics/POWER_BI.md) e [`docs/analytics/LOOKER_STUDIO.md`](../analytics/LOOKER_STUDIO.md) já documentavam como bloqueio comum das duas integrações.

## Escopo desta v1

**Só leitura de analytics**, e só nos 6 endpoints que `POWER_BI.md` já documenta como o dado exportável hoje (nenhuma métrica nova foi inventada para isto):

- `GET /analytics/executive`
- `GET /analytics/executive/series`
- `GET /analytics/executive/targets`
- `GET /analytics/executive/correlation`
- `GET /analytics/marketing`
- `GET /analytics/marketing/by-channel`

`/dashboard*` e `/analytics/funnel*` continuam exclusivos de sessão — fora do escopo documentado, podem ganhar suporte a API key depois se houver necessidade real.

Não existe seletor de escopo (ex.: `analytics:read` vs. `analytics:write`) porque só há uma coisa que uma chave pode fazer hoje — ler analytics. Se um segundo escopo aparecer no futuro (ex.: exportação via API), um campo `scope` na tabela `api_keys` é a extensão natural, mas construir isso agora seria especular sobre uma necessidade que ainda não existe.

## Como funciona

- **Criação**: `POST /organizations/{id}/api-keys` (`ORGANIZATION_ADMIN`+, rate-limited — `api_key_create_rate_limiter`, `app/core/rate_limit.py`). Gera `lucratix_<43 caracteres aleatórios>` (`secrets.token_urlsafe(32)`), devolve o valor bruto **uma única vez**, nesta resposta. O banco guarda só o hash (SHA-256, `hash_opaque_token` — o mesmo mecanismo já usado por token de reset de senha e verificação de e-mail, `app/core/security.py`) e um `key_prefix` (os 16 primeiros caracteres do valor bruto, não-secreto, só para a chave ser identificável numa lista).
- **Autenticação**: header `Authorization: Bearer <chave>`. `app/core/api_key_auth.py::require_role_or_api_key(minimum_role)` — mesma checagem de papel de `app.core.deps.require_role`, mas resolve a organização/papel a partir da chave em vez do cookie quando o header está presente. Header ausente usa a sessão normal, comportamento idêntico ao que já existia.
- **Papel resolvido AO VIVO**: a chave carrega `created_by_user_id`, não um papel fixo. A cada request, o papel é lido da membership ATIVA dessa pessoa na organização — se ela for rebaixada ou removida depois de criar a chave, o acesso da chave muda/some automaticamente, sem precisar caçar chaves órfãs. Isto é deliberadamente diferente de um snapshot do papel no momento da criação (mais simples de implementar, mas deixaria uma chave com privilégio obsoleto depois de alguém sair da empresa).
- **Revogação**: `DELETE /organizations/{id}/api-keys/{key_id}` (mesmo papel mínimo). Nunca hard-delete — `revoked_at` marcado, mesmo padrão de `revoke_session` (`app/core/sessions.py`). Idempotente.
- **`last_used_at`**: atualizado a cada autenticação bem-sucedida — visibilidade de "essa chave ainda está em uso?" pra quem for fazer limpeza depois. Não é um log de auditoria (não grava IP/timestamp por evento) — só o último uso.

## Por que não reaproveitar o JWT de sessão

Sessão de usuário tem prazo curto (15 min access / 7 dias refresh, RN-016: sessão única) e é revogada a qualquer login em outro dispositivo — uma API key para uma ferramenta de terceiros precisa de um ciclo de vida independente de o usuário estar logado no navegador. Reaproveitar o JWT também obrigaria a chave a ser renovada como um token de sessão, inviável para uma ferramenta de BI que só faz uma chamada agendada de tempos em tempos.

## Isolamento multi-tenant (RNF-002)

Uma chave só autentica requisições para a `organization_id` com que foi criada — uma chave de uma organização usada no `organization_id` de outra recebe o mesmo `401` genérico de "chave inválida ou revogada" que uma chave inexistente receberia (nunca revela que a chave existe, só que é de outra empresa — mesmo espírito anti-enumeração de RN-012).

## O que NÃO existe nesta v1

- **UI de "chaves usadas recentemente" com IP/geolocalização** — só `last_used_at` (timestamp), sem os detalhes que um log de auditoria completo daria. Se abuso de chave vazada virar um problema real, isso é a extensão natural.
- **Rotação automática/expiração por tempo** — uma chave vive até ser revogada manualmente. Avaliado e adiado: a maioria das integrações de BI é de longa duração (um relatório publicado, atualizado por anos), e forçar rotação periódica sem um fluxo de "renovar sem quebrar o relatório publicado" seria pior UX do que a ausência de expiração.
- **Rate limiting nas chamadas autenticadas por API key** (só a criação da chave é rate-limited) — os 6 endpoints são leitura agregada, não sensíveis a força bruta do mesmo jeito que login; revisitar se abuso real for observado.

## Testes

- `tests/unit/test_api_key_auth.py` — resolução do header, papel ao vivo (criador rebaixado/removido perde acesso), chave revogada rejeitada, chave de outra organização não vaza.
- `tests/api/test_api_keys.py` — criar exige `ORGANIZATION_ADMIN` (403 para papéis menores), listar nunca devolve o valor bruto, revogar é idempotente, rate limit na criação, um dos 6 endpoints de analytics autenticando só com o header (sem cookie).
