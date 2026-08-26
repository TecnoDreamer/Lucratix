import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cartao de compartilhamento social (Open Graph/Twitter) — texto e cores de
// marca, sem embutir logo.png (o troféu ilustrado nao renderiza bem em
// composicoes de texto+imagem via ImageResponse sem custo de fetch/base64
// desproporcional a este uso). Mesma paleta do favicon (app/icon.tsx).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #001640 0%, #0052e0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: "#ffffff" }}>Lucra</span>
          <span style={{ color: "#f0a800" }}>tix</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 32, color: "#dbe4ff" }}>
          Business Intelligence e Analytics
        </div>
      </div>
    ),
    { ...size }
  );
}
