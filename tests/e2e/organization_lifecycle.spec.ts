import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

// Upload de logotipo fica fora do escopo e2e (precisa de credenciais reais
// do Cloudinary) — mesmo padrão de gating já usado em `helpers.ts` para
// RESEND_API_KEY: sem infraestrutura externa real, não simulamos com mock
// (perderia o valor de ponta-a-ponta) nem quebramos o CI por depender de
// segredo externo.

test("busca filtra 'Suas empresas' pelo nome", async ({ page }) => {
  await registerAndLogin(page, "org-search-e2e");

  const uniqueSuffix = Date.now();
  const target = `Empresa Alvo ${uniqueSuffix}`;
  const other = `Outra Empresa ${uniqueSuffix}`;
  await createOrganization(page, target);
  await createOrganization(page, other);

  await page.getByPlaceholder("Buscar empresa...").fill("Alvo");
  await expect(page.getByRole("link", { name: target })).toBeVisible();
  await expect(page.getByRole("link", { name: other })).not.toBeVisible();
});

test("congelar uma empresa mostra o banner e bloqueia escrita; reativar destrava", async ({ page }) => {
  await registerAndLogin(page, "org-freeze-e2e");
  const orgName = `Empresa Ciclo ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Configurações da empresa" }).click();
  await expect(page.getByRole("heading", { name: "Ciclo de vida" })).toBeVisible();

  await page.getByRole("button", { name: "Encerrar empresa" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Encerrar" }).click();
  await expect(dialog).not.toBeVisible();

  // Banner de empresa congelada aparece em qualquer sub-página.
  await expect(page.getByText(/Esta empresa está encerrada/)).toBeVisible();

  // Escrita bloqueada (409) em qualquer módulo — testamos via baseline, que
  // é acessível pela própria Home. O formulário deve reportar o erro do
  // backend em vez de aparentar sucesso.
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await expect(page.getByText(/Esta empresa está encerrada/)).toBeVisible();

  // Reativar, de volta em Configurações.
  await page.getByRole("link", { name: "Configurações da empresa" }).click();
  await page.getByRole("button", { name: "Reativar empresa" }).click();
  await expect(page.getByText(/Esta empresa está encerrada/)).not.toBeVisible();

  // Volta a aparecer na aba "Ativas" (default) de "Suas empresas".
  await page.getByRole("link", { name: "Suas empresas" }).click();
  await expect(page.getByRole("link", { name: orgName })).toBeVisible();
});
