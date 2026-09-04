import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, uniqueEmail } from "./helpers";

// `page.request` usa a `baseURL` do playwright.config.ts (localhost:3000,
// o Next.js), NAO a resolucao de API_URL do proprio app (apps/web/src/lib/api.ts)
// -- aquela so roda dentro do JS que a pagina carrega no browser. Em
// dev/CI o rewrite de next.config.ts fica desativado (sem BACKEND_URL
// configurado, so NEXT_PUBLIC_API_URL) -- a mesma configuracao usada em
// .github/workflows/e2e-ci.yml e no docker-compose.yml local -- entao os
// caminhos relativos de /api/* dao 404 aqui. Precisa do endereco absoluto
// da API pras chamadas diretas deste teste (o resto do form/UI ja
// funciona via localhost:8000 porque e assim que o proprio app resolve
// API_URL fora de producao).
const API_URL = "http://localhost:8000";

test("fluxo abusivo de login: excesso de tentativas falhas bloqueia por IP e o login legitimo funciona apos o cooldown", async ({
  page,
}) => {
  // Timeout padrao (30s) nao cabe o cooldown real de 65s esperado abaixo.
  test.setTimeout(120_000);

  const email = uniqueEmail("abuso-login");
  await page.request.post(`${API_URL}/api/v1/auth/register`, {
    data: { name: "Usuário E2E", email, password: TEST_PASSWORD },
  });

  // login_ip_rate_limiter (apps/api/app/core/rate_limit.py): 30 tentativas /
  // 60s por IP. Uma conta nova a cada tentativa isola a dimensao de IP
  // (password-spray) -- se fosse sempre a MESMA conta, o limiter de CONTA
  // (10 tentativas / 300s) travaria primeiro e o cooldown seria de 5
  // minutos, caro demais pra rodar em CI a cada suite. Essa protecao por
  // conta unica ja esta coberta nos testes de integracao/seguranca do
  // backend (tests/security/test_rate_limiting.py) -- nao precisa de E2E
  // pra provar de novo, so a experiencia ponta a ponta do bloqueio por IP.
  // Teto de 40 tentativas (em vez de exatamente 30) cobre o caso de outros
  // specs do mesmo arquivo ja terem consumido parte da janela do mesmo IP
  // (playwright.config.ts roda com workers: 1 -- todos os specs
  // compartilham o mesmo processo de API, logo o mesmo estado em memoria
  // do RateLimiter).
  let blocked = false;
  for (let i = 0; i < 40 && !blocked; i++) {
    const resp = await page.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: uniqueEmail(`spray-${i}`), password: "SenhaErrada123!" },
    });
    if (resp.status() === 429) {
      blocked = true;
    } else {
      expect(resp.status()).toBe(401);
    }
  }
  expect(blocked).toBe(true);

  // A UI, com a conta real (registrada no inicio do teste), mostra a
  // mensagem amigavel do backend em vez de "Credenciais invalidas" enquanto
  // o IP estiver bloqueado -- RNF-005/secao 16 do prompt de hardening.
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Muitas tentativas de login")).toBeVisible();

  // Cooldown: depois que a janela de 60s do limiter de IP expira, o login
  // legitimo com a senha correta funciona normalmente -- fecha o loop
  // "protecao -> mensagem adequada -> cooldown -> recuperacao esperada"
  // pedido pela secao 25 do prompt de hardening.
  await page.waitForTimeout(65_000);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/organizations");
  await expect(page.getByRole("heading", { name: "Suas empresas" })).toBeVisible();
});
