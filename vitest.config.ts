import { defineConfig } from "vitest/config";

// Os testes ponta a ponta (e2e/) rodam no Playwright, não no Vitest.
export default defineConfig({ test: { include: ["tests/**/*.test.{ts,tsx}"], exclude: ["e2e/**", "node_modules/**"] } });
