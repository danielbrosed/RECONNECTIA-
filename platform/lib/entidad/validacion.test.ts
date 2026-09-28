// Pruebas del estado de validación del alta de entidades (H4).
// Se ejecutan con: node --import tsx --test lib/entidad/validacion.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTACTO_VALIDACION,
  ESTADO_VALIDACION_LABELS,
  MOTIVO_RECHAZO_MAX,
  RUTA_PENDIENTE,
  estadoValidacionEntidad,
} from "./validacion";

const antes = new Date("2026-09-25T10:00:00Z");
const despues = new Date("2026-09-25T11:00:00Z");

test("sin ficha (null o undefined): pendiente", () => {
  assert.equal(estadoValidacionEntidad(null), "pendiente");
  assert.equal(estadoValidacionEntidad(undefined), "pendiente");
});

test("ficha sin fechas: pendiente", () => {
  assert.equal(estadoValidacionEntidad({ validatedAt: null, rejectedAt: null }), "pendiente");
});

test("solo validatedAt: validada", () => {
  assert.equal(estadoValidacionEntidad({ validatedAt: antes, rejectedAt: null }), "validada");
});

test("solo rejectedAt: rechazada", () => {
  assert.equal(estadoValidacionEntidad({ validatedAt: null, rejectedAt: antes }), "rechazada");
});

test("rechazo posterior a la validación: rechazada", () => {
  assert.equal(estadoValidacionEntidad({ validatedAt: antes, rejectedAt: despues }), "rechazada");
});

test("validación posterior al rechazo: validada", () => {
  assert.equal(estadoValidacionEntidad({ validatedAt: despues, rejectedAt: antes }), "validada");
});

test("mismo instante: gana el rechazo", () => {
  assert.equal(
    estadoValidacionEntidad({ validatedAt: antes, rejectedAt: new Date(antes.getTime()) }),
    "rechazada",
  );
});

test("etiquetas de los tres estados", () => {
  assert.equal(ESTADO_VALIDACION_LABELS.pendiente, "Pendiente de validar");
  assert.equal(ESTADO_VALIDACION_LABELS.validada, "Validada");
  assert.equal(ESTADO_VALIDACION_LABELS.rechazada, "Rechazada");
  assert.deepEqual(Object.keys(ESTADO_VALIDACION_LABELS).sort(), ["pendiente", "rechazada", "validada"]);
});

test("constantes compartidas", () => {
  assert.equal(MOTIVO_RECHAZO_MAX, 500);
  assert.equal(RUTA_PENDIENTE, "/portal/pendiente");
  assert.match(CONTACTO_VALIDACION, /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i);
});
