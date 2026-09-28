// Pruebas de la verificación de correo con dobles en memoria.
// Se ejecutan con: node --import tsx --test lib/verify-email.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MSG_ENLACE_NO_VALIDO,
  MSG_FALTA_TOKEN,
  MSG_SIN_CUENTA,
  isVerifyToken,
  verifyEmailWithToken,
  type VerifyEmailDeps,
} from "./verify-email";

type TokenRow = { identifier: string; expires: Date };
type UserRow = { id: string; verified: boolean };

const EMAIL = "ana@example.com";
const EN_UNA_HORA = new Date(Date.now() + 60 * 60 * 1000);

/**
 * Fábrica de dependencias falsas: dos Maps en memoria (tokens por texto del
 * token, usuarios por correo), contadores de llamadas y el orden en que se han
 * invocado las dependencias, para poder afirmar que `markVerified` va antes que
 * `deleteToken` y que un token rechazado por prefijo ni siquiera se consulta.
 */
function fakeDeps(init: {
  tokens?: Record<string, TokenRow>;
  users?: Record<string, UserRow>;
  now?: Date;
}) {
  const tokens = new Map<string, TokenRow>(Object.entries(init.tokens ?? {}));
  const users = new Map<string, UserRow>(Object.entries(init.users ?? {}));
  const llamadas = { findToken: 0, findUserByEmail: 0, markVerified: 0, deleteToken: 0 };
  const orden: string[] = [];

  const deps: VerifyEmailDeps = {
    async findToken(token) {
      llamadas.findToken += 1;
      orden.push("findToken");
      return tokens.get(token) ?? null;
    },
    async findUserByEmail(email) {
      llamadas.findUserByEmail += 1;
      orden.push("findUserByEmail");
      const u = users.get(email);
      return u ? { id: u.id } : null;
    },
    async markVerified(userId) {
      llamadas.markVerified += 1;
      orden.push("markVerified");
      for (const u of users.values()) if (u.id === userId) u.verified = true;
    },
    async deleteToken(token) {
      llamadas.deleteToken += 1;
      orden.push("deleteToken");
      tokens.delete(token);
    },
  };
  const reloj = init.now;
  if (reloj) deps.now = () => reloj;

  return { deps, tokens, users, llamadas, orden };
}

function usuarioSinVerificar(): Record<string, UserRow> {
  return { [EMAIL]: { id: "u1", verified: false } };
}

test("isVerifyToken solo acepta el prefijo ver_", () => {
  assert.equal(isVerifyToken("ver_abc"), true);
  assert.equal(isVerifyToken("inv_abc"), false);
  assert.equal(isVerifyToken("rst_abc"), false);
  assert.equal(isVerifyToken("abc"), false);
  assert.equal(isVerifyToken(""), false);
});

test("una invitación (inv_) viva no verifica, no se consulta ni se gasta", async () => {
  const f = fakeDeps({
    tokens: { inv_abc: { identifier: EMAIL, expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("inv_abc", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_ENLACE_NO_VALIDO });
  assert.equal(f.llamadas.findToken, 0);
  assert.equal(f.tokens.has("inv_abc"), true);
  assert.equal(f.users.get(EMAIL)?.verified, false);
  assert.deepEqual(f.orden, []);
});

test("un enlace de restablecer (rst_) vivo no verifica, no se consulta ni se gasta", async () => {
  const f = fakeDeps({
    tokens: { rst_abc: { identifier: EMAIL, expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("rst_abc", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_ENLACE_NO_VALIDO });
  assert.equal(f.llamadas.findToken, 0);
  assert.equal(f.tokens.has("rst_abc"), true);
  assert.equal(f.users.get(EMAIL)?.verified, false);
});

test("un token sin prefijo no verifica ni se consulta", async () => {
  const f = fakeDeps({
    tokens: { abc123: { identifier: EMAIL, expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("abc123", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_ENLACE_NO_VALIDO });
  assert.equal(f.llamadas.findToken, 0);
  assert.equal(f.tokens.has("abc123"), true);
  assert.equal(f.users.get(EMAIL)?.verified, false);
});

test("un token ver_ vivo verifica la cuenta y borra el token, en ese orden", async () => {
  const f = fakeDeps({
    tokens: { ver_abc: { identifier: EMAIL, expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("ver_abc", f.deps);
  assert.deepEqual(res, { ok: true });
  assert.equal(f.users.get(EMAIL)?.verified, true);
  assert.equal(f.tokens.has("ver_abc"), false);
  assert.equal(f.llamadas.markVerified, 1);
  assert.equal(f.llamadas.deleteToken, 1);
  assert.ok(f.orden.indexOf("markVerified") < f.orden.indexOf("deleteToken"));
  assert.deepEqual(f.orden, ["findToken", "findUserByEmail", "markVerified", "deleteToken"]);
});

test("un token ver_ caducado no verifica y no se borra", async () => {
  const caduca = new Date("2026-01-01T00:00:00Z");
  const f = fakeDeps({
    tokens: { ver_viejo: { identifier: EMAIL, expires: caduca } },
    users: usuarioSinVerificar(),
    now: new Date("2026-01-02T00:00:00Z"),
  });
  const res = await verifyEmailWithToken("ver_viejo", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_ENLACE_NO_VALIDO });
  assert.equal(f.llamadas.findToken, 1);
  assert.equal(f.tokens.has("ver_viejo"), true);
  assert.equal(f.users.get(EMAIL)?.verified, false);
  assert.equal(f.llamadas.markVerified, 0);
  assert.equal(f.llamadas.deleteToken, 0);
});

test("un token ver_ que no existe no verifica", async () => {
  const f = fakeDeps({ users: usuarioSinVerificar() });
  const res = await verifyEmailWithToken("ver_nadie", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_ENLACE_NO_VALIDO });
  assert.equal(f.llamadas.findToken, 1);
  assert.equal(f.llamadas.findUserByEmail, 0);
  assert.equal(f.users.get(EMAIL)?.verified, false);
});

test("un token vacío devuelve falta el token sin tocar ninguna dependencia", async () => {
  const f = fakeDeps({
    tokens: { ver_abc: { identifier: EMAIL, expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_FALTA_TOKEN });
  assert.deepEqual(f.llamadas, { findToken: 0, findUserByEmail: 0, markVerified: 0, deleteToken: 0 });
  assert.equal(f.tokens.has("ver_abc"), true);
});

test("un token ver_ vivo de una cuenta inexistente avisa y no borra el token", async () => {
  const f = fakeDeps({
    tokens: { ver_abc: { identifier: "nadie@example.com", expires: EN_UNA_HORA } },
    users: usuarioSinVerificar(),
  });
  const res = await verifyEmailWithToken("ver_abc", f.deps);
  assert.deepEqual(res, { ok: false, error: MSG_SIN_CUENTA });
  assert.equal(f.llamadas.findUserByEmail, 1);
  assert.equal(f.llamadas.markVerified, 0);
  assert.equal(f.llamadas.deleteToken, 0);
  assert.equal(f.tokens.has("ver_abc"), true);
});
