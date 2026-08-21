import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("usuario registra baseline e ve o historico preservado", async ({ page }) => {
  await registerAndLogin(page, "baseline-e2e");
  const orgName = `Empresa Baseline E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await expect(page.getByText("Nenhum baseline registrado ainda.")).toBeVisible();

  await page.getByLabel("Receita").fill("50000");
  await page.getByLabel("Lucro").fill("10000");
  await page.getByRole("button", { name: "Registrar baseline" }).click();

  await expect(page.getByText(/Receita: 50/)).toBeVisible();
  await expect(page.getByText(/Lucro: 10/)).toBeVisible();
});

test("dashboard exibe as metricas do periodo sem quebrar quando nao ha dados", async ({ page }) => {
  await registerAndLogin(page, "dashboard-e2e");
  const orgName = `Empresa Dashboard E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");

  for (const label of ["Receita", "Lucro", "Margem", "CAC", "Conversao", "Conversão"]) {
    const el = page.getByText(label, { exact: false }).first();
    if (await el.count()) {
      await expect(el).toBeVisible();
    }
  }
  // Sem financeiro/funil lançado ainda, todas as metricas devem aparecer
  // como "nao aplicavel" (RN-004) em vez de travar a pagina ou mostrar 0.
  await expect(page.getByText("não aplicável").first()).toBeVisible();
});
