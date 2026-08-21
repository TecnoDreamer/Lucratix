import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("usuario B nao ve a empresa criada pelo usuario A", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await registerAndLogin(pageA, "tenant-a-e2e");
    const orgName = `Empresa Privada A ${Date.now()}`;
    await createOrganization(pageA, orgName);

    await registerAndLogin(pageB, "tenant-b-e2e");
    await expect(pageB.getByText("Nenhuma empresa ainda. Cadastre a primeira abaixo.")).toBeVisible();
    await expect(pageB.getByRole("link", { name: orgName })).not.toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
