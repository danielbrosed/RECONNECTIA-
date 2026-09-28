// Versión de sesión (H2), lado servidor: la caché y el lector de
// lib/session-version.ts cableados a Prisma, más los ayudantes para subir la
// versión cuando cambia la contraseña.
//
// COSTE. auth() se llama 2 o 3 veces por petición (layout + guarda + página) y
// cada llamada pasa por callbacks.jwt, que consulta currentSessionState. Con la
// caché es, como mucho, 1 SELECT por clave primaria por usuario cada 10 s, en
// vez de 2 o 3 SELECT por petición.
//
// EXPULSIÓN. Producción sirve un único proceso, así que esta caché es la de todo
// el despliegue: al subir la versión se olvida la entrada y la siguiente
// petición de cualquier navegador de esa cuenta lee la versión nueva y se queda
// fuera. Si algún día hubiera varias instancias, las demás tardarían como mucho
// SESSION_VERSION_TTL_MS en enterarse.
//
// Fallo de base al leer: se avisa por consola y se conserva la sesión
// (fail-open). Cuenta inexistente: sesión fuera.

import { prisma } from "@/lib/db";
import {
  SESSION_VERSION_TTL_MS,
  createVersionCache,
  createVersionReader,
  type VersionCache,
} from "@/lib/session-version";

// La caché cuelga de globalThis para que sea ÚNICA por proceso. Next compila
// este módulo en varias capas (páginas y acciones de servidor por un lado, el
// manejador de /api/auth por otro) y cada capa tendría su propia instancia:
// olvidar la entrada en una no la borraría en las demás y la expulsión podría
// tardar hasta el TTL. Mismo criterio que el cliente Prisma de lib/db.ts.
const globalCache = globalThis as unknown as { __rciSessionVersionCache?: VersionCache };
const cache: VersionCache =
  globalCache.__rciSessionVersionCache ??
  (globalCache.__rciSessionVersionCache = createVersionCache({ ttlMs: SESSION_VERSION_TTL_MS }));

/** Versión de sesión y rol actuales de una cuenta, con caché de 10 s.
 * undefined si la base no respondió, null si la cuenta no existe. */
export const currentSessionState = createVersionReader({
  cache,
  async load(userId) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true, role: true },
    });
    return u ? { sessionVersion: u.sessionVersion, role: u.role } : null;
  },
  onError: (e) => console.error("[session-version] no se pudo leer la versión de sesión:", e),
});

/** Para mezclar en el `data` de un user.update que cambie la contraseña, de
 * forma que la versión suba en la misma escritura. Después hay que llamar a
 * forgetSessionVersion(userId), o este proceso seguiría sirviendo la versión
 * vieja desde la caché durante el TTL. */
export function bumpSessionVersionData() {
  return { sessionVersion: { increment: 1 } } as const;
}

/** Olvida la entrada de caché de una cuenta. Llamar justo después de subir su
 * versión. */
export function forgetSessionVersion(userId: string): void {
  cache.forget(userId);
}

/** Sube la versión y olvida la caché; devuelve la versión nueva. Para quien
 * solo necesita cerrar las sesiones de una cuenta sin tocar nada más (reseteo
 * de contraseña por administración, G02). */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: bumpSessionVersionData(),
    select: { sessionVersion: true },
  });
  forgetSessionVersion(userId);
  return u.sessionVersion;
}
