import Image from "next/image";

/**
 * Logo oficial da Lucratix — ver docs/branding/LUCRATIX_BRAND.md.
 *
 * `variant="mark"` usa a peça completa (troféu ilustrado), pensada para
 * lugares grandes onde o detalhe se sustenta (painel de marca do login,
 * loading institucional). `variant="wordmark"` usa o recorte compacto só da
 * placa "Lucratix" (mais legível em proporções estreitas), pensado para
 * header/sidebar. Nenhuma das duas variantes deve ser usada em tamanhos
 * muito pequenos (abaixo de ~28px de altura) — nesse caso, prefira texto
 * estilizado com as cores de marca (ver `--brand-primary`/`--brand-accent`
 * em globals.css) em vez do logo (ver auditoria da marca, seção sobre
 * favicon, e app/icon.tsx, que gera o favicon como texto, não como recorte
 * do logo).
 */
export function BrandLogo({
  variant = "mark",
  className,
  priority,
}: {
  variant?: "mark" | "wordmark";
  className?: string;
  priority?: boolean;
}) {
  const src =
    variant === "mark" ? "/brand/lucratix-mark.png" : "/brand/lucratix-wordmark.png";
  const width = variant === "mark" ? 1024 : 1006;
  const height = variant === "mark" ? 1522 : 410;

  return (
    <Image
      src={src}
      alt="Lucratix"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
