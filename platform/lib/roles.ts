// Enums modelados como strings en SQLite — fuentes de verdad centralizadas.

export const ROLES = ["STUDENT", "TRAINER", "COMPANY", "ENTITY", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Alumno",
  TRAINER: "Formador",
  COMPANY: "Empresa",
  ENTITY: "Entidad de formación",
  ADMIN: "Administrador",
};

export const ROLE_HOME: Record<Role, string> = {
  // El alumno aterriza en su perfil (las ofertas quedan capadas hasta la V1).
  STUDENT: "/perfil",
  TRAINER: "/formador",
  COMPANY: "/empresa",
  ENTITY: "/portal",
  ADMIN: "/admin",
};

// LOTE03 (L3-17): exactamente cuatro, en el orden del cliente: Presencial,
// Aula virtual, Teleformación y Mixta. Se conservan las claves guardadas
// (IN_PERSON, ONLINE = Teleformación, HYBRID = Mixta) y entra AULA_VIRTUAL: no
// se migran cursos, formaciones ni borradores. Lo que significa cada una
// (lugar, fechas, formador, distancia) vive en lib/modalidades.ts.
export const MODALITIES = ["IN_PERSON", "AULA_VIRTUAL", "ONLINE", "HYBRID"] as const;
export type Modality = (typeof MODALITIES)[number];

// LOTE01 (E7): el ÚNICO juego de etiquetas de modalidad de cursos y
// formaciones. MODALIDAD_CURSO_LABELS (lib/cursos-entidad.ts),
// FORMACION_MODALITY_LABELS (lib/formaciones.ts) y MODALIDAD_SOLICITUD_LABELS
// (lib/solicitudes-formacion.ts) son esta misma tabla.
export const MODALITY_LABELS: Record<Modality, string> = {
  IN_PERSON: "Presencial",
  AULA_VIRTUAL: "Aula virtual",
  ONLINE: "Teleformación",
  HYBRID: "Mixta",
};

export const APPLICATION_STATUSES = [
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pendiente",
  REVIEWED: "Revisada",
  SHORTLISTED: "Short-list",
  REJECTED: "Descartada",
  HIRED: "Contratada",
};

// JSON helpers para campos serializados (SQLite no soporta arrays nativos).
export function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function toJsonArray(values: unknown[]): string {
  return JSON.stringify(values ?? []);
}
