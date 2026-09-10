# Política de Senhas Fortes

Introduzida em 2026-09-02. Fonte única de verdade no backend:
`apps/api/app/core/password_policy.py`. O frontend replica a mesma lógica, com os
mesmos requisitos e na mesma ordem, em `apps/web/src/lib/password-policy.ts` —
só para feedback em tempo real (UX); **o backend é sempre a autoridade**, uma
chamada direta à API nunca contorna a política (ver
[TESTES_DE_AUTENTICACAO.md](TESTES_DE_AUTENTICACAO.md)).

## Objetivo

Toda **nova senha** — criada, alterada ou redefinida — deve ser resistente a
tentativa trivial de adivinhação/força bruta, sem impor fricção desnecessária
(sem regra decorativa, sem bloquear gerenciador de senha, sem truncar
silenciosamente).

## Requisitos

Simultaneamente:

| Requisito | Regra |
|---|---|
| Comprimento mínimo | 8 caracteres |
| Letra maiúscula | Pelo menos 1 |
| Caractere especial | Pelo menos 1 |
| Dígitos numéricos | **3 ou mais** (não "exatamente 3" — 4, 5 ou mais também é válido) |

Comprimento máximo: 255 caracteres. Não é um limite de UX (nenhuma senha real
chega perto disso) — é defesa contra abuso: como o hashing (Argon2, ver
abaixo) é deliberadamente caro em CPU, aceitar uma string arbitrariamente
grande sem limite viraria um vetor de negação de serviço. Nunca trunca
silenciosamente: acima de 255 caracteres, a requisição é rejeitada com erro
explícito.

### Definição de "caractere especial"

Qualquer símbolo ASCII imprimível que não é letra nem dígito — exatamente o
conjunto de `string.punctuation` do Python:

```text
! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~
```

O frontend (`lib/password-policy.ts`) constrói o mesmo conjunto
programaticamente (varrendo o intervalo ASCII imprimível e excluindo
letras/dígitos), para nunca divergir do backend por um símbolo esquecido
digitado manualmente.

### Unicode e comprimento

A política **não bloqueia** colagem, gerenciador de senha, espaço ou
caracteres Unicode (emoji, acentos, alfabetos não-latinos). Um caractere
Unicode conta para o comprimento normalmente. Maiúscula é detectada de forma
sensível a Unicode (ex.: `Ж`, `Á` contam como maiúscula) — mas dígito e
caractere especial continuam restritos ao conjunto ASCII acima (dígitos
"largos" de outros alfabetos ou símbolos fora desse conjunto não contam como
requisito atendido, mesmo que visualmente pareçam número/símbolo).

## Onde a política é aplicada

Toda rota que define uma senha nova, sem exceção:

| Fluxo | Endpoint | Campo validado |
|---|---|---|
| Cadastro | `POST /api/v1/auth/register` | `password` |
| Redefinição (esqueci minha senha) | `POST /api/v1/auth/password-reset/confirm` | `new_password` |
| Alteração de senha | `POST /api/v1/auth/change-password` | `new_password` |
| Convite/criação administrativa | *(reaproveita o fluxo de redefinição — ver abaixo)* | `new_password` |

**Não existe endpoint de "criação administrativa com senha escolhida pelo
admin"**: tanto a criação de usuário pelo Super Admin (`POST
/api/v1/platform/users`) quanto a concessão de acesso a uma organização por um
admin (`POST /api/v1/platform/organizations/{id}/memberships`) criam a conta
com uma senha placeholder aleatória (nunca comunicada a ninguém) e devolvem um
token de definição de senha — a pessoa convidada define a própria senha pelo
mesmo fluxo de "esqueci minha senha" (`app/modules/auth/service.py::
create_user_with_reset_token`). Por isso, cobrir `password-reset/confirm`
cobre automaticamente convite e criação administrativa — não há um quarto
ponto de validação a manter em sincronia.

`current_password` (a senha ATUAL, em `/change-password`, usada só para
reautenticar antes de trocar) **nunca** passa por esta validação — só a senha
NOVA precisa atender a política. Login (`POST /auth/login`) também nunca
valida a política: só confere a senha contra o hash já salvo.

## Por que o `min_length` não fica no schema Pydantic

Os 3 campos de senha nova (`UserRegister.password`, `PasswordResetConfirm.
new_password`, `PasswordChange.new_password`) usam `Field(max_length=255)`,
**sem** `min_length`. Isso é deliberado: o FastAPI valida o corpo da
requisição contra o schema Pydantic **antes** de a rota rodar — se o
`min_length=8` estivesse no `Field`, uma senha de 5 caracteres seria
rejeitada ali, com o 422 genérico do Pydantic (`"String should have at least
8 characters"`) **sem nunca chegar** em `_enforce_password_policy`, mascarando
os outros requisitos que também podem estar faltando (maiúscula, especial,
números) — violando a regra de "mostrar todos os requisitos que faltam de
uma vez". `max_length` continua no schema porque é uma defesa de payload
grande (rejeitar antes de gastar CPU rodando qualquer validação), não parte
do feedback de UX.

## Contrato de erro

Uma violação de política responde **400 Bad Request** com um `detail` em
string simples (não um objeto estruturado) — mesmo padrão já usado por todo
`app/modules/auth/router.py` (ex.: `"Token invalido ou expirado"`), que o
frontend já sabe extrair via `ApiError.message`
(`apps/web/src/lib/api.ts`). Todos os requisitos que faltam são listados de
uma vez, não só o primeiro:

```json
{ "detail": "A senha deve ter pelo menos 8 caracteres; pelo menos uma letra maiúscula." }
```

A senha nunca é ecoada de volta em nenhuma resposta, log ou mensagem de erro.

## Armazenamento

Hashing via **Argon2** (`argon2-cffi`, `app/core/security.py::hash_password`)
— já era o algoritmo em uso antes desta política, nenhuma migração de hash foi
necessária. Nunca reversível, nunca texto puro. `verify_password` nunca deixa
um hash malformado derrubar a request com 500 — trata como credencial
inválida.

## Usuários existentes (legado)

Nenhuma conta criada antes desta política é invalidada retroativamente. A
política passa a valer no momento em que uma senha é **criada, alterada ou
redefinida** — login com uma senha antiga fraca continua funcionando
normalmente. Uma campanha de "atualize sua senha" para contas legadas, se um
dia for decidida, é uma migração de produto separada, fora do escopo desta
rodada.

## Proteções complementares

- **Rate limiting** já existente e não alterado nesta rodada: `POST
  /auth/login` (10/60s por IP+e-mail), `POST /auth/password-reset/request` e
  `POST /auth/resend-verification` (5/300s cada) — ver
  [AUTHENTICATION.md](AUTHENTICATION.md#rate-limiting). `/change-password` e
  `/password-reset/confirm` não têm rate limit dedicado: o primeiro exige
  sessão autenticada (já protegida pela política de sessão única, RN-016); o
  segundo exige um token opaco de 256 bits de entropia
  (`secrets.token_urlsafe(32)`) — inviável de adivinhar por força bruta,
  então um limite de tentativas adicional não muda o perfil de risco.
- **Detecção de senha vazada/comum**: avaliada, **não implementada** nesta
  rodada — exigiria integração com um serviço externo (ex.: k-anonymity da
  API do Have I Been Pwned) e nunca deve enviar a senha em texto puro para
  fora. Fica registrada como melhoria futura, não um requisito desta política.

## Frontend

- Componente reutilizável de campo de senha (`components/password-input.tsx`,
  já existente): mostrar/ocultar acessível, aviso de Caps Lock.
- Checklist de requisitos em tempo real
  (`components/password-requirements-checklist.tsx`, novo): cada requisito
  mostra ícone (✓/✗) + texto — nunca só cor — e um resumo em `aria-live`
  ("X de 4 requisitos atendidos") para leitor de tela, sem precisar reler a
  lista inteira a cada tecla digitada. Usado nas três telas que definem uma
  senha nova via UI: `/register`, `/redefinir-senha` e a seção "Senha" da
  Central de Configurações (`components/change-password-card.tsx`, que
  chama `POST /change-password` — o endpoint já existia, só não tinha tela).
- Confirmação de senha (`/redefinir-senha` e a seção "Senha" de
  Configurações): validada separadamente ("As senhas não coincidem"), antes
  mesmo de chamar a API. Na seção "Senha", o campo de senha ATUAL não usa
  `minLength` do HTML nem passa pelo checklist — é uma senha já existente
  (possivelmente legado), só a senha NOVA precisa atender a política.

## Internacionalização

Toda mensagem nova do checklist está em `messages/{pt-BR,en,es}.json`, sob o
namespace `common.passwordRequirements` — ver
[docs/i18n/CATALOGO_DE_MENSAGENS.md](../i18n/CATALOGO_DE_MENSAGENS.md). A
mensagem de erro do **backend** (`"A senha deve ter..."`) segue a mesma regra
de todo erro de backend documentada em
[docs/i18n/README.md](../i18n/README.md): permanece só em português,
independente do idioma da UI — mesmo tratamento de qualquer outro
`HTTPException.detail`.

## Limitações conhecidas e melhorias futuras

- Sem detecção de senha comprometida/comum (ver "Proteções complementares").
- Sem campanha de força de atualização de senhas legadas.
