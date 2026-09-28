// Extracción de la IP del cliente para claves de rate-limit.
//
// PROBLEMA. `X-Forwarded-For` la puede fijar el cliente. Tomar el PRIMER valor
// (el de la izquierda) usa justamente el trozo que el cliente controla: rotándolo
// se anula cualquier límite basado en IP.
//
// CÓMO SE USA BIEN. Cada proxy de confianza AÑADE al final la IP desde la que
// recibió la petición. Si confías en N proxies (los tuyos), la IP real del cliente
// es el valor que está N posiciones desde el final. Todo lo que quede a la
// izquierda de esa posición lo escribió alguien en quien no confías y no cuenta.
//
// TOPOLOGÍA. En producción hay un proxy inverso de confianza delante de la app:
// exactamente 1 salto. Si se añade una CDN delante del proxy, pasan a ser 2.
//
// CONFIGURACIÓN. `TRUSTED_PROXY_HOPS` = número de proxies de confianza entre la app
// e internet.
//   - Sin definir, vacía o con un valor que no sea un número >= 0: se asume 1 y se
//     avisa una sola vez por proceso al arrancar (ver `instrumentation.ts`).
//   - 0: no hay ningún proxy (solo `next dev`). Ninguna cabecera es fiable, así que
//     la IP queda como "unknown" y el límite se apoya en el resto de la clave.
//   - N >= 1: se toma el valor que está N posiciones desde el final de
//     X-Forwarded-For; si no hay X-Forwarded-For se usa `x-real-ip`.

export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

/** Lo mínimo que hace falta de `Headers`: vale el de Next, el de fetch o un doble en tests. */
export type HeadersLike = { get(name: string): string | null };

export type TrustedHops = { hops: number; source: "env" | "default"; raw?: string };

/**
 * Interpreta TRUSTED_PROXY_HOPS. Función pura: recibe el valor crudo, no lee process.env.
 * Ausente o en blanco: 1 por defecto. Un valor que no sea un número >= 0: 1 por defecto
 * y se conserva `raw` para el aviso. Los decimales se truncan ("1.7" vale 1).
 */
export function resolveTrustedProxyHops(raw: string | undefined): TrustedHops {
  if (raw === undefined) return { hops: DEFAULT_TRUSTED_PROXY_HOPS, source: "default" };
  const texto = raw.trim();
  if (texto === "") return { hops: DEFAULT_TRUSTED_PROXY_HOPS, source: "default" };
  const n = Number(texto);
  if (!Number.isFinite(n) || n < 0) return { hops: DEFAULT_TRUSTED_PROXY_HOPS, source: "default", raw };
  return { hops: Math.floor(n), source: "env" };
}

/**
 * Extrae la IP con un número de saltos dado. Función pura.
 * Con 0 proxies ninguna cabecera es fiable: nunca se devuelve el primer valor,
 * que es el que escribe el cliente.
 */
export function clientIpFrom(hdrs: HeadersLike | null | undefined, hops: number): string {
  try {
    if (!hdrs || !(hops > 0)) return "unknown";
    const xff = hdrs.get("x-forwarded-for");
    if (xff) {
      const parts = xff
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length) {
        const idx = parts.length - hops;
        return (idx >= 0 ? parts[idx] : parts[0]) || "unknown";
      }
    }
    const real = hdrs.get("x-real-ip");
    if (real) return real.trim() || "unknown";
  } catch {
    /* sin IP: quien llama sigue con el resto de la clave (p. ej. email) */
  }
  return "unknown";
}

export const AVISO_TRUSTED_PROXY_HOPS =
  "[net] TRUSTED_PROXY_HOPS no está definida o no es válida. Se asume 1 proxy de confianza (el proxy inverso). Defínela en el entorno: 1 con un proxy inverso, 2 si además hay una CDN delante, 0 solo si no hay ningún proxy.";

let avisado = false;

/** Avisa una sola vez por proceso si la variable falta o es inválida. Devuelve true si avisó. */
export function warnIfTrustedProxyHopsUnset(
  raw: string | undefined = process.env.TRUSTED_PROXY_HOPS,
  log: (msg: string) => void = console.warn,
): boolean {
  if (resolveTrustedProxyHops(raw).source === "env") return false;
  if (avisado) return false;
  avisado = true;
  log(raw === undefined ? AVISO_TRUSTED_PROXY_HOPS : `${AVISO_TRUSTED_PROXY_HOPS} Valor recibido: "${raw}".`);
  return true;
}

/** IP del cliente según `TRUSTED_PROXY_HOPS` del entorno (avisa si falta o no es válida). */
export function clientIp(hdrs: HeadersLike | null | undefined): string {
  const r = resolveTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS);
  if (r.source === "default") warnIfTrustedProxyHopsUnset();
  return clientIpFrom(hdrs, r.hops);
}
