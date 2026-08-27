import { expect, test, type Page } from "@playwright/test";

/** Seções 51-52 do prompt de layout/performance: garante que o troféu não
 * está sendo cortado — bounding box real do <img> maior que zero e imagem
 * efetivamente carregada (naturalWidth/naturalHeight > 0), tanto no logo do
 * painel de marca (desktop) quanto no logo mobile duplicado. */

// Diagnóstico do teste flaky observado no PR #77 (variação de 5-14px em
// `x + width <= heroBox.x + heroBox.width + 1`, sem regressão visual real):
// o troféu tem uma animação de entrada (`trophy-spin-in`, 900ms, rotate
// 0→360deg + scale 0.9→1 — ver `.trophy-mark` em globals.css). Uma imagem
// retangular rotacionada tem uma bounding box AXIS-ALIGNED maior que a
// imagem parada (a diagonal "estoura" os cantos enquanto gira). Medido
// diretamente (amostrando o boundingBox real em vários instantes após o
// mount, sem alterar a duração real da animação): o overflow à direita
// passa de -48px (estado parado, dentro do painel com folga) para até
// +29px por volta de t=100-200ms, voltando ao valor de repouso perto de
// t=900ms — a mesma janela onde a CI ocasionalmente mede. CPU throttling
// (Emulation.setCPUThrottlingRate) não reproduz o problema: rotate/scale
// aqui rodam no compositor, não na main thread, então não são afetados por
// throttling de JS — a variável real é o instante (em wall-clock) em que
// `boundingBox()` é chamado em relação ao início da animação, não a
// velocidade de execução do runner.
//
// A correção não é só aumentar a tolerância (o overshoot de pico chega a
// ~29px — uma tolerância grande o bastante pra cobrir isso aceitaria
// também um corte de verdade). A correção é estabilizar o momento da
// medição: `prefers-reduced-motion: reduce` já é tratado globalmente em
// globals.css (força animation-duration/transition-duration para 0.01ms) —
// confirmado experimentalmente que, com isso emulado, o boundingBox fica
// no valor de repouso mesmo medindo em t=0ms (não há mais janela de risco
// nenhuma). A tolerância pequena abaixo cobre só arredondamento/sub-pixel
// de layout, não mais a animação.
const LAYOUT_TOLERANCE_PX = 2;

async function emulateStableLayout(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Confirma que `inner` cabe inteiro dentro de `outer` nos 4 lados, com uma
 * pequena tolerância nomeada para ruído de sub-pixel/arredondamento — não
 * para mascarar um elemento realmente maior que o container. */
function expectContainedWithin(inner: Box, outer: Box, tolerancePx: number): void {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - tolerancePx);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - tolerancePx);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + tolerancePx);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + tolerancePx);
}

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
    // Estabiliza o momento da medição — ver diagnóstico acima. Sem isso, a
    // animação de entrada do troféu (rotate+scale) pode estar em andamento
    // no instante em que o boundingBox() é lido, com overshoot de até ~29px.
    await emulateStableLayout(page);
    await page.goto("/login");

    // O wordmark pequeno virou texto ("Lucra"+"tix", ver auth-hero.tsx) —
    // só o troféu grande é <img> no painel de marca.
    const allLogos = page.locator('img[alt="Lucratix"]:visible');
    await expect(allLogos).toHaveCount(1);

    const trophy = allLogos.first();
    const trophyBox = await trophy.boundingBox();
    expect(trophyBox).not.toBeNull();
    if (!trophyBox) throw new Error("Não foi possível medir o troféu do painel de marca.");
    expect(trophyBox.width).toBeGreaterThan(100);
    expect(trophyBox.height).toBeGreaterThan(100);

    const heroPanel = page.locator(".overflow-hidden.bg-gradient-to-br");
    const heroBox = await heroPanel.boundingBox();
    expect(heroBox).not.toBeNull();
    if (!heroBox) throw new Error("Não foi possível medir o painel de marca.");

    // O troféu precisa caber inteiro dentro do painel — se ultrapassar, o
    // `overflow-hidden` do painel corta a imagem (mesma classe de bug do
    // recorte antigo, agora em outra camada).
    expectContainedWithin(trophyBox, heroBox, LAYOUT_TOLERANCE_PX);
  });

  test("desktop: wordmark pequeno é texto ('Lucra' azul + 'tix' dourado), não mais imagem", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");

    const wordmark = page.getByText("Lucratix", { exact: true }).first();
    await expect(wordmark).toBeVisible();

    const lucra = wordmark.getByText("Lucra", { exact: true });
    const tix = wordmark.getByText("tix", { exact: true });
    await expect(lucra).toBeVisible();
    await expect(tix).toBeVisible();

    const lucraColor = await lucra.evaluate((el) => getComputedStyle(el).color);
    const tixColor = await tix.evaluate((el) => getComputedStyle(el).color);
    expect(lucraColor).not.toBe(tixColor);
  });

  test("mobile: logo usa o troféu completo (mark), não o recorte compacto (wordmark)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const logo = page.locator('img[alt="Lucratix"]:visible').first();
    await expect(logo).toBeVisible();

    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    const src = await logo.evaluate((img: HTMLImageElement) => img.currentSrc);
    expect(src).toContain("lucratix-mark.png");
  });

  for (const width of [320, 375, 390, 430]) {
    test(`mobile ${width}px: sem scroll horizontal e logo cabe na tela`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/login");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      const logo = page.locator('img[alt="Lucratix"]:visible').first();
      const box = await logo.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });
  }

  test("cadastro/recuperação de senha: mesmo tratamento do logo mobile (consistência entre telas)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 });

    for (const path of ["/register", "/esqueci-senha"]) {
      await page.goto(path);
      const logo = page.locator('img[alt="Lucratix"]:visible').first();
      await expect(logo).toBeVisible();
      const src = await logo.evaluate((img: HTMLImageElement) => img.currentSrc);
      expect(src).toContain("lucratix-mark.png");
    }
  });
});
