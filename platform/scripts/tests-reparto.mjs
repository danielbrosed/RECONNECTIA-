// Reparto de los ficheros de tests entre los que corren a la vez y los que
// corren solos, al final (lo usa scripts/run-tests.mjs).
//
// `node --test` corre los ficheros EN PARALELO contra la misma base local. Un
// fichero de tests de base que cambia o recorre algo de TODA la base mientras
// corre (por ejemplo, marcar una entidad como gratis para todas las empresas,
// LOTE03 L3-12, o ejecutar el relleno de una migración sobre todas las filas)
// corre después de los demás y solo, sin ningún otro fichero a la vez
// (revisión 2B, R2B-02). Para eso, o se llama «*-serie-bd.test.ts», o lleva la
// marca «@tests-en-serie» en su cabecera (para no renombrar el de otra fase).
// Lo vigila lib/lote03-2b.test.ts.

import fs from "node:fs";

/** Ficheros que corren solos, al final, por su nombre. */
export const RE_EN_SERIE = /-serie-bd\.test\.ts$/;
/** O por esta marca en las primeras líneas. */
export const MARCA_EN_SERIE = "@tests-en-serie";

/** ¿Corre solo, al final? */
export function vaEnSerie(fichero, leer = (f) => fs.readFileSync(f, "utf8")) {
  if (RE_EN_SERIE.test(String(fichero).replace(/\\/g, "/"))) return true;
  try {
    return leer(fichero).slice(0, 3000).includes(MARCA_EN_SERIE);
  } catch {
    return false;
  }
}

/** { paralelo, enSerie } con el mismo orden que llegan. */
export function repartirTests(ficheros, leer) {
  const paralelo = [];
  const enSerie = [];
  for (const f of ficheros) (vaEnSerie(f, leer) ? enSerie : paralelo).push(f);
  return { paralelo, enSerie };
}
