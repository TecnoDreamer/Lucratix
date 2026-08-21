import { defineConfig, devices } from "@playwright/test";

/**
 * Espera que o front-end (Next.js) e a API (FastAPI, com Postgres migrado)
 * ja estejam rodando — ver .github/workflows/e2e-ci.yml para como o CI sobe
 * os dois antes de rodar os testes. Para rodar localmente:
 *   docker compose up -d db && npm run migrate
 *   (em um terminal) cd apps/api && uvicorn app.main:app
 *   (em outro)       cd apps/web && npm run build && npm start
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
