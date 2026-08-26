# Autenticação

> Consolida o funcionamento real do sistema de autenticação — não existia um documento único antes desta rodada (redesign de autenticação + rebranding Lucratix). Ver também `docs/security/security-requirements.md` (mapeamento OWASP) e `docs/security/threat-model.md`.

## Visão geral

JWT stateless quanto a assinatura/expiração, mas com sessão única validada no servidor (RN-013): access token (15 min) + refresh token (7 dias), ambos em cookies `HttpOnly`/`Secure` (produção)/`SameSite=Lax`. Cada token carrega uma claim `sid` checada contra a tabela `sessions` em toda request autenticada (`app/core/deps.py::get_current_user`) e no `/refresh` (`app/modules/auth/router.py`) — um JWT com assinatura e prazo válidos não basta se a sessão foi revogada.

**Login revoga qualquer sessão ativa anterior do mesmo usuário**, com atomicidade garantida por um índice único parcial no banco (`uq_sessions_one_active_per_user`, migration `0007_sessions`), não apenas pela ordem das instruções da aplicação — ver `app/core/sessions.py`. Login em um novo dispositivo desconecta qualquer outro dispositivo já autenticado; a UX correspondente (mensagem "Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo.") está em `apps/web/src/lib/api.ts` (`loginRedirectPath`) e na página de login (`?reason=session_revoked`).

## Recuperação de senha

Fluxo de link único, sem etapa de código/OTP separada: `POST /password-reset/request` (e-mail) → token opaco de 256 bits, hash SHA-256 armazenado (`app/models/password_reset_token.py`), TTL de 1 hora, uso único → `POST /password-reset/confirm` (token + nova senha). Resposta de `/request` é **sempre idêntica** independente de o e-mail existir (RN-012, evita enumeração de contas).

**Sem serviço de e-mail integrado** (limitação conhecida, já documentada antes desta rodada): fora de produção, a resposta de `/request` inclui `dev_token` diretamente, e o frontend (`apps/web/src/app/esqueci-senha/page.tsx`) mostra um link de continuidade com esse token — únicamente fora de produção (`settings.is_production`), nunca em produção. Antes de um deploy real de recuperação de senha para usuários finais, é preciso integrar um serviço de envio de e-mail e remover esse campo incondicionalmente (já sinalizado no código-fonte).

## Rate limiting

Em memória, por instância (`app/core/rate_limit.py`) — limitação conhecida documentada ali: não é compartilhado entre processos/instâncias, precisaria de um store externo (Redis) se o deploy passar a ter mais de uma réplica atrás de um load balancer.

| Endpoint | Limite |
|---|---|
| `POST /auth/login` | 10 tentativas / 60s, por IP + e-mail alvo |
| `POST /auth/password-reset/request` | 5 tentativas / 300s, por IP + e-mail alvo (adicionado nesta rodada — não existia; o endpoint podia ser chamado sem limite) |

## O que **não** existe (decisão deliberada, não lacuna esquecida)

- **SSO/autenticação social** (Google, Microsoft): nenhuma integração implementada. Seção 24 do prompt de redesign proíbe explicitamente mostrar botões de SSO que não funcionam — não foram adicionados.
- **"Lembrar de mim"**: não existe diferenciação de duração de sessão hoje (access/refresh já têm prazos fixos, sessão única já é o comportamento padrão). Seção 22 proíbe checkbox decorativo sem comportamento real — não foi adicionado. Se no futuro fizer sentido (ex.: refresh token de duração maior quando marcado), isso exige mudança de verdade no backend, não só na UI.
- **Termos de Uso / Política de Privacidade / Suporte**: sem conteúdo legal real para essas páginas, não foram criados links no rodapé de autenticação — seção 37 proíbe link morto, e um link para uma página vazia/placeholder seria pior do que a ausência do link.

## Segurança preservada nesta rodada (redesign de autenticação)

Nenhuma mudança nesta rodada alterou: validação server-side, cookies (`HttpOnly`/`Secure`/`SameSite`), a política de sessão única, mensagens sem enumeração de conta (login e password-reset), ou logout server-side. O redesign foi de UI/UX (visibilidade de senha, Caps Lock, telas de recuperação) e de uma lacuna real de rate limiting — não uma reescrita da lógica de autenticação existente.
