import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("usuario cria uma empresa e ve seu papel de owner", async ({ page }) => {
  await registerAndLogin(page, "org-e2e");

  const orgName = `Empresa E2E ${Date.now()}`;
  await createOrganization(page, orgName);

  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");
  await expect(page.getByRole("heading", { name: orgName })).toBeVisible();
  await expect(page.getByText("Seu papel: Proprietário")).toBeVisible();
});

test("usuario ve navegacao para todas as areas da empresa", async ({ page }) => {
  await registerAndLogin(page, "org-nav-e2e");
  await createOrganization(page, `Empresa Nav ${Date.now()}`);
  await page.getByRole("link", { name: /Empresa Nav/ }).click();
  await page.waitForURL("**/organizations/**");

  for (const label of [
    "Dashboard",
    "Analytics",
    "Produtos",
    "Financeiro",
    "Marketing",
    "Funil",
    "Experimentos",
  ]) {
    // exact: true - a partir do redesign da pagina inicial da empresa, o
    // grid de "Acesso rapido" tambem tem um link cujo texto comeca com o
    // mesmo rotulo (ex.: "Financeiro Visualize receitas..."), entao uma
    // busca nao-exata bate em dois elementos.
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});
