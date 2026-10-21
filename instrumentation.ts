// Agendador interno: na produção, com WORKER_ENABLED=1, um tick por minuto no mesmo processo do site (réplica única).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.WORKER_ENABLED !== "1") return;
  const g = globalThis as { __promoWorker?: boolean };
  if (g.__promoWorker) return;
  g.__promoWorker = true;
  const { tick } = await import("./lib/jobs/runner");
  const loop = () => tick().catch((e) => console.error("[worker] tick", e));
  setInterval(loop, 60_000);
  console.log("[worker] agendador interno ligado");
}