// Lanzador de tests: recorre lib/ buscando *.test.ts y se los pasa explícitos a
// `node --test` con el cargador de tsx. No usa el glob de `node --test` ni
// `fs.glob` porque producción compila con Node 20 (.node-version) y ahí no
// existen. Termina con la línea RESULT::{json} y sale con el código del hijo.
//
// Revisión 2B (R2B-02): los ficheros «*-serie-bd.test.ts» (tests de base que
// cambian algo de TODA la base mientras corren) van después de los demás, cada
// uno solo, sin ningún otro fichero a la vez (scripts/tests-reparto.mjs).
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { repartirTests } from "./tests-reparto.mjs";

const webapp = dirname(dirname(fileURLToPath(import.meta.url)));

function recogerTests(dir) {
  const out = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) out.push(...recogerTests(ruta));
    else if (entrada.isFile() && entrada.name.endsWith(".test.ts")) out.push(ruta);
  }
  return out;
}

const ficheros = recogerTests(join(webapp, "lib")).sort();

if (ficheros.length === 0) {
  console.log("No hay ficheros *.test.ts en lib/.");
  console.log("RESULT::" + JSON.stringify({ ok: true, files: 0 }));
  process.exit(0);
}

const { paralelo, enSerie } = repartirTests(ficheros);
console.log(`Tests (${ficheros.length} ficheros${enSerie.length ? `; ${enSerie.length} en serie, al final` : ""}):`);
for (const f of ficheros) console.log("  " + relative(webapp, f));

function lanzar(lista) {
  const hijo = spawnSync(process.execPath, ["--import", "tsx", "--test", ...lista], {
    stdio: "inherit",
    cwd: webapp,
  });
  if (hijo.error) console.error("No se pudo lanzar node --test:", hijo.error.message);
  return hijo.status ?? 1;
}

let status = paralelo.length ? lanzar(paralelo) : 0;
for (const f of enSerie) {
  console.log(`\nEn serie: ${relative(webapp, f)}`);
  const s = lanzar([f]);
  if (status === 0) status = s;
}
console.log("RESULT::" + JSON.stringify({ ok: status === 0, files: ficheros.length, enSerie: enSerie.length }));
process.exit(status);
