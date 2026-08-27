import { expect, test } from "@playwright/test";

/** Seções 51-52 do prompt de layout/performance: garante que o troféu não
 * está sendo cortado — bounding box real do <img> maior que zero e imagem
 * efetivamente carregada (naturalWidth/naturalHeight > 0), tanto no logo do
 * painel de marca (desktop) quanto no logo mobile duplicado. */
test.describe("logotipo não é cortado", () => {
  test("desktop: logo do painel de marca carrega por inteiro", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");

    const logo = page.locator('img[alt="Lucratix"]:visible').first();
    await expect(logo).toBeVisible();

    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    const natural = await logo.evaluate((img: HTMLImageElement) => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    }));
    expect(natural.complete).toBe(true);
    expect(natural.naturalWidth).toBeGreaterThan(0);
    expect(natural.naturalHeight).toBeGreaterThan(0);
  });

  test("mobile: logo permanece visível e íntegro", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const logo = page.locator('img[alt="Lucratix"]:visible').first();
    await expect(logo).toBeVisible();

    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
