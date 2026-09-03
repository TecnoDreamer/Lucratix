# Autenticação

> Consolida o funcionamento real do sistema de autenticação — não existia um documento único antes desta rodada (redesign de autenticação + rebranding Lucratix). Ver também `docs/security/security-requirements.md` (mapeamento OWASP) e `docs/security/threat-model.md`.

## Visão geral

JWT stateless quanto a assinatura/expiração, mas com sessão única validada no servidor (RN-013): access token (15 min) + refresh token (7 dias), ambos em cookies `HttpOnly`/`Secure` (produção)/`SameSite=Lax`. Cada token carrega uma claim `sid` checada contra a tabela `sessions` em toda request autenticada (`app/core/deps.py::get_current_user`) e no `/refresh` (`app/modules/auth/router.py`) — um JWT com assinatura e prazo válidos não basta se a sessão foi revogada.

**Login revoga qualquer sessão ativa anterior do mesmo usuário**, com atomicidade garantida por um índice único parcial no banco (`uq_sessions_one_active_per_user`, migration `0007_sessions`), não apenas pela ordem das instruções da aplicação — ver `app/core/sessions.py`. Login em um novo dispositivo desconecta qualquer outro dispositivo já autenticado; a UX correspondente (mensagem "Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo.") está em `apps/web/src/lib/api.ts` (`loginRedirectPath`) e na página de login (`?reason=session_revoked`).

## Política de senha forte (2026-09-02)

Toda senha nova (cadastro, alteração, redefinição, convite/criação
administrativa) precisa atender 4 requisitos simultâneos — ver
[POLITICA_DE_SENHAS.md](POLITICA_DE_SENHAS.md) para os detalhes completos
(requisitos, definição de caractere especial, contrato de erro, legado).

## Recuperação de senha

Fluxo de link único, sem etapa de código/OTP separada: `POST /password-reset/request` (e-mail) → token opaco de 256 bits, hash SHA-256 armazenado (`app/models/password_reset_token.py`), TTL de 1 hora, uso único → `POST /password-reset/confirm` (token + nova senha). Resposta de `/request` é **sempre idêntica** independente de o e-mail existir (RN-012, evita enumeração de contas).

## Verificação de e-mail (RF-001, 2026-08-31)

RF-001 sempre previu *"sistema cria usuário com status `pending`/`active`"* — implementado agora. Cadastro (`POST /auth/register`) gera um `EmailVerificationToken` (mesma forma de `PasswordResetToken`, tabela separada — nunca reaproveita o mesmo token para os dois propósitos) e envia um e-mail de confirmação. `POST /auth/verify-email` confirma; `POST /auth/resend-verification` reenvia (genérico + rate limited, RN-012). `GET /auth/me` devolve `email_verified: bool` (nunca o timestamp cru).

**Decisão deliberada: verificação nunca bloqueia login.** Uma conta continua 100% usável antes de verificar o e-mail — o frontend ("Suas empresas") mostra um lembrete não bloqueante com botão de reenviar, nunca uma tela de bloqueio. Motivo: bloquear travaria o próprio fluxo de conta criada por um admin/Super Admin (`docs/security/ACCESS_CONTROL.md`), que já usa o mesmo mecanismo de token para a pessoa definir a senha — forçar verificação antes de qualquer acesso duplicaria essa fricção sem necessidade. Pode virar bloqueante depois, é uma decisão de produto separada, não técnica.

### Envio de e-mail real (Resend)

`app/core/email.py::send_email` — `urllib.request` da biblioteca padrão (POST para a API do Resend), **nenhuma dependência nova**. Configuração via variável de ambiente:

| Variável | Obrigatória | Efeito |
|---|---|---|
| `RESEND_API_KEY` | Não (padrão: vazia) | Sem ela, `send_email` nunca tenta rede — devolve `False` direto, custo zero. **Liga a feature sozinha quando a env var aparecer**, sem precisar de deploy de código novo. |
| `EMAIL_FROM` | Não (padrão: `Lucratix <onboarding@resend.dev>`) | Trocar para um endereço do domínio verificado assim que existir. |
| `FRONTEND_BASE_URL` | Não (padrão: `http://localhost:3000`) | Base pra montar o link completo dentro do corpo do e-mail. |

**Passo a passo pra ativar de verdade** (fora do escopo do que a IA pode fazer sozinha — exige uma conta em nome do usuário):
1. Criar conta grátis em [resend.com](https://resend.com) (sem cartão).
2. Gerar uma API key e colocar em `RESEND_API_KEY` — direto no `.env` local e na variável de ambiente do Railway em produção. Nunca precisa compartilhar o valor da chave fora desses dois lugares.
3. **Verificar um domínio próprio** (registros DNS — SPF/DKIM — no provedor do domínio). Sem isso, o Resend só entrega para o e-mail com que a própria conta Resend foi criada (sandbox `onboarding@resend.dev`) — inútil para usuários reais. Ver [resend.com/docs/knowledge-base/403-error-resend-dev-domain](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
4. Atualizar `EMAIL_FROM` pra usar o domínio verificado.

Enquanto isso não é feito, o sistema continua funcionando exatamente como antes desta rodada: `dev_token` na resposta (fora de produção), sem regressão nenhuma.

**Autenticação por WhatsApp — pesquisado, não implementado.** Mensagem de verificação (OTP) é categoria "Authentication" no WhatsApp Business Platform, e a própria Meta documenta que **não é gratuita por padrão** — cobrada desde a primeira mensagem, mesmo dentro do "free tier" de conversas de serviço (que só cobre conversas iniciadas pelo cliente, nunca uma mensagem que a plataforma dispara sozinha). Ver [developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing). Não existe caminho honesto de fazer isso de graça em escala real — fica fora de escopo até haver decisão explícita de assumir esse custo por mensagem.

## Rate limiting

Ver [`docs/security/RATE_LIMITING.md`](RATE_LIMITING.md) para a arquitetura completa (3 dimensões de chave — IP isolado, conta isolada, IP+conta combinada — resolução de IP confiável, backoff, e por que o storage continua em memória). Resumo: todo endpoint sensível de `/auth` (login, registro, refresh, esqueci/redefinir senha, trocar senha, verificar/reenviar e-mail) tem rate limiting hoje, assim como convite de membro e criação administrativa de usuário.

## O que **não** existe (decisão deliberada, não lacuna esquecida)

- **SSO/autenticação social** (Google, Microsoft): nenhuma integração implementada. Seção 24 do prompt de redesign proíbe explicitamente mostrar botões de SSO que não funcionam — não foram adicionados.
- **"Lembrar de mim"**: não existe diferenciação de duração de sessão hoje (access/refresh já têm prazos fixos, sessão única já é o comportamento padrão). Seção 22 proíbe checkbox decorativo sem comportamento real — não foi adicionado. Se no futuro fizer sentido (ex.: refresh token de duração maior quando marcado), isso exige mudança de verdade no backend, não só na UI.
- **Termos de Uso / Política de Privacidade / Suporte**: sem conteúdo legal real para essas páginas, não foram criados links no rodapé de autenticação — seção 37 proíbe link morto, e um link para uma página vazia/placeholder seria pior do que a ausência do link.

## Segurança preservada nesta rodada (redesign de autenticação)

Nenhuma mudança nesta rodada alterou: validação server-side, cookies (`HttpOnly`/`Secure`/`SameSite`), a política de sessão única, mensagens sem enumeração de conta (login e password-reset), ou logout server-side. O redesign foi de UI/UX (visibilidade de senha, Caps Lock, telas de recuperação) e de uma lacuna real de rate limiting — não uma reescrita da lógica de autenticação existente.
