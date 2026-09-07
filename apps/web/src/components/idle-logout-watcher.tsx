"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { IDLE_TIMEOUT_MS, LAST_ACTIVITY_STORAGE_KEY, WARNING_BEFORE_MS, isPrivatePath } from "@/lib/idle-timeout";
import { ConfirmDialog } from "@/components/confirm-dialog";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
// Nao grava a cada pixel de mouse — 1x a cada 5s ja e granularidade de
// sobra pra um timeout medido em minutos, e evita escrever no localStorage
// (compartilhado entre abas) sem parar.
const ACTIVITY_WRITE_THROTTLE_MS = 5000;
const CHECK_INTERVAL_MS = 5000;

function readLastActivity(): number {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) : null;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function writeLastActivity(now: number): void {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
  } catch {
    // localStorage indisponivel (modo privado restritivo, quota) -- o
    // watcher continua funcionando so pra esta aba, via estado em memoria
    // (readLastActivity cai no Date.now() atual, nunca um erro visivel).
  }
}

/** Desloga a sessao apos IDLE_TIMEOUT_MS de inatividade, com aviso
 * WARNING_BEFORE_MS antes — sem UI propria fora do aviso, montado
 * globalmente em app/layout.tsx (mesmo padrao de ThemeWatcher/LocaleSync).
 * So arma em area autenticada (isPrivatePath) e sincroniza entre abas via
 * localStorage (nunca so o estado local do componente). */
export function IdleLogoutWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("idleLogout");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const loggingOutRef = useRef(false);

  const active = isPrivatePath(pathname);

  const touchActivity = useCallback(() => {
    writeLastActivity(Date.now());
    setSecondsLeft(null);
  }, []);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await api.post("/api/v1/auth/logout");
      router.push("/login?reason=idle_timeout");
    } catch {
      // 401 (sessao ja nao existia -- ex.: deslogado em outra aba) ou erro
      // de rede: nunca redireciona quem nao se sabe ao certo que estava
      // autenticado. Empurra a contagem pra frente pra nao tentar de novo
      // a cada 5s enquanto a aba continuar parada na mesma pagina privada.
      writeLastActivity(Date.now());
    } finally {
      loggingOutRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (!active) return;

    writeLastActivity(readLastActivity());

    let lastWrite = 0;
    function handleActivity() {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWrite = now;
      touchActivity();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    const interval = setInterval(() => {
      if (loggingOutRef.current) return;
      const idleFor = Date.now() - readLastActivity();
      if (idleFor >= IDLE_TIMEOUT_MS) {
        void logout();
      } else if (idleFor >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleFor) / 1000)));
      } else {
        setSecondsLeft(null);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      clearInterval(interval);
    };
  }, [active, logout, touchActivity]);

  if (!active || secondsLeft === null) return null;

  return (
    <ConfirmDialog
      open
      title={t("title")}
      description={t("description", { seconds: secondsLeft })}
      confirmLabel={t("stayLabel")}
      cancelLabel={t("logoutNowLabel")}
      onConfirm={touchActivity}
      onCancel={() => void logout()}
    />
  );
}
