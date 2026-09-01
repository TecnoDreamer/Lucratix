import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Logotipo de organização (feature de gestão de empresas, 2026-09-01) —
    // hospedado no Cloudinary, precisa estar na allowlist pro next/image
    // conseguir otimizar/servir a imagem remota.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    // Faz o navegador falar so com este dominio (mesma origem), repassando
    // por tras para o backend (Railway). Isso evita ter que trocar o cookie
    // de auth para SameSite=None so por causa do deploy em dominios
    // diferentes — ver conversa sobre deploy (ADR-0004 continua valendo).
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
