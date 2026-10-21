import { defineConfig, devices } from "@playwright/test";

// As senhas das contas de teste vêm do .env.local (nunca vão para o código).
try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: os testes que precisam de login são ignorados
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const INT_PORT = 3200; // site para os testes de integração, apontando para o servidor de mentira
const STUB_PORT = 4010;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  projects: [
    { name: "desktop", testIgnore: /integration\//, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" } },
    { name: "mobile", testIgnore: /integration\//, grep: /@mobile/, use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${PORT}` } },
    { name: "integration", testMatch: /integration\/.*\.spec\.ts/, timeout: 90_000, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${INT_PORT}`, trace: "retain-on-failure" } },
  ],
  // Sobe o site de produção local se ainda não estiver no ar (rode `npm run build` antes). Os dois últimos só servem ao projeto "integration".
  webServer: [
    { command: `npx next start -p ${PORT}`, url: `http://127.0.0.1:${PORT}/api/health`, reuseExistingServer: true, timeout: 60_000 },
    { command: "node e2e/integration/stub-server.mjs", url: `http://127.0.0.1:${STUB_PORT}/health`, reuseExistingServer: true, timeout: 20_000 },
    {
      command: `npx next start -p ${INT_PORT}`,
      url: `http://127.0.0.1:${INT_PORT}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        MASTER_KEY: "ab".repeat(32), // chave só de teste
        SHOPEE_API_URL: `http://127.0.0.1:${STUB_PORT}/graphql`,
        TELEGRAM_API_BASE: `http://127.0.0.1:${STUB_PORT}`,
        NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${INT_PORT}`,
      },
    },
  ],
});