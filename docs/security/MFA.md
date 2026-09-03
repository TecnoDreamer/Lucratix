# MFA — proposta de arquitetura (não implementado)

Não existe nenhuma infraestrutura de MFA/2FA neste projeto hoje. O prompt de hardening de autenticação pede para avaliar MFA para papéis privilegiados e, na ausência de infraestrutura, propor uma arquitetura segura em vez de improvisar algo inseguro — este documento é essa proposta. **Nada aqui está implementado**; é material para uma rodada dedicada, quando/se o usuário priorizar.

## Por que não entra nesta rodada

TOTP/WebAuthn de verdade é uma feature própria — fluxo de enrollment, tela de recovery codes, mudança no fluxo de login, novos endpoints, migração de schema para segredo/códigos, UX de "perdi meu segundo fator" — comparável em tamanho a qualquer uma das PRs do épico de hardening já entregues, não um acessório que cabe dentro de uma rodada de sessões. Mesma disciplina de escopo já usada neste projeto para itens do tipo "avaliado, não implementado" (ex.: detecção de senha vazada via HIBP, `docs/security/POLITICA_DE_SENHAS.md`).

## Escolha de tecnologia: TOTP, não SMS

- **TOTP** (RFC 6238, `pyotp` no backend) — sem custo de infraestrutura externa (ao contrário de SMS, que exige um provedor pago tipo Twilio e tem seus próprios problemas de segurança — SIM swapping, interceptação). Funciona com qualquer app autenticador padrão (Google Authenticator, Authy, 1Password). Único custo real: o usuário precisa ter um app autenticador instalado — aceitável para os papéis-alvo (donos/administradores de organização, Super Admin), não para todo usuário.
- **WebAuthn/passkeys** — mais forte ainda (resistente a phishing, sem segredo compartilhado), mas exige mais infraestrutura de frontend (WebAuthn API do browser) e um fluxo de fallback para quem não tem hardware compatível. Cogitado como evolução futura do TOTP, não como primeira versão — mais simples entregar TOTP primeiro e aprender com o uso real antes de investir em WebAuthn.
- **SMS**: descartado — custo recorrente, e é o mecanismo de MFA mais fraco que existe (SIM swapping é um ataque conhecido e documentado). Não deveria ser adicionado nem como opção secundária.

## Quem seria obrigado/oferecido

- **Obrigatório**: `ORGANIZATION_OWNER` e `ORGANIZATION_ADMIN` de qualquer organização, e qualquer usuário com `is_platform_admin=True` (Super Admin) — são os papéis que já têm os privilégios mais sensíveis do sistema (RN-009), o mesmo critério que já rege outras exceções de segurança (`docs/security/ACCESS_CONTROL.md`).
- **Opcional**: `ANALYST`/`VIEWER` — sem obrigação, mas a mesma infraestrutura serviria se algum desses papéis quiser ativar por conta própria.
- Decisão de negócio a confirmar quando esta rodada for priorizada: MFA obrigatório bloqueia login até o enrollment (pior UX, mais seguro) ou dá um período de carência (ex.: 7 dias) antes de obrigar? Nenhuma das duas está implementada — é uma escolha de produto, não técnica.

## Fluxo proposto

### Enrollment (ativar MFA numa conta)
1. `POST /auth/mfa/enroll` (autenticado) — gera um segredo TOTP novo (`pyotp.random_base32()`), devolve a URI `otpauth://` (pra renderizar como QR code no frontend) e uma lista de recovery codes (ex.: 10 códigos de uso único, gerados com `secrets.token_hex`). O segredo NÃO é ativado ainda — fica pendente até a confirmação.
2. `POST /auth/mfa/enroll/confirm` (autenticado, `{code: "123456"}`) — verifica o código TOTP contra o segredo pendente; se bater, ativa o MFA na conta e persiste o segredo (ver "Armazenamento" abaixo). Os recovery codes só são mostrados **uma vez**, nesta resposta — o backend guarda só o hash de cada um (mesmo padrão de token opaco, `hash_opaque_token`), nunca o valor bruto.

### Login com MFA ativo
1. `POST /auth/login` (fluxo atual, inalterado na validação de senha) — se a conta tem MFA ativo, **não** emite cookies de sessão ainda. Devolve um estado intermediário (ex.: `{"mfa_required": true, "mfa_token": "<jwt de curta duração, ex. 5 min, tipo MFA_PENDING>"}`) em vez de `UserRead`.
2. `POST /auth/mfa/verify` (`{mfa_token, code}`) — valida o `mfa_token` (tipo `MFA_PENDING`, não intercambiável com access/refresh — mesmo padrão de `TokenType` já usado hoje, `core/security.py`), verifica o código TOTP (ou um recovery code, marcando-o usado) contra o segredo da conta. Só aqui `_set_auth_cookies` é chamado — o login só completa de verdade depois do segundo fator.
3. Rate limiting dedicado no `/auth/mfa/verify` (mesma tríade de dimensões da PR1 — IP isolado, conta isolada, combinada) — um código de 6 dígitos tem só 10⁶ combinações, ordens de grandeza mais fraco que um token opaco de 256 bits; sem rate limiting seria trivial de forçar por força bruta.

### Desativar MFA
`POST /auth/mfa/disable` (autenticado, exige a senha atual + um código TOTP válido) — nunca deveria ser possível sem provar posse do segundo fator, senão uma sessão comprometida desativaria a proteção sozinha.

## Armazenamento (schema proposto, não migrado)

Novo model `MfaCredential` (1:1 com `User`, ou colunas direto em `users` se só um método for suportado):

```python
class MfaCredential:
    user_id: UUID  # FK users.id, único
    secret_encrypted: str   # NÃO hash — TOTP precisa recuperar o segredo em texto pra
                            # comparar o código a cada verificação. Criptografado com uma
                            # chave de aplicação (env var nova, ex. MFA_ENCRYPTION_KEY,
                            # nunca a mesma que JWT_SECRET_KEY) — nunca texto puro no banco.
    enabled_at: datetime | None  # None = enrollment pendente, ainda não confirmado
    recovery_codes_hashed: list[str]  # hash de cada código (mesmo mecanismo de
                                       # hash_opaque_token), consumidos (removidos ou
                                       # marcados usados) a cada uso
```

Diferença importante em relação a tokens de reset/verificação já existentes: aqueles são **hash** porque só precisam ser *comparados* (o servidor nunca precisa "ler de volta" o token bruto). O segredo TOTP precisa ser **recuperado** a cada verificação de login (o algoritmo TOTP roda sobre o segredo em texto, não sobre um hash dele) — por isso precisa de **criptografia reversível com uma chave de aplicação**, não hash. Essa chave nunca pode ser a mesma usada para assinar JWT (`JWT_SECRET_KEY`) — comprometer uma não deveria comprometer a outra.

## Testes que essa rodada precisaria (quando implementada)

Mesma disciplina das PRs 1-3: enrollment gera segredo válido/QR renderizável; confirmação rejeita código errado sem ativar; login com MFA ativo nunca emite cookie de sessão antes do `/mfa/verify`; `mfa_token` não é intercambiável com access/refresh; recovery code funciona uma vez só; rate limiting no `/mfa/verify` (spray de código de 6 dígitos); desativar exige senha + código, nunca só um dos dois.
