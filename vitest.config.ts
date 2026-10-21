import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Os testes ponta a ponta (e2e/) rodam no Playwright, não no Vitest.
// "server-only" só protege o código do navegador no Next; nos testes de servidor ele vira um módulo vazio.
export default defineConfig({
  resolve: { alias: { "server-only": resolve(process.cwd(), "tests/stubs/server-only.ts") } },
  test: { include: ["tests/**/*.test.{ts,tsx}"], exclude: ["e2e/**", "node_modules/**"] },
});