// Em producao (Vercel) nao aponta direto para o backend: fica em branco
// (caminho relativo) e o rewrite de next.config.ts repassa /api/* para o
// Railway, mantendo tudo na mesma origem para o cookie de sessao funcionar.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Precisa ser identico ao texto de SESSION_REVOKED_DETAIL em
// apps/api/app/core/security.py — comparado por igualdade exata para
// distinguir "sessao encerrada por login em outro dispositivo" (RN-013)
// de qualquer outro 401 generico. Ver loginRedirectPath abaixo.
export const SESSION_REVOKED_MESSAGE =
  "Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo.";

export function isSessionRevokedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401 && err.message === SESSION_REVOKED_MESSAGE;
}

/** Rota de login a usar ao redirecionar apos um 401: preserva o motivo
 * quando a sessao foi encerrada por login em outro dispositivo, para que
 * /login mostre a mensagem amigavel em vez de uma tela de login generica. */
export function loginRedirectPath(err: unknown): string {
  return isSessionRevokedError(err) ? "/login?reason=session_revoked" : "/login";
}

const _REFRESH_PATH = "/api/v1/auth/refresh";
const _AUTH_PATHS_WITHOUT_RETRY = new Set(["/api/v1/auth/login", _REFRESH_PATH]);

async function _rawFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...init?.headers,
    },
  });
}

async function _toResult<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // resposta sem corpo JSON, mantem o statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await _rawFetch(path, init);

  // Access token expirado (15min) mas refresh token (7 dias) ainda pode ser
  // valido: tenta renovar uma vez antes de propagar o 401 (issue #33).
  if (res.status === 401 && !_AUTH_PATHS_WITHOUT_RETRY.has(path)) {
    const refreshRes = await _rawFetch(_REFRESH_PATH, { method: "POST" });
    if (refreshRes.ok) {
      const retryRes = await _rawFetch(path, init);
      return _toResult<T>(retryRes);
    }
  }

  return _toResult<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
