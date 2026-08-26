import { ImageResponse } from "next/og";

// Mesmo raciocinio de app/icon.tsx (favicon), em 180x180 — tamanho padrao
// esperado para o icone de tela inicial no iOS/iPadOS.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 100,
          color: "#f0a800",
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
