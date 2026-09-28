// Taxonomía de SERVICIOS de la plataforma (ronda 6). Sustituye a la de 25
// sectores de lib/sectors.ts como lenguaje de cara al usuario: son los mismos 7
// servicios que usa la web comercial B2B (sites/cesea-formacion-b2b/js/app.js),
// para que el cliente lea lo mismo en la web y en la plataforma.
//
// Se guardan como JSON string en BD (columna TEXT) igual que el resto de
// multivalor del proyecto, vía toJsonArray()/parseJsonArray() de lib/roles.ts.
// Lo que se guarda es la CLAVE ("sociosanitarios"), no la etiqueta: la etiqueta
// se puede reescribir sin migrar datos.
//
// lib/sectors.ts NO se borra: CompanyProfile.sector y los campos .sector de
// Formacion/Course se conservan como legacy, y el mapa de abajo permite leer los
// datos viejos mientras queden.

export const SERVICIOS = [
  "sociosanitarios",
  "salud",
  "auxiliares",
  "hosteleria",
  "tecnologicos",
  "financieros",
  "educativos",
] as const;

export type Servicio = (typeof SERVICIOS)[number];

export const SERVICIO_LABELS: Record<Servicio, string> = {
  sociosanitarios: "Servicios sociosanitarios",
  salud: "Servicios de salud y cuidado",
  auxiliares: "Servicios auxiliares",
  hosteleria: "Servicios de hostelería",
  tecnologicos: "Servicios tecnológicos",
  financieros: "Servicios financieros",
  educativos: "Servicios educativos",
};

/** Tope de servicios que se pueden marcar, en línea con el tope de sectores. */
export const SERVICIOS_MAX = 4;

// Conversión desde los 25 sectores de lib/sectors.ts. Decisión del cliente
// (2026-08-05): los 7 servicios exactos, y todo lo que no tiene equivalente
// directo va a "auxiliares". Es una conversión con pérdida y se sabe: un
// soldador industrial queda como auxiliar. Se acepta a cambio de hablar el mismo
// idioma que la web comercial.
const MAPA_SECTOR_SERVICIO: Record<string, Servicio> = {
  Sociosanitario: "sociosanitarios",
  "Servicios sociales": "sociosanitarios",
  Salud: "salud",
  Hostelería: "hosteleria",
  Tecnología: "tecnologicos",
  Telecomunicaciones: "tecnologicos",
  "Banca y seguros": "financieros",
  Educación: "educativos",
  "Formación profesional": "educativos",
};

/** Servicio equivalente a un sector antiguo. Lo no mapeado cae en auxiliares. */
export function servicioDesdeSector(sector: string | null | undefined): Servicio | null {
  const s = (sector ?? "").trim();
  if (!s) return null;
  return MAPA_SECTOR_SERVICIO[s] ?? "auxiliares";
}

/** Convierte una lista de sectores antiguos en servicios, sin repetidos. */
export function serviciosDesdeSectores(sectores: readonly (string | null | undefined)[]): Servicio[] {
  const out: Servicio[] = [];
  for (const sec of sectores) {
    const srv = servicioDesdeSector(sec);
    if (srv && !out.includes(srv)) out.push(srv);
  }
  return out;
}

/** Descarta lo que no sea un servicio válido (defensa al leer de BD o de un form). */
export function normalizarServicios(valores: readonly unknown[]): Servicio[] {
  const validos = new Set<string>(SERVICIOS);
  const out: Servicio[] = [];
  for (const v of valores) {
    if (typeof v === "string" && validos.has(v) && !out.includes(v as Servicio)) {
      out.push(v as Servicio);
    }
  }
  return out;
}

/** Etiquetas legibles, para pintar en una celda o una línea de resumen. */
export function etiquetasServicios(valores: readonly string[]): string[] {
  return normalizarServicios(valores).map((s) => SERVICIO_LABELS[s]);
}

/**
 * Puntuación de servicio entre dos listas: 100 si comparten alguno, 50 neutral
 * si a alguno de los dos lados le falta el dato, 0 si no coinciden. Es el
 * equivalente de sectorScoreFor() con lista a ambos lados. Ver
 * lib/formacion-affinity.ts.
 */
export function servicioScoreFor(
  perfilServicios: readonly string[],
  objetivoServicios: readonly string[],
): number {
  const a = normalizarServicios(perfilServicios);
  const b = normalizarServicios(objetivoServicios);
  if (a.length === 0 || b.length === 0) return 50;
  return a.some((s) => b.includes(s)) ? 100 : 0;
}
