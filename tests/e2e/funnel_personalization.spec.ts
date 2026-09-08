import { expect, test, type Page } from "@playwright/test";
import { createOrganization, registerAndLogin } from "./helpers";

const PRESET_GROUP = "Predefinição";

async function goToFunnel(page: Page, orgName: string): Promise<void> {
  await registerAndLogin(page, "funnel-personalization-e2e");
  await createOrganization(page, orgName);
  await page.getByRole("link", { name: orgName }).click();
  await page.waitForURL("**/organizations/**");

  // Abaixo do breakpoint `lg`, a sidebar vira um drawer atrás do botão
  // "Abrir menu" (ver organizations/[id]/layout.tsx) — o link "Funil" só
  // fica clicável depois de abrir o drawer. Acima de `lg`, esse botão nem
  // existe no DOM, daí o count() antes de tentar clicar.
  const openMenu = page.getByRole("button", { name: "Abrir menu" });
  if (await openMenu.count()) {
    await openMenu.click();
  }
  await page.getByRole("link", { name: "Funil", exact: true }).click();
  await page.waitForURL("**/funnel");
}

/** Lança um período com dado em toda etapa aplicável — sem isso os
 * gráficos ficam no estado "sem dados suficientes" (RN-003, ver
 * funnel-stages-chart.tsx) e não há nada pra personalizar/inspecionar.
 * A seção de análise (KPIs/gráficos) busca de novo sozinha assim que o
 * período é salvo (`analyticsReloadToken` em funnel/page.tsx) — sem
 * reload manual da página. */
async function launchPeriodWithData(page: Page): Promise<void> {
  await page.getByLabel("Impressões", { exact: true }).fill("100000");
  await page.getByLabel("Visitas", { exact: true }).fill("20000");
  await page.getByLabel("Leads", { exact: true }).fill("4000");
  await page.getByLabel("MQLs", { exact: true }).fill("2000");
  await page.getByLabel("SQLs", { exact: true }).fill("800");
  await page.getByLabel("Oportunidades", { exact: true }).fill("400");
  await page.getByLabel("Clientes", { exact: true }).fill("120");
  await page.getByLabel("Recompras", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Salvar período" }).click();
  // Linha nova na tabela de lançamentos confirma que o PUT terminou.
  await expect(page.getByRole("cell", { name: "100.000" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Funil" })).toBeVisible();
}

test.describe("Personalização de gráficos do Funil — persistência (PR3)", () => {
  test("aplicar um preset persiste entre reloads; 'Restaurar padrão' também persiste", async ({
    page,
  }) => {
    const orgName = `Empresa Funil E2E ${Date.now()}`;
    await goToFunnel(page, orgName);
    await launchPeriodWithData(page);

    // KPIs e labels externos refletem o período lançado (RN-003 / PR1): o
    // gráfico do funil sai do estado "sem dados" assim que há uma etapa
    // aplicável.
    const funnelChart = page.getByRole("img", { name: "Funil" });
    await expect(funnelChart).toBeVisible();
    await expect(page.getByText("Leads", { exact: true }).first()).toBeVisible();

    // Hover no gráfico de Conversão por etapa mostra o tooltip rico (taxa,
    // valores absolutos, perda — seção 4 do prompt de redesign). Ancora no
    // próprio label do eixo de categoria de uma transição específica (mais
    // preciso que estimar a posição de uma barra a partir de frações da
    // altura do container).
    const conversionChart = page.getByRole("img", { name: "Conversão por etapa" });
    await expect(conversionChart).toBeVisible();
    // Sem a etapa de reload que existia antes desta correção (que também
    // resetava o scroll pro topo da página), o scroll continua onde ficou
    // depois de preencher o formulário de lançamento manual — bem mais
    // abaixo do gráfico de conversão. `page.mouse.move` usa coordenadas do
    // viewport, então precisa do elemento visível na tela antes de calcular
    // a posição do hover, não só "visível" no sentido de CSS.
    await conversionChart.scrollIntoViewIfNeeded();
    const firstRowLabel = conversionChart.getByText("Impressões →Visitas", { exact: true });
    await expect(firstRowLabel).toBeVisible();
    const labelBox = await firstRowLabel.boundingBox();
    const chartBox = await conversionChart.boundingBox();
    if (!labelBox || !chartBox) {
      throw new Error("Gráfico de conversão sem bounding box — não renderizou.");
    }
    const tooltip = page.getByRole("tooltip");
    await page.mouse.move(chartBox.x + chartBox.width * 0.6, labelBox.y + labelBox.height / 2);
    await expect(tooltip).toBeVisible();
    await expect(tooltip.getByText("Taxa de conversão")).toBeVisible();
    // Tira o mouse de cima antes de continuar, pra não deixar o tooltip
    // aberto atrapalhando os cliques seguintes.
    await page.mouse.move(0, 0);

    // Personalizar o gráfico do Funil: abre o dialog, troca pro preset
    // "Analítico" e aplica.
    const funnelHeader = page.getByRole("heading", { level: 3, name: "Funil", exact: true }).locator("..");
    await funnelHeader.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Analítico" }).click();

    const applyPatch = page.waitForResponse(
      (resp) => resp.url().includes("/chart-preferences/funnel-stages") && resp.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Aplicar" }).click();
    await applyPatch;
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Recarrega a página — a preferência precisa vir do backend, não de
    // estado de sessão (é exatamente isso que esta PR muda).
    await page.reload();
    await page.waitForURL("**/funnel");
    await expect(page.getByRole("heading", { level: 3, name: "Funil", exact: true })).toBeVisible();

    const funnelHeaderAfterReload = page
      .getByRole("heading", { level: 3, name: "Funil", exact: true })
      .locator("..");
    await funnelHeaderAfterReload.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(
      page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Analítico" })
    ).toHaveAttribute("aria-pressed", "true");

    // "Restaurar padrão" (dentro do dialog) + "Aplicar" também persiste —
    // grava o objeto concreto do preset "Padrão", não apaga a preferência
    // (ver docs/charts/PERSONALIZACAO_DE_GRAFICOS.md: simplificação
    // deliberada da PR3).
    await page.getByRole("button", { name: "Restaurar padrão" }).click();
    const restorePatch = page.waitForResponse(
      (resp) => resp.url().includes("/chart-preferences/funnel-stages") && resp.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Aplicar" }).click();
    await restorePatch;

    await page.reload();
    await page.waitForURL("**/funnel");
    const funnelHeaderAfterRestore = page
      .getByRole("heading", { level: 3, name: "Funil", exact: true })
      .locator("..");
    await funnelHeaderAfterRestore.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(
      page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Padrão" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("preferência é por gráfico: personalizar o Funil não muda a Conversão por etapa", async ({
    page,
  }) => {
    const orgName = `Empresa Funil E2E Isolamento ${Date.now()}`;
    await goToFunnel(page, orgName);
    await launchPeriodWithData(page);

    const funnelHeader = page.getByRole("heading", { level: 3, name: "Funil", exact: true }).locator("..");
    await funnelHeader.getByRole("button", { name: "Personalizar gráfico" }).click();
    await page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Compacto" }).click();
    const patch = page.waitForResponse(
      (resp) => resp.url().includes("/chart-preferences/funnel-stages") && resp.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Aplicar" }).click();
    await patch;

    const conversionHeader = page
      .getByRole("heading", { level: 3, name: "Conversão por etapa", exact: true })
      .locator("..");
    await conversionHeader.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(
      page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Padrão" })
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Personalização de gráficos do Funil — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("abrir, aplicar preset e recarregar funciona no viewport mobile", async ({ page }) => {
    const orgName = `Empresa Funil E2E Mobile ${Date.now()}`;
    await goToFunnel(page, orgName);
    await launchPeriodWithData(page);

    const funnelHeader = page.getByRole("heading", { level: 3, name: "Funil", exact: true }).locator("..");
    await funnelHeader.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Apresentação" }).click();

    const patch = page.waitForResponse(
      (resp) => resp.url().includes("/chart-preferences/funnel-stages") && resp.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Aplicar" }).click();
    await patch;

    await page.reload();
    await page.waitForURL("**/funnel");
    const funnelHeaderAfterReload = page
      .getByRole("heading", { level: 3, name: "Funil", exact: true })
      .locator("..");
    await funnelHeaderAfterReload.getByRole("button", { name: "Personalizar gráfico" }).click();
    await expect(
      page.getByRole("group", { name: PRESET_GROUP }).getByRole("button", { name: "Apresentação" })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
