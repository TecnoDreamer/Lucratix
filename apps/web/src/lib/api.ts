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
  // FormData (upload de arquivo) nunca leva Content-Type explicito — o
  // browser precisa gerar o boundary do multipart sozinho; forcar
  // application/json aqui quebraria o parsing no backend.
  const isFormData = init?.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "X-Requested-With": "XMLHttpRequest",
      ...init?.headers,
    },
  });
}

/** Repete o request uma vez apos tentar renovar o access token, exatamente
 * como `request()` abaixo — extraido para ser reaproveitado por
 * `downloadFile` (resposta binaria, nunca JSON, por isso nao usa `request`). */
async function _fetchWithRetry(path: string, init?: RequestInit): Promise<Response> {
  const res = await _rawFetch(path, init);
  if (res.status === 401 && !_AUTH_PATHS_WITHOUT_RETRY.has(path)) {
    const refreshRes = await _rawFetch(_REFRESH_PATH, { method: "POST" });
    if (refreshRes.ok) {
      return _rawFetch(path, init);
    }
  }
  return res;
}

async function _errorDetail(res: Response): Promise<string> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body.detail ?? detail;
  } catch {
    // resposta sem corpo JSON, mantem o statusText
  }
  return detail;
}

async function _toResult<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(res.status, await _errorDetail(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Access token expirado (15min) mas refresh token (7 dias) ainda pode ser
  // valido: _fetchWithRetry tenta renovar uma vez antes de propagar o 401
  // (issue #33).
  return _toResult<T>(await _fetchWithRetry(path, init));
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // Upload multipart (modulo de importacao de dados) — FormData, nunca JSON.
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};

/** Baixa um arquivo (modulo de exportacao de dados) — resposta binaria, nunca
 * JSON, por isso nao passa por `_toResult`. O nome do arquivo vem do
 * `Content-Disposition` que o backend já monta (`build_filename`); "export"
 * é só o fallback caso o header falte por algum motivo. */
export async function downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
  const res = await _fetchWithRetry(path);
  if (!res.ok) {
    throw new ApiError(res.status, await _errorDetail(res));
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return { blob: await res.blob(), filename: match ? match[1] : "export" };
}
