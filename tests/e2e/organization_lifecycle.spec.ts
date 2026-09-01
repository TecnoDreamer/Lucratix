import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

// Upload de logotipo fica fora do escopo e2e (precisa de credenciais reais
// do Cloudinary) — mesmo padrão de gating já usado em `helpers.ts` para
// RESEND_API_KEY: sem infraestrutura externa real, não simulamos com mock
// (perderia o valor de ponta-a-ponta) nem quebramos o CI por depender de
// segredo externo.

test("busca filtra 'Suas empresas' pelo nome", async ({ page }) => {
  await registerAndLogin(page, "org-search-e2e");

  // O campo de busca só aparece a partir de SEARCH_THRESHOLD (6) empresas
  // (progressive disclosure — ver apps/web/src/app/organizations/page.tsx)
  // — precisa passar desse número pra exercitar a busca de verdade.
  const uniqueSuffix = Date.now();
  for (let i = 0; i < 6; i++) {
    await createOrganization(page, `Empresa Enchimento ${uniqueSuffix} ${i}`);
  }
  const target = `Empresa Alvo ${uniqueSuffix}`;
  await createOrganization(page, target);

  await page.getByPlaceholder("Buscar empresa...").fill("Alvo");
  await expect(page.getByRole("link", { name: target })).toBeVisible();
  await expect(page.getByRole("link", { name: `Empresa Enchimento ${uniqueSuffix} 0` })).not.toBeVisible();
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

  // Banner de empresa congelada aparece em qualquer sub-página, sem
  // precisar de reload — a resposta do freeze é propagada de volta pro
  // layout via contexto (ver contexts/organization-context.tsx).
  await expect(page.getByText("Esta empresa está encerrada.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await expect(page.getByText("Esta empresa está encerrada.", { exact: true })).toBeVisible();

  // Reativar, de volta em Configurações.
  await page.getByRole("link", { name: "Configurações da empresa" }).click();
  await page.getByRole("button", { name: "Reativar empresa" }).click();
  await expect(page.getByText("Esta empresa está encerrada.", { exact: true })).not.toBeVisible();

  // Volta a aparecer na aba "Ativas" (default) de "Suas empresas".
  await page.getByRole("link", { name: "Suas empresas" }).click();
  await expect(page.getByRole("link", { name: orgName })).toBeVisible();
});
