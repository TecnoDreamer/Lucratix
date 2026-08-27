import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("analytics exibe nao aplicavel sem dados, sem quebrar a pagina", async ({ page }) => {
  await registerAndLogin(page, "analytics-empty-e2e");
  const orgName = `Empresa Analytics Vazia E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await page.waitForURL("**/analytics");

  await expect(page.getByRole("heading", { name: "Visão Executiva" })).toBeVisible();
  await expect(page.getByText("não aplicável").first()).toBeVisible();

  // Trocar de preset nao quebra a pagina.
  await page.getByRole("button", { name: "Últimos 3 meses" }).click();
  await expect(page.getByRole("heading", { name: "Visão Executiva" })).toBeVisible();
});

test("analytics mostra os KPIs do mes com dados financeiros lancados", async ({ page }) => {
  await registerAndLogin(page, "analytics-data-e2e");
  const orgName = `Empresa Analytics Dados E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await page.waitForURL("**/financials");
  await page.getByLabel("Receita").fill("58200");
  await page.getByLabel("Custos").fill("21500");
  await page.getByLabel("Despesas").fill("8000");
  await page.getByLabel("Investimento em marketing").fill("7500");
  await page.getByRole("button", { name: "Salvar período" }).click();
  await expect(page.getByText("58.200")).toBeVisible();

  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await page.waitForURL("**/analytics");

  // Preset padrao "Este mes" coincide com o mes recem-lancado.
  await expect(page.getByText("58.200")).toBeVisible();
  // Sem mes anterior lancado, a comparacao e "n/d", nunca "0%".
  await expect(page.getByText(/n\/d/).first()).toBeVisible();
});

test("analytics mostra os KPIs de marketing de uma campanha do mes atual", async ({ page }) => {
  await registerAndLogin(page, "analytics-marketing-e2e");
  const orgName = `Empresa Analytics Marketing E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  await page.getByRole("link", { name: "Marketing", exact: true }).click();
  await page.waitForURL("**/marketing");

  await page.getByLabel("Novo canal").fill("Google Ads");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Google Ads" })).toBeVisible();

  await page.getByRole("combobox").selectOption({ label: "Google Ads" });
  await page.getByLabel("Nome da campanha").fill("Campanha Deste Mês");
  await page.getByLabel("Início", { exact: true }).fill(monthStart);
  await page.getByLabel("Fim", { exact: true }).fill(monthEnd);
  await page.getByLabel("Investimento").fill("1000");
  await page.getByLabel("Receita atribuída").fill("4000");
  await page.getByLabel("Impressões").fill("10000");
  await page.getByLabel("Cliques").fill("500");
  await page.getByRole("button", { name: "Adicionar campanha" }).click();
  await expect(page.getByRole("cell", { name: "Campanha Deste Mês" })).toBeVisible();

  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await page.waitForURL("**/analytics");

  await expect(page.getByRole("heading", { name: "Marketing", exact: true })).toBeVisible();
  // ROAS = 4000/1000 = 4.
  await expect(page.getByText("4", { exact: true })).toBeVisible();
});
