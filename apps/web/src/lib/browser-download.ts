/** Dispara o download de um `Blob` já pronto no navegador (link temporário
 * com `URL.createObjectURL`) — extraído de `export-panel.tsx` para ser
 * reaproveitado também pela exportação de gráfico do Analytics
 * (`analytics-export.ts`), em vez de duplicar a mesma lógica duas vezes. */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
