// Logout automático por inatividade — ver components/idle-logout-watcher.tsx.
// 15 minutos coincide de propósito com ACCESS_TOKEN_EXPIRE_MINUTES=15
// (apps/api/app/core/config.py): o timeout de inatividade nunca fica mais
// frouxo que o próprio ciclo de vida do access token.
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const WARNING_BEFORE_MS = 60 * 1000;

// Chave compartilhada entre abas do mesmo navegador (localStorage, não
// sessionStorage) — atividade em UMA aba reseta a contagem de TODAS,
// evitando derrubar uma aba em uso só porque outra ficou parada.
export const LAST_ACTIVITY_STORAGE_KEY = "lucratix:last_activity_at";

// Só arma o watcher em área autenticada — nunca em página pública (evita
// sequer tentar deslogar quem nao esta logado). Allowlist deliberada (em
// vez de negar só as rotas públicas conhecidas): a segurança de verdade é
// sempre imposta pelo backend (cookie HttpOnly/RN-013); esta camada é
// UX/defesa em profundidade, então uma área autenticada nova que esqueça
// de entrar aqui não é uma regressão de segurança, só uma lacuna de UX a
// completar depois.
const PRIVATE_PATH_PREFIXES = ["/organizations", "/conta", "/admin"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
