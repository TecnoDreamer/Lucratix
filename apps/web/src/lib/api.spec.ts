import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  SESSION_REVOKED_MESSAGE,
  api,
  downloadFile,
  isSessionRevokedError,
  loginRedirectPath,
} from "./api";

describe("isSessionRevokedError", () => {
  it("reconhece um 401 com a mensagem exata de sessao revogada", () => {
    const err = new ApiError(401, SESSION_REVOKED_MESSAGE);
    expect(isSessionRevokedError(err)).toBe(true);
  });

  it("ignora um 401 generico com outra mensagem", () => {
    const err = new ApiError(401, "Sessao invalida ou expirada");
    expect(isSessionRevokedError(err)).toBe(false);
  });

  it("ignora outros status codes mesmo com a mensagem identica", () => {
    const err = new ApiError(403, SESSION_REVOKED_MESSAGE);
    expect(isSessionRevokedError(err)).toBe(false);
  });

  it("ignora erros que nao sao ApiError", () => {
    expect(isSessionRevokedError(new Error(SESSION_REVOKED_MESSAGE))).toBe(false);
    expect(isSessionRevokedError(null)).toBe(false);
  });
});

describe("loginRedirectPath", () => {
  it("preserva o motivo quando a sessao foi revogada", () => {
    const err = new ApiError(401, SESSION_REVOKED_MESSAGE);
    expect(loginRedirectPath(err)).toBe("/login?reason=session_revoked");
  });

  it("aponta para /login sem motivo para qualquer outro erro", () => {
    expect(loginRedirectPath(new ApiError(401, "Sessao invalida ou expirada"))).toBe("/login");
    expect(loginRedirectPath(new Error("rede indisponivel"))).toBe("/login");
  });
});

// Módulo de importação/exportação de dados (2026-08-29) — postForm (upload
// multipart), del (cancelar import) e downloadFile (baixar export) são as
// únicas adições ao cliente HTTP desde a introdução deste arquivo; testadas
// contra um mock de `fetch` global, diferente do resto do arquivo (que só
// testa funções puras) porque são elas mesmas quem monta o `Request`.
describe("api client (fetch)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("postForm envia o FormData como body sem forçar Content-Type json", async () => {
    const formData = new FormData();
    formData.append("domain", "financial_periods");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));

    await api.postForm("/api/v1/organizations/org-1/imports", formData);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(formData);
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("del envia método DELETE", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await api.del("/api/v1/organizations/org-1/imports/job-1");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });

  describe("downloadFile", () => {
    it("devolve o blob e o nome do arquivo a partir do Content-Disposition", async () => {
      // Corpo string (nao um Blob já pronto): mais fiel a uma resposta HTTP
      // de verdade, que sempre chega como bytes/stream — `res.blob()` é quem
      // constrói o Blob, exatamente como no fluxo real do navegador.
      vi.mocked(fetch).mockResolvedValue(
        new Response("a,b\n1,2", {
          status: 200,
          headers: { "Content-Disposition": 'attachment; filename="financial_periods_export.csv"' },
        })
      );

      const result = await downloadFile(
        "/api/v1/organizations/org-1/exports/financial_periods?format=csv"
      );

      expect(result.filename).toBe("financial_periods_export.csv");
      expect(await result.blob.text()).toBe("a,b\n1,2");
    });

    it("usa 'export' como nome padrão quando o header está ausente", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("x", { status: 200 }));

      const result = await downloadFile(
        "/api/v1/organizations/org-1/exports/financial_periods?format=csv"
      );

      expect(result.filename).toBe("export");
    });

    it("levanta ApiError com o detail do corpo JSON quando a resposta falha", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ detail: "Domínio não suportado." }), { status: 400 })
      );

      await expect(
        downloadFile("/api/v1/organizations/org-1/exports/leads?format=csv")
      ).rejects.toThrow("Domínio não suportado.");
    });
  });

  describe("_errorDetail (via api.post)", () => {
    it("converte o array de erros de validação do FastAPI/Pydantic (422) numa string legível", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [
              { type: "missing", loc: ["body", "name"], msg: "Field required" },
              { type: "missing", loc: ["body", "email"], msg: "Field required" },
            ],
          }),
          { status: 422 }
        )
      );

      await expect(api.post("/api/v1/auth/register", {})).rejects.toThrow(
        "Field required; Field required"
      );
    });
  });
});
