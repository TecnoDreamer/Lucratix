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
  const responsePromise = page
    .waitForResponse(
      (res) => res.url().endsWith("/api/v1/organizations") && res.request().method() === "POST",
      { timeout: 8000 }
    )
    .catch((e: Error) => {
      // eslint-disable-next-line no-console
      console.log(`[createOrganization] nenhuma resposta de POST /organizations capturada: ${e.message}`);
      return null;
    });

  await page.getByLabel("Nova empresa").fill(name);
  await page.getByRole("button", { name: "Criar" }).click();

  const response = await responsePromise;
  if (response) {
    const body = await response.text().catch(() => "<sem corpo>");
    // eslint-disable-next-line no-console
    console.log(`[createOrganization] POST /organizations -> ${response.status()} ${body}`);
  }

  await expect(page.getByRole("link", { name })).toBeVisible({ timeout: 5000 });
}
