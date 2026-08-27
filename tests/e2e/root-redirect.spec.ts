import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

/** `/` virou Server Component que só decide para onde redirecionar (sem
 * round-trip de rede no cliente) — ver docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md. */
test.describe("redirecionamento da raiz", () => {
  test("sem sessão, raiz redireciona para /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login");
  });

  test("com sessão ativa, raiz redireciona para /organizations", async ({ page }) => {
    await registerAndLogin(page, "root-redirect-e2e");
    await page.goto("/");
    await page.waitForURL("**/organizations");
  });
});
