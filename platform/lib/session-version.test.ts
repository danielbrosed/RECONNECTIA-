// Pruebas de la parte pura de la versión de sesión (H2). Se ejecutan con:
//   node --import tsx --test lib/session-version.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createVersionCache,
  createVersionReader,
  sessionIsStale,
  tokenVersion,
  type SessionState,
} from "./session-version";

test("tokenVersion: lo que no sea un entero >= 0 vale 0", () => {
  assert.equal(tokenVersion(undefined), 0);
  assert.equal(tokenVersion(null), 0);
  assert.equal(tokenVersion("3"), 0);
  assert.equal(tokenVersion(-1), 0);
  assert.equal(tokenVersion(2.5), 0);
  assert.equal(tokenVersion(3), 3);
});

test("sessionIsStale: misma versión vale; distinta o cuenta inexistente no; base caída conserva", () => {
  assert.equal(sessionIsStale(0, 0), false);
  assert.equal(sessionIsStale(0, 1), true);
  assert.equal(sessionIsStale(1, 0), true);
  assert.equal(sessionIsStale(0, null), true);
  assert.equal(sessionIsStale(5, undefined), false);
});

test("caché: miss, set/get, caducidad por TTL, forget y vaciado al llenarse", () => {
  let ahora = 1_000;
  const cache = createVersionCache({ ttlMs: 100, now: () => ahora, maxEntries: 2 });
  const v0: SessionState = { sessionVersion: 0, role: "ADMIN" };

  assert.equal(cache.get("u1"), undefined);
  cache.set("u1", v0);
  assert.deepEqual(cache.get("u1"), v0);

  ahora += 99;
  assert.deepEqual(cache.get("u1"), v0);
  ahora += 1;
  assert.equal(cache.get("u1"), undefined);
  assert.equal(cache.size(), 0);

  cache.set("u1", v0);
  cache.forget("u1");
  assert.equal(cache.get("u1"), undefined);

  cache.set("u1", v0);
  cache.set("u2", v0);
  assert.equal(cache.size(), 2);
  cache.set("u3", v0);
  assert.equal(cache.size(), 1);
  assert.deepEqual(cache.get("u3"), v0);
  assert.equal(cache.get("u1"), undefined);
});

test("lector: dos lecturas dentro del TTL consultan la base una sola vez", async () => {
  let ahora = 0;
  const cache = createVersionCache({ ttlMs: 100, now: () => ahora });
  let llamadas = 0;
  const read = createVersionReader({
    cache,
    async load() {
      llamadas++;
      return { sessionVersion: 2, role: "STUDENT" };
    },
  });
  assert.deepEqual(await read("u1"), { sessionVersion: 2, role: "STUDENT" });
  assert.deepEqual(await read("u1"), { sessionVersion: 2, role: "STUDENT" });
  assert.equal(llamadas, 1);
  ahora = 100;
  await read("u1");
  assert.equal(llamadas, 2);
});

test("lector: si load lanza devuelve undefined y avisa por onError", async () => {
  const errores: unknown[] = [];
  const read = createVersionReader({
    cache: createVersionCache({ ttlMs: 100 }),
    async load() {
      throw new Error("base caída");
    },
    onError: (e) => errores.push(e),
  });
  assert.equal(await read("u1"), undefined);
  assert.equal(errores.length, 1);
  assert.ok(errores[0] instanceof Error);
});

test("lector: cuenta inexistente devuelve null y no se cachea", async () => {
  let llamadas = 0;
  const read = createVersionReader({
    cache: createVersionCache({ ttlMs: 100 }),
    async load() {
      llamadas++;
      return null;
    },
  });
  assert.equal(await read("u1"), null);
  assert.equal(await read("u1"), null);
  assert.equal(llamadas, 2);
});

test("escenario: cambiar la contraseña expulsa de inmediato en el mismo proceso", async () => {
  const db: Record<string, SessionState> = { u1: { sessionVersion: 0, role: "ADMIN" } };
  const cache = createVersionCache({ ttlMs: 10_000 });
  const read = createVersionReader({
    cache,
    async load(id) {
      return db[id] ?? null;
    },
  });

  const antes = await read("u1");
  assert.equal(antes?.sessionVersion, 0);

  // Cambio de contraseña: sube la versión en la base y se olvida la caché.
  db.u1.sessionVersion = 1;
  cache.forget("u1");

  const despues = await read("u1");
  assert.equal(despues?.sessionVersion, 1);
  // El token del otro navegador sigue en 0: se queda fuera al siguiente clic.
  assert.equal(sessionIsStale(tokenVersion(0), despues?.sessionVersion), true);
});

test("escenario: una sesión emitida antes del despliegue sigue viva", () => {
  // El token no trae sessionVersion (undefined) y la fila nace en 0.
  assert.equal(sessionIsStale(tokenVersion(undefined), 0), false);
});

test("una lectura en vuelo no vuelve a cachear la versión vieja si hubo un forget entre medias", async () => {
  const cache = createVersionCache({ ttlMs: 10_000 });
  let resolver: ((v: { sessionVersion: number; role: string }) => void) | undefined;
  let cargas = 0;
  const read = createVersionReader({
    cache,
    load: () => {
      cargas += 1;
      return new Promise((res) => {
        resolver = res;
      });
    },
  });
  const enVuelo = read("u1");
  assert.equal(cache.generation("u1"), 0);
  cache.forget("u1"); // cambio de contraseña mientras la base responde
  assert.equal(cache.generation("u1"), 1);
  resolver!({ sessionVersion: 0, role: "STUDENT" });
  const viejo = await enVuelo;
  assert.equal(viejo?.sessionVersion, 0);
  assert.equal(cache.get("u1"), undefined, "la versión vieja no debe quedar cacheada");
  const segunda = read("u1");
  resolver!({ sessionVersion: 1, role: "STUDENT" });
  assert.equal((await segunda)?.sessionVersion, 1);
  assert.equal(cargas, 2);
  assert.equal(cache.get("u1")?.sessionVersion, 1);
});
