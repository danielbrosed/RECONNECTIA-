import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "./rate-limit";
import {
  AVISO_TRUSTED_PROXY_HOPS,
  clientIpFrom,
  resolveTrustedProxyHops,
  warnIfTrustedProxyHopsUnset,
  type TrustedHops,
} from "./net";

// Ningún test de este fichero llama a `clientIp()` (la versión que lee
// process.env): dispararía el aviso de una sola vez por proceso antes de que
// lo compruebe el último test.

test("resolveTrustedProxyHops: tabla de valores", () => {
  const casos: Array<[string | undefined, TrustedHops]> = [
    [undefined, { hops: 1, source: "default" }],
    ["", { hops: 1, source: "default" }],
    ["   ", { hops: 1, source: "default" }],
    ["0", { hops: 0, source: "env" }],
    ["1", { hops: 1, source: "env" }],
    ["2", { hops: 2, source: "env" }],
    [" 2 ", { hops: 2, source: "env" }],
    ["1.7", { hops: 1, source: "env" }],
    ["abc", { hops: 1, source: "default", raw: "abc" }],
    ["-3", { hops: 1, source: "default", raw: "-3" }],
  ];
  for (const [raw, esperado] of casos) {
    assert.deepEqual(resolveTrustedProxyHops(raw), esperado, `valor ${JSON.stringify(raw)}`);
  }
});

test("clientIpFrom: tabla de cabeceras y saltos", () => {
  type Caso = { nombre: string; hdrs: Record<string, string> | null; hops: number; esperado: string };
  const casos: Caso[] = [
    { nombre: "1 salto, una sola IP", hdrs: { "x-forwarded-for": "1.1.1.1" }, hops: 1, esperado: "1.1.1.1" },
    {
      nombre: "1 salto, el cliente falsifica el primer valor",
      hdrs: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" },
      hops: 1,
      esperado: "1.1.1.1",
    },
    { nombre: "1 salto, cadena de tres", hdrs: { "x-forwarded-for": "a, b, c" }, hops: 1, esperado: "c" },
    { nombre: "1 salto, espacios alrededor", hdrs: { "x-forwarded-for": "  1.1.1.1  " }, hops: 1, esperado: "1.1.1.1" },
    {
      nombre: "2 saltos, cadena de tres",
      hdrs: { "x-forwarded-for": "9.9.9.9, 1.1.1.1, 2.2.2.2" },
      hops: 2,
      esperado: "1.1.1.1",
    },
    { nombre: "2 saltos, menos entradas que saltos", hdrs: { "x-forwarded-for": "1.1.1.1" }, hops: 2, esperado: "1.1.1.1" },
    { nombre: "1 salto, sin XFF, con x-real-ip", hdrs: { "x-real-ip": "3.3.3.3" }, hops: 1, esperado: "3.3.3.3" },
    {
      nombre: "1 salto, XFF solo con comas, con x-real-ip",
      hdrs: { "x-forwarded-for": " , ,", "x-real-ip": "3.3.3.3" },
      hops: 1,
      esperado: "3.3.3.3",
    },
    { nombre: "1 salto, sin cabeceras", hdrs: {}, hops: 1, esperado: "unknown" },
    { nombre: "hdrs null", hdrs: null, hops: 1, esperado: "unknown" },
    {
      nombre: "0 saltos: ninguna cabecera es fiable",
      hdrs: { "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" },
      hops: 0,
      esperado: "unknown",
    },
  ];
  for (const c of casos) {
    const hdrs = c.hdrs === null ? null : new Headers(c.hdrs);
    assert.equal(clientIpFrom(hdrs, c.hops), c.esperado, c.nombre);
  }
});

test("clientIpFrom: rotar el prefijo falsificado de X-Forwarded-For no cambia la IP", () => {
  for (let i = 0; i < 20; i++) {
    const spoof = `10.0.0.${i}`;
    const hdrs = new Headers({ "x-forwarded-for": `${spoof}, 198.51.100.7` });
    assert.equal(clientIpFrom(hdrs, 1), "198.51.100.7", `prefijo ${spoof}`);
  }
});

// Aceptación de H3: con 1 proxy de confianza, rotar el trozo de X-Forwarded-For
// que escribe el cliente no esquiva el límite de completar-registro (10/10 min).
test("integración con rateLimit: 11 peticiones con prefijo rotado, la undécima se bloquea", () => {
  const base = `completar-registro:test:${Date.now()}`;
  const opts = { limit: 10, windowMs: 10 * 60_000 };
  const permitidas: boolean[] = [];
  for (let i = 0; i < 11; i++) {
    const ip = clientIpFrom(new Headers({ "x-forwarded-for": `10.0.0.${i}, 198.51.100.7` }), 1);
    permitidas.push(rateLimit(`${base}:${ip}`, opts).allowed);
  }
  assert.deepEqual(permitidas.slice(0, 10), Array(10).fill(true), "las 10 primeras pasan");
  assert.equal(permitidas[10], false, "la undécima se bloquea");
  assert.equal(permitidas.filter((p) => !p).length, 1, "solo se bloquea una");
});

// Va el último: el aviso es de una sola vez por proceso y aquí lo consumimos.
test("warnIfTrustedProxyHopsUnset: avisa una sola vez y solo si falta o no es válida", () => {
  const mensajes: string[] = [];
  const log = (m: string) => {
    mensajes.push(m);
  };
  assert.equal(warnIfTrustedProxyHopsUnset("1", log), false, "con valor válido no avisa");
  assert.equal(mensajes.length, 0);
  assert.equal(warnIfTrustedProxyHopsUnset(undefined, log), true, "sin variable avisa");
  assert.equal(mensajes.length, 1);
  assert.ok((mensajes[0] ?? "").includes("TRUSTED_PROXY_HOPS"));
  assert.equal(mensajes[0], AVISO_TRUSTED_PROXY_HOPS);
  assert.equal(warnIfTrustedProxyHopsUnset(undefined, log), false, "la segunda vez ya no avisa");
  assert.equal(mensajes.length, 1);
});
