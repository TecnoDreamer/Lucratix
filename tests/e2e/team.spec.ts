import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin, uniqueEmail } from "./helpers";

test("admin da empresa convida, troca o papel e revoga um membro pela tela de Equipe", async ({ page }) => {
  await registerAndLogin(page, "team-e2e");
  const orgName = `Empresa Equipe ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Equipe" }).click();
  await expect(page.getByRole("heading", { name: "Equipe da empresa" })).toBeVisible();

  const guestName = "Convidado E2E";
  const guestEmail = uniqueEmail("convidado-e2e");
  await page.getByLabel("E-mail").fill(guestEmail);
  await page.getByLabel("Nome (se ainda não tiver conta)").fill(guestName);
  await page.getByRole("button", { name: "Convidar pessoa" }).click();

  await expect(page.getByText(`Acesso concedido a ${guestEmail}.`)).toBeVisible();
  await expect(page.getByRole("cell", { name: guestName, exact: true })).toBeVisible();

  // O papel padrão do convite é o mais restrito (Visualizador); promove a Analista.
  const roleSelect = page.getByRole("combobox", { name: `Papel — ${guestName}` });
  await expect(roleSelect).toHaveValue("VIEWER");
  await roleSelect.selectOption("ANALYST");
  await expect(roleSelect).toHaveValue("ANALYST");

  // Revogar exige confirmação.
  await page.getByRole("button", { name: `Revogar — ${guestName}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Revogar" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("cell", { name: guestName, exact: true })).not.toBeVisible();
});
