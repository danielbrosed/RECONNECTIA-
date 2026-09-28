import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import { rateLimit } from "./rate-limit";

// El Map del limitador es global del proceso: cada test usa una clave propia
// con sufijo Date.now() para no pisar (ni heredar) contadores de otros tests.
const clave = (nombre: string) => `test:${nombre}:${Date.now()}`;

test("permite `limit` peticiones y bloquea la siguiente", () => {
  const k = clave("limite");
  const opts = { limit: 3, windowMs: 60_000 };
  for (let i = 1; i <= opts.limit; i++) {
    const r = rateLimit(k, opts);
    assert.equal(r.allowed, true, `la petición ${i} debería pasar`);
    assert.equal(r.retryAfterSec, 0);
  }
  const bloqueada = rateLimit(k, opts);
  assert.equal(bloqueada.allowed, false);
  assert.ok(bloqueada.retryAfterSec >= 1, "retryAfterSec debe ser al menos 1 segundo");
});

test("la ventana se reinicia al expirar", async () => {
  const k = clave("ventana");
  const opts = { limit: 1, windowMs: 30 };
  assert.equal(rateLimit(k, opts).allowed, true);
  assert.equal(rateLimit(k, opts).allowed, false);
  await esperar(40);
  assert.equal(rateLimit(k, opts).allowed, true, "tras expirar la ventana vuelve a permitir");
});

test("claves distintas no se mezclan", () => {
  const a = clave("a");
  const b = clave("b");
  const opts = { limit: 1, windowMs: 60_000 };
  assert.equal(rateLimit(a, opts).allowed, true);
  assert.equal(rateLimit(a, opts).allowed, false);
  assert.equal(rateLimit(b, opts).allowed, true, "la clave b no hereda el contador de a");
});
