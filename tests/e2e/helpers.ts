import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const TEST_PASSWORD = "SenhaForte123!";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`;
}

/** Registra um usuario novo e faz login, terminando em /organizations. */
export async function registerAndLogin(page: Page, emailPrefix: string): Promise<string> {
  const email = uniqueEmail(emailPrefix);

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Cadastro recebido/i)).toBeVisible();

  await page.waitForURL("**/login", { timeout: 5000 });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");

  return email;
}

export async function createOrganization(page: Page, name: string): Promise<void> {
  const consoleMessages: string[] = [];
  const requestsSeen: string[] = [];
  const onConsole = (msg: { text(): string; type(): string }) =>
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  const onPageError = (err: Error) => consoleMessages.push(`[pageerror] ${err.message}`);
  const onRequest = (req: { method(): string; url(): string }) =>
    requestsSeen.push(`${req.method()} ${req.url()}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("request", onRequest);

  const responsePromise = page
    .waitForResponse(
      (res) => res.url().endsWith("/api/v1/organizations") && res.request().method() === "POST",
      { timeout: 8000 }
    )
    .catch((e: Error) => {
      // eslint-disable-next-line no-console
      console.log(`[createOrganization] nenhuma resposta de POST /organizations capturada: ${e.message}`);
      // eslint-disable-next-line no-console
      console.log(`[createOrganization] console/erros da pagina: ${JSON.stringify(consoleMessages)}`);
      // eslint-disable-next-line no-console
      console.log(`[createOrganization] requests vistas: ${JSON.stringify(requestsSeen)}`);
      return null;
    });

  const nameInput = page.getByLabel("Nova empresa");
  await nameInput.fill(name);
  // eslint-disable-next-line no-console
  console.log(`[createOrganization] valor do input apos fill: "${await nameInput.inputValue()}"`);
  const submitButton = page.getByRole("button", { name: "Criar" });
  // eslint-disable-next-line no-console
  console.log(
    `[createOrganization] botao Criar - visivel: ${await submitButton.isVisible()}, habilitado: ${await submitButton.isEnabled()}`
  );
  await submitButton.click();

  const response = await responsePromise;

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("request", onRequest);

  if (response) {
    const body = await response.text().catch(() => "<sem corpo>");
    // eslint-disable-next-line no-console
    console.log(`[createOrganization] POST /organizations -> ${response.status()} ${body}`);
  }

  await expect(page.getByRole("link", { name })).toBeVisible({ timeout: 5000 });
}
