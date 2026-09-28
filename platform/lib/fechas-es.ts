// El "hoy" del negocio, que es el de España y no el del servidor.
//
// Por qué existe: comparar `new Date()` contra una columna DateTime guardada a
// medianoche UTC hace que un curso que termina hoy salga de «en proceso» a las
// 00:00 UTC, es decir, de madrugada del último día, y que un curso de un solo
// día no se vea NUNCA en proceso. Trabajando con la fecha en texto (YYYY-MM-DD)
// y comparando cadenas, el día es el que ve la persona que mira la pantalla.
//
// Función pura salvo por la lectura del reloj: quien necesite determinismo (la
// barra cronológica, las incidencias automáticas) recibe el día ya resuelto.

const FORMATO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hoy en España, como "YYYY-MM-DD". */
export function hoyEnMadrid(): string {
  return FORMATO.format(new Date());
}

/** Un DateTime de base de datos como "YYYY-MM-DD" en hora de España. */
export function diaDe(d: Date | null | undefined): string | null {
  return d ? FORMATO.format(d) : null;
}

/** Días de diferencia entre dos días ISO. Negativo si el segundo ya pasó. */
export function diasEntre(desde: string, hasta: string): number | null {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}
