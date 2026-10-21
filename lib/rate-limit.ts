// Limite de tentativas por chave (IP, e-mail, usuário) em janela de tempo. Fica na memória do processo:
// basta para uma réplica única e esfria sozinho; o limite do Supabase Auth continua valendo por baixo.
export type Limiter = { hit(key: string, now?: number): { ok: true } | { ok: false; retryAfterSec: number } };

export function createLimiter(opts: { max: number; windowMs: number; maxKeys?: number }): Limiter {
  const buckets = new Map<string, number[]>();
  const maxKeys = opts.maxKeys ?? 10_000;
  return {
    hit(key, now = Date.now()) {
      // Só os testes ponta a ponta ligam isto, para entrar muitas vezes com a mesma conta de teste.
      if (process.env.DISABLE_RATE_LIMITS === "1") return { ok: true };
      const recent = (buckets.get(key) ?? []).filter((t) => now - t < opts.windowMs);
      if (recent.length >= opts.max) {
        buckets.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + opts.windowMs - now) / 1000)) };
      }
      recent.push(now);
      buckets.set(key, recent);
      if (buckets.size > maxKeys) {
        // não deixa a memória crescer sem limite: descarta as chaves mais antigas
        for (const k of buckets.keys()) {
          if (buckets.size <= maxKeys * 0.8) break;
          buckets.delete(k);
        }
      }
      return { ok: true };
    },
  };
}