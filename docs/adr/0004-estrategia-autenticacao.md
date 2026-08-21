# ADR-0004 — Autenticação via access/refresh token em cookies HttpOnly

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

O front-end (Next.js) e o back-end (FastAPI) são aplicações separadas. É preciso um mecanismo de autenticação seguro contra XSS (RNF-003, RNF-004) e que não exponha token a JavaScript do cliente.

## Decisão

- Emitir um **access token** (JWT, curta duração, ex.: 15 minutos) e um **refresh token** (opaco ou JWT, duração maior, ex.: 7 dias, rotacionado a cada uso).
- Ambos entregues como cookies `HttpOnly`, `Secure` (em produção) e `SameSite=Lax`.
- Proteção CSRF: como o cookie é `SameSite=Lax` e a API só aceita métodos mutáveis (`POST`/`PUT`/`PATCH`/`DELETE`) com um header customizado adicional (ex.: `X-Requested-With`) verificado no servidor, mitigando CSRF sem exigir token CSRF separado no MVP — revisar em [security-requirements.md](../security/security-requirements.md) se essa mitigação for considerada insuficiente na Fase 18 (Hardening).

## Alternativas consideradas

- **Token em `localStorage`:** rejeitado — vulnerável a roubo via XSS, o que violaria RNF-003/RNF-004 diretamente.
- **Sessão de servidor com store dedicado (Redis):** mais simples de revogar imediatamente, mas adiciona um componente de infraestrutura antes de haver necessidade real; revisitar se revogação imediata de sessão se tornar requisito forte (ex.: "derrubar sessão de usuário comprometido agora").

## Consequências

- Revogação de access token só ocorre por expiração natural (curta, 15 min) — refresh token pode ser invalidado no banco (tabela ou coluna de sessão) para forçar logout remoto.
- **Desvio conhecido da decisão acima:** a implementação atual (`POST /api/v1/auth/refresh`) reemite apenas um novo access token e **não rotaciona** o refresh token a cada uso, porque a rotação sozinha (sem um store de revogação) não traz benefício real de segurança — o token antigo continuaria criptograficamente válido até expirar. Rotação com valor real de segurança fica para quando a issue #24 (revogação server-side) for resolvida.
- Nenhum dado sensível (senha, token) aparece em log (RNF-010).
- Login/refresh são os pontos de maior atenção para rate limiting (RNF-005).
