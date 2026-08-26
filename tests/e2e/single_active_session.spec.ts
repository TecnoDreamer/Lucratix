import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, registerAndLogin } from "./helpers";

test("logar em um novo dispositivo encerra a sessao do dispositivo anterior", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    const email = await registerAndLogin(pageA, "session-e2e");
    await expect(pageA.getByRole("heading", { name: "Suas empresas" })).toBeVisible();

    await pageB.goto("/login");
    await pageB.getByLabel("E-mail").fill(email);
    await pageB.getByLabel("Senha").fill(TEST_PASSWORD);
    await pageB.getByRole("button", { name: "Entrar" }).click();
    await pageB.waitForURL("**/organizations");
    await expect(pageB.getByRole("heading", { name: "Suas empresas" })).toBeVisible();

    // O dispositivo A so descobre que a sessao caiu na proxima chamada a API.
    await pageA.reload();
    await pageA.waitForURL(/\/login\?reason=session_revoked/);
    await expect(pageA.getByText(/acessada em outro dispositivo/i)).toBeVisible();

    // O dispositivo B continua com a sessao ativa normalmente.
    await pageB.reload();
    await expect(pageB.getByRole("heading", { name: "Suas empresas" })).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
