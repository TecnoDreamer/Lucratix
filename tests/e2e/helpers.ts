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
  // exact: true, senao a busca por "Senha" tambem casa com o botao
  // "Mostrar senha" (contem "senha" como substring do proprio aria-label).
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Cadastro recebido/i)).toBeVisible();

  // Sem RESEND_API_KEY (ambiente de CI/e2e), o cadastro devolve dev_token e
  // a pagina PARA no formulario (banner de confirmacao de e-mail) em vez de
  // redirecionar sozinha para /login — decisao deliberada (RF-001, ver
  // docs/security/AUTHENTICATION.md: verificar e-mail nunca e obrigatorio
  // pra logar). Ir direto pra /login em vez de esperar um redirect que so
  // acontece quando o e-mail de verdade e enviado.
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");

  return email;
}

export async function createOrganization(page: Page, name: string): Promise<void> {
  await page.getByLabel("Nova empresa").fill(name);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
}
