// Limitador de peticiones en memoria, ventana fija. FAIL-OPEN por diseño: ante
// cualquier error NUNCA bloquea (devuelve allowed:true). Mitiga abuso/credential
// -stuffing en UNA instancia (producción sirve hoy 1 proceso); NO es un limitador
// distribuido. Para multi-instancia, migrar la implementación a Upstash/Redis
// manteniendo esta misma firma.
//
// OWASP A04:2021 (Insecure Design) / API4:2023 (Unrestricted Resource Consumption).
// https://owasp.org/Top10/A04_2021-Insecure_Design/

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
let lastSweep = 0;

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Cuenta `key` dentro de una ventana de `windowMs`. Permite hasta `limit`
 * peticiones; la siguiente devuelve allowed:false con los segundos que faltan
 * para que la ventana se reinicie.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  try {
    const now = Date.now();

    // Barrido perezoso de entradas caducadas (evita fuga de memoria sin timers).
    if (now - lastSweep > 60_000) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
      lastSweep = now;
    }

    const bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }

    bucket.count += 1;
    if (bucket.count > opts.limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 }; // fail-open: nunca tumbar el flujo
  }
}
