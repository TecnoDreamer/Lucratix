import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

/** `/` virou Server Component e não detecta mais API fora do ar (decide só
 * pela presença do cookie de sessão) — essa distinção precisa continuar
 * existindo em `/organizations`, o primeiro lugar que de fato busca dado
 * após o redirecionamento. Ver docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md. */
test("API inalcançável mostra tela de retry dedicada, distinta de erro genérico", async ({
  page,
}) => {
  await registerAndLogin(page, "org-conn-error-e2e");
  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();

  // Simula a API fora do ar: aborta toda chamada para /api/v1/* como se a
  // conexão tivesse caído (mesmo efeito de um `fetch()` rejeitado).
  await page.route("**/api/v1/**", (route) => route.abort("connectionrefused"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Não foi possível carregar suas empresas" })).toBeVisible();
  await expect(page.getByText("Não foi possível conectar ao servidor.")).toBeVisible();
  const retryButton = page.getByRole("button", { name: "Tentar novamente" });
  await expect(retryButton).toBeVisible();

  // API volta a responder: clicar em "Tentar novamente" recupera a tela normal.
  await page.unroute("**/api/v1/**");
  await retryButton.click();
  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();
});
