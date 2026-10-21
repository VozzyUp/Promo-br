import { defineConfig, devices } from "@playwright/test";

// As senhas das contas de teste vêm do .env.local (nunca vão para o código).
try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: os testes que precisam de login são ignorados
}

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  // Sobe o site de produção local se ainda não estiver no ar (rode `npm run build` antes).
  webServer: { command: `npx next start -p ${PORT}`, url: `http://127.0.0.1:${PORT}/api/health`, reuseExistingServer: true, timeout: 60_000 },
});