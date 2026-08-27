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

  test("desktop: troféu grande do painel de marca não é cortado pelo overflow-hidden", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");

    const allLogos = page.locator('img[alt="Lucratix"]:visible');
    await expect(allLogos).toHaveCount(2); // wordmark pequeno + troféu grande

    const trophy = allLogos.nth(1);
    const trophyBox = await trophy.boundingBox();
    expect(trophyBox).not.toBeNull();
    expect(trophyBox!.width).toBeGreaterThan(100);
    expect(trophyBox!.height).toBeGreaterThan(100);

    const heroPanel = page.locator(".overflow-hidden.bg-gradient-to-br");
    const heroBox = await heroPanel.boundingBox();
    expect(heroBox).not.toBeNull();

    // O troféu precisa caber inteiro dentro do painel — se ultrapassar, o
    // `overflow-hidden` do painel corta a imagem (mesma classe de bug do
    // recorte antigo, agora em outra camada).
    expect(trophyBox!.x).toBeGreaterThanOrEqual(heroBox!.x);
    expect(trophyBox!.x + trophyBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width + 1);
    expect(trophyBox!.y).toBeGreaterThanOrEqual(heroBox!.y);
    expect(trophyBox!.y + trophyBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height + 1);
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
