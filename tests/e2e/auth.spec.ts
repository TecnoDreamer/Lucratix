import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, registerAndLogin, uniqueEmail } from "./helpers";

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
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await page.waitForURL("**/login");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada");
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
  const senha = page.getByLabel("Senha");
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
  await expect(page.getByLabel("Senha")).toBeFocused();

  await page.keyboard.type("SenhaForte123!");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeFocused();
});
