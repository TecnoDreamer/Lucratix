import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("relatorio executivo mostra KPIs e o botao de impressao oculta a navegacao", async ({ page }) => {
  await registerAndLogin(page, "reports-e2e");
  const orgName = `Empresa Relatorio E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Financeiro" }).click();
  await page.waitForURL("**/financials");
  await page.getByLabel("Receita").fill("58200");
  await page.getByLabel("Custos").fill("21500");
  await page.getByRole("button", { name: "Salvar período" }).click();
  await expect(page.getByText("58.200")).toBeVisible();

  await page.getByRole("link", { name: "Relatório" }).click();
  await page.waitForURL("**/reports");

  await expect(page.getByRole("heading", { name: "Relatório executivo" })).toBeVisible();
  await expect(page.getByText("58.200")).toBeVisible();
  await expect(page.getByText(/Nenhuma campanha com data cadastrada/)).toBeVisible();

  const printButton = page.getByRole("button", { name: "Imprimir / Salvar como PDF" });
  await expect(printButton).toBeEnabled();

  // Na impressao, a navegacao/filtros somem e so o conteudo do relatorio fica visivel.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("link", { name: "Suas empresas" })).toBeHidden();
  await expect(printButton).toBeHidden();
  await expect(page.getByRole("heading", { name: "Relatório executivo" })).toBeVisible();
  await expect(page.getByText("58.200")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
});

test("relatorio executivo inclui metricas de marketing de campanhas do periodo", async ({ page }) => {
  await registerAndLogin(page, "reports-marketing-e2e");
  const orgName = `Empresa Relatorio Marketing E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  await page.getByRole("link", { name: "Marketing" }).click();
  await page.waitForURL("**/marketing");
  await page.getByLabel("Novo canal").fill("Google Ads");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Google Ads" })).toBeVisible();

  await page.getByRole("combobox").selectOption({ label: "Google Ads" });
  await page.getByLabel("Nome da campanha").fill("Campanha Relatório");
  await page.getByLabel("Início", { exact: true }).fill(monthStart);
  await page.getByLabel("Fim", { exact: true }).fill(monthEnd);
  await page.getByLabel("Investimento").fill("1000");
  await page.getByLabel("Receita atribuída").fill("4000");
  await page.getByRole("button", { name: "Adicionar campanha" }).click();
  await expect(page.getByRole("cell", { name: "Campanha Relatório" })).toBeVisible();

  await page.getByRole("link", { name: "Relatório" }).click();
  await page.waitForURL("**/reports");

  await expect(page.getByText("Marketing do período")).toBeVisible();
  await expect(page.getByText("ROAS")).toBeVisible();
  // ROAS = 4000/1000 = 4.
  await expect(page.getByText("4", { exact: true })).toBeVisible();
});
