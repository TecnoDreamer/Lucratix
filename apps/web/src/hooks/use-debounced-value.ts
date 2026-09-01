import { useEffect, useState } from "react";

/** Atrasa a propagação de um valor que muda rápido (ex.: campo de busca)
 * até `delayMs` sem uma nova mudança — evita um request por tecla digitada.
 * Nenhum utilitário de debounce existia no projeto antes desta feature. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
