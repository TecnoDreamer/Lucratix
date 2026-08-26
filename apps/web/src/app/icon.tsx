import { ImageResponse } from "next/og";

// Favicon gerado por codigo, nao recortado de logo.png: o troféu ilustrado
// da marca (coroa, fitas, grinalda) perde toda a legibilidade em 32x32 —
// ver docs/branding/LUCRATIX_BRAND.md. Um "L" estilizado nas cores de marca
// (--brand-secondary / --brand-accent, mesmos tons amostrados de logo.png)
// se sustenta em qualquer tamanho de aba de navegador.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#001640",
          borderRadius: 7,
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: "#f0a800",
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
