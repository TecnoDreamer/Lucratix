# UX/UI de Autenticação

> Complementa `docs/branding/LUCRATIX_BRAND.md` (identidade visual) e `docs/security/AUTHENTICATION.md` (como o sistema funciona por baixo). Cobre as decisões de experiência do redesign de login/cadastro/recuperação de senha.

## Estrutura compartilhada

- `AuthHero` (`apps/web/src/components/auth-hero.tsx`): painel de marca split-screen, `hidden lg:flex` — só desktop/tablet largo. Wordmark, eyebrow/título/descrição por página, mini-dashboard demonstrativo (dados claramente marcados como ilustrativos, `aria-hidden` para não confundir leitor de tela com números falsos de conta).
- `PasswordInput` (`apps/web/src/components/password-input.tsx`): campo de senha reutilizável — mostrar/ocultar e aviso de Caps Lock. Usado em login, cadastro e redefinição de senha (nunca duplicado).
- `BrandLogo` (`apps/web/src/components/brand-logo.tsx`): logo mobile centralizado, 64px de altura (`h-16 mx-auto block`) no topo do card, acima do `<h1>` — visível apenas abaixo do breakpoint `lg` (no desktop o `AuthHero` já mostra o wordmark).

Todas as páginas de autenticação (`/login`, `/register`, `/esqueci-senha`, `/redefinir-senha`) seguem o mesmo layout: `AuthHero` à esquerda (desktop) + card centralizado com logo/título/descrição/formulário.

## Visibilidade de senha

Ícone `Eye`/`EyeOff` (`components/icons.tsx`) dentro do campo, `aria-label` dinâmico ("Mostrar senha" / "Ocultar senha"), alcançável por Tab e ativável por Enter/Espaço (é um `<button type="button">` nativo). Alterna `type="password"` ↔ `type="text"` sem perder o valor digitado.

## Caps Lock

Detectado via `KeyboardEvent.getModifierState("CapsLock")` em `onKeyDown`/`onKeyUp` do campo de senha. O aviso ("Caps Lock está ativado.") é renderizado **fora** do `<label>` do campo, propositalmente — texto dentro do `<label>` alteraria o nome acessível do input calculado pelo navegador (ex.: o campo passaria a se chamar "Senha Caps Lock está ativado" para leitores de tela). Desaparece ao perder o foco ou quando o Caps Lock é desativado.

## Recuperação de senha — jornada

Sem etapa de "código de verificação" separada (o backend usa um link de token único, não OTP — ver `docs/security/AUTHENTICATION.md`):

1. `/esqueci-senha` — e-mail, mensagem de sucesso sempre genérica (não confirma se o e-mail existe).
2. `/redefinir-senha?token=...` — três estados: sem token (link inválido, com CTA para solicitar novo), formulário de nova senha (com confirmação, validada no cliente antes de chamar a API), e sucesso (com CTA para o login).

## Erros

Mensagens específicas e acionáveis, nunca genéricas ("Erro"): credenciais inválidas, token expirado/inválido, limite de tentativas excedido — cada uma vinda diretamente da API (`ApiError.message`), sem reescrever ou genericizar no cliente. Nenhuma mensagem revela se um e-mail específico existe na base (login e password-reset seguem a mesma regra, RN-012).

## Segurança — comunicação ao usuário

O texto "Sua sessão fica protegida e você continua conectado com segurança" (login) é deliberadamente neutro — não alega criptografia específica, certificação ou "segurança bancária" (proibido pela seção 26 do prompt de redesign). Reflete o que existe de fato: cookies `HttpOnly`/`Secure`/`SameSite` e sessão única server-side.

## Testes

- Unitários (Vitest): `PasswordInput` (mostrar/ocultar, Caps Lock, não vazar para o nome acessível), páginas de recuperação de senha (estados, chamadas à API, tratamento de erro).
- E2E (Playwright, `tests/e2e/`): fluxo completo de recuperação de senha ponta a ponta (`password_reset.spec.ts`), mostrar/ocultar senha por clique e teclado, ordem de tabulação completa do formulário de login (`auth.spec.ts`).
