import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin, TEST_PASSWORD } from "./helpers";

const NEW_PASSWORD = "OutraSenhaForte789!";

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
  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await expect(page).toHaveURL(/\/conta\/configuracoes\?from=/);

  // "Voltar para <nome>" leva de volta para a Home da MESMA empresa, nunca
  // "Suas empresas".
  const backLink = page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(orgUrl);

  // Back nativo do navegador funciona normalmente (next/link ja empilha historico).
  await page.getByRole("link", { name: "Configurações", exact: true }).click();
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

  await page.getByRole("link", { name: "Configurações", exact: true }).click();
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
  // waitForURL só confirma a URL — não espera o fetch de
  // GET /organizations/{id} da página terminar, que é quando
  // rememberActiveOrganizationId grava o id em localStorage (ver
  // organizations/[id]/layout.tsx). Sem esperar o nome da empresa aparecer
  // de verdade aqui, o page.goto abaixo pode navegar embora ANTES desse
  // fetch resolver, abortando-o antes do localStorage ser escrito.
  await expect(page.getByRole("heading", { name: orgName })).toBeVisible();

  // Acessa /conta/configuracoes direto pela URL, sem vir da sidebar — sem
  // ?from, mas o id da empresa foi lembrado em localStorage ao carregar a
  // Home dela acima.
  await page.goto("/conta/configuracoes");
  await expect(page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) })).toBeVisible({
    timeout: 15000,
  });
});

test("alterar senha em Configurações: senha fraca é rejeitada, senha forte funciona e a antiga para de funcionar", async ({
  page,
}) => {
  const email = await registerAndLogin(page, "change-password-e2e");

  await page.goto("/conta/configuracoes");
  await expect(page.getByRole("heading", { name: "Senha", exact: true })).toBeVisible();

  // Senha atual errada e rejeitada pelo backend.
  await page.getByLabel("Senha atual").fill("senha-errada");
  await page.getByLabel("Nova senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmar nova senha").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha atual incorreta")).toBeVisible();

  // Senha nova fraca: checklist mostra os requisitos, backend rejeita.
  await page.getByLabel("Senha atual").fill(TEST_PASSWORD);
  await page.getByLabel("Nova senha", { exact: true }).fill("fraquinha");
  await expect(page.getByText("Um caractere especial")).toBeVisible();
  await page.getByLabel("Confirmar nova senha").fill("fraquinha");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText(/A senha deve ter/)).toBeVisible();

  // Corrige para uma senha forte — sucesso, campos limpos.
  await page.getByLabel("Nova senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmar nova senha").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible();

  // A senha antiga para de funcionar; a nova funciona.
  await page.getByRole("link", { name: "Suas empresas" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Credenciais invalidas")).toBeVisible();

  await page.getByLabel("Senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");
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
