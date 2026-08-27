import { expect, test } from "@playwright/test";

/** Página pública /sobre — acessível sem login, com FAQ/glossário em
 * acordeão e navegação de volta para o login. */
test.describe("página Sobre", () => {
  test("carrega sem autenticação e mostra o conteúdo principal", async ({ page }) => {
    await page.goto("/sobre");

    await expect(page).toHaveTitle(/Sobre/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "O que é a Lucratix" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Perguntas frequentes" })).toBeVisible();
  });

  test("link 'Conheça a aplicação' no login leva até /sobre", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Conheça a aplicação" }).click();
    await expect(page).toHaveURL(/\/sobre$/);
  });

  test("link 'Voltar ao login' na página Sobre leva de volta ao login", async ({ page }) => {
    await page.goto("/sobre");
    await page.getByRole("link", { name: "Voltar ao login" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("FAQ abre e fecha ao clicar na pergunta", async ({ page }) => {
    await page.goto("/sobre");

    const question = page.getByRole("button", { name: "O que é a Lucratix?" });
    await expect(question).toHaveAttribute("aria-expanded", "false");

    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/business intelligence e analytics para quem gerencia/)).toBeVisible();

    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "false");
  });

  test("glossário da página abre um termo em acordeão", async ({ page }) => {
    await page.goto("/sobre");

    const term = page.getByRole("button", { name: "Baseline", exact: true });
    await term.click();
    await expect(term).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/preservado para sempre/)).toBeVisible();
  });

  test("CTA final leva ao cadastro", async ({ page }) => {
    await page.goto("/sobre");
    await page.getByRole("link", { name: "Criar minha conta" }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("sem scroll horizontal em telas pequenas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/sobre");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});
