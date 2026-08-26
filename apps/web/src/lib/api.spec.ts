import { describe, expect, it } from "vitest";
import { ApiError, SESSION_REVOKED_MESSAGE, isSessionRevokedError, loginRedirectPath } from "./api";

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
