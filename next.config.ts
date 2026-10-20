import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renderização dinâmica clássica na fase da fatia vertical; reavaliar cacheComponents depois.
  output: "standalone",
  poweredByHeader: false,
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
