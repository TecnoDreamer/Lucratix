# Controle de acesso — níveis, painel de Super Admin, bootstrap

Implementado em 2026-08-31. RN-009, RF-001, RF-012 já previam este desenho desde o início do projeto
(`docs/requirements/`, persona "Administrador(a) da Plataforma" em `docs/product/personas.md`) — o campo
`User.is_platform_admin` já existia no schema, só não era checado em lugar nenhum. Este documento reúne
num só lugar o que a implementação faz de verdade, para não ficar só espalhado em código/PR.

## Níveis de acesso

| Nível | Escopo | Pode fazer |
|---|---|---|
| **Super Admin** (`is_platform_admin=True`) | Toda a plataforma | Painel exclusivo (`/admin`, frontend). Cria contas de usuário soltas, concede/revoga acesso a **qualquer** empresa (mesmo sem ter membership nela), altera papel de qualquer membro, ativa/desativa contas, concede/revoga o Super Admin de outros usuários. Nunca remove o próprio `is_platform_admin` nem desativa a própria conta (trava anti-lockout). |
| **Proprietário** (`ORGANIZATION_OWNER`) | Uma empresa | Dono daquela empresa. Cria/convida funcionários **daquela empresa**, concede papéis até Administrador, revoga acesso, edita dados da empresa. |
| **Administrador** (`ORGANIZATION_ADMIN`) | Uma empresa | Mesmo que Proprietário, exceto: não pode promover ninguém a Proprietário, nem alterar/revogar quem já é Proprietário (RN-009 — rank superior ao próprio). |
| **Analista** (`ANALYST`) | Uma empresa | Lê e escreve dado operacional (financeiro, marketing, funil, produtos, experimentos, importação). Não gerencia usuários nem configurações da empresa. |
| **Visualizador** (`VIEWER`) | Uma empresa | Somente leitura — nada de criar/editar/importar (RN-010). |

`PLATFORM_ADMIN` não é um `MembershipRole` (não vive em `memberships.role`) — é um booleano global em
`User.is_platform_admin`, deliberadamente fora do escopo de qualquer organização (RN-009).

## Arquitetura: painel novo, isolamento multi-tenant intocado

`get_organization_context` (`app/core/deps.py`) — o ponto único de aplicação do isolamento multi-tenant,
RNF-002, com teste dedicado de isolamento entre organizações — **não foi alterado**. Super Admin não
ganhou um bypass silencioso ali dentro. Em vez disso, tem uma API própria e claramente separada:

- `app/modules/platform_admin/` (prefixo `/api/v1/platform`), toda rota atrás de
  `require_platform_admin` (`app/core/deps.py`) — 403 sem `is_platform_admin=True`.
- **Escopo deliberado**: gestão de usuários/acesso, não visão de dado de negócio de cada empresa. Ver dado
  de negócio (financeiro, campanhas etc.) de uma organização continua exigindo uma membership real nela,
  como sempre — Super Admin não "vê tudo de todo cliente" por tabela automaticamente. Painel de
  auditoria cross-organização não existe ainda (RF-027 continua escopado por organização) — próximo
  passo natural, não construído nesta rodada.

## Criação de conta pelo admin — reaproveita "esqueci minha senha", sem peça nova

Quando um `ORGANIZATION_ADMIN`+ ou `PLATFORM_ADMIN` concede acesso a um e-mail que ainda não tem conta
(`POST /organizations/{id}/memberships` ou `POST /platform/organizations/{id}/memberships`, com `name`
preenchido), a conta é criada na hora — `app/modules/auth/service.py::create_user_with_reset_token` — com
uma senha placeholder aleatória (nunca comunicada a ninguém) e o **mesmo mecanismo de token de
"esqueci minha senha"** (`PasswordResetToken`, `POST /auth/password-reset/confirm`,
`/redefinir-senha`). Nenhum model novo, nenhum endpoint novo de confirmação, nenhuma página nova — a
pessoa convidada define a própria senha pelo fluxo que já existia.

**Limitação real, herdada, não inventada por esta mudança**: não existe serviço de envio de e-mail
configurado hoje. Em produção, o token não chega a lugar nenhum sozinho — mesma limitação que já existia
no "esqueci minha senha". Fora de produção, a resposta da API devolve `dev_token`, e o painel mostra um
link copiável (mesmo tratamento visual de `esqueci-senha/page.tsx`) para o admin enviar manualmente.
Fechar essa lacuna (serviço de e-mail transacional) é um próximo passo real, não escondido.

## Bootstrap do primeiro Super Admin

Promover alguém a Super Admin exige... um Super Admin — problema do ovo-e-galinha resolvido
deliberadamente **fora da API** (nunca autopromoção via HTTP):

```bash
# Da raiz de apps/api, contra o banco do ambiente-alvo. O e-mail precisa
# corresponder a uma conta ja cadastrada (registre-se pela tela normal antes).
python -m app.scripts.grant_platform_admin email@exemplo.com
```

Exige acesso ao servidor/banco, não à aplicação — mesma postura de segurança de qualquer bootstrap
administrativo. Depois do primeiro Super Admin promovido assim, todos os demais são geridos pelo próprio
painel (`/admin/users`, botão "Tornar super admin"/"Remover super admin").

## Painel `/admin` (frontend)

Visível só para quem tem `is_platform_admin=True` (`GET /auth/me`) — `apps/web/src/app/admin/layout.tsx`
redireciona para `/organizations` sem renderizar nada do painel caso contrário. A autorização de verdade
é sempre do backend (`require_platform_admin`); o layout só evita oferecer uma tela que terminaria em 403,
mesmo padrão já usado em `organizations/[id]/layout.tsx` para itens de navegação com `minRole`.

- `/admin/organizations` — todas as empresas, dono, nº de membros.
- `/admin/organizations/{id}` — membros daquela empresa: tabela com troca de papel e revogação por linha,
  formulário "Conceder acesso" (cria conta se necessário).
- `/admin/users` — todas as contas da plataforma: criar conta solta, ativar/desativar, conceder/revogar
  Super Admin — com os botões desabilitados na própria linha do usuário logado (trava anti-lockout do
  lado do backend, refletida na UI).

Link "Painel Admin" aparece em "Suas empresas" (`organizations/page.tsx`) só para quem tem o papel.
