import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("sidebar leva a Configurações com ?from=, e 'Voltar para <empresa>' retorna à mesma Home", async ({
  page,
}) => {
  await registerAndLogin(page, "account-settings-e2e");
  const orgName = `Empresa Config E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");
  const orgUrl = page.url();

  // Sidebar inclui ?from=<orgId> na URL.
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/conta\/configuracoes\?from=/);

  // "Voltar para <nome>" leva de volta para a Home da MESMA empresa, nunca
  // "Suas empresas".
  const backLink = page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(orgUrl);

  // Back nativo do navegador funciona normalmente (next/link ja empilha historico).
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/conta\/configuracoes\?from=/);
  await page.goBack();
  await expect(page).toHaveURL(orgUrl);
});

test("refresh na tela de Configurações preserva o alvo do 'Voltar' (querystring sobrevive)", async ({
  page,
}) => {
  await registerAndLogin(page, "account-settings-reload-e2e");
  const orgName = `Empresa Reload E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/conta\/configuracoes\?from=/);

  // Reload refaz o fetch de GET /organizations do zero (sem cache da
  // navegacao anterior) — o link comeca no fallback generico e so "sobe"
  // pro nome da empresa quando esse fetch resolve.
  await page.reload();
  await expect(page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) })).toBeVisible({
    timeout: 15000,
  });
});

test("deep link direto em /conta/configuracoes (sem ?from) resolve pela última empresa ativa", async ({
  page,
}) => {
  await registerAndLogin(page, "account-settings-deeplink-e2e");
  const orgName = `Empresa Deep Link E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  // Acessa /conta/configuracoes direto pela URL, sem vir da sidebar — sem
  // ?from, mas o id da empresa foi lembrado em localStorage ao carregar a
  // Home dela acima. Timeout maior: page.goto e uma navegacao completa,
  // refaz o fetch de GET /organizations do zero antes de resolver o link.
  await page.goto("/conta/configuracoes");
  await expect(page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) })).toBeVisible({
    timeout: 15000,
  });
});

test("sem sessão, 'Voltar' cai para 'Suas empresas' (que por sua vez redireciona pro login)", async ({
  page,
}) => {
  // A tela de Configurações em si nao redireciona sozinha num 401 (evita
  // duas navegacoes concorrentes para a mesma falha) — o link "Suas
  // empresas" degrada e e ELE quem, ao ser clicado, cai em /organizations,
  // que redireciona pro login.
  await page.goto("/conta/configuracoes");
  const fallback = page.getByRole("link", { name: "Suas empresas" });
  await expect(fallback).toBeVisible();
  await fallback.click();
  await page.waitForURL("**/login");
});
