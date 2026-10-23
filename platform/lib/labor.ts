// Perfil laboral del alumno (datos estilo CRM de formación bonificada).
// Fuente ÚNICA de las listas cerradas, la whitelist de campos, los validadores
// y los formateadores. Importable desde server actions y componentes cliente
// (sin "use server", patrón de lib/competencias.ts).
//
// LOTE01 (AL2): se acabó la «regla de oro» de G04 (campo con valor =
// bloqueado). El alumno edita y guarda su ficha al momento, todo o nada
// (lib/ficha-laboral-server.ts). La única excepción es el DNI/NIE ya guardado,
// que con CAMBIO_DNI_DIRECTO = false (lib/config-ficha.ts) solo cambia por una
// ProfileChangeRequest que valida el superadministrador.

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

// ---------------------------------------------------------------------------
// LOTE01 (AL5): situación actual y respuestas para quien no trabaja
// ---------------------------------------------------------------------------

/** «Situación actual», primer campo de la ficha laboral (AL5). */
export const SITUACIONES_LABORALES = [
  "TRABAJANDO",
  "ESTUDIANDO",
  "ESTUDIANDO_Y_TRABAJANDO",
  "BUSCANDO_EMPLEO",
  "OTRA",
] as const;
export type SituacionLaboral = (typeof SITUACIONES_LABORALES)[number];

// LOTE02 (AL1): los textos de la pregunta «¿Cuál es tu situación?» del registro
// (es el mismo dato que la «Situación actual» del LOTE01 AL5).
export const SITUACION_LABORAL_LABELS: Record<SituacionLaboral, string> = {
  TRABAJANDO: "Trabajo",
  ESTUDIANDO: "Solo estudio",
  ESTUDIANDO_Y_TRABAJANDO: "Estudio y trabajo",
  BUSCANDO_EMPLEO: "Busco empleo",
  OTRA: "Otra situación",
};

/**
 * Situaciones en las que la persona NO trabaja: centro, cargo, turno y
 * servicios se rellenan solos con «No trabajo actualmente» o «Nunca he
 * trabajado» y se bloquean (AL5).
 */
export const SITUACIONES_SIN_TRABAJO: readonly SituacionLaboral[] = ["ESTUDIANDO", "BUSCANDO_EMPLEO"];

/** Situaciones en las que la persona SÍ trabaja: no valen las respuestas de no trabajo. */
export const SITUACIONES_CON_TRABAJO: readonly SituacionLaboral[] = ["TRABAJANDO", "ESTUDIANDO_Y_TRABAJANDO"];

export function situacionSinTrabajo(s: string | null | undefined): boolean {
  return (SITUACIONES_SIN_TRABAJO as readonly string[]).includes(s ?? "");
}

export function situacionConTrabajo(s: string | null | undefined): boolean {
  return (SITUACIONES_CON_TRABAJO as readonly string[]).includes(s ?? "");
}

/** Respuestas de no trabajo, comunes a centro, cargo, turno y servicios (AL5). */
export const SIN_TRABAJO = ["NO_TRABAJA", "NUNCA_TRABAJO"] as const;
export type SinTrabajo = (typeof SIN_TRABAJO)[number];

export const SIN_TRABAJO_LABELS: Record<SinTrabajo, string> = {
  NO_TRABAJA: "No trabajo actualmente",
  NUNCA_TRABAJO: "Nunca he trabajado",
};

export function esSinTrabajo(v: string | null | undefined): v is SinTrabajo {
  return (SIN_TRABAJO as readonly string[]).includes(v ?? "");
}

/** Opciones fijas del cargo: las dos de no trabajo y «Estudiante · sin cargo». */
export const CARGO_OPCIONES = ["NO_TRABAJA", "NUNCA_TRABAJO", "ESTUDIANTE"] as const;
export type CargoOpcion = (typeof CARGO_OPCIONES)[number];

export const CARGO_OPCION_LABELS: Record<CargoOpcion, string> = {
  ...SIN_TRABAJO_LABELS,
  ESTUDIANTE: "Estudiante · sin cargo",
};

/** Turnos de trabajo (AL5). Códigos ASCII; la etiqueta lleva la eñe. Los tres
 *  primeros son los de siempre (importaciones y fichas antiguas siguen valiendo). */
export const WORK_SHIFTS = [
  "MANANA",
  "TARDE",
  "NOCHE",
  "PARTIDA",
  "ROTATIVO",
  "OTRO",
  "NO_TRABAJA",
  "NUNCA_TRABAJO",
] as const;
export type WorkShift = (typeof WORK_SHIFTS)[number];

export const WORK_SHIFT_LABELS: Record<WorkShift, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
  PARTIDA: "Jornada partida",
  ROTATIVO: "Rotativo",
  OTRO: "Otro",
  ...SIN_TRABAJO_LABELS,
};

// ---------------------------------------------------------------------------
// LOTE01 (AL6): edad mínima por nivel de estudios
// ---------------------------------------------------------------------------

/**
 * Edad mínima (años cumplidos) con la que se puede tener cada nivel de
 * estudios terminado. Un único sitio: lo usan el desplegable (con la fecha de
 * nacimiento ya puesta) y el servidor. Referencia: la ESO se termina con 16, el
 * bachillerato y la FP de grado medio con 17-18, la FP superior con 19-20, un
 * grado con 21-22, un máster con 22-23 y un doctorado con 25 o más. Los topes
 * son los más bajos posibles, para no cerrar el paso a casos reales.
 */
export const EDAD_MINIMA_POR_NIVEL: Record<EducationLevel, number> = {
  "menos-primaria": 0,
  primaria: 12,
  "secundaria-1": 16,
  "secundaria-2": 17,
  postsecundaria: 18,
  "tecnico-superior": 19,
  "uni-1": 20,
  "uni-2": 21,
  "uni-3": 23,
  otras: 0,
};

/** Años cumplidos el día `hoyIso` por quien nació el día `nacimientoIso` (AAAA-MM-DD). null si falta alguna. */
export function edadCumplida(nacimientoIso: string | null | undefined, hoyIso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nacimientoIso ?? "");
  const h = /^(\d{4})-(\d{2})-(\d{2})/.exec(hoyIso);
  if (!m || !h) return null;
  let edad = Number(h[1]) - Number(m[1]);
  if (`${h[2]}-${h[3]}` < `${m[2]}-${m[3]}`) edad -= 1;
  return edad;
}

/** ¿Se puede tener ese nivel con esa edad? Sin edad (fecha sin poner), todos valen. */
export function nivelPosibleConEdad(nivel: string, edad: number | null): boolean {
  if (edad === null) return true;
  const min = EDAD_MINIMA_POR_NIVEL[nivel as EducationLevel];
  return min === undefined ? true : edad >= min;
}

export const MSG_NIVEL_EDAD =
  "Ese nivel de estudios no encaja con tu fecha de nacimiento. Revisa la fecha o elige otro nivel.";

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
 * Campos de GESTIÓN: solo los ve y los edita administración. El alumno no los
 * ve en su ficha, no puede rellenarlos ni pedir cambios sobre ellos.
 *
 * DECISIÓN DE PRODUCTO CERRADA (G04, 29 sep 2026): el guion de validación
 * antiguo decía que el alumno veía el grupo de cotización y el coste por hora;
 * se da por buena la versión actual, que los oculta. Si alguien quiere volver a
 * exponerlos tiene que cambiar esta lista a propósito: lib/labor.test.ts falla
 * si la pantalla del alumno vuelve a usarlos.
 */
export const LABOR_FIELDS_MANAGEMENT = [
  "professionalCategory",
  "cotizationGroup",
  "costPerHourCents",
] as const satisfies readonly LaborField[];

/**
 * Campos que el ALUMNO ve en su ficha laboral: todos menos los de gestión.
 * Es la lista que usan la pantalla /perfil/datos Y sus acciones de servidor
 * (guardar y solicitar cambio), para que un formulario manipulado tampoco
 * pueda tocar los de gestión. El panel de administración usa LABOR_FIELDS
 * completo, así que las solicitudes antiguas sobre esos campos se siguen
 * resolviendo con normalidad.
 */
export const LABOR_FIELDS_STUDENT = LABOR_FIELDS.filter(
  (f) => !(LABOR_FIELDS_MANAGEMENT as readonly string[]).includes(f),
) as readonly LaborField[];

export const LABOR_FIELD_LABELS: Record<LaborField, string> = {
  dni: "DNI/NIE",
  phone: "Teléfono",
  birthDate: "Fecha de nacimiento",
  educationLevel: "Nivel de estudios",
  professionalCategory: "Categoría profesional",
  cotizationGroup: "Grupo de cotización",
  ssAccount: "Nº de la Seguridad Social (NAF)",
  costPerHourCents: "Coste por hora",
  workShift: "Turno de trabajo",
  // LOTE02 (AL8): «Empresa o centro de trabajo».
  estancia: "Empresa o centro de trabajo",
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

/** Mensaje de un CIF/NIF que no pasa isValidNifCif (ficha de empresa, G08a). */
export const MSG_CIF_NO_VALIDO = "El CIF no es válido. Revisa que la letra y el dígito de control sean correctos.";

// Primera letra del CIF de una persona jurídica. A, B, E y H llevan dígito de
// control; P, Q, R, S, N y W, letra; el resto, cualquiera de los dos.
const CIF_LETRA_INICIAL = "ABCDEFGHJNPQRSUVW";
const CIF_CONTROL_LETRAS = "JABCDEFGHI";

function cifValido(v: string): boolean {
  const m = v.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!m || !CIF_LETRA_INICIAL.includes(m[1])) return false;
  const digitos = m[2];
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    const n = Number(digitos[i]);
    if (i % 2 === 0) {
      // Posiciones impares (1.ª, 3.ª, 5.ª y 7.ª): se dobla y se suman sus cifras.
      const doble = n * 2;
      suma += Math.floor(doble / 10) + (doble % 10);
    } else {
      suma += n;
    }
  }
  const control = (10 - (suma % 10)) % 10;
  const digito = String(control);
  const letra = CIF_CONTROL_LETRAS[control];
  const dado = m[3];
  if ("PQRSNW".includes(m[1])) return dado === letra;
  if ("ABEH".includes(m[1])) return dado === digito;
  return dado === digito || dado === letra;
}

/**
 * NIF español de una empresa o de un autónomo, con su control: CIF de persona
 * jurídica (letra, 7 dígitos y dígito o letra de control), DNI, NIE o NIF
 * especial K, L y M (letra, 7 dígitos y letra como la del DNI). Admite
 * espacios, puntos y guiones, que normalizeNifCif quita.
 */
export function isValidNifCif(value: string): boolean {
  const v = normalizeNifCif(value);
  if (isValidDniNie(v)) return true;
  const klm = v.match(/^([KLM])(\d{7})([A-Z])$/);
  if (klm) return DNI_LETTERS[Number(klm[2]) % 23] === klm[3];
  return cifValido(v);
}

/** CIF/NIF tal y como se guarda: mayúsculas, sin espacios, puntos ni guiones. */
export function normalizeNifCif(value: string): string {
  return value.trim().toUpperCase().replace(/[\s.-]/g, "");
}

/**
 * CIF que se guarda al editar una ficha (empresa o entidad). Solo se comprueba
 * con su letra o dígito de control si CAMBIA respecto al guardado: un valor
 * antiguo que no pase el control (importado o de antes de la regla) no impide
 * guardar el resto de la ficha (revisión de G08a, M3). Vacío: null. Con
 * `validar` false (empresa extranjera) se guarda tal cual, sin normalizar.
 */
export function cifAGuardar(
  nuevo: string | null | undefined,
  guardado: string | null | undefined,
  { validar = true }: { validar?: boolean } = {},
): { ok: true; cif: string | null } | { ok: false; error: string } {
  const texto = (nuevo ?? "").trim();
  if (!texto) return { ok: true, cif: null };
  if (!validar) return { ok: true, cif: texto };
  const cif = normalizeNifCif(texto);
  const antes = guardado ? normalizeNifCif(guardado) : null;
  if (cif === antes) return { ok: true, cif: guardado ?? cif };
  return isValidNifCif(cif) ? { ok: true, cif } : { ok: false, error: MSG_CIF_NO_VALIDO };
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

/**
 * Revisión de G10a (A1): el teléfono del trabajador es móvil o fijo español,
 * 9 cifras que empiezan por 6, 7, 8 o 9 (ya normalizado con normalizePhone:
 * sin +34 ni separadores). Lo usan la ficha laboral, administración, las
 * solicitudes de cambio y la carga por fichero.
 */
export function isValidSpanishPhone(value: string): boolean {
  return /^[6789]\d{8}$/.test(value);
}

export const MSG_TELEFONO_NO_VALIDO = "El teléfono no es válido: tienen que ser 9 cifras empezando por 6, 7, 8 o 9.";

/**
 * Nº de la Seguridad Social del trabajador: el NÚMERO DE AFILIACIÓN (NAF), 12
 * cifras = provincia (2) + número (8) + control (2). (Hasta el arreglo de G04
 * del 1 oct 2026 este campo pedía la cuenta de cotización de 11 cifras.)
 *
 * Control: si el número de 8 cifras es menor que 10.000.000, d = número +
 * provincia × 10.000.000; si no, d = la cifra de «provincia» seguida de
 * «número». control = d mod 97, con dos cifras.
 */
export const MSG_SS_NO_VALIDO = "El número de la Seguridad Social no es válido: son 12 cifras (provincia, número y control)";

/** Las dos cifras de control de un NAF a partir de su provincia (2) y su número (8). */
export function controlNaf(provincia: string, numero: string): string {
  const n = Number(numero);
  const d = n < 10_000_000 ? n + Number(provincia) * 10_000_000 : Number(`${provincia}${numero}`);
  return String(d % 97).padStart(2, "0");
}

function nafCuadra(doce: string): boolean {
  return /^\d{12}$/.test(doce) && controlNaf(doce.slice(0, 2), doce.slice(2, 10)) === doce.slice(10);
}

/**
 * Normaliza el NAF: solo cifras (tolera espacios, barras, puntos y guiones al
 * teclear o en un fichero). Con 11 cifras, si completado con un 0 a la
 * izquierda pasa el control, se completa: una provincia 01-09 escrita sin el
 * cero o una celda numérica de Excel que lo perdió. Se guarda con 12.
 */
export function normalizeSsAccount(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 11 && nafCuadra(`0${d}`)) return `0${d}`;
  return d;
}

/** NAF válido: 12 cifras con su control (acepta lo que normalizeSsAccount completa). */
export function isValidSsAccount(value: string): boolean {
  return nafCuadra(normalizeSsAccount(value));
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

/**
 * LOTE03 (L3-06): céntimos → cómo se escribe en un campo («12,00», sin «€»).
 * Es la forma canónica del coste por hora en el autoguardado: la usan el
 * servidor (lo que confirma) y el navegador (para comparar), así «12» y
 * «12,00» son lo mismo y no se reenvía en bucle.
 */
export function formatCentsEntrada(cents: number): string {
  return formatCents(cents).replace(/\s*€$/, "");
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
      return isValidSpanishPhone(p) ? p : null;
    }
    case "birthDate": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      const d = new Date(`${v}T00:00:00.000Z`);
      // Mismo criterio que el formulario: V8 desliza los días imposibles
      // ("2000-02-30" pasa a 1 de marzo); el round-trip lo detecta.
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
      return d;
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

/**
 * Datos personales sensibles: NUNCA en claro en la auditoría, en los logs ni
 * en listados donde no hagan falta (minimización). Documento, móvil, cuenta de
 * la Seguridad Social y fecha de nacimiento.
 */
export const LABOR_SENSITIVE_FIELDS = ["dni", "phone", "ssAccount", "birthDate"] as const satisfies readonly LaborField[];
const MASKED_FIELDS: ReadonlySet<LaborField> = new Set(LABOR_SENSITIVE_FIELDS);

export function isSensitiveLaborField(field: LaborField): boolean {
  return MASKED_FIELDS.has(field);
}

/**
 * Enmascara un valor ya formateado si el campo es sensible: quedan sus 3
 * últimos caracteres ("···448T", "···990"). El resto de campos va legible.
 * Sirve para la auditoría y para el historial de solicitudes del alumno.
 */
export function maskLaborValue(field: LaborField, display: string): string {
  if (!display) return "";
  if (!MASKED_FIELDS.has(field)) return display;
  return display.length <= 3 ? "···" : `···${display.slice(-3)}`;
}

/** Valor para el resumen de AuditLog: enmascarado si es sensible, «vacío» si no hay. */
export function auditLaborValue(field: LaborField, display: string): string {
  if (!display) return "vacío";
  return maskLaborValue(field, display);
}

export const CHANGE_REQUEST_STATES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type ChangeRequestState = (typeof CHANGE_REQUEST_STATES)[number];

export const CHANGE_REQUEST_STATE_LABELS: Record<ChangeRequestState, string> = {
  PENDING: "Pendiente de revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};
