/**
 * Candado compartido para TODO script que hable con la base de datos.
 *
 * POR QUÉ EXISTE. Hasta la ronda de agosto de 2026, `webapp/.env` apuntaba a
 * PRODUCCIÓN, y ese fichero lo leen el CLI de Prisma, `tsx` y una docena de
 * scripts. Convivía con `pnpm db:seed` y `pnpm db:reset`, que empiezan por
 * `deleteMany()` sin `where` y por `migrate reset --force`. Un tabulado de más
 * en la terminal vaciaba la base real. Cada script se defendía por su cuenta,
 * unos bien y otros no, y los que no eran justo los peligrosos.
 *
 * CÓMO SE ARREGLÓ. `.env` apunta ahora a la base LOCAL. Las URLs de producción
 * viven aisladas en `.env.prod` con otro nombre (`PROD_DATABASE_URL`,
 * `PROD_DIRECT_URL`), así que ninguna herramienta las coge por accidente:
 * alcanzarlas exige pasar `--prod` y pasar por aquí.
 *
 * REGLA. Ningún script del repositorio resuelve la URL por su cuenta ni lee
 * `process.env.DATABASE_URL`. Se pide aquí, y aquí se comprueba que el destino
 * es el que se ha pedido:
 *   - con `--prod`, la URL resuelta NO puede ser local
 *   - sin `--prod`, la URL resuelta TIENE que ser local
 * Las dos direcciones importan. La segunda es la que evita que un script de QA
 * escriba en producción porque alguien exportó una variable en su terminal.
 *
 * USO
 *   import { leerArgs, resolverUrl, emitirResultado, abortar } from "./_guard-db.mjs";
 *   const args = leerArgs(process.argv);
 *   const url = resolverUrl({ prod: args.prod });
 *   const prisma = new PrismaClient({ datasources: { db: { url } } });
 *   ...
 *   emitirResultado({ ok: true, borradas: 12 });
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const DIR_WEBAPP = path.resolve(AQUI, "..");
export const DIR_RAIZ = path.resolve(DIR_WEBAPP, "..");

/** Códigos de salida, iguales en todos los scripts. */
export const SALIDA = { OK: 0, ERROR: 1, CANDADO: 2 };

const RE_LOCAL = /(^|@|\/\/)(localhost|127\.0\.0\.1)([:/]|$)/i;

/** true si la URL apunta a una base de la propia máquina. */
export function esLocal(url) {
  return typeof url === "string" && RE_LOCAL.test(url);
}

/**
 * Lee un fichero de entorno a un objeto plano. Tolera el BOM que Windows cuela
 * al guardar en UTF-8: sin quitarlo, la PRIMERA clave del fichero se lee con un
 * carácter invisible delante y no casa nunca. Ya nos pasó con el fichero de
 * credenciales del verificador (commit 582c693).
 */
export function leerEnv(nombre) {
  const ruta = path.join(DIR_WEBAPP, nombre);
  if (!fs.existsSync(ruta)) return null;
  const txt = fs.readFileSync(ruta, "utf8").replace(/^﻿/, "");
  const out = {};
  for (const linea of txt.split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/** Aborta con mensaje y código. Imprime también la línea RESULT:: para que la
 *  salida sea igual de legible tanto si va bien como si va mal. */
export function abortar(motivo, codigo = SALIDA.CANDADO, extra = {}) {
  console.error(`\n✗ ABORTADO: ${motivo}`);
  console.log("RESULT::" + JSON.stringify({ ok: false, abortado: motivo, ...extra }));
  process.exit(codigo);
}

/** Lee las banderas comunes de la línea de comandos. */
export function leerArgs(argv = process.argv) {
  const args = argv.slice(2);
  const valor = (nombre) => {
    const p = args.find((a) => a.startsWith(`--${nombre}=`));
    return p ? p.slice(nombre.length + 3) : null;
  };
  return {
    prod: args.includes("--prod"),
    confirm: args.includes("--confirm"),
    force: args.includes("--force"),
    huella: valor("huella"),
    source: valor("source"),
    crudo: args,
  };
}

/**
 * Devuelve la URL de la base y comprueba que el destino es el pedido.
 * `preferirDirect` usa DIRECT_URL cuando existe: es la conexión sin pooler, que
 * es la que hace falta para migraciones y para transacciones largas.
 */
export function resolverUrl({ prod = false, preferirDirect = true } = {}) {
  if (prod) {
    const env = leerEnv(".env.prod");
    if (!env) {
      abortar(
        "no existe webapp/.env.prod. Las URLs de producción viven ahí desde que .env pasó a apuntar a local.",
      );
    }
    const url = (preferirDirect && env.PROD_DIRECT_URL) || env.PROD_DATABASE_URL;
    if (!url) abortar("webapp/.env.prod no define PROD_DIRECT_URL ni PROD_DATABASE_URL.");
    if (esLocal(url)) {
      abortar("se ha pedido --prod pero la URL de .env.prod es LOCAL. Revisa el fichero.");
    }
    return url;
  }

  const env = leerEnv(".env") ?? {};
  const url = (preferirDirect && env.DIRECT_URL) || env.DATABASE_URL;
  if (!url) abortar("webapp/.env no define DATABASE_URL.");
  if (!esLocal(url)) {
    abortar(
      "sin --prod el destino tiene que ser LOCAL, y la URL de .env apunta fuera. " +
        "Si de verdad quieres tocar producción, pasa --prod de forma explícita.",
    );
  }
  return url;
}

/** Etiqueta legible del destino, para imprimirla en la cabecera del resumen. */
export function etiquetaDestino(url) {
  try {
    const u = new URL(url);
    return `${esLocal(url) ? "LOCAL" : "PRODUCCIÓN"} · ${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return esLocal(url) ? "LOCAL" : "PRODUCCIÓN";
  }
}

/** Exige --confirm para escribir. Sin él, el script informa y sale bien. */
export function exigirConfirm(args, { queSeVaAHacer = "escribir" } = {}) {
  if (args.confirm) return true;
  console.log(
    `\n· Modo seco: no se ha escrito nada. Añade --confirm para ${queSeVaAHacer} de verdad.`,
  );
  return false;
}

/**
 * Compara la huella aprobada con la recalculada. Sirve para que entre el
 * momento en que alguien revisa un inventario y el momento en que se ejecuta el
 * borrado no se haya colado ningún cambio (un registro nuevo, por ejemplo).
 */
export function exigirHuella(args, huellaCalculada) {
  if (!args.huella) {
    abortar(
      `falta --huella. Ejecuta antes el inventario, revisa lo que va a pasar y pasa la huella que imprime. ` +
        `La de ahora mismo es ${huellaCalculada}.`,
    );
  }
  if (args.huella !== huellaCalculada) {
    abortar(
      `la huella no coincide. Aprobada ${args.huella}, actual ${huellaCalculada}. ` +
        `Los datos han cambiado desde que se revisó el inventario: vuelve a lanzarlo.`,
      SALIDA.CANDADO,
      { huellaAprobada: args.huella, huellaActual: huellaCalculada },
    );
  }
  return true;
}

/** Última línea de todo script. Se lee con RESULT:: para automatizar. */
export function emitirResultado(obj) {
  console.log("RESULT::" + JSON.stringify(obj));
}

/** Cabecera común, para que toda salida empiece diciendo dónde va a escribir. */
export function cabecera(titulo, { url, args }) {
  console.log(`\n── ${titulo} ${"─".repeat(Math.max(0, 56 - titulo.length))}`);
  console.log(`   Destino: ${etiquetaDestino(url)}`);
  console.log(`   Modo:    ${args.confirm ? "APPLY (escribe)" : "seco (no escribe)"}`);
  console.log("");
}
