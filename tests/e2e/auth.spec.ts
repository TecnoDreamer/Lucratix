import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, registerAndLogin, uniqueEmail } from "./helpers";

test("usuario consegue se cadastrar, entrar e sair", async ({ page }) => {
  await registerAndLogin(page, "auth-e2e");

  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
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
