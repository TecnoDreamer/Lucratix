import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, uniqueEmail } from "./helpers";

const NEW_PASSWORD = "OutraSenhaForte456!";

test("fluxo completo: esqueci a senha -> redefinir -> logar com a senha nova", async ({ page }) => {
  const email = uniqueEmail("reset-e2e");

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await page.waitForURL("**/login");

  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.waitForURL("**/esqueci-senha");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link de redefinição" }).click();

  // Sem servico de e-mail integrado (ambiente de teste = nao-producao): a
  // propria tela expoe o link de continuidade com o dev_token.
  const continueLink = page.getByRole("link", { name: /Continuar para redefinir a senha/ });
  await expect(continueLink).toBeVisible();
  await continueLink.click();
  await page.waitForURL(/\/redefinir-senha\?token=/);

  // exact: true, senao "Nova senha" tambem casa com "Confirmar nova senha"
  // (substring).
  await page.getByLabel("Nova senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmar nova senha").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Redefinir senha" }).click();

  await expect(page.getByRole("heading", { name: "Senha alterada com sucesso" })).toBeVisible();
  await page.getByRole("link", { name: "Ir para o login" }).click();
  await page.waitForURL("**/login");

  // Senha antiga nao funciona mais.
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Credenciais invalidas")).toBeVisible();

  // Senha nova funciona.
  await page.getByLabel("Senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");
  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();
});

test("link de redefinicao sem token mostra estado de link invalido", async ({ page }) => {
  await page.goto("/redefinir-senha");
  await expect(page.getByRole("heading", { name: "Link inválido" })).toBeVisible();
  await page.getByRole("link", { name: /Solicitar um novo link/ }).click();
  await page.waitForURL("**/esqueci-senha");
});
