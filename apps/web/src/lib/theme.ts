export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage indisponivel (modo privado, etc.) — cai no padrao.
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preferencia so nao persiste entre sessoes; tema ainda se aplica agora.
  }
  applyTheme(theme);
}

/** Mantem o tema em dia se o SO mudar de claro/escuro enquanto "Sistema" estiver ativo. */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(SYSTEM_DARK_QUERY);
  const listener = () => {
    if (getStoredTheme() === "system") onChange();
  };
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Script inline (sem interpolacao de dado externo) para aplicar o tema
 * salvo ANTES da primeira pintura, evitando o "flash" de tema errado. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("${SYSTEM_DARK_QUERY}").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
