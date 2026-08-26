import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("analytics exibe nao aplicavel sem dados, sem quebrar a pagina", async ({ page }) => {
  await registerAndLogin(page, "analytics-empty-e2e");
  const orgName = `Empresa Analytics Vazia E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Analytics" }).click();
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

  await page.getByRole("link", { name: "Financeiro" }).click();
  await page.waitForURL("**/financials");
  await page.getByLabel("Receita").fill("58200");
  await page.getByLabel("Custos").fill("21500");
  await page.getByLabel("Despesas").fill("8000");
  await page.getByLabel("Investimento em marketing").fill("7500");
  await page.getByRole("button", { name: "Salvar período" }).click();
  await expect(page.getByText("58.200")).toBeVisible();

  await page.getByRole("link", { name: "Analytics" }).click();
  await page.waitForURL("**/analytics");

  // Preset padrao "Este mes" coincide com o mes recem-lancado.
  await expect(page.getByText("58.200")).toBeVisible();
  // Sem mes anterior lancado, a comparacao e "n/d", nunca "0%".
  await expect(page.getByText(/n\/d/).first()).toBeVisible();
});
