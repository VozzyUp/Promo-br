import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renderização dinâmica clássica na fase da fatia vertical; reavaliar cacheComponents depois.
  output: "standalone",
  poweredByHeader: false,
  // Publicar aceita até 8 imagens de 3 MB no mesmo envio.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
