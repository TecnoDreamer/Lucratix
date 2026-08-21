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
  await page.getByLabel("Nova empresa").fill(name);
  await page.getByRole("button", { name: "Criar" }).click();

  const link = page.getByRole("link", { name });
  const alert = page.getByRole("alert");
  await Promise.race([
    link.waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
    alert.waitFor({ state: "visible", timeout: 8000 }).catch(() => {}),
  ]);

  if (await alert.isVisible().catch(() => false)) {
    const text = await alert.textContent();
    throw new Error(`Falha ao criar organizacao "${name}": alerta na pagina diz "${text}"`);
  }

  await expect(link).toBeVisible({ timeout: 8000 });
}
