import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

async function openOrganization(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("link", { name }).click();
  await page.waitForURL("**/organizations/**");
}

test("usuario registra dados financeiros de um periodo", async ({ page }) => {
  await registerAndLogin(page, "financials-e2e");
  const orgName = `Empresa Financeiro E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await openOrganization(page, orgName);

  // exact: true - o grid de "Acesso rapido" da pagina inicial da empresa
  // tambem tem um link cujo texto comeca com o mesmo rotulo.
  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await page.waitForURL("**/financials");

  await page.getByLabel("Receita").fill("20000");
  await page.getByLabel("Custos").fill("8000");
  await page.getByRole("button", { name: "Salvar período" }).click();

  await expect(page.getByRole("cell", { name: "20.000" })).toBeVisible();
});

test("usuario cria um canal e uma campanha de marketing", async ({ page }) => {
  await registerAndLogin(page, "campaigns-e2e");
  const orgName = `Empresa Campanha E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await openOrganization(page, orgName);

  // exact: true - o grid de "Acesso rapido" da pagina inicial da empresa
  // tambem tem um link cujo texto comeca com o mesmo rotulo.
  await page.getByRole("link", { name: "Marketing", exact: true }).click();
  await page.waitForURL("**/marketing");

  await page.getByLabel("Novo canal").fill("Google Ads");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Google Ads" })).toBeVisible();

  await page.getByRole("combobox").selectOption({ label: "Google Ads" });
  await page.getByLabel("Nome da campanha").fill("Campanha de Lançamento");
  await page.getByLabel("Investimento").fill("1000");
  await page.getByRole("button", { name: "Adicionar campanha" }).click();

  await expect(page.getByRole("cell", { name: "Campanha de Lançamento" })).toBeVisible();
});
