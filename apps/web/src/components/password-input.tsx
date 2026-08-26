"use client";

import { useState, type KeyboardEvent } from "react";
import { IconEye, IconEyeOff, IconLock } from "@/components/icons";
import { input as inputClass, label as labelClass } from "@/lib/ui";

/**
 * Campo de senha reutilizável — mostrar/ocultar (seção 20 do prompt de
 * autenticação) e aviso de Caps Lock (seção 30). Mantém a mesma estrutura
 * de `<label>` (texto + input aninhado, sem `htmlFor`/`id` explícitos) dos
 * demais campos do formulário, para não quebrar `getByLabel` nos testes —
 * ver comentário em `lib/ui.ts`. O aviso de Caps Lock fica FORA do
 * `<label>` propositalmente: texto dentro do label alteraria o nome
 * acessível do input (ex.: "Senha Caps Lock está ativado").
 */
export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") {
      setCapsLockOn(event.getModifierState("CapsLock"));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>
        {label}
        <span className="relative">
          <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type={visible ? "text" : "password"}
            required={required}
            minLength={minLength}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            onBlur={() => setCapsLockOn(false)}
            className={`${inputClass} pl-9 pr-10`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      {capsLockOn && (
        <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
          Caps Lock está ativado.
        </p>
      )}
    </div>
  );
}
