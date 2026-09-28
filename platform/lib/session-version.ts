// Versión de sesión (H2): la parte pura, sin Prisma ni Next, de "cambiar la
// contraseña cierra las demás sesiones".
//
// Por qué hace falta. Las sesiones viajan en un JWT firmado dentro de la cookie
// (session.strategy = "jwt" en auth.ts): el servidor no guarda nada por sesión,
// así que no hay una lista de sesiones que borrar cuando alguien cambia la
// contraseña. La única forma de invalidar cookies que ya circulan es que el
// token lleve un dato contrastable con la base en cada petición. Ese dato es
// User.sessionVersion: se copia al token al entrar, cambiar la contraseña lo
// incrementa, y cualquier token con una versión distinta deja de valer al
// siguiente clic (callbacks.jwt en auth.ts devuelve null y la cookie se limpia).
//
// Coste. auth() se llama dos o tres veces por petición (layout, guarda, página)
// y cada llamada pasa por callbacks.jwt. Sin caché serían dos o tres SELECT por
// petición. Con la caché en memoria de este módulo (TTL de 10 s) es, como
// mucho, un SELECT por clave primaria por usuario cada 10 s.
//
// Expulsión inmediata. Quien sube la versión olvida también la entrada de la
// caché de su proceso. Con un único proceso (como en producción) la siguiente
// petición de cualquier navegador de esa cuenta ya lee la versión nueva. Con
// varias instancias, las demás tardarían como mucho el TTL en enterarse.
//
// Este módulo no importa nada con efectos para poder probarlo con node:test
// (lib/session-version.test.ts) sin base de datos ni servidor.

export const SESSION_VERSION_TTL_MS = 10_000;

/** Lo que se guarda por usuario: la versión de sesión y el rol, que se refresca
 * desde la base en la misma lectura. */
export type SessionState = { sessionVersion: number; role: string };

/** Versión que lleva el token. Lo que no sea un entero >= 0 vale 0: los tokens
 * emitidos antes del despliegue no traen el campo y las filas nacen en 0, así
 * que desplegar no expulsa a nadie. */
export function tokenVersion(raw: unknown): number {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : 0;
}

/** ¿Hay que invalidar la sesión?
 *  - dbVersion === undefined: no se pudo consultar la base. Fail-open: se
 *    conserva la sesión antes que expulsar a todo el mundo por una caída.
 *  - dbVersion === null: la cuenta ya no existe. Fuera.
 *  - número distinto del token: la contraseña cambió después de emitirlo. Fuera. */
export function sessionIsStale(tokenSv: number, dbVersion: number | null | undefined): boolean {
  if (dbVersion === undefined) return false;
  if (dbVersion === null) return true;
  return dbVersion !== tokenSv;
}

export type VersionCache = {
  get(userId: string): SessionState | undefined;
  set(userId: string, v: SessionState): void;
  forget(userId: string): void;
  /** Generación de una cuenta: sube con cada forget. El lector la anota antes
   * de consultar la base y no cachea si cambió entre medias. */
  generation(userId: string): number;
  size(): number;
};

/** Caché en memoria por proceso, sin timers: cada entrada guarda su caducidad y
 * `get` descarta las vencidas al leerlas. Si se llena (maxEntries, 5000 por
 * defecto) se vacía entera antes de insertar: más barato que una LRU y con un
 * TTL tan corto no se nota. `now` se inyecta para poder probarla con un reloj
 * falso. */
export function createVersionCache(opts: {
  ttlMs: number;
  now?: () => number;
  maxEntries?: number;
}): VersionCache {
  const { ttlMs, now = Date.now, maxEntries = 5000 } = opts;
  const entries = new Map<string, { v: SessionState; exp: number }>();
  // Solo crece con cada forget (cambios de contraseña): tamaño despreciable.
  const gens = new Map<string, number>();
  return {
    get(userId) {
      const hit = entries.get(userId);
      if (!hit) return undefined;
      if (now() >= hit.exp) {
        entries.delete(userId);
        return undefined;
      }
      return hit.v;
    },
    set(userId, v) {
      if (entries.size >= maxEntries) entries.clear();
      entries.set(userId, { v, exp: now() + ttlMs });
    },
    forget(userId) {
      entries.delete(userId);
      gens.set(userId, (gens.get(userId) ?? 0) + 1);
    },
    generation(userId) {
      return gens.get(userId) ?? 0;
    },
    size() {
      return entries.size;
    },
  };
}

/** Lector con caché delante de `load`. Devuelve:
 *  - SessionState: la cuenta existe (de caché o de la base).
 *  - null: la cuenta no existe. No se cachea, para no arrastrar un "no existe"
 *    durante el TTL.
 *  - undefined: `load` ha fallado. Se avisa por `onError` y decide quien llama
 *    (auth.ts conserva la sesión). */
export function createVersionReader(deps: {
  load(userId: string): Promise<SessionState | null>;
  cache: VersionCache;
  onError?: (e: unknown) => void;
}): (userId: string) => Promise<SessionState | null | undefined> {
  const { load, cache, onError } = deps;
  return async (userId) => {
    const hit = cache.get(userId);
    if (hit) return hit;
    // Si alguien olvida la entrada mientras la base responde (cambio de
    // contraseña en vuelo), la lectura vieja no se vuelve a cachear.
    const gen = cache.generation(userId);
    try {
      const estado = await load(userId);
      if (estado && cache.generation(userId) === gen) cache.set(userId, estado);
      return estado;
    } catch (e) {
      onError?.(e);
      return undefined;
    }
  };
}
