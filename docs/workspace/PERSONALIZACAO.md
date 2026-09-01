# Central de Configurações

`apps/web/src/app/conta/configuracoes/page.tsx` reúne preferências da conta, aplicadas em todas as empresas que o usuário acessa.

## O que existe hoje

- **Aparência** — tema claro/escuro/sistema (já existia antes desta rodada, `apps/web/src/lib/theme.ts`).
- **Acessos rápidos** — quais cards aparecem na Home de cada empresa e em qual ordem (novo, ver [ACESSOS_RAPIDOS.md](ACESSOS_RAPIDOS.md)).

## Por que não tem mais seções

O prompt mestre sugeria também "Idioma e região", "Notificações", "Empresa" e "Conta/Segurança" como seções da central. Só foram implementadas as que têm uma funcionalidade real por trás:

- **Idioma e região** — fica para a PR de internacionalização (i18n é 100% greenfield hoje, nenhuma biblioteca instalada — ver roadmap no plano de implementação). Adicionar o seletor agora, sem nada para ele fazer, seria uma tela decorativa.
- **Notificações** — não existe nenhum sistema de notificação (e-mail/push/in-app) implementado além dos e-mails transacionais (verificação de conta, reset de senha). Sem preferência real para configurar.
- **Empresa** — dados cadastrais de empresa já são editados na própria página da organização (`/organizations/{id}`, PATCH `/organizations/{id}`); duplicar aqui criaria duas fontes de edição para o mesmo dado.
- **Conta/Segurança** — o backend já tem `POST /auth/change-password` (ver `tests/api/test_password_reset.py`), mas não existe nenhuma tela para chamá-lo. Adicionar essa seção é ortogonal ao escopo desta PR (navegação + acessos rápidos); fica registrado aqui como pendência real, não decisão de produto.
