// Estado de validación del alta de una entidad (H4). Fichero PURO: sin Prisma
// ni Next, para poder probarlo con node:test y compartirlo entre el servidor y
// los componentes de cliente (etiquetas, límites, rutas).

import { casaRuta } from "@/lib/soft-launch";
//
// Regla del cliente: el registro de entidades es público, pero ninguna entidad
// usa el portal hasta que administración valida su alta. El estado no se guarda
// como tal: se DERIVA de las dos marcas de EntityProfile (validatedAt y
// rejectedAt) y la más reciente manda. Así una entidad rechazada puede
// validarse después (y al revés) con solo escribir la fecha nueva; al escribir
// una marca se limpia la contraria (lib/admin/usuarios.ts).

export type EstadoValidacionEntidad = "pendiente" | "validada" | "rechazada";

export type FechasValidacionEntidad = {
  validatedAt: Date | null;
  rejectedAt: Date | null;
};

/**
 * La marca más reciente manda; a igualdad de instante gana el rechazo (lectura
 * conservadora: ante la duda, la entidad no entra). Sin ficha o sin fechas,
 * pendiente.
 */
export function estadoValidacionEntidad(
  fechas: FechasValidacionEntidad | null | undefined,
): EstadoValidacionEntidad {
  if (!fechas) return "pendiente";
  const validada = fechas.validatedAt ? fechas.validatedAt.getTime() : null;
  const rechazada = fechas.rejectedAt ? fechas.rejectedAt.getTime() : null;
  if (validada === null && rechazada === null) return "pendiente";
  if (validada === null) return "rechazada";
  if (rechazada === null) return "validada";
  return rechazada >= validada ? "rechazada" : "validada";
}

export const ESTADO_VALIDACION_LABELS: Record<EstadoValidacionEntidad, string> = {
  pendiente: "Pendiente de validar",
  validada: "Validada",
  rechazada: "Rechazada",
};

/** Longitud máxima del motivo de rechazo que escribe administración. */
export const MOTIVO_RECHAZO_MAX = 500;

/** Única ruta del portal que ve una entidad sin validar. */
export const RUTA_PENDIENTE = "/portal/pendiente";

/**
 * LOTE02 (V4): pantallas del portal que usa una entidad PENDIENTE de validar
 * («en preparación»): el estado de su alta, el formulario de validación, su
 * ficha y sus cursos (que no salen en ningún catálogo hasta que la validen).
 * El resto del portal exige la entidad validada. Mismo formato que RUTAS_V0.
 * LOTE06 (L6-08): y su cartera de SkillPoints (saldo, historial y pedirlos por
 * correo), como la empresa sin validar en /empresa/skp: una entidad es una
 * empresa que imparte formación y compra SkillPoints igual.
 */
export const RUTAS_ENTIDAD_EN_PREPARACION = [
  RUTA_PENDIENTE,
  "/portal/alta/**",
  "/portal/ficha",
  "/portal/catalogo",
  "/portal/cursos/nuevo",
  "/portal/cursos/importar",
  "/portal/cursos/*/editar",
  "/portal/skillpoints",
] as const;

/** ¿Puede una entidad en preparación entrar en esta pantalla del portal? */
export function rutaEntidadEnPreparacion(pathname: string): boolean {
  return RUTAS_ENTIDAD_EN_PREPARACION.some((p) => casaRuta(pathname, p));
}

/** Valor de validatedBy de las entidades validadas en la migración inicial (anteriores a la regla). */
export const VALIDADO_POR_MIGRACION = "migracion";

/** Contacto que ve la entidad en la pantalla de pendiente y en el correo de rechazo. Único sitio donde vive. */
export const CONTACTO_VALIDACION = "bienvenida@reconnectia.es";
