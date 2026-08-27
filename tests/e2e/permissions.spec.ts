import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, createOrganization, registerAndLogin, uniqueEmail } from "./helpers";

/**
 * RN-010: usuario VIEWER e somente leitura. A UI nao esconde os formularios
 * (o servidor e a fonte da verdade de autorizacao — RNF-002/RN-010), entao
 * este teste confirma que uma tentativa de escrita como VIEWER falha com
 * um erro visivel, em vez de silenciosamente ter sucesso.
 */
test("usuario com papel VIEWER nao consegue registrar baseline (RN-010)", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const viewerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const viewerPage = await viewerContext.newPage();

  try {
    await registerAndLogin(ownerPage, "rbac-owner-e2e");
    const orgName = `Empresa RBAC E2E ${Date.now()}`;
    await createOrganization(ownerPage, orgName);
    await ownerPage.getByRole("link", { name: orgName }).click();
    await ownerPage.waitForURL("**/organizations/**");
    const orgUrl = ownerPage.url();

    const viewerEmail = uniqueEmail("rbac-viewer-e2e");
    await viewerPage.goto("/register");
    await viewerPage.getByLabel("Nome").fill("Viewer E2E");
    await viewerPage.getByLabel("E-mail").fill(viewerEmail);
    await viewerPage.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
    await viewerPage.getByRole("button", { name: "Cadastrar" }).click();
    await viewerPage.waitForURL("**/login");

    // Owner convida o viewer para a organizacao com papel VIEWER (via API,
    // ja que nao ha tela de convite no MVP - so o endpoint, ver RF-011).
    await ownerPage.request.post(`http://localhost:8000/api/v1/organizations/${orgUrl.split("/").pop()}/memberships`, {
      data: { email: viewerEmail, role: "VIEWER" },
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    await viewerPage.getByLabel("E-mail").fill(viewerEmail);
    await viewerPage.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
    await viewerPage.getByRole("button", { name: "Entrar" }).click();
    await viewerPage.waitForURL("**/organizations");

    await viewerPage.goto(orgUrl);
    await expect(viewerPage.getByText("Seu papel: Visualizador")).toBeVisible();

    await viewerPage.getByLabel("Receita").fill("999");
    await viewerPage.getByRole("button", { name: "Registrar baseline" }).click();

    await expect(viewerPage.getByText("Papel insuficiente para esta operacao")).toBeVisible();
    await expect(viewerPage.getByText("Nenhum baseline registrado ainda.")).toBeVisible();
  } finally {
    await ownerContext.close();
    await viewerContext.close();
  }
});
