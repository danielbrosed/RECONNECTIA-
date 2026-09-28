// Lanzador de tests: recorre lib/ buscando *.test.ts y se los pasa explícitos a
// `node --test` con el cargador de tsx. No usa el glob de `node --test` ni
// `fs.glob` porque producción compila con Node 20 (.node-version) y ahí no
// existen. Termina con la línea RESULT::{json} y sale con el código del hijo.
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

console.log(`Tests (${ficheros.length} ficheros):`);
for (const f of ficheros) console.log("  " + relative(webapp, f));

const hijo = spawnSync(process.execPath, ["--import", "tsx", "--test", ...ficheros], {
  stdio: "inherit",
  cwd: webapp,
});
if (hijo.error) console.error("No se pudo lanzar node --test:", hijo.error.message);
const status = hijo.status ?? 1;
console.log("RESULT::" + JSON.stringify({ ok: status === 0, files: ficheros.length }));
process.exit(status);
