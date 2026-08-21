import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("usuario troca entre duas empresas e ve os dados corretos de cada uma", async ({ page }) => {
  await registerAndLogin(page, "switch-e2e");

  const orgA = `Empresa Switch A ${Date.now()}`;
  const orgB = `Empresa Switch B ${Date.now()}`;
  await createOrganization(page, orgA);
  await createOrganization(page, orgB);

  // Entra na empresa A, registra um baseline especifico dela.
  await page.getByRole("link", { name: orgA }).click();
  await page.waitForURL("**/organizations/**");
  await expect(page.getByRole("heading", { name: orgA })).toBeVisible();
  await page.getByLabel("Receita").fill("11111");
  await page.getByRole("button", { name: "Registrar baseline" }).click();
  await expect(page.getByText(/Receita: 11/)).toBeVisible();

  // Volta para a lista e entra na empresa B — nao deve ver o baseline de A.
  await page.getByRole("link", { name: "Suas empresas" }).click();
  await page.waitForURL("**/organizations");
  await page.getByRole("link", { name: orgB }).click();
  await page.waitForURL("**/organizations/**");
  await expect(page.getByRole("heading", { name: orgB })).toBeVisible();
  await expect(page.getByText("Nenhum baseline registrado ainda.")).toBeVisible();
  await expect(page.getByText(/Receita: 11/)).not.toBeVisible();

  // Volta para A e confirma que o baseline continua la (troca nao perde dado).
  await page.getByRole("link", { name: "Suas empresas" }).click();
  await page.waitForURL("**/organizations");
  await page.getByRole("link", { name: orgA }).click();
  await page.waitForURL("**/organizations/**");
  await expect(page.getByText(/Receita: 11/)).toBeVisible();
});
