// Perfil laboral del alumno (datos estilo CRM de formación bonificada).
// Fuente ÚNICA de las listas cerradas, la whitelist de campos, los validadores
// y los formateadores. Importable desde server actions y componentes cliente
// (sin "use server", patrón de app/(app)/perfil/externo/certif-kinds.ts).
//
// REGLA DE ORO (se aplica en servidor, en app/(app)/perfil/datos/actions.ts):
// un campo con valor queda BLOQUEADO para el alumno; solo puede completar los
// vacíos. Cambiar un campo bloqueado exige una ProfileChangeRequest aprobada
// por administración. El bloqueo se deriva del valor (isLaborFieldFilled).

// ---------------------------------------------------------------------------
// Listas cerradas (los códigos se guardan en BD; las etiquetas son de display)
// ---------------------------------------------------------------------------

/** Niveles de estudios estándar de la formación bonificada (FUNDAE/SEPE). */
export const EDUCATION_LEVELS = [
  "menos-primaria",
  "primaria",
  "secundaria-1",
  "secundaria-2",
  "postsecundaria",
  "tecnico-superior",
  "uni-1",
  "uni-2",
  "uni-3",
  "otras",
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  "menos-primaria": "Menos que primaria",
  primaria: "Educación primaria",
  "secundaria-1":
    "Primera etapa de educación secundaria (1º y 2º ciclo de la ESO. EGB. Graduado Escolar. Certificados de profesionalidad nivel 1 y 2)",
  "secundaria-2":
    "Segunda etapa de educación secundaria (Bachillerato. FP de grado medio. BUP. FPI y FPII)",
  postsecundaria:
    "Educación postsecundaria no superior (Certificados de Profesionalidad de nivel 3)",
  "tecnico-superior": "Técnico Superior/FP grado superior y equivalentes",
  "uni-1": "E. universitarios 1º ciclo (Diplomatura-Grados)",
  "uni-2": "E. universitarios 2º ciclo (Licenciatura-Máster)",
  "uni-3": "E. universitarios 3º ciclo (Doctorado)",
  otras: "Otras titulaciones",
};

/** Categorías profesionales estándar de la formación bonificada. */
export const PROFESSIONAL_CATEGORIES = [
  "directivo",
  "mando-intermedio",
  "tecnico",
  "baja-cualificacion",
  "cualificado",
] as const;
export type ProfessionalCategory = (typeof PROFESSIONAL_CATEGORIES)[number];

export const PROFESSIONAL_CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  directivo: "Directivo",
  "mando-intermedio": "Mando Intermedio",
  tecnico: "Técnico",
  "baja-cualificacion": "Trabajador con Baja Cualificación",
  cualificado: "Trabajador Cualificado",
};

/** Grupos de cotización de la Seguridad Social (1 a 11). */
export const COTIZATION_GROUPS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
] as const;
export type CotizationGroup = (typeof COTIZATION_GROUPS)[number];

export const COTIZATION_GROUP_LABELS: Record<CotizationGroup, string> = {
  "1": "Ingenieros y Licenciados",
  "2": "Ingenieros técnicos. Peritos y Ayudantes titulados",
  "3": "Jefes administrativos y de taller",
  "4": "Ayudantes no titulados",
  "5": "Oficiales administrativos",
  "6": "Subalternos",
  "7": "Auxiliares administrativos",
  "8": "Oficiales de primera y segunda",
  "9": "Oficiales de tercera y Especialistas",
  "10": "Trabajadores mayores de 18 años no cualificados",
  "11": "Trabajadores menores de dieciocho años",
};

/** Display "N - Etiqueta", el formato del CRM del cliente. */
export function cotizationGroupDisplay(code: CotizationGroup): string {
  return `${code} - ${COTIZATION_GROUP_LABELS[code]}`;
}

/** Turnos de trabajo. Códigos ASCII; la etiqueta lleva la eñe. */
export const WORK_SHIFTS = ["MANANA", "TARDE", "NOCHE"] as const;
export type WorkShift = (typeof WORK_SHIFTS)[number];

export const WORK_SHIFT_LABELS: Record<WorkShift, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
};

// ---------------------------------------------------------------------------
// Whitelist canónica de campos laborales
// ---------------------------------------------------------------------------

export const LABOR_FIELDS = [
  "dni",
  "phone",
  "birthDate",
  "educationLevel",
  "professionalCategory",
  "cotizationGroup",
  "ssAccount",
  "costPerHourCents",
  "workShift",
  "estancia",
] as const;
export type LaborField = (typeof LABOR_FIELDS)[number];

/**
 * Campos que el ALUMNO ve en su ficha laboral. La categoría profesional, el
 * grupo de cotización y el coste por hora se quedan fuera de su presentación
 * por decisión de producto: son datos de gestión que maneja la administración.
 * Siguen existiendo en base de datos y en el panel de administración, que usa
 * LABOR_FIELDS completo, así que las solicitudes de cambio ya registradas sobre
 * esos campos se siguen resolviendo con normalidad.
 */
export const LABOR_FIELDS_STUDENT = LABOR_FIELDS.filter(
  (f) => f !== "professionalCategory" && f !== "cotizationGroup" && f !== "costPerHourCents",
) as readonly LaborField[];

export const LABOR_FIELD_LABELS: Record<LaborField, string> = {
  dni: "DNI/NIF",
  phone: "Móvil",
  birthDate: "Fecha de nacimiento",
  educationLevel: "Nivel de estudios",
  professionalCategory: "Categoría profesional",
  cotizationGroup: "Grupo de cotización",
  ssAccount: "Cuenta de la Seguridad Social",
  costPerHourCents: "Coste por hora",
  workShift: "Turno",
  estancia: "Estancia o centro de trabajo",
};

/** Subconjunto del perfil con los campos laborales (shape de Prisma). */
export type LaborProfile = {
  dni: string | null;
  phone: string | null;
  birthDate: Date | null;
  educationLevel: string | null;
  professionalCategory: string | null;
  cotizationGroup: string | null;
  ssAccount: string | null;
  costPerHourCents: number | null;
  workShift: string | null;
  estancia: string | null;
};

export const EMPTY_LABOR_PROFILE: LaborProfile = {
  dni: null,
  phone: null,
  birthDate: null,
  educationLevel: null,
  professionalCategory: null,
  cotizationGroup: null,
  ssAccount: null,
  costPerHourCents: null,
  workShift: null,
  estancia: null,
};

/** Un campo cuenta como relleno (= bloqueado) si tiene valor no vacío. */
export function isLaborFieldFilled(profile: Partial<LaborProfile> | null | undefined, field: LaborField): boolean {
  if (!profile) return false;
  const value = profile[field];
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

// ---------------------------------------------------------------------------
// Normalizadores y validadores puros
// ---------------------------------------------------------------------------

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

/** DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra), con letra de control. */
export function isValidDniNie(value: string): boolean {
  const v = value.trim().toUpperCase().replace(/[\s.-]/g, "");
  const dni = v.match(/^(\d{8})([A-Z])$/);
  if (dni) return DNI_LETTERS[Number(dni[1]) % 23] === dni[2];
  const nie = v.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nie) {
    const prefix = { X: "0", Y: "1", Z: "2" }[nie[1] as "X" | "Y" | "Z"];
    return DNI_LETTERS[Number(prefix + nie[2]) % 23] === nie[3];
  }
  return false;
}

export function normalizeDniNie(value: string): string {
  return value.trim().toUpperCase().replace(/[\s.-]/g, "");
}

/** Deja solo dígitos (quita espacios, puntos, guiones y el prefijo +34). */
export function normalizePhone(value: string): string {
  let v = value.replace(/[\s.\-()]/g, "");
  if (v.startsWith("+34")) v = v.slice(3);
  else if (v.startsWith("0034")) v = v.slice(4);
  return v;
}

export function isValidSpanishMobile(value: string): boolean {
  return /^[67]\d{8}$/.test(value);
}

/** Cuenta de cotización SS: 11 dígitos (tolera separadores al teclear). */
export function normalizeSsAccount(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidSsAccount(value: string): boolean {
  return /^\d{11}$/.test(value);
}

/** "10,33" | "10.33" | "10,33 €" → céntimos (1033). null si no es un importe. */
export function parseEurosToCents(value: string): number | null {
  const v = value.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(parseFloat(v) * 100);
}

export function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const dec = String(cents % 100).padStart(2, "0");
  return `${euros},${dec} €`;
}

// ---------------------------------------------------------------------------
// Serialización de valores (para ProfileChangeRequest y aprobaciones)
// ---------------------------------------------------------------------------

/** Fecha → "YYYY-MM-DD" (sin hora, criterio único del perfil laboral). */
export function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Valor tipado → string almacenable en ProfileChangeRequest. */
export function laborValueToString(field: LaborField, value: LaborProfile[LaborField]): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateToIso(value);
  return String(value);
}

/** String de ProfileChangeRequest → valor tipado para Prisma. */
export function laborValueFromString(
  field: LaborField,
  raw: string,
): string | number | Date | null {
  const v = raw.trim();
  if (v === "") return null;
  if (field === "birthDate") return new Date(`${v}T00:00:00.000Z`);
  if (field === "costPerHourCents") return Number(v);
  return v;
}

/**
 * Valida un valor SERIALIZADO (tal y como viaja en ProfileChangeRequest:
 * céntimos como "1033", fechas "YYYY-MM-DD", códigos de lista) y lo devuelve
 * tipado para Prisma; null si no es válido. OJO: no confundir con los schemas
 * de ENTRADA de formulario (allí "10,33" son euros con coma).
 */
export function parseSerializedLaborValue(
  field: LaborField,
  raw: string,
): string | number | Date | null {
  const v = raw.trim();
  if (v === "") return null;
  switch (field) {
    case "dni":
      return isValidDniNie(v) ? normalizeDniNie(v) : null;
    case "phone": {
      const p = normalizePhone(v);
      return isValidSpanishMobile(p) ? p : null;
    }
    case "birthDate": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      const d = new Date(`${v}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    case "educationLevel":
      return (EDUCATION_LEVELS as readonly string[]).includes(v) ? v : null;
    case "professionalCategory":
      return (PROFESSIONAL_CATEGORIES as readonly string[]).includes(v) ? v : null;
    case "cotizationGroup":
      return (COTIZATION_GROUPS as readonly string[]).includes(v) ? v : null;
    case "ssAccount": {
      const s = normalizeSsAccount(v);
      return isValidSsAccount(s) ? s : null;
    }
    case "costPerHourCents": {
      if (!/^\d+$/.test(v)) return null;
      const n = Number(v);
      return n > 0 && n <= 99999 ? n : null;
    }
    case "workShift":
      return (WORK_SHIFTS as readonly string[]).includes(v) ? v : null;
    case "estancia":
      return v.length >= 2 && v.length <= 160 ? v : null;
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Valor legible para la UI (fechas dd/mm/aaaa, importes, etiquetas largas). */
export function formatLaborValue(field: LaborField, value: LaborProfile[LaborField]): string {
  if (value === null || value === undefined || value === "") return "";
  switch (field) {
    case "birthDate": {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    }
    case "costPerHourCents":
      return formatCents(Number(value));
    case "educationLevel":
      return EDUCATION_LEVEL_LABELS[value as EducationLevel] ?? String(value);
    case "professionalCategory":
      return PROFESSIONAL_CATEGORY_LABELS[value as ProfessionalCategory] ?? String(value);
    case "cotizationGroup":
      return COTIZATION_GROUP_LABELS[value as CotizationGroup]
        ? cotizationGroupDisplay(value as CotizationGroup)
        : String(value);
    case "workShift":
      return WORK_SHIFT_LABELS[value as WorkShift] ?? String(value);
    default:
      return String(value);
  }
}

/** Igual que formatLaborValue pero partiendo del string serializado. */
export function formatLaborValueFromString(field: LaborField, raw: string): string {
  const value = laborValueFromString(field, raw);
  return formatLaborValue(field, value as LaborProfile[LaborField]);
}

/** Campos cuyo valor NO debe viajar en claro a la auditoría (minimización). */
const MASKED_FIELDS: ReadonlySet<LaborField> = new Set(["dni", "phone", "ssAccount"]);

/**
 * Valor para el resumen de AuditLog: los identificadores personales se
 * enmascaran a sus 3 últimos caracteres ("···448T"); el resto va legible.
 */
export function auditLaborValue(field: LaborField, display: string): string {
  if (!display) return "vacío";
  if (!MASKED_FIELDS.has(field)) return display;
  return display.length <= 3 ? "···" : `···${display.slice(-3)}`;
}

export const CHANGE_REQUEST_STATES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type ChangeRequestState = (typeof CHANGE_REQUEST_STATES)[number];

export const CHANGE_REQUEST_STATE_LABELS: Record<ChangeRequestState, string> = {
  PENDING: "Pendiente de revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};
