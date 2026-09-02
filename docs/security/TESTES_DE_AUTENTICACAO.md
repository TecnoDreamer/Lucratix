# Testes de Autenticação

Cobertura de teste da política de senha forte ([POLITICA_DE_SENHAS.md](POLITICA_DE_SENHAS.md))
e, em geral, dos fluxos que definem uma senha. Ver também
[security-testing.md](security-testing.md) (estratégia de teste de segurança
do projeto como um todo) e [AUTHENTICATION.md](AUTHENTICATION.md).

## Unitários — `tests/unit/test_password_policy.py`

Testa `app/core/password_policy.py` isoladamente, sem API/banco:

- Rejeita: menos de 8 caracteres; sem maiúscula; sem caractere especial;
  menos de 3 números.
- Aceita (com os demais requisitos atendidos): exatamente 3 números; mais de
  3 números; exatamente 8 caracteres; senha longa.
- Unicode: emoji/acento não atrapalham quando os outros requisitos já são
  atendidos; texto sem nenhuma letra maiúscula ASCII/Unicode continua
  inválido mesmo com dígitos e símbolo.
- Múltiplos requisitos faltando são todos reportados (`missing_requirements`
  nunca para no primeiro).
- `describe_missing_requirements` monta a mensagem na ordem canônica,
  independente da ordem recebida.
- Os 8 casos de exemplo do próprio pedido de política (`abcdefg`,
  `Abcdefgh`, `Abcdef@1`, `abcdef@123`, `Abcdef123` → inválidas;
  `Abcd@123`, `Projeto@123`, `Teste#987654` → válidas), conferidos contra a
  definição real de caractere especial.

Equivalente no frontend: `apps/web/src/lib/password-policy.spec.ts` (mesmos
casos, contra `lib/password-policy.ts`).

## Integração — `tests/api/test_auth_flow.py` e `tests/api/test_password_reset.py`

Hits diretos na API (sem frontend no meio) — prova que ignorar o frontend não
permite senha fraca:

- `test_register_rejects_weak_password`: `POST /auth/register` com senha
  fraca devolve 400 com todos os requisitos faltando na mensagem; nenhum
  usuário é criado (a validação acontece antes de `register_user`).
- `test_confirm_reset_rejects_weak_password_and_does_not_consume_the_token`:
  `POST /password-reset/confirm` com senha fraca devolve 400 **e não
  consome o token** — o mesmo link continua válido para uma tentativa
  seguinte com senha forte.
- `test_change_password_rejects_weak_new_password`: `POST /change-password`
  com `new_password` fraca devolve 400; a senha antiga continua funcionando
  (a troca nunca foi aplicada).

Os testes já existentes (`test_confirm_reset_changes_password_and_token_is_single_use`,
`test_change_password_requires_correct_current_password`, etc.) continuam
passando sem alteração — já usavam senhas que atendem à nova política
(`SenhaForte123!`, `SenhaNova123!` etc.), confirmado por auditoria antes da
implementação (nenhum outro valor de senha fixo em todo `tests/` deixou de
ser válido).

## E2E — `tests/e2e/auth.spec.ts` e `tests/e2e/password_reset.spec.ts`

- **Cadastro**: preencher senha fraca (`abcdefgh`) → checklist mostra os 4
  requisitos com o estado atual de cada um → tentar enviar → erro do backend
  (`"A senha deve ter..."`) aparece, cadastro não é concluído → corrigir para
  uma senha forte → reenviar → cadastro concluído.
- **Esqueci minha senha → redefinir**: fluxo completo já existente
  (`OutraSenhaForte456!`) continua cobrindo redefinição com senha forte,
  login com a senha antiga falhando e com a nova funcionando.

## Auditoria de senhas fixas em teste (antes da implementação)

Levantamento de todo valor literal usado como senha em `tests/` (`grep
-rhoE '"password":\s*"[^"]*"' tests/` + busca por `new_password`/
`current_password`) confirmou 6 valores distintos, todos compatíveis com a
nova política ou usados só em login (nunca passam por validação de
política): `SenhaForte123!`, `SenhaAntiga123!`, `SenhaDoFuncionario123!`,
`SenhaNova123!`, `OutraSenha123!`/`OutraSenhaForte456!`; `errada` e
`qualquer` (login com credencial inválida, não definição de senha). Nenhum
teste pré-existente precisou de alteração por causa desta política.
