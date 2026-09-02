import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, registerAndLogin, uniqueEmail } from "./helpers";

test("cadastro sem RESEND_API_KEY mostra o link de confirmar e-mail, e confirmar funciona ponta a ponta", async ({
  page,
}) => {
  const email = uniqueEmail("verify-e2e");

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  const confirmLink = page.getByRole("link", { name: /Continuar para confirmar o e-mail/ });
  await expect(confirmLink).toBeVisible();
  await confirmLink.click();

  await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("link", { name: "Ir para Suas empresas" }).click();
  await page.waitForURL("**/login");

  // Login normalmente e confirma que o lembrete de e-mail nao aparece mais
  // (ja foi verificado no passo acima).
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");
  await expect(page.getByText(/Confirme seu e-mail/)).not.toBeVisible();
});

test("cadastro com senha fraca mostra o checklist e o erro do backend; corrigir a senha completa o cadastro", async ({
  page,
}) => {
  const email = uniqueEmail("weakpass-e2e");

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  const senha = page.getByLabel("Senha", { exact: true });
  await senha.fill("abcdefgh");

  // Checklist em tempo real: comprimento ok, os outros 3 requisitos não.
  await expect(page.getByText("8 ou mais caracteres")).toBeVisible();
  await expect(page.getByText("Uma letra maiúscula")).toBeVisible();
  await expect(page.getByText("Um caractere especial")).toBeVisible();
  await expect(page.getByText("Pelo menos 3 números")).toBeVisible();

  // Uma chamada direta (bypassando qualquer bloqueio de UI) tambem e
  // rejeitada pelo backend — RN: o backend e sempre a autoridade.
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/A senha deve ter/)).toBeVisible();
  await expect(page.getByText(/Cadastro recebido/i)).not.toBeVisible();

  // Corrige a senha para uma que atende os 4 requisitos e reenvia.
  await senha.fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Cadastro recebido/i)).toBeVisible();
});

test("usuario consegue se cadastrar, entrar e sair", async ({ page }) => {
  await registerAndLogin(page, "auth-e2e");

  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
});

test("login com senha errada mostra mensagem generica", async ({ page }) => {
  const email = uniqueEmail("wrongpass-e2e");

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  // Sem RESEND_API_KEY (ambiente de e2e), o cadastro para no formulario
  // (banner de dev_token) em vez de redirecionar sozinho — ver
  // helpers.ts::registerAndLogin.
  await page.goto("/login");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Credenciais invalidas")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("acessar /organizations sem sessao redireciona para /login", async ({ page }) => {
  await page.goto("/organizations");
  await page.waitForURL("**/login");
});

test("mostrar/ocultar senha funciona por clique e por teclado", async ({ page }) => {
  await page.goto("/login");
  const senha = page.getByLabel("Senha", { exact: true });
  await senha.fill("SenhaForte123!");
  await expect(senha).toHaveAttribute("type", "password");

  const toggle = page.getByRole("button", { name: "Mostrar senha" });
  await toggle.click();
  await expect(senha).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toBeVisible();

  // Acessivel por teclado: foco + Enter tambem alterna.
  await page.getByRole("button", { name: "Ocultar senha" }).focus();
  await page.keyboard.press("Enter");
  await expect(senha).toHaveAttribute("type", "password");
});

test("navegacao por teclado: email -> senha -> mostrar senha -> esqueci senha -> entrar", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").focus();
  await page.keyboard.type("usuario@example.com");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();

  await page.keyboard.type("SenhaForte123!");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeFocused();
});
