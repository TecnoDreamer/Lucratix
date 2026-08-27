import Image from "next/image";

/**
 * Logo oficial da Lucratix — ver docs/branding/LUCRATIX_BRAND.md.
 *
 * `variant="mark"` usa a peça completa (troféu ilustrado), pensada para
 * lugares grandes onde o detalhe se sustenta (painel de marca do login,
 * loading institucional). `variant="wordmark"` usa o recorte compacto só da
 * placa "Lucratix" (mais legível em proporções estreitas), pensado para
 * header/sidebar — recorte de `lucratix-mark.png` na faixa y=[1100,1522]
 * (base + coroa de louros, sem a haste/colar da taça acima; ver
 * `docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md` sobre o recorte anterior,
 * que cortava a haste no meio da forma). Nenhuma das duas variantes deve ser
 * usada em tamanhos muito pequenos (abaixo de ~28px de altura) — nesse caso, prefira texto
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
  const width = 1024;
  const height = variant === "mark" ? 1522 : 422;
  // Maior largura renderizada real de cada variante em todo o app hoje —
  // "mark" chega a 300px (clamp em auth-hero.tsx), "wordmark" no máximo a
  // ~155px (h-16). Sem isso, o next/image mira a largura intrínseca inteira
  // (1024px) e serve uma imagem ~7-12x maior que o necessário (medido:
  // 57KB/584ms para um logo exibido a 64px de altura — ver
  // docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md, seção 4).
  const sizes = variant === "mark" ? "320px" : "160px";

  return (
    <Image
      src={src}
      alt="Lucratix"
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
