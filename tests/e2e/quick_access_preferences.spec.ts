import { expect, test } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

test("desmarcar e reordenar acessos rápidos em Configurações reflete na Home, e 'Restaurar padrão' desfaz", async ({
  page,
}) => {
  await registerAndLogin(page, "quick-access-e2e");
  const orgName = `Empresa Acessos E2E ${Date.now()}`;
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  // A sidebar TAMBÉM tem um link "Financeiro" (navegação geral, sempre
  // presente, independente da preferência de acesso rápido) — por isso
  // todo locator de card aqui é escopado à seção "Acesso rápido", nunca
  // `page.getByRole` solto, para não casar com o link errado.
  const quickAccessSection = page.locator('section:has-text("Acesso rápido")');

  // Todos os 7 cards aparecem por padrão na Home.
  await expect(quickAccessSection.getByRole("link", { name: /Financeiro/ })).toBeVisible();
  await expect(quickAccessSection.getByRole("link", { name: /Marketing/ })).toBeVisible();

  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await expect(page.getByLabel("Mostrar Financeiro")).toBeVisible();

  // Desmarca Financeiro e move Marketing para cima duas vezes: a lista
  // interna preserva a posição de itens desabilitados (Financeiro continua
  // ocupando um "slot", só não aparece na Home) — um clique só troca
  // Marketing de lugar com o Financeiro desabilitado (sem efeito visível na
  // Home, já que ele já estava escondido); o segundo clique é que troca
  // Marketing com Analytics de verdade.
  await page.getByLabel("Mostrar Financeiro").uncheck();
  const moveMarketingUp = page.getByRole("button", { name: "Mover Marketing para cima" });
  await moveMarketingUp.click();
  await moveMarketingUp.click();
  // exact: true — a página de Configurações também tem o botão "Salvar nova
  // senha" (seção Senha), que "Salvar" sem exact também casaria por substring.
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();

  await page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) }).click();
  await page.waitForURL("**/organizations/**");

  // Espera os cards de verdade renderizarem (não o skeleton de
  // carregamento) antes de inspecionar a ordem — sem isso, "Financeiro não
  // visível" passa trivialmente durante o loading (nada ainda renderizado),
  // e a leitura de allTextContents() abaixo captura uma lista vazia ou
  // parcial (o grid inteiro comita numa única passada do React, mas
  // allTextContents() não é uma asserção com retry — esperar explicitamente
  // pelos DOIS cards que a checagem de ordem abaixo depende evita ler a
  // lista um frame cedo demais).
  await expect(quickAccessSection.getByRole("link", { name: /Marketing/ })).toBeVisible();
  await expect(quickAccessSection.getByRole("link", { name: /Analytics/ })).toBeVisible();
  // Financeiro sumiu do Acesso rápido (continua existindo na sidebar,
  // por isso o escopo), Marketing agora vem antes de Analytics.
  await expect(quickAccessSection.getByRole("link", { name: /Financeiro/ })).not.toBeVisible();
  const cardTitles = await quickAccessSection.locator("a").allTextContents();
  const marketingIndex = cardTitles.findIndex((t) => t.includes("Marketing"));
  const analyticsIndex = cardTitles.findIndex((t) => t.includes("Analytics"));
  expect(marketingIndex).toBeGreaterThanOrEqual(0);
  expect(marketingIndex).toBeLessThan(analyticsIndex);

  // "Restaurar padrão" devolve os 7 cards na ordem original.
  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Restaurar padrão" }).click();
  await expect(page.getByLabel("Mostrar Financeiro")).toBeChecked();

  await page.getByRole("link", { name: new RegExp(`Voltar para ${orgName}`) }).click();
  await page.waitForURL("**/organizations/**");
  await expect(quickAccessSection.getByRole("link", { name: /Financeiro/ })).toBeVisible();
});
